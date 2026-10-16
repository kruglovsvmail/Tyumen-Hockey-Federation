import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatBirthDate } from '../utils/formatDate.js';
import './DocumentBadge.css';

// Значки с подсказкой по нажатию и значок документа допуска. Общие для состава на
// странице команды (TeamDetailPage) и окна «Резервные вратари» дивизиона: документ
// выглядит и объясняется одинаково, где бы человек его ни увидел.

// Сегодняшняя дата в том же формате, в каком приходят сроки документов ('YYYY-MM-DD').
// Собираем из локальных компонентов, а не через toISOString() — тот отдаёт UTC и в наших
// часовых поясах до утра показывал бы вчерашний день.
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isDocumentValid = (doc) => {
  if (!doc.present) return false;
  // Просроченный документ допуска не даёт — показываем его так же, как отсутствующий,
  // а точную дату человек увидит в подсказке.
  if (!doc.expiresAt) return true;
  return doc.expiresAt >= todayIso();
};

export const documentHint = (doc) => {
  if (!doc.present) return 'Нет документа';
  if (!doc.expiresAt) return 'Есть, срок не указан';
  return isDocumentValid(doc)
    ? `Действует до ${formatBirthDate(doc.expiresAt)}`
    : `Срок истёк ${formatBirthDate(doc.expiresAt)}`;
};

// Бейдж с подсказкой по клику (а не по наведению — на телефоне hover недоступен).
// Подсказка уходит порталом в body: таблица состава прокручивается по горизонтали
// (overflow на обёртке), и внутри неё всплывающий блок был бы обрезан.
const TIP_HALF_WIDTH = 160;

export function TipBadge({ className, tipTitle, tipText, tipAction, children }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    // Клик по своей же кнопке пропускаем — её обработчик сам закроет подсказку
    // (иначе повторный клик успевал бы закрыть и тут же открыть её заново).
    // Клик внутри самой подсказки — тоже: у неё бывает своя кнопка (например,
    // «Заполнить» у согласия), и подсказка не должна исчезать раньше, чем та сработает.
    const closeIfOutside = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (tipRef.current?.contains(e.target)) return;
      setPos(null);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPos(null);
    };
    document.addEventListener('pointerdown', closeIfOutside);
    window.addEventListener('keydown', onKeyDown);
    // true — ловим прокрутку и внутренних контейнеров (обёртка таблицы), а не только окна
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return setPos(null);
    const rect = btnRef.current.getBoundingClientRect();
    // Описание квалификации бывает в несколько абзацев, поэтому подсказку, которой не
    // хватает места сверху, разворачиваем вниз, а по горизонтали прижимаем к краю экрана.
    const minLeft = TIP_HALF_WIDTH + 12;
    const maxLeft = window.innerWidth - TIP_HALF_WIDTH - 12;
    const center = rect.left + rect.width / 2;
    setPos({
      top: rect.top < 300 ? rect.bottom : rect.top,
      left: maxLeft > minLeft ? Math.min(Math.max(center, minLeft), maxLeft) : center,
      below: rect.top < 300,
    });
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        onClick={toggle}
        aria-label={`${tipTitle}: ${tipText}`}
      >
        {children}
      </button>
      {pos &&
        createPortal(
          <span
            ref={tipRef}
            className={`team-roster__tip${pos.below ? ' team-roster__tip--below' : ''}`
              + (tipAction ? ' team-roster__tip--interactive' : '')}
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
          >
            <b>{tipTitle}</b>
            {tipText}
            {tipAction}
          </span>,
          document.body
        )}
    </>
  );
}

// Значок документа допуска: зелёный — есть и действует, серый — нет или просрочен.
// По нажатию — подсказка со сроком; action — своя кнопка в подсказке («Заполнить»
// у согласия, которое человек подписывает сам).
export function DocumentBadge({ doc, label, action = null }) {
  return (
    <TipBadge
      className={`team-roster__doc-btn team-roster__doc-btn--${isDocumentValid(doc) ? 'ok' : 'missing'}`}
      tipTitle={label}
      tipText={documentHint(doc)}
      tipAction={action}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 2.5h7l5 5v14a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 21.5v-17A1.5 1.5 0 0 1 6 2.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M13 2.5v5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.5 12.5h7M8.5 16.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </TipBadge>
  );
}
