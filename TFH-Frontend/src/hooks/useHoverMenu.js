import { useCallback, useRef, useState } from 'react';

// Задержка перед закрытием — чтобы можно было довести курсор от пункта до выпадающей панели.
const CLOSE_DELAY = 150;

// Общее состояние "какое выпадающее меню сейчас открыто" для группы триггеров (например,
// всех пунктов шапки). Раньше каждый DropdownMenu держал открытость сам в себе — из-за этого
// при быстром переходе от одного пункта к другому старое меню ещё не успевало закрыться
// по своему таймеру, и оба выпадали одновременно, наезжая друг на друга. Здесь же переход
// на новый пункт мгновенно закрывает предыдущий (один openKey на всю группу).
export function useHoverMenu() {
  const [openKey, setOpenKey] = useState(null);
  const closeTimer = useRef(null);

  const handleEnter = useCallback((key) => {
    clearTimeout(closeTimer.current);
    setOpenKey(key);
  }, []);

  const handleLeave = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), CLOSE_DELAY);
  }, []);

  return { openKey, handleEnter, handleLeave };
}
