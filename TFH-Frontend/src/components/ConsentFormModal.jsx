import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiGet, apiPost } from '../api/client.js';
import { getImageUrl } from '../utils/getImageUrl.js';
import { formatBirthDate } from '../utils/formatDate.js';
import Loader from './Loader.jsx';
import './Modal.css';
import './ConsentFormModal.css';

// Форма согласия на обработку персональных данных. Открывается с публичной страницы
// команды — кнопкой в подсказке к иконке документа, если согласия у игрока нет
// или оно просрочено.
//
// Паспортные данные вводятся один раз, хотя документа в PDF получается два (обработка ПД
// и распространение ПД): бэкенд печатает одни и те же поля в оба бланка.
// Здесь эти данные нигде не сохраняются, кроме отправки на сервер, — ни в localStorage,
// ни в адресной строке.

const API_BASE = import.meta.env.VITE_API_URL;

// Пустой бланк с тем же текстом, что уйдёт в подписанный документ (собирается тем же
// шаблоном на сервере). Нужен, чтобы человек прочитал, что именно подписывает.
// Версия бланка в адресе — чтобы у того, кто успел закэшировать прошлую редакцию,
// браузер скачал документ заново.
const blankFormUrl = (formVersion) =>
  `${API_BASE}/api/consent/blank.pdf${formVersion ? `?v=${encodeURIComponent(formVersion)}` : ''}`;

const EMPTY_FORM = {
  passportSeries: '',
  passportNumber: '',
  passportIssueDate: '',
  passportIssuedBy: '',
  registrationAddress: '',
  phone: '',
};

// Серия и номер паспорта — только цифры и не длиннее, чем в документе (4 и 6).
// Отрезаем лишнее прямо при вводе, а не ругаемся после отправки: человек сразу видит,
// что больше не помещается.
const onlyDigits = (raw, max) => String(raw).replace(/\D/g, '').slice(0, max);

// Последние 10 цифр номера — то же правило, что на бэкенде: номер набирают и с восьмёркой,
// и с +7, и вообще без кода страны.
const phoneDigits = (raw) => {
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Маска телефона. Номер набирают и с восьмёрки, и с +7 — обе привычки оставляем как есть,
// а в документ бэкенд в любом случае впечатает единый вид «+7 (900) 123-45-67».
// Считаем только цифры и раскладываем их по местам, поэтому маска не мешает ни вставке
// номера из буфера, ни стиранию с конца.
const maskPhone = (raw) => {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  // Первая цифра — код страны: 8 сохраняем в том виде, как человек её ввёл.
  const startsWithEight = digits[0] === '8';
  const body = (startsWithEight || digits[0] === '7' ? digits.slice(1) : digits).slice(0, 10);

  let out = startsWithEight ? '8' : '+7';
  if (body.length >= 1) out += ` (${body.slice(0, 3)}`;
  if (body.length >= 4) out += `) ${body.slice(3, 6)}`;
  if (body.length >= 7) out += `-${body.slice(6, 8)}`;
  if (body.length >= 9) out += `-${body.slice(8, 10)}`;
  return out;
};

// Всё ли заполнено для отправки. Повторяет серверную проверку (validateForm
// в ConsentController), но нужна отдельно: браузерная валидация required срабатывает
// только при отправке, а кнопка «Согласен» должна быть неактивна с самого начала.
const isFormComplete = (form, agreed) => agreed
  && form.passportSeries.length > 0
  && form.passportNumber.length > 0
  && form.passportIssueDate !== ''
  && form.passportIssuedBy.trim().length >= 5
  && form.registrationAddress.trim().length >= 5
  && phoneDigits(form.phone).length === 10;

export default function ConsentFormModal({ rosterId, onClose, onSigned }) {
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiGet(`/api/consent/${rosterId}`)
      .then((data) => { if (!cancelled) setState(data); })
      .catch(() => { if (!cancelled) setLoadError('Не удалось загрузить форму. Попробуйте позже'); });
    return () => { cancelled = true; };
  }, [rosterId]);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const setField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiPost(`/api/consent/${rosterId}`, { ...form, agreed });
      setSigned(result);
      // Обновляем состав на странице, чтобы иконка документа позеленела сразу,
      // а кнопка «Заполнить» из подсказки исчезла.
      onSigned?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (loadError) return <p className="admin-modal__message">{loadError}</p>;
    if (!state) return <Loader />;

    if (signed) {
      return (
        <div className="consent-modal__done">
          <p className="admin-modal__message">
            Согласие подписано и передано в систему лиги. Код документа:{' '}
            <b>{signed.documentCode}</b>
          </p>
          {/* Срок берётся из даты окончания сезона. Если она в лиге не заполнена,
              согласие сохраняется без срока — и обещать дату тут нечего. */}


          {signed.fileUrl && (
            <a
              className="consent-modal__link"
              href={getImageUrl(signed.fileUrl)}
              target="_blank"
              rel="noreferrer"
            >
              Скачать подписанный документ
            </a>
          )}
          <div className="admin-modal__buttons">
            <button type="button" className="admin-modal__submit" onClick={onClose}>Готово</button>
          </div>
        </div>
      );
    }

    if (!state.canSign) {
      return (
        <>
          <p className="admin-modal__message">{state.reason}</p>
          <div className="admin-modal__buttons">
            <button type="button" className="admin-modal__cancel" onClick={onClose}>Закрыть</button>
          </div>
        </>
      );
    }

    return (
      <form className="admin-modal__form" onSubmit={handleSubmit}>
        <p className="admin-modal__message">
          Согласие подписывается на имя <b>{state.playerName}</b>. Данные из формы попадут в два документа — согласие
          на обработку персональных данных и согласие на их распространение.
        </p>

        <a
          className="consent-modal__link"
          href={blankFormUrl(state.formVersion)}
          target="_blank"
          rel="noreferrer"
        >
          Прочитать текст согласия
        </a>

        <div className="consent-modal__row consent-modal__row--passport">
          <label className="consent-modal__field">
            <span className="consent-modal__label">Серия паспорта</span>
            <input
              className="admin-modal__input"
              value={form.passportSeries}
              onChange={(e) => setForm((p) => ({ ...p, passportSeries: onlyDigits(e.target.value, 4) }))}
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              required
              autoFocus
            />
          </label>
          <label className="consent-modal__field">
            <span className="consent-modal__label">Номер паспорта</span>
            <input
              className="admin-modal__input"
              value={form.passportNumber}
              onChange={(e) => setForm((p) => ({ ...p, passportNumber: onlyDigits(e.target.value, 6) }))}
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              required
            />
          </label>
          <label className="consent-modal__field">
            <span className="consent-modal__label">Дата выдачи</span>
            <input
              className="admin-modal__input"
              type="date"
              value={form.passportIssueDate}
              onChange={setField('passportIssueDate')}
              required
            />
          </label>
        </div>

        <label className="consent-modal__field">
          <span className="consent-modal__label">Кем выдан</span>
          <input
            className="admin-modal__input"
            value={form.passportIssuedBy}
            onChange={setField('passportIssuedBy')}
            maxLength={200}
            autoComplete="off"
            required
          />
        </label>

        <label className="consent-modal__field">
          <span className="consent-modal__label">Адрес регистрации</span>
          <textarea
            className="admin-modal__input consent-modal__textarea"
            value={form.registrationAddress}
            onChange={setField('registrationAddress')}
            maxLength={200}
            rows={2}
            required
          />
        </label>

        <label className="consent-modal__field">
          <span className="consent-modal__label">Контактный номер телефона</span>
          <input
            className="admin-modal__input"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: maskPhone(e.target.value) }))}
            autoComplete="off"
            required
          />
        </label>

        {/* Та самая «галочка вместо подписи» из текста бланка: без неё кнопка неактивна,
            а на сервер уходит флаг agreed, который там тоже проверяется. */}
        <label className="consent-modal__check">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
          />
          <span>
            Нажимая «Согласен», я подтверждаю, что ознакомился и выражаю согласие, которое
            в соответствии с законом считается простой электронной подписью и не требует
            печать и подпись документа
          </span>
        </label>

        {error && <div className="admin-modal__error">{error}</div>}

        <div className="admin-modal__buttons">
          <button type="button" className="admin-modal__cancel" onClick={onClose}>Отмена</button>
          <button
            type="submit"
            className="admin-modal__submit"
            disabled={submitting || !isFormComplete(form, agreed)}
          >
            {submitting ? 'Сохраняем…' : 'Согласен'}
          </button>
        </div>
      </form>
    );
  };

  // Клик по затемнению окно не закрывает: в форме паспортные данные, и промах мимо неё
  // не должен стирать всё введённое. Уйти можно кнопкой «Отмена» или клавишей Escape —
  // оба действия осознанные.
  return createPortal(
    <div className="admin-modal-overlay">
      <div className="admin-modal admin-modal--wide">
        <div className="admin-modal__title font-display">Согласие на обработку персональных данных</div>
        {renderBody()}
      </div>
    </div>,
    document.body
  );
}
