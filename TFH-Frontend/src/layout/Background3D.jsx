import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import './Background.css';

// Камера на каждую секцию сайта — те же орбита/угол/зум, что были в старой CSS-версии
// (ZONE_TRANSFORM: rotateZ — облёт вокруг арены, scale — приближение), только теперь
// это настоящая сферическая позиция камеры Three.js, а не CSS-трансформ плоского рисунка.
// rotateX там был почти одинаковый на всех зонах (57-65°) — это стабильный "взгляд сверху",
// его я свёл в один общий ELEVATION_DEG; а вот rotateZ (облёт) и scale (зум) — то, что
// реально отличало зоны друг от друга, — перенесены как есть.
const ELEVATION_DEG = 58;
const BASE_RADIUS = 24;
// { azimuthDeg: старый rotateZ, scale: старый scale, elevationDeg?: свой угол наклона зоны,
//   heightOffset?: сдвиг камеры (и точки, куда она смотрит) по Y — вверх/вниз, не меняя угол,
//   offsetX?: сдвиг камеры (и точки, куда она смотрит) по X — влево/вправо, не меняя угол }
const ZONE_ORBIT = {
  home: { azimuthDeg: 0, scale: 1.7, elevationDeg: 24, heightOffset: 2.5, offsetX: 0 },
  'fed-organizatsiya': { azimuthDeg: 36, scale: 2.7, elevationDeg: 64, heightOffset: 2.5 },
  'fed-rukovodstvo': { azimuthDeg: -20, scale: 2.7, elevationDeg: 44, heightOffset: 2.5 },
  'fed-kontakty': { azimuthDeg: -66, scale: 2.7, elevationDeg: 24, heightOffset: 2.5 },
  'champ-master': { azimuthDeg: -40, scale: 3.7, elevationDeg: 30, heightOffset: 1, offsetX: 7 },
  'champ-lubitel': { azimuthDeg: 0, scale: 1.6, elevationDeg: 20, heightOffset: 2, offsetX: -7 },
  'champ-vip': { azimuthDeg: -44, scale: 1.7, elevationDeg: 24, heightOffset: 2.5 },
  'media-foto': { azimuthDeg: -60, scale: 2.6, elevationDeg: 20, heightOffset: 2, offsetX: -7 },
  'media-video': { azimuthDeg: -60, scale: 2.6, elevationDeg: 40, heightOffset: 2, offsetX: 0 },
  'media-translyacii': { azimuthDeg: -30, scale: 3.6, elevationDeg: 30, heightOffset: 2, offsetX: 2 },
  partners: { azimuthDeg: -10, scale: 3.6, elevationDeg: 20, heightOffset: 2, offsetX: 0 },
};

function sphericalToCamera({ azimuthDeg, scale, elevationDeg = ELEVATION_DEG, heightOffset = 0, offsetX = 0 }) {
  const elevation = (elevationDeg * Math.PI) / 180;
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const radius = BASE_RADIUS / scale;
  const x = radius * Math.cos(elevation) * Math.sin(azimuth) + offsetX;
  const y = radius * Math.sin(elevation) + heightOffset;
  const z = radius * Math.cos(elevation) * Math.cos(azimuth);
  return { position: [x, y, z], target: [offsetX, heightOffset, 0], fov: 45 };
}

const ZONE_CAMERA = Object.fromEntries(
  Object.entries(ZONE_ORBIT).map(([zone, orbit]) => [zone, sphericalToCamera(orbit)])
);

// Ручной подбор ракурса мышкой (OrbitControls + лог в консоль) — включается по необходимости.
const DEBUG_CAMERA = false;

function Arena() {
  const { scene } = useGLTF('/models/arena.glb');
  return <primitive object={scene} />;
}

function CameraRig({ zone }) {
  const preset = ZONE_CAMERA[zone] || ZONE_CAMERA.home;
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  // Точка, куда СЕЙЧАС смотрит камера — своя плавная переменная, а не мгновенный
  // прыжок на target новой зоны. Стартует с первого target, чтобы на самом первом
  // кадре не ехать откуда-то из нуля координат.
  const currentTarget = useRef(null);

  useFrame(({ camera }) => {
    if (DEBUG_CAMERA) return; // при подборе ракурса не мешаем ручному управлению
    posVec.set(...preset.position);
    targetVec.set(...preset.target);
    if (!currentTarget.current) {
      currentTarget.current = targetVec.clone();
    }
    camera.position.lerp(posVec, 0.04);
    currentTarget.current.lerp(targetVec, 0.04);
    camera.lookAt(currentTarget.current);
    if (Math.abs(camera.fov - preset.fov) > 0.01) {
      camera.fov += (preset.fov - camera.fov) * 0.04;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function DebugLogger({ zone }) {
  const controlsRef = useRef(null);
  return (
    <OrbitControls
      ref={controlsRef}
      onEnd={() => {
        const controls = controlsRef.current;
        if (!controls) return;
        const p = controls.object.position;
        const t = controls.target;
        // eslint-disable-next-line no-console
        console.log(
          `[${zone}] position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}], ` +
            `target: [${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}], fov: ${controls.object.fov.toFixed(0)}`
        );
      }}
    />
  );
}

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

export default function Background3D({ zone = 'home' }) {
  const flakes = useMemo(() => makeSnowflakes(22), []);
  const [dpr, setDpr] = useState(1.5);
  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, 2));
  }, []);

  // Стартовая камера — считаем только один раз при монтировании (тот же объект на
  // всех рендерах). Если пересоздавать этот объект каждый рендер, R3F иногда заново
  // применяет его к камере и дёргает её обратно, перебивая плавную анимацию CameraRig.
  // Дальше положением камеры управляет только CameraRig/DebugLogger, а не этот проп.
  const initialCameraRef = useRef(null);
  if (!initialCameraRef.current) {
    const initial = ZONE_CAMERA[zone] || ZONE_CAMERA.home;
    initialCameraRef.current = { position: initial.position, fov: initial.fov };
  }

  return (
    <>
      <div className="ice-scene" style={DEBUG_CAMERA ? { zIndex: 9999 } : undefined}>
        <Canvas
          dpr={dpr}
          camera={initialCameraRef.current}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#d9e7f3']} />
          <ambientLight intensity={1.0} />
          <directionalLight position={[6, 10, 6]} intensity={2.4} />
          <directionalLight position={[-6, 4, -4]} intensity={1} />
          <Suspense fallback={null}>
            <Arena />
            {/* Environment даёт PBR-материалам (металл рамы ворот и т.п.) реалистичные
                отражения/заполняющий свет — без неё они выглядят плоскими и тёмными
                даже при ярких directional-источниках. */}
            <Environment preset="city" />
          </Suspense>
          {DEBUG_CAMERA ? <DebugLogger zone={zone} /> : <CameraRig zone={zone} />}
        </Canvas>
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

useGLTF.preload('/models/arena.glb');
