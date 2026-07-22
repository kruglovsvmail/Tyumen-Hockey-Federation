import { useEffect, useRef, useState } from 'react';

// Определяет, обрезался ли текст CSS-клэмпом (line-clamp), сравнивая scrollHeight/clientHeight —
// чтобы показывать кнопку "Развернуть" только когда текст реально не влезает, а не по
// приблизительной оценке длины строки. Используется и в DivisionCard, и в новостях на главной.
export function useClampOverflow(content, expanded) {
  const ref = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Меряем только пока текст свёрнут — в развёрнутом виде scrollHeight === clientHeight,
    // это не даст понять, была ли обрезка вообще.
    if (!el || expanded) return;

    const checkTruncation = () => setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    checkTruncation();

    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [content, expanded]);

  return { ref, isTruncated };
}
