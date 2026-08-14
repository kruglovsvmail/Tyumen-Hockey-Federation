import { Component, Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.jsx';
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
  home: { azimuthDeg: 33, scale: 2.5, elevationDeg: 70, heightOffset: 2.5, offsetX: -1.3 },
  'fed-organizatsiya': { azimuthDeg: 10, scale: 2, elevationDeg: 64, heightOffset: 2.5 },
  'fed-rukovodstvo': { azimuthDeg: -30, scale: 2.7, elevationDeg: 74, heightOffset: 2.5 },
  'fed-kontakty': { azimuthDeg: -26, scale: 4, elevationDeg: 64, heightOffset: 1.5, offsetX: -3.3 },
  'champ-master': { azimuthDeg: -40, scale: 3.7, elevationDeg: 30, heightOffset: 1, offsetX: 7 },
  'champ-lubitel': { azimuthDeg: 40, scale: 3.6, elevationDeg: 40, heightOffset: 2, offsetX: -7 },
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

// Своя модель арены на каждую тему: светлая сцена на тёмной странице светит как
// лампа, поэтому в тёмной теме грузится отдельный тёмный экспорт.
const ARENA_LIGHT = '/models/arena.glb';
const ARENA_DARK = '/models/arena-dark.glb';

// Цвет фона канваса. Им же красим туман — только при точном совпадении дальний край
// модели растворяется в фоне, а не обрывается видимой границей. Поэтому значение одно
// на два места: разъедутся — граница вернётся.
const SCENE_BG = { light: '#e8eff2', dark: '#0b141d' };

// Туман, чтобы жёсткий silhouette-край льда не упирался в фон. Ориентиры по геометрии:
// арена в мировых координатах — 40 x 20 единиц (X x Z), камера в зависимости от раздела
// стоит в 6.5–15 единицах от центра, так что ближняя кромка льда оказывается в 8–14
// единицах от камеры, а дальние края — в 30–41. Отсюда диапазон: до FOG_NEAR всё чётко,
// к FOG_FAR — полностью залито цветом фона. Меньше FOG_FAR — граница мягче, но лёд
// заметнее выцветает к дальнему борту.
const FOG_NEAR = 10;
const FOG_FAR = 45;

function Arena({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

/**
 * Пока тёмного экспорта нет в public/models, useGLTF на нём падает — и вместе с
 * ним падал бы весь канвас, то есть фон сайта целиком. Здесь ловим и сообщаем
 * наверх: модель тогда не рисуем, канвас остаётся прозрачным и виден градиент
 * (см. Background.css). Светлую арену на тёмной теме не подставляем — она светит
 * как лампа.
 *
 * Класс, а не хук: перехват ошибок рендера в React есть только у классов.
 */
class ArenaBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onMissing?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
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

export default function Background3D({ zone = 'home' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const sceneBg = SCENE_BG[theme];
  const arenaUrl = isDark ? ARENA_DARK : ARENA_LIGHT;

  // Тёмной модели ещё может не быть в public/models. Сбрасывать флаг при возврате
  // к светлой теме незачем: он проверяется только вместе с isDark, а повторная
  // попытка загрузки всё равно упёрлась бы в закэшированную ошибку.
  const [darkArenaMissing, setDarkArenaMissing] = useState(false);
  const hasArena = !(isDark && darkArenaMissing);

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
    <div
      className={`ice-scene${hasArena ? '' : ' ice-scene--flat'}`}
      style={DEBUG_CAMERA ? { zIndex: 9999 } : undefined}
    >
      {/* Канвас живёт всё время работы сайта и по темам не пересоздаётся. Снимать
          его при отсутствии модели нельзя: вместе с ним уходит WebGL-контекст, а
          разобранная модель остаётся в кэше useGLTF — при обратном монтировании
          в новый контекст она уже не встаёт, и фон не появляется вовсе.
          Поэтому alpha: true — без модели канвас просто прозрачен, и сквозь него
          виден градиент из CSS. */}
      <Canvas dpr={dpr} camera={initialCameraRef.current} gl={{ antialias: true, alpha: true }}>
        {/* Заливка и туман — только вместе с моделью: иначе они закрасили бы градиент */}
        {hasArena && <color attach="background" args={[sceneBg]} />}
        {hasArena && <fog attach="fog" args={[sceneBg, FOG_NEAR, FOG_FAR]} />}
        <ambientLight intensity={1.0} />
        <directionalLight position={[6, 10, 6]} intensity={2.4} />
        <directionalLight position={[-6, 4, -4]} intensity={1} />
        <Suspense fallback={null}>
          {/* key — чтобы при смене темы граница ошибок сбрасывалась и заново
              пробовала загрузить модель нужной темы */}
          <ArenaBoundary key={arenaUrl} onMissing={() => setDarkArenaMissing(true)}>
            <Arena url={arenaUrl} />
          </ArenaBoundary>
          {/* Environment даёт PBR-материалам (металл рамы ворот и т.п.) реалистичные
              отражения/заполняющий свет — без неё они выглядят плоскими и тёмными
              даже при ярких directional-источниках. */}
          <Environment preset="city" />
        </Suspense>
        {DEBUG_CAMERA ? <DebugLogger zone={zone} /> : <CameraRig zone={zone} />}
      </Canvas>
      <div className="ice-scene__vignette" />
    </div>
  );
}

// Предзагружаем только светлую: тёмная нужна меньшинству, а запрос за
// несуществующим файлом сыпал бы ошибками в консоль, пока модель не добавили
useGLTF.preload(ARENA_LIGHT);
