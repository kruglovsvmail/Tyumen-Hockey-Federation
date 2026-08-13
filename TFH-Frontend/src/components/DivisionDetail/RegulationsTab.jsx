import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Именно min-сборка воркера: он подключается как готовый файл-ассет и Vite его
// не минифицирует — неминифицированный тянет 2.2 МБ против 1.2 МБ
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Loader from '../Loader.jsx';
import PlaceholderSection from '../PlaceholderSection.jsx';
import './RegulationsTab.css';

/**
 * Просмотрщик положения дивизиона.
 *
 * Показываем PDF как есть, страницами, а не вытащенным текстом: положение —
 * утверждённый документ, и любая пересборка его в HTML означала бы догадки о
 * структуре и риск потерять или исказить пункт. Плюс титульные листы бывают
 * сканами, из которых текста не достать вовсе.
 *
 * Текстовый слой намеренно не рисуем — страницы только для чтения.
 *
 * Весь модуль подключается динамическим импортом из DivisionDetailPage: pdf.js
 * весит порядка 350 КБ, и в общий бандл сайта ему попадать незачем.
 */

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Запас вокруг экрана, при котором страница уже начинает рисоваться. Без него
// лист появляется пустым ровно в момент, когда до него долистали.
const RENDER_MARGIN = '600px';

const THUMB_WIDTH = 104;

/**
 * Один лист. Рисуется не сразу, а когда подходит к экрану: в положении бывает
 * шесть десятков страниц, и рендер всех разом кладёт телефон.
 */
function PdfPage({ doc, pageNumber, width, isThumb = false, onVisible }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  const taskRef = useRef(null);
  const [size, setSize] = useState(null);   // пропорции листа, чтобы место под него держалось заранее
  const [isNear, setIsNear] = useState(false);

  // Размеры страницы берём до отрисовки: листы в документе бывают разного
  // формата (титульный лист сканом в Letter, остальные в A4), и одной
  // пропорцией на весь документ обойтись нельзя
  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageNumber).then(
      (page) => {
        if (cancelled) return;
        const v = page.getViewport({ scale: 1 });
        setSize({ width: v.width, height: v.height });
      },
      () => { /* документ закрыли раньше, чем ответил getPage */ }
    );
    return () => { cancelled = true; };
  }, [doc, pageNumber]);

  // Наблюдателя два, и это не дублирование: у них разные зоны срабатывания.
  // Первый с запасом в 600px решает, пора ли рисовать лист. Второй определяет,
  // какая страница «текущая», и смотрит на узкую полосу по центру экрана —
  // считать по доле видимости нельзя, лист бывает выше окна и нужной доли
  // не наберёт никогда.
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return undefined;

    const renderObserver = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsNear(true); },
      { rootMargin: RENDER_MARGIN }
    );
    renderObserver.observe(el);

    let currentObserver;
    if (onVisible) {
      currentObserver = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) onVisible(pageNumber); },
        { rootMargin: '-45% 0px -45% 0px' }
      );
      currentObserver.observe(el);
    }

    return () => {
      renderObserver.disconnect();
      currentObserver?.disconnect();
    };
  }, [pageNumber, onVisible]);

  useEffect(() => {
    if (!isNear || !size || !width) return;

    let cancelled = false;
    const scale = width / size.width;
    // На плотных экранах рисуем в 2x, иначе текст мылится. Выше двух не идём:
    // память под канвас растёт квадратично, а разницы на глаз уже нет.
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    doc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale: scale * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      taskRef.current?.cancel();
      taskRef.current = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      taskRef.current.promise.catch(() => { /* отменённый рендер — это норма */ });
    });

    return () => {
      cancelled = true;
      taskRef.current?.cancel();
    };
  }, [doc, pageNumber, width, isNear, size]);

  const ratio = size ? size.height / size.width : 1.414;

  return (
    <div
      ref={holderRef}
      className={isThumb ? 'regulations__thumb-canvas-wrap' : 'regulations__page'}
      style={{ width, height: Math.round(width * ratio) }}
    >
      <canvas ref={canvasRef} className="regulations__canvas" />
    </div>
  );
}

export default function RegulationsTab({ regulationsUrl }) {
  const [doc, setDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [pageWidth, setPageWidth] = useState(0);

  const viewportRef = useRef(null);
  const pageRefs = useRef({});

  useEffect(() => {
    if (!regulationsUrl) return undefined;

    let cancelled = false;
    setError(null);
    setDoc(null);

    // S3 отдаёт Accept-Ranges, поэтому pdf.js тянет документ по частям и первый
    // лист показывается, не дожидаясь всего файла
    const task = pdfjsLib.getDocument({ url: regulationsUrl });
    task.promise.then(
      (loaded) => {
        if (cancelled) { loaded.destroy(); return; }
        setDoc(loaded);
        setNumPages(loaded.numPages);
        setCurrentPage(1);
      },
      (err) => { if (!cancelled) setError(err?.message || 'Не удалось открыть файл'); }
    );

    return () => { cancelled = true; task.destroy(); };
  }, [regulationsUrl]);

  // Ширина листа = ширина области просмотра: вписанный по высоте A4 на телефоне
  // нечитаем. По горизонтали документ не скроллится, увеличение — жестом.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const measure = () => setPageWidth(Math.max(0, el.clientWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [doc]);

  const handlePageVisible = useCallback((page) => setCurrentPage(page), []);

  const goToPage = (page) => {
    pageRefs.current[page]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!regulationsUrl) {
    return <PlaceholderSection>Положение для этого дивизиона пока не опубликовано.</PlaceholderSection>;
  }

  if (error) {
    return (
      <PlaceholderSection>
        Не удалось открыть положение: {error}.{' '}
        <a href={regulationsUrl} target="_blank" rel="noreferrer">Скачать файл</a>
      </PlaceholderSection>
    );
  }

  if (!doc) return <Loader />;

  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="regulations">
      <aside className="regulations__pages" aria-label="Страницы документа">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`regulations__thumb${page === currentPage ? ' is-active' : ''}`}
            onClick={() => goToPage(page)}
          >
            <PdfPage doc={doc} pageNumber={page} width={THUMB_WIDTH} isThumb />
            <span className="regulations__thumb-num">{page}</span>
          </button>
        ))}
      </aside>

      <div className="regulations__main">
        <div className="regulations__toolbar">
          <span className="regulations__counter">
            Страница {currentPage} из {numPages}
          </span>
          <a className="regulations__download" href={regulationsUrl} target="_blank" rel="noreferrer">
            Скачать PDF
          </a>
        </div>

        <div className="regulations__viewport" ref={viewportRef}>
          {pageWidth > 0 && pages.map((page) => (
            <div key={page} className="regulations__page-anchor" ref={(el) => { pageRefs.current[page] = el; }}>
              <PdfPage
                doc={doc}
                pageNumber={page}
                width={pageWidth}
                onVisible={handlePageVisible}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
