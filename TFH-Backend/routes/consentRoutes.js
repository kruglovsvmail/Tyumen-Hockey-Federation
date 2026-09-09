import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getBlankConsent, getConsentState, signConsent } from '../controllers/ConsentController.js';
import { getClientIp } from '../utils/clientIp.js';

const router = Router();

// Форма подписания открыта всем: учётных записей игроков на сайте нет, а страница
// команды публичная. Поэтому ограничение частоты — единственное, что мешает залить
// в заявки лиги пачку выдуманных согласий или завалить сервер генерацией PDF.
//
// Потолок выбран с большим запасом в сторону живых людей: игроки одной команды вполне
// могут подписываться с раздевалки через один Wi-Fi, а мобильные операторы прячут за
// одним адресом тысячи абонентов. 15 в час одного человека не заденет, но превращает
// массовую заливку в заметно долгое занятие.
//
// Ключ считаем из X-Forwarded-For сами (см. utils/clientIp.js), поэтому встроенную
// проверку заголовка у библиотеки отключаем — иначе она ругается на отсутствие
// app.set('trust proxy'), который мы сознательно не включаем.
const signLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(getClientIp(req) || 'unknown'),
  validate: { xForwardedForHeader: false },
  message: { message: 'Слишком много попыток подписания с этого адреса. Попробуйте позже' },
});

// Адресуемся человеком в заявке, а не строкой состава: представитель команды подписывает
// то же согласие, а строки в составе у него может не быть вовсе.
// Пустой бланк объявлен раньше шаблонов — иначе его перехватил бы '/:appId'.
router.get('/blank.pdf', getBlankConsent);
router.get('/:appId/:userId', getConsentState);
router.post('/:appId/:userId', signLimiter, signConsent);

export default router;
