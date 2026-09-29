import { useEffect, useRef, useState } from 'react';

// Обычно сравниваем высоту текста с высотой видимой части. Если задан maxLines,
// сравниваем полную высоту с этим числом строк: видимый блок может показывать меньше
// строк, чтобы освободить последнюю строку для кнопки.
export function useClampOverflow(content, expanded, maxLines) {
  const ref = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || (expanded && !maxLines)) return;

    const checkTruncation = () => {
      const limit = maxLines
        ? parseFloat(window.getComputedStyle(el).lineHeight) * maxLines
        : el.clientHeight;
      setIsTruncated(el.scrollHeight > limit + 1);
    };
    checkTruncation();

    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [content, expanded, maxLines]);

  return { ref, isTruncated };
}
