import { useEffect, useState, useCallback } from 'react';

// Стрелки "вверх/вниз" для вертикально скроллящегося блока, высота которого задаётся
// снаружи (например, растянута CSS Grid'ом до высоты соседней колонки — см. StandingsTab).
// Кнопки показываются только когда контент реально не помещается, и листают на "страницу"
// (90% видимой высоты), а не на фиксированный шаг — чтобы подстраиваться под любую высоту.
export function useScrollCarousel(ref, deps = []) {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    update();
    el.addEventListener('scroll', update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, update, ...deps]);

  const scrollByPage = (direction) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ top: direction * el.clientHeight * 0.9, behavior: 'smooth' });
  };

  return { canScrollUp, canScrollDown, scrollUp: () => scrollByPage(-1), scrollDown: () => scrollByPage(1) };
}
