// Подписание согласия на обработку персональных данных игроком на сайте ТФХ.
//
// Как это устроено целиком:
//   1. На публичной странице команды у игрока в подсказке к иконке «Согласие на обработку
//      данных» появляется кнопка «Заполнить», если документа ещё нет или он просрочен.
//   2. Игрок вводит паспортные данные и адрес регистрации и ставит галочку — сам бланк
//      предусматривает, что галочка заменяет собственноручную подпись.
//   3. Здесь из этого собирается PDF сразу с двумя согласиями (обработка + распространение),
//      кладётся в бакет общей системы и прописывается в user_season_consents — согласие
//      принадлежит паре «человек + сезон», а не заявке, поэтому действует во всех заявках
//      игрока в сезоне, в том числе после перехода в другую команду посреди сезона. После
//      этого документ виден в LMS, в кабинете команды и иконка на сайте зеленеет.
//
// Паспортные данные в БД НЕ сохраняются: они живут только внутри PDF. В базу пишется
// один лишь факт подписания (roster_consent_signatures) — кто, когда, с какого адреса
// и какую редакцию бланка подписал.
//
// Личность подписанта не проверяется — так решено сознательно: у игроков нет учётных
// записей на сайте федерации, а страница команды публичная. Из-за этого запись о факте
// подписания (IP, user-agent, время) и ограничение частоты запросов — единственное, чем
// можно подкрепить документ при разборе «я этого не подписывал».

import crypto from 'crypto';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3.js';
import { sharedPool, tfhPool } from '../config/db.js';
import { getClientIp } from '../utils/clientIp.js';
import { renderConsentPdf, CONSENT_FORM_VERSION } from '../src/consents/consentPdf.js';

const LEAGUE_ID = Number(process.env.LEAGUE_ID);

// Бакет общей системы LMS/Team Room, а не сайта федерации: согласие — документ допуска,
// и лежать он должен там, откуда его читают LMS и кабинет команды (см. имя ключа ниже).
const SHARED_S3_BUCKET = process.env.SHARED_S3_BUCKET || 'hockeyeco-uploads';

// Дата в документе — календарный день по месту, где работает организация (Тюмень).
// Здесь намеренно не DEFAULT_TIMEZONE ('Europe/Moscow') из LMS: та константа задаёт общее
// правило для сроков сразу нескольких городов, а тут — дата на бумаге конкретной
// тюменской организации, и вечернее подписание не должно уезжать на день назад.
const LEAGUE_TIMEZONE = process.env.LEAGUE_TIMEZONE || 'Asia/Yekaterinburg';

const MIN_SIGNER_AGE = 18;

const formatInTz = (date, options) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: LEAGUE_TIMEZONE, ...options }).format(date);

// 'YYYY-MM-DD' -> 'ДД.ММ.ГГГГ'. Дата приезжает из <input type="date">, поэтому формат
// фиксированный; собираем строку руками, чтобы не создавать Date и не ловить сдвиг на день.
const isoToRu = (iso) => {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Возраст на сегодня. В лиге играют совершеннолетние, так что проверка ниже — страховка:
// за несовершеннолетнего согласие даёт законный представитель, а полей для него в бланке
// нет вовсе. Поэтому если такой игрок всё же попадётся, форму ему не открываем, а не
// подписываем документ «как получится».
const ageOn = (birthDate, now) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
};

const todayIso = () => {
  const parts = formatInTz(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' }).split('.');
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

// Заявка + всё, что нужно и для проверок доступа, и для самого бланка. Условия видимости
// те же, что на публичной странице команды (см. getTeamDetail в ChampionshipController):
// подписать можно только то, что на этой странице реально показано.
const PERSON_QUERY = `
  SELECT
    tt.id AS tournament_team_id,
    p.user_id AS player_id,
    p.tournament_roster_id,
    usc.consent_url,
    to_char(usc.consent_expires_at, 'YYYY-MM-DD') AS consent_expires_at,
    u.first_name, u.last_name, u.middle_name,
    to_char(u.birth_date, 'YYYY-MM-DD') AS birth_date,
    d.req_consent, d.name AS division_name,
    COALESCE(tt.snap_name, t.name) AS team_name,
    to_char(s.end_date, 'YYYY-MM-DD') AS season_end_date,
    s.league_id
  FROM tournament_teams tt
  JOIN divisions d ON d.id = tt.division_id
  JOIN seasons s ON s.id = d.season_id
  JOIN teams t ON t.id = tt.team_id
  -- Человек в заявке — игрок или представитель. Строка состава приоритетнее: у играющего
  -- тренера подписанное согласие должно лечь на тот же комплект документов.
  JOIN LATERAL (
    SELECT user_id, tournament_roster_id
      FROM (
        SELECT tr.player_id AS user_id, MIN(tr.id) AS tournament_roster_id, 1 AS pri
          FROM tournament_rosters tr
         WHERE tr.tournament_team_id = tt.id AND tr.player_id = $2 AND tr.period_end IS NULL
         GROUP BY tr.player_id
        UNION ALL
        SELECT ttr.user_id, NULL::int, 2
          FROM tournament_team_roles ttr
         WHERE ttr.tournament_team_id = tt.id AND ttr.user_id = $2 AND ttr.left_at IS NULL
         GROUP BY ttr.user_id
      ) candidates
     ORDER BY pri
     LIMIT 1
  ) p ON true
  JOIN users u ON u.id = p.user_id
  -- Согласие лежит на паре «человек + сезон»: одно на все заявки игрока в сезоне
  LEFT JOIN user_season_consents usc
         ON usc.user_id = p.user_id AND usc.season_id = s.id
  WHERE tt.id = $1
    AND tt.status IN ('approved', 'revision', 'pending')
    AND d.is_published = true
`;

// Единая проверка «можно ли подписывать» для обоих эндпоинтов: GET по ней рисует форму
// или объяснение, POST по ней же отказывает. Возвращает текст причины или null.
const signingBlockedReason = (roster) => {
  if (roster.league_id !== LEAGUE_ID) return 'Заявка относится к другой лиге';
  if (!roster.req_consent) return 'В этом дивизионе согласие на обработку данных не требуется';

  if (roster.consent_url) {
    const notExpired = !roster.consent_expires_at || roster.consent_expires_at >= todayIso();
    if (notExpired) return 'Согласие уже загружено';
  }

  const age = ageOn(roster.birth_date, new Date());
  if (age !== null && age < MIN_SIGNER_AGE) {
    return 'Игроку нет 18 лет: согласие за него даёт законный представитель. '
      + 'Обратитесь к руководителю команды или в федерацию';
  }

  return null;
};

// Значения уходят в запрос как есть, поэтому нечисловые отсекаем заранее: иначе Postgres
// упадёт на приведении типа, и посетитель увидит 500 вместо «не найдено».
const parseId = (value) => (/^\d+$/.test(value || '') ? value : null);

const trimmed = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Последние 10 цифр номера: так номер приводится к единому виду независимо от того,
// набрали его с 8, с +7 или вообще без кода страны.
const phoneDigits = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// В документ телефон печатается всегда как «+7 (900) 123-45-67», что бы человек ни ввёл
// в форме. Формат тот же, что в профиле Team Room (TR-Frontend/src/pages/ProfilePage.jsx),
// чтобы номер выглядел одинаково во всех системах.
const formatPhone = (raw) => {
  const last10 = phoneDigits(raw);
  if (last10.length !== 10) return String(raw || '').trim();
  return `+7 (${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6, 8)}-${last10.slice(8, 10)}`;
};

// Предел длины значений, которые печатаются в бланк. Не защита, а вёрстка: каждое
// согласие обязано умещаться в один лист А4, и на этих значениях шаблон проверен.
// Больше 200 символов не бывает ни у органа выдачи, ни у адреса регистрации.
const FIELD_MAX = 200;

// Возвращает текст ошибки или null. Проверяем ровно то, что печатается в бланк:
// пустых полей в документе быть не должно.
const validateForm = (body) => {
  if (body.agreed !== true) return 'Не подтверждено согласие';
  if (!/^\d{1,4}$/.test(trimmed(body.passportSeries, 4))) return 'Серия паспорта — до 4 цифр';
  if (!/^\d{1,6}$/.test(trimmed(body.passportNumber, 6))) return 'Номер паспорта — до 6 цифр';
  if (!ISO_DATE.test(body.passportIssueDate || '')) return 'Укажите дату выдачи документа';
  if (body.passportIssueDate > todayIso()) return 'Дата выдачи документа не может быть в будущем';
  if (trimmed(body.passportIssuedBy, FIELD_MAX).length < 5) return 'Укажите орган, выдавший документ';
  if (trimmed(body.registrationAddress, FIELD_MAX).length < 5) return 'Укажите адрес регистрации';
  if (phoneDigits(body.phone).length !== 10) return 'Укажите номер телефона полностью: +7 (900) 123-45-67';

  return null;
};

const fullNameOf = (roster) =>
  [roster.last_name, roster.first_name, roster.middle_name].filter(Boolean).join(' ');

// Расшифровка подписи по бланку — «инициалы и фамилия», то есть «И.И. Иванов».
const initialsOf = (roster) => {
  const initials = [roster.first_name, roster.middle_name]
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join('');
  return [initials, roster.last_name].filter(Boolean).join(' ');
};

// GET /api/consent/blank.pdf — пустой бланк для чтения перед подписанием.
//
// Собирается тем же шаблоном, что и подписанный документ, поэтому разойтись с ним
// не может: в незаполненных полях стоят прочерки, и человек видит ровно тот текст,
// под которым поставит галочку. Бланк одинаков для всех и не меняется до правки шаблона,
// поэтому держим его в памяти — иначе каждый открывший форму запускал бы отрисовку PDF.
let blankPdfCache = null;

export const getBlankConsent = async (req, res) => {
  try {
    if (!blankPdfCache) {
      blankPdfCache = await renderConsentPdf({
        fullName: '', initials: '',
        passportSeries: '', passportNumber: '', passportIssueDate: '', passportIssuedBy: '',
        registrationAddress: '', phone: '',
        // Пустой documentCode шаблон понимает как «это образец»: снимает галочку
        // в блоке подписи и меняет служебную строку внизу страницы.
        signedAtDate: '', signedAtTime: '', documentCode: '',
      });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="soglasie-blank.pdf"');
    // Браузеру кэшировать запрещаем. Адрес у бланка постоянный, а содержимое меняется
    // при каждой правке шаблона — с обычным max-age человек часами получал бы из кэша
    // прошлую редакцию документа и читал не то, что подписывает. Отрисовка ничего
    // не стоит: готовый файл лежит в памяти процесса (blankPdfCache).
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.send(blankPdfCache);
  } catch (err) {
    console.error('Ошибка сборки пустого бланка согласия:', err);
    res.status(500).json({ message: 'Не удалось открыть бланк' });
  }
};

// GET /api/consent/:appId/:userId — что показать в модалке: форму или причину отказа.
// Публичный эндпоинт, поэтому наружу отдаём только то, что и так есть на странице
// команды (ФИО, команда, дивизион). Телефон и прочие контакты — не отдаём.
export const getConsentState = async (req, res) => {
  try {
    const appId = parseId(req.params.appId);
    const userId = parseId(req.params.userId);
    if (!appId || !userId) return res.status(404).json({ message: 'Заявка не найдена' });

    const { rows } = await sharedPool.query(PERSON_QUERY, [appId, userId]);
    const roster = rows[0];
    if (!roster) return res.status(404).json({ message: 'Заявка не найдена' });

    const blockedReason = signingBlockedReason(roster);

    res.json({
      canSign: blockedReason === null,
      reason: blockedReason,
      // Версия бланка уходит на фронт только затем, чтобы подставить её в адрес ссылки
      // на пустой бланк: у тех, кто успел закэшировать прошлую редакцию до запрета
      // кэширования, новый адрес заставит браузер скачать документ заново.
      formVersion: CONSENT_FORM_VERSION,
      playerName: fullNameOf(roster),
      teamName: roster.team_name,
      divisionName: roster.division_name,
      // Срок действия согласия в системе — до конца сезона: на следующий сезон документ
      // подписывается заново. Со сроком обработки ПД из текста бланка (не менее 50 лет)
      // это не связано.
      expiresAt: roster.season_end_date,
    });
  } catch (err) {
    console.error('Ошибка получения состояния согласия:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// POST /api/consent/:appId/:userId — собрать PDF, положить в S3 и прописать в заявку.
export const signConsent = async (req, res) => {
  let uploadedKey = null;

  try {
    const appId = parseId(req.params.appId);
    const userId = parseId(req.params.userId);
    if (!appId || !userId) return res.status(404).json({ message: 'Заявка не найдена' });

    const { rows } = await sharedPool.query(PERSON_QUERY, [appId, userId]);
    const roster = rows[0];
    if (!roster) return res.status(404).json({ message: 'Заявка не найдена' });

    const blockedReason = signingBlockedReason(roster);
    if (blockedReason) return res.status(409).json({ message: blockedReason });

    const validationError = validateForm(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const now = new Date();
    // Один и тот же случайный код и печатается в документе, и уходит в имя файла:
    // по нему лига сверяет присланный PDF с записью о подписании, а имя объекта в S3
    // перестаёт угадываться перебором id заявок (бакет отдаёт файлы без авторизации).
    const token = crypto.randomBytes(8).toString('hex');
    const documentCode = token.toUpperCase();

    // Дальше три стадии, и каждая падает по-своему. Разделены они ради человека у экрана:
    // одно общее «попробуйте позже» ничего не объясняет ни игроку, ни лиге, к которой он
    // придёт с вопросом. Подробности ошибки остаются в логе, наружу уходит только стадия.
    let pdfBuffer;
    try {
      pdfBuffer = await renderConsentPdf({
        fullName: fullNameOf(roster),
        initials: initialsOf(roster),
        passportSeries: trimmed(req.body.passportSeries, 4),
        passportNumber: trimmed(req.body.passportNumber, 6),
        passportIssueDate: isoToRu(req.body.passportIssueDate),
        passportIssuedBy: trimmed(req.body.passportIssuedBy, FIELD_MAX),
        registrationAddress: trimmed(req.body.registrationAddress, FIELD_MAX),
        phone: formatPhone(req.body.phone),
        signedAtDate: formatInTz(now, { year: 'numeric', month: '2-digit', day: '2-digit' }),
        signedAtTime: formatInTz(now, { hour: '2-digit', minute: '2-digit' }),
        documentCode,
      });
    } catch (err) {
      console.error('Согласие: не удалось собрать PDF:', err);
      return res.status(500).json({
        message: 'Не удалось сформировать документ. Сообщите об этом в федерацию.',
      });
    }

    // Имя файла — та же схема, что у сканов, которые вручную грузят в LMS и в кабинете
    // команды (uploads/tournament_rosters_{id}_consent.*), плюс случайный хвост.
    const s3Key = `uploads/tournament_person_${roster.tournament_team_id}_${roster.player_id}_consent_${token}.pdf`;
    try {
      await s3.send(new PutObjectCommand({
        Bucket: SHARED_S3_BUCKET,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }));
      uploadedKey = s3Key;
    } catch (err) {
      console.error('Согласие: не удалось загрузить файл в S3:', err);
      return res.status(500).json({
        message: 'Документ сформирован, но не сохранился в хранилище. Сообщите об этом в федерацию.',
      });
    }

    // Запись идёт в две разные базы, и общей транзакции на них не бывает.
    //
    // Журнал подписания — внутренняя бухгалтерия сайта, он живёт в собственной базе ТФХ.
    // В общей базе лиги согласие ложится в user_season_consents (человек + сезон): по нему
    // LMS и кабинет команды понимают, что документ есть, в любой заявке игрока в сезоне.
    //
    // В общую базу сайт НЕ пишет сам — у роли tfh_reader прав на запись там нет вообще.
    // Запись делает функция tfh_sign_consent(), она принадлежит владельцу базы и работает
    // его правами (SECURITY DEFINER); у сайта есть только право её вызвать. Раньше сайт
    // писал напрямую по колоночным грантам, и они трижды слетали — при пересоздании
    // таблицы и от любого REVOKE «для порядка» — а подписание падало до следующей
    // попытки подписать. Функцию такие уборки не трогают.
    //
    // Порядок такой: открываем транзакцию в своей базе, пишем журнал, правим заявку
    // в общей базе и только после её успеха фиксируем журнал. Если общая база недоступна
    // или функции в ней нет, журнал откатывается — и в системе не остаётся следов
    // наполовину выполненной операции.
    const tfhClient = await tfhPool.connect();
    try {
      await tfhClient.query('BEGIN');
      await tfhClient.query(
        `INSERT INTO roster_consent_signatures
           (tournament_roster_id, tournament_team_id, user_id, document_code, form_version, file_url, expires_at, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          // У представителя строки состава нет вовсе — заявка и человек есть всегда
          roster.tournament_roster_id,
          roster.tournament_team_id,
          roster.player_id,
          documentCode,
          CONSENT_FORM_VERSION,
          `/${s3Key}`,
          roster.season_end_date,
          getClientIp(req),
          (req.headers['user-agent'] || '').slice(0, 255),
        ]
      );
      await sharedPool.query(
        'SELECT public.tfh_sign_consent($1, $2, $3, $4)',
        [roster.tournament_team_id, roster.player_id, `/${s3Key}`, roster.season_end_date]
      );
      await tfhClient.query('COMMIT');
    } catch (err) {
      await tfhClient.query('ROLLBACK').catch(() => {});
      console.error('Согласие: не удалось записать результат подписания:', err);
      // Файл без записи в базе никому не виден и не нужен — убираем его сразу.
      await s3.send(new DeleteObjectCommand({ Bucket: SHARED_S3_BUCKET, Key: s3Key })).catch(() => {});
      // Три ошибки называем прямо: их чинит администратор, и «попробуйте позже» тут
      // только собьёт с толку — само оно не заработает никогда.
      const SETUP_ERRORS = {
        42501: 'У сайта нет права вызвать функцию записи в базе лиги. Так подписание работать не будет — сообщите об этом администратору.',
        42883: 'В базе лиги нет функции tfh_sign_consent. Подписание не заработает, пока её не создадут — сообщите администратору.',
        '42P01': 'В базе сайта нет таблицы журнала согласий. Подписание не заработает, пока её не создадут — сообщите администратору.',
      };
      return res.status(500).json({
        message: SETUP_ERRORS[err.code]
          || 'Не удалось сохранить согласие. Попробуйте позже или сообщите в федерацию.',
      });
    } finally {
      tfhClient.release();
    }

    // Предыдущий файл (просроченное согласие или скан, загруженный руководителем) удаляем
    // уже после успешной записи — иначе при сбое в БД заявка осталась бы вообще без
    // документа. Трогаем только то, что лежит по «нашему» имени для этой же заявки.
    const previousKey = (roster.consent_url || '').replace(/^\//, '');
    // Согласие общее на сезон, так что прежний файл мог быть загружен под другой заявкой
    // игрока: своим считаем любой файл согласия этого человека. Плюс старый формат ключа,
    // от строки ростера, — под ним лежат согласия, подписанные до переезда документов.
    const isOwnPreviousKey = new RegExp(`^uploads/tournament_person_\\d+_${roster.player_id}_consent`).test(previousKey)
      || /^uploads\/tournament_rosters_\d+_consent/.test(previousKey);
    if (previousKey && previousKey !== s3Key && isOwnPreviousKey) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: SHARED_S3_BUCKET, Key: previousKey }))
        .catch((err) => console.error('Не удалось удалить прежний файл согласия:', err.message));
    }

    // Ссылку на файл отдаём только тому, кто прямо сейчас его и заполнил, — чтобы человек
    // мог сохранить себе копию подписанного документа. На странице команды и в любом
    // другом ответе сайта ссылок на согласия нет: это персональные данные.
    res.json({ success: true, expiresAt: roster.season_end_date, documentCode, fileUrl: `/${s3Key}` });
  } catch (err) {
    console.error('Ошибка подписания согласия:', err);
    // Файл уже улетел в S3, а дальше что-то упало — убираем за собой, чтобы в бакете
    // не оставался никому не нужный документ с паспортными данными, на который при этом
    // ниоткуда нет ссылки.
    if (uploadedKey) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: SHARED_S3_BUCKET, Key: uploadedKey }))
        .catch(() => {});
    }
    res.status(500).json({ message: 'Не удалось сохранить согласие. Попробуйте позже' });
  }
};
