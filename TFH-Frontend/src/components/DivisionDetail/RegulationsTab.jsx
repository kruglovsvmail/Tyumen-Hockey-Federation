import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Именно min-сборка воркера: он подключается как готовый файл-ассет и Vite его
// не минифицирует — неминифицированный тянет 2.2 МБ против 1.2 МБ
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { apiGet, apiDelete } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import Loader from '../Loader.jsx';
import PlaceholderSection from '../PlaceholderSection.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import RegulationFormModal from './RegulationFormModal.jsx';
import './RegulationsTab.css';

/**
 * Вкладка «Положения»: сетка документов дивизиона, по клику — просмотрщик PDF.
 *
 * Документы заводит админ сайта (название + PDF), а не администратор лиги в LMS:
 * положений у дивизиона бывает несколько, и что именно публиковать — решает
 * федерация. Показываем PDF как есть, страницами, а не вытащенным текстом:
 * положение — утверждённый документ, и любая пересборка его в HTML означала бы
 * догадки о структуре и риск потерять или исказить пункт. Плюс титульные листы
 * бывают сканами, из которых текста не достать вовсе.
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

// Лист занимает не всю ширину области просмотра, а её часть: читать документ
// во весь экран неудобно, а освободившееся место уходит колонке с превью,
// и страницы в ней видно, а не только угадываются.
const DOC_SCALE = 0.7;

const THUMB_WIDTH = 156;

// На узком экране колонка превью разворачивается в ленту над документом (см. CSS),
// и там нужны и превью помельче, и лист во всю ширину — иначе текст нечитаем.
const NARROW_QUERY = '(max-width: 860px)';
const THUMB_WIDTH_NARROW = 104;

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

/**
 * Блок положения в сетке — та же плашка с названием, что у протоколов СДК:
 * иконка формата ничего не добавляет, здесь и так только PDF.
 *
 * Карточка — div с role="link", а не button: кнопки админа лежат внутри неё,
 * а вкладывать button в button нельзя.
 */
function RegulationCard({ regulation, editable, onOpen, onEdit, onDelete }) {
  const withStop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div
      className={`regulation-card${editable ? ' regulation-card--editable' : ''}`}
      onClick={onOpen}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      {editable && (
        <div className="regulation-card__actions">
          <button
            type="button"
            className="regulation-card__action"
            onClick={withStop(onEdit)}
            aria-label="Редактировать"
          >
            ✎
          </button>
          <button
            type="button"
            className="regulation-card__action regulation-card__action--danger"
            onClick={withStop(onDelete)}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      <span className="regulation-card__title">{regulation.title}</span>
    </div>
  );
}

/** Открытый документ: слева список страниц, справа сам PDF. */
function RegulationViewer({ regulation, onBack }) {
  const [doc, setDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);

  const viewportRef = useRef(null);
  const pageRefs = useRef({});

  const fileUrl = regulation.fileUrl;

  useEffect(() => {
    if (!fileUrl) return undefined;

    let cancelled = false;
    setError(null);
    setDoc(null);

    // S3 отдаёт Accept-Ranges, поэтому pdf.js тянет документ по частям и первый
    // лист показывается, не дожидаясь всего файла
    const task = pdfjsLib.getDocument({ url: fileUrl });
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
  }, [fileUrl]);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const apply = () => setIsNarrow(mq.matches);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const measure = () => setViewportWidth(Math.max(0, el.clientWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [doc]);

  const handlePageVisible = useCallback((page) => setCurrentPage(page), []);

  const goToPage = (page) => {
    pageRefs.current[page]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const thumbWidth = isNarrow ? THUMB_WIDTH_NARROW : THUMB_WIDTH;
  const pageWidth = Math.round(viewportWidth * (isNarrow ? 1 : DOC_SCALE));
  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="regulations-viewer content-in">
      {/* Панель рисуется всегда, в том числе поверх ошибки и загрузки: иначе из
          не открывшегося документа было бы некуда вернуться */}
      <div className="regulations__bar">
        <button type="button" className="regulations__back" onClick={onBack}>
          ‹ Все положения
        </button>
        <a className="regulations__download" href={fileUrl} target="_blank" rel="noreferrer">
          Скачать PDF
        </a>
      </div>

      {error && (
        <PlaceholderSection>
          Не удалось открыть документ: {error}.{' '}
          <a href={fileUrl} target="_blank" rel="noreferrer">Скачать файл</a>
        </PlaceholderSection>
      )}

      {!error && !doc && <Loader />}

      {!error && doc && (
        <div className="regulations">
          <aside className="regulations__pages" aria-label="Страницы документа">
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                className={`regulations__thumb${page === currentPage ? ' is-active' : ''}`}
                onClick={() => goToPage(page)}
              >
                <PdfPage doc={doc} pageNumber={page} width={thumbWidth} isThumb />
                <span className="regulations__thumb-num">{page}</span>
              </button>
            ))}
          </aside>

          <div className="regulations__main">
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
      )}
    </div>
  );
}

export default function RegulationsTab({ divisionId }) {
  const { isAdmin, token } = useAdmin();

  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openedId, setOpenedId] = useState(null);      // какой документ открыт в просмотрщике
  const [editing, setEditing] = useState(null);        // null — закрыто, {} — создание, {...} — редактирование
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setOpenedId(null);
    apiGet(`/api/regulations?divisionId=${divisionId}`)
      .then((data) => setRegulations(data.regulations))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId]);

  const handleSaved = (saved) => {
    setRegulations((prev) => {
      const exists = prev.some((r) => r.id === saved.id);
      return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved];
    });
    setEditing(null);
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/regulations/${deleting.id}`, token);
      setRegulations((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  if (error) {
    return <PlaceholderSection>Не удалось загрузить положения: {error}</PlaceholderSection>;
  }

  if (loading) return <Loader />;

  const opened = regulations.find((r) => r.id === openedId);
  if (opened) {
    return <RegulationViewer regulation={opened} onBack={() => setOpenedId(null)} />;
  }

  return (
    <>
      {regulations.length === 0 && !isAdmin && (
        <PlaceholderSection>Положения для этого дивизиона пока не опубликованы.</PlaceholderSection>
      )}

      {(regulations.length > 0 || isAdmin) && (
        <div className="regulations-grid content-in">
          {regulations.map((regulation) => (
            <RegulationCard
              key={regulation.id}
              regulation={regulation}
              editable={isAdmin}
              onOpen={() => setOpenedId(regulation.id)}
              onEdit={() => setEditing(regulation)}
              onDelete={() => setDeleting(regulation)}
            />
          ))}
          {isAdmin && (
            <button type="button" className="regulations-add-card" onClick={() => setEditing({})}>
              + ДОБАВИТЬ
            </button>
          )}
        </div>
      )}

      {editing && (
        <RegulationFormModal
          regulation={editing.id ? editing : null}
          divisionId={divisionId}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Удалить положение?"
          message={`«${deleting.title}» будет удалено без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleting(null);
            setDeleteError(null);
          }}
        />
      )}
    </>
  );
}
