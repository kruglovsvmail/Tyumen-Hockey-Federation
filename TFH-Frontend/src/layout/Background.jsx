import { useMemo } from 'react';
import './Background.css';

// Целевые трансформы "рига" арены на каждый раздел — камера облетает сцену при смене зоны.
// Значения и структура — из прототипа Claude Design (design_handoff/README.md, "3D Ice Rink Background").
const ZONE_TRANSFORM = {
  home: 'translateY(15vh) rotateX(63deg) rotateZ(0deg) scale(1.05)',
  fed: 'translateY(21vh) rotateX(59deg) rotateZ(36deg) scale(1.34)',
  champ: 'translateY(19vh) rotateX(61deg) rotateZ(-34deg) scale(1.28)',
  media: 'translateY(25vh) rotateX(57deg) rotateZ(116deg) scale(1.18)',
  partners: 'translateY(13vh) rotateX(65deg) rotateZ(-102deg) scale(1.12)',
};

const FACEOFF_SPOTS = [
  { left: '19%', top: '26%' },
  { left: '19%', top: '74%' },
  { left: '81%', top: '26%' },
  { left: '81%', top: '74%' },
];

const CENTER_DOTS = [
  { left: '35.5%', top: '30%' },
  { left: '35.5%', top: '70%' },
  { left: '64.5%', top: '30%' },
  { left: '64.5%', top: '70%' },
];

function makeSnowflakes(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.round(Math.random() * 100),
    size: 3 + Math.round(Math.random() * 4),
    duration: 10 + Math.round(Math.random() * 10),
    delay: -Math.round(Math.random() * 20),
    anim: i % 2 === 0 ? 'fallA' : 'fallB',
  }));
}

export default function Background({ zone = 'home' }) {
  const rigTransform = ZONE_TRANSFORM[zone] || ZONE_TRANSFORM.home;
  const flakes = useMemo(() => makeSnowflakes(22), []);

  return (
    <>
      <div className="ice-scene">
        <div className="ice-scene__perspective">
          <div className="ice-scene__rig" style={{ transform: `translate(-50%, -50%) ${rigTransform}` }}>
            <div className="ice-scene__drift">
              <div className="ice-scene__boards" />
              <div className="ice-scene__ice">
                <div className="ice-scene__line ice-scene__line--red-center" />
                <div className="ice-scene__line ice-scene__line--blue" style={{ left: '33%' }} />
                <div className="ice-scene__line ice-scene__line--blue" style={{ left: '67%' }} />
                <div className="ice-scene__goal-line" style={{ left: '7.5%' }} />
                <div className="ice-scene__goal-line" style={{ right: '7.5%' }} />
                <div className="ice-scene__center-circle" />
                <img src="/image/logo.webp" alt="" className="ice-scene__logo" />
                {FACEOFF_SPOTS.map((pos) => (
                  <div key={`${pos.left}-${pos.top}`} className="ice-scene__faceoff-circle" style={pos}>
                    <div className="ice-scene__dot" />
                  </div>
                ))}
                <div className="ice-scene__net ice-scene__net--left" />
                <div className="ice-scene__net ice-scene__net--right" />
                {CENTER_DOTS.map((pos) => (
                  <div key={`${pos.left}-${pos.top}`} className="ice-scene__dot ice-scene__dot--floating" style={pos} />
                ))}
                <div className="ice-scene__dot ice-scene__dot--center" />
              </div>
            </div>
          </div>
        </div>
        <div className="ice-scene__vignette" />
      </div>
      <div className="ice-scene__snow" aria-hidden="true">
        {flakes.map((f) => (
          <span
            key={f.id}
            className="ice-scene__flake"
            style={{
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              animation: `${f.anim} ${f.duration}s linear ${f.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}
