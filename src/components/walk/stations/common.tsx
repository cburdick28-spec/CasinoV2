"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
  RingGeometry,
  CircleGeometry,
  PlaneGeometry,
  SpriteMaterial,
  Sprite,
  SRGBColorSpace,
  type BufferGeometry,
} from "three";
import { getWalkState } from "../state";
import type { Station } from "../world";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Float32BufferAttribute } from "three";
import { mats } from "./kit";

export const FONT_URL = new URL(
  "./Geist-Regular.ttf",
  import.meta.url,
).toString();

/* ------------------------------ halo sprites ------------------------------ */

let haloTex: CanvasTexture | null = null;
function getHaloTexture() {
  if (!haloTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    if (g) {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(255,255,255,0.45)");
      gr.addColorStop(0.6, "rgba(255,255,255,0.1)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    }
    haloTex = new CanvasTexture(c);
    haloTex.colorSpace = SRGBColorSpace;
  }
  return haloTex;
}

let blobTex: CanvasTexture | null = null;
function getBlobTexture() {
  if (!blobTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    if (g) {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(0,0,0,0.55)");
      gr.addColorStop(0.55, "rgba(0,0,0,0.32)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    }
    blobTex = new CanvasTexture(c);
  }
  return blobTex;
}
let blobMat: MeshBasicMaterial | null = null;
function getBlobMat() {
  if (!blobMat)
    blobMat = new MeshBasicMaterial({
      map: getBlobTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
  return blobMat;
}
const blobGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

const haloMats = new Map<string, SpriteMaterial>();
function haloMat(color: string, opacity: number) {
  const key = color + opacity;
  let m = haloMats.get(key);
  if (!m) {
    m = new SpriteMaterial({
      map: getHaloTexture(),
      color: new Color(color),
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity,
    });
    haloMats.set(key, m);
  }
  return m;
}

/** Soft additive glow blob that always faces the camera. */
export function Halo({
  position,
  size = 1,
  color = "#ffc94a",
  opacity = 0.7,
  spriteRef,
}: {
  position: [number, number, number];
  size?: number;
  color?: string;
  opacity?: number;
  spriteRef?: React.Ref<Sprite>;
}) {
  const mat = useMemo(() => haloMat(color, opacity), [color, opacity]);
  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[size, size, 1]}
      material={mat}
    />
  );
}

/* ------------------------------ small animation helpers ------------------------------ */

/** Spins its children continuously around one axis. */
export function Spin({
  axis = "y",
  speed = 1,
  position,
  rotation,
  children,
}: {
  axis?: "x" | "y" | "z";
  speed?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation[axis] += dt * speed;
  });
  return (
    <group ref={ref} position={position} rotation={rotation}>
      {children}
    </group>
  );
}

/** Gentle bob (and optional sway) for floating signature objects. */
export function Bob({
  amp = 0.05,
  speed = 1.5,
  phase = 0,
  sway = 0,
  position = [0, 0, 0],
  children,
}: {
  amp?: number;
  speed?: number;
  phase?: number;
  sway?: number;
  position?: [number, number, number];
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * speed + phase;
    g.position.y = position[1] + Math.sin(t) * amp;
    g.rotation.z = Math.sin(t * 0.8) * sway;
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

/** Global animation: blinking bulbs and shimmering screens (shared materials, so one update). */
export function StationsClock() {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = Math.floor(t * 2.6) % 2;
    const sA = p === 0 ? 1 : 0.28;
    const sB = p === 1 ? 1 : 0.28;
    mats.a.color.setScalar(sA);
    mats.b.color.setScalar(sB);
    const s = 0.88 + 0.12 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
    mats.scr.color.setScalar(s);
  });
  return null;
}

/* ------------------------------ sign + ring + prompt ------------------------------ */

const rrCache = new Map<string, BufferGeometry>();
function roundedRect(w: number, h: number, r: number) {
  const key = `${w.toFixed(2)}x${h.toFixed(2)}x${r}`;
  let g = rrCache.get(key);
  if (!g) {
    const s = new Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    g = new ShapeGeometry(s, 6);
    rrCache.set(key, g);
  }
  return g;
}

const signMat = new MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.93,
  depthWrite: false,
  toneMapped: false,
});
const signCache = new Map<string, BufferGeometry>();
/** Accent border and dark backing plate baked into one geometry (one draw call). */
function signGeo(w: number, h: number, accent: string) {
  const key = `${w.toFixed(2)}|${h}|${accent}`;
  let g = signCache.get(key);
  if (!g) {
    const parts: BufferGeometry[] = [];
    const mk = (geo: BufferGeometry, color: string, z: number) => {
      const n = geo.toNonIndexed();
      n.translate(0, 0, z);
      const c = new Color(color);
      const arr = new Float32Array(n.getAttribute("position").count * 3);
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = c.r;
        arr[i + 1] = c.g;
        arr[i + 2] = c.b;
      }
      n.setAttribute("color", new Float32BufferAttribute(arr, 3));
      parts.push(n);
    };
    mk(roundedRect(w + 0.14, h + 0.14, 0.2), accent, 0);
    mk(roundedRect(w, h, 0.16), "#1d1226", 0.004);
    g = mergeGeometries(parts, false);
    signCache.set(key, g);
  }
  return g;
}

const GOLD = new Color("#ffcc4d");

export function StationFrame({
  station,
  name,
  signY,
  accent,
  children,
}: {
  station: Station;
  name: string;
  signY: number;
  accent: string;
  children: ReactNode;
}) {
  const slug = station.slug;
  const R = station.interactRadius;

  const dim = useMemo(
    () => new Color(accent).lerp(new Color("#ffffff"), 0.15),
    [accent],
  );
  const ringMat = useRef<MeshBasicMaterial>(null);
  const discMat = useRef<MeshBasicMaterial>(null);
  const ringMesh = useRef<Mesh>(null);
  const mix = useRef(0);

  const innerGeo = useMemo(() => {
    const a = new RingGeometry(R - 0.1, R + 0.1, 72).rotateX(-Math.PI / 2);
    const b = new RingGeometry(R - 0.34, R - 0.28, 72).rotateX(-Math.PI / 2);
    const m = mergeGeometries([a, b], false);
    a.dispose();
    b.dispose();
    return m;
  }, [R]);
  const discGeo = useMemo(
    () => new CircleGeometry(R, 56).rotateX(-Math.PI / 2),
    [R],
  );
  useEffect(
    () => () => {
      innerGeo.dispose();
      discGeo.dispose();
    },
    [innerGeo, discGeo],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const isNear = getWalkState().near === slug;
    mix.current += ((isNear ? 1 : 0) - mix.current) * Math.min(1, dt * 7);
    const m = mix.current;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    const rm = ringMat.current;
    if (rm) {
      rm.color.copy(dim).lerp(GOLD, m);
      rm.opacity = 0.3 + m * (0.35 + 0.35 * pulse);
    }
    const dm = discMat.current;
    if (dm) {
      dm.color.copy(dim).lerp(GOLD, m);
      dm.opacity = 0.05 + m * (0.06 + 0.08 * pulse);
    }
    if (ringMesh.current) {
      const sc = 1 + m * 0.012 * pulse;
      ringMesh.current.scale.set(sc, 1, sc);
    }
  });

  const w = Math.max(2.4, name.length * 0.22 + 0.6);
  const h = 0.66;

  return (
    <group
      position={[station.position[0], 0, station.position[1]]}
      rotation={[0, station.yaw, 0]}
    >
      {children}

      {/* soft contact shadow */}
      <mesh
        geometry={blobGeo}
        material={getBlobMat()}
        position={[0, 0.006, 0]}
        scale={[station.colliderRadius * 2.5, 1, station.colliderRadius * 2.5]}
        renderOrder={0}
      />

      {/* floor pad at the interaction radius */}
      <mesh geometry={discGeo} position={[0, 0.012, 0]} renderOrder={1}>
        <meshBasicMaterial
          ref={discMat}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh
        ref={ringMesh}
        geometry={innerGeo}
        position={[0, 0.02, 0]}
        renderOrder={2}
      >
        <meshBasicMaterial
          ref={ringMat}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
          polygonOffset
          polygonOffsetFactor={-3}
        />
      </mesh>

      {/* name sign: always faces the player */}
      <Billboard position={[0, signY, 0]} scale={0.7}>
        <mesh
          geometry={signGeo(w, h, accent)}
          material={signMat}
          renderOrder={10}
        />
        <Suspense fallback={null}>
          <Text
            font={FONT_URL}
            fontSize={0.38}
            color="#fff3d6"
            anchorX="center"
            anchorY="middle"
            position={[0, 0.02, 0.01]}
            outlineWidth={0.014}
            outlineColor="#fff3d6"
            renderOrder={12}
            material-toneMapped={false}
            material-depthWrite={false}
          >
            {name}
          </Text>
        </Suspense>
      </Billboard>
    </group>
  );
}

export { DoubleSide };
