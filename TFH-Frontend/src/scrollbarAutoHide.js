// Глобально показывает скроллбар только во время активной прокрутки, скрывает через паузу.
// Ширину полосы это не трогает (см. global.css) — только видимость, поэтому вёрстку не дёргает.
let hideTimer;

const handleScroll = () => {
  document.documentElement.classList.add('is-scrolling');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    document.documentElement.classList.remove('is-scrolling');
  }, 800);
};

window.addEventListener('scroll', handleScroll, { passive: true });
