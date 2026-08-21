// Сборка PDF согласия. Рендерим через pdfmake (чистый JS), а не через puppeteer, как
// протоколы в LMS: контейнер ТФХ собран из node:20-slim, Chromium в нём нет, и тянуть
// его сюда ради одного бланка — это +полгигабайта к образу и долгая сборка на нестабильной
// сети Timeweb. Взамен нужен свой шрифт с кириллицей: базовые шрифты PDF (Helvetica и
// компания) кириллицу не содержат, поэтому в репозитории лежит DejaVu Serif
// (assets/fonts, свободная лицензия — см. LICENSE_DEJAVU.txt рядом).

import path from 'path';
import { fileURLToPath } from 'url';
import pdfMake from 'pdfmake';
import { buildConsentDocDefinition } from './consent-tfh.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');

pdfMake.addFonts({
  Serif: {
    normal: path.join(FONTS_DIR, 'DejaVuSerif.ttf'),
    bold: path.join(FONTS_DIR, 'DejaVuSerif-Bold.ttf'),
    italics: path.join(FONTS_DIR, 'DejaVuSerif-Italic.ttf'),
    bolditalics: path.join(FONTS_DIR, 'DejaVuSerif-BoldItalic.ttf'),
  },
});

// Часть содержимого документа приходит из формы на публичной странице, поэтому наглухо
// закрываем pdfmake доступ наружу и к диску: качать по ссылкам он не должен вообще,
// а с диска ему нужны ровно наши шрифты и ничего больше.
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((filePath) => path.resolve(filePath).startsWith(path.resolve(FONTS_DIR)));

export const renderConsentPdf = async (data) => {
  const pdf = pdfMake.createPdf(buildConsentDocDefinition(data));
  return pdf.getBuffer();
};

export { CONSENT_FORM_VERSION } from './consent-tfh.js';
