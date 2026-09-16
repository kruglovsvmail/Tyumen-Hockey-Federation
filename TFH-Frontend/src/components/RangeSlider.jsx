import './RangeSlider.css';

// Бегунок вместо числового поля — для настроек, которые подбирают на глаз, а не
// вводят точно (сколько матчей в блоке, размер логотипа). Заполненная часть дорожки
// считается здесь и уходит в CSS переменной --fill: у WebKit нет аналога
// ::-moz-range-progress, и слева от ползунка иначе нечем красить.
export default function RangeSlider({ min, max, step = 1, value, onChange, className = '', ...rest }) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <input
      type="range"
      className={`range-slider ${className}`.trim()}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ '--fill': `${fill}%` }}
      {...rest}
    />
  );
}
