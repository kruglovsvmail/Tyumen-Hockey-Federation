import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDateEstimate } from '../../utils/formatDate.js';
import '../Modal.css';
import './DateEstimatePicker.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseIso = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (iso, n) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const rangeIso = (fromIso, toIsoStr) => {
  let [a, b] = [fromIso, toIsoStr];
  if (a > b) [a, b] = [b, a];
  const out = [];
  let cur = a;
  while (cur <= b) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
};

// Календарь-сетка с мульти-выбором дат: обычный клик — выбрать только эту дату,
// Ctrl/Cmd+клик — добавить/убрать дату из выбора не сбрасывая остальное, Shift+клик —
// выделить диапазон от последней выбранной даты (anchor) до этой. То же самое доступно
// с клавиатуры: стрелки двигают фокус, Enter/Space — как Ctrl+клик, Shift+Enter/Space —
// как Shift+клик. Рендерится порталом в body — модалка, вне вёрстки страницы.
export default function DateEstimatePicker({ initialDates, onSave, onClose }) {
  const initial = initialDates && initialDates.length > 0 ? [...initialDates].sort() : null;

  const [selected, setSelected] = useState(() => new Set(initial || []));
  const [anchor, setAnchor] = useState(initial ? initial[0] : null);
  const [focused, setFocused] = useState(initial ? initial[0] : toIso(new Date()));
  const [viewMonth, setViewMonth] = useState(() => {
    const base = initial ? parseIso(initial[0]) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cellRefs = useRef(new Map());

  useEffect(() => {
    cellRefs.current.get(focused)?.focus();
  }, [focused, viewMonth]);

  const shiftMonth = (delta) => {
    setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  };

  const applyClick = (dateIso, e) => {
    if (e.shiftKey && anchor) {
      setSelected(new Set(rangeIso(anchor, dateIso)));
    } else if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(dateIso)) next.delete(dateIso);
        else next.add(dateIso);
        return next;
      });
      setAnchor(dateIso);
    } else {
      setSelected(new Set([dateIso]));
      setAnchor(dateIso);
    }
    setFocused(dateIso);
    const d = parseIso(dateIso);
    if (d.getMonth() !== viewMonth.getMonth() || d.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const moveFocus = (deltaDays) => {
    const next = addDays(focused, deltaDays);
    setFocused(next);
    const d = parseIso(next);
    if (d.getMonth() !== viewMonth.getMonth() || d.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleKeyDown = (e, dateIso) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(-7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(7);
        break;
      case 'PageUp':
        e.preventDefault();
        shiftMonth(-1);
        break;
      case 'PageDown':
        e.preventDefault();
        shiftMonth(1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (e.shiftKey && anchor) {
          setSelected(new Set(rangeIso(anchor, dateIso)));
        } else {
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(dateIso)) next.delete(dateIso);
            else next.add(dateIso);
            return next;
          });
          setAnchor(dateIso);
        }
        break;
      default:
        break;
    }
  };

  // Сетка всегда ровно 6 недель (42 ячейки) вне зависимости от месяца — иначе у месяцев
  // с 4 неделями модалка была бы ниже, чем у месяцев с 6, и высота "прыгала" бы при пролистывании.
  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    // Понедельник = 0, чтобы неделя начиналась привычно для RU
    const leadBlanks = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < leadBlanks; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(toIso(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)));
    }
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [viewMonth]);

  const todayIso = toIso(new Date());
  const sortedSelected = [...selected].sort();

  const handleSave = async () => {
    if (sortedSelected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(sortedSelected);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal date-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">Прикидочная дата матча</div>
        <p className="date-picker__hint">
          Клик — выбрать дату. Ctrl/Cmd+клик — добавить ещё одну. Shift+клик — выделить диапазон.
          То же самое — стрелками и Enter/Space с клавиатуры.
        </p>

        <div className="date-picker__month-nav">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">‹</button>
          <span>{MONTHS_FULL[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">›</button>
        </div>

        <div className="date-picker__weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="date-picker__grid">
          {grid.map((dateIso, idx) =>
            dateIso ? (
              <button
                key={dateIso}
                type="button"
                ref={(el) => {
                  if (el) cellRefs.current.set(dateIso, el);
                  else cellRefs.current.delete(dateIso);
                }}
                tabIndex={dateIso === focused ? 0 : -1}
                className={[
                  'date-picker__cell',
                  selected.has(dateIso) ? 'is-selected' : '',
                  dateIso === todayIso ? 'is-today' : '',
                ].join(' ').trim()}
                onClick={(e) => applyClick(dateIso, e)}
                onKeyDown={(e) => handleKeyDown(e, dateIso)}
              >
                {parseIso(dateIso).getDate()}
              </button>
            ) : (
              <span key={`blank-${idx}`} className="date-picker__cell date-picker__cell--blank" />
            )
          )}
        </div>

        <div className="date-picker__preview">
          {sortedSelected.length > 0 ? (
            <>Выбрано: <strong>{formatDateEstimate(sortedSelected)}</strong></>
          ) : (
            'Даты не выбраны'
          )}
        </div>

        {error && <div className="admin-modal__error">{error}</div>}

        <div className="admin-modal__buttons">
          {sortedSelected.length > 0 && (
            <button type="button" className="admin-modal__cancel" onClick={() => setSelected(new Set())}>
              Очистить
            </button>
          )}
          <button type="button" className="admin-modal__cancel" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="admin-modal__submit"
            disabled={sortedSelected.length === 0 || saving}
            onClick={handleSave}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
