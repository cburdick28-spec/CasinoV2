"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PROPS, ROOMS, roomAt } from "../world";
import { BARS, BENCHES, FLOOR_LANTERNS, ROPES, SOFAS, TABLES } from "./placements";
import { Bar, Benches, Blobs, Chandelier, Confetti, Frame, RoundTable, Sofas, Glow, Halos, Inst, Ropes, SignBoard, Sparkles, floorLanterns, hdr, wallLanternItems, type Item, type LanternItem } from "./kit";
import { art, label } from "./textures";

const T = ROOMS.lobby.theme;
const GOLD = { color: "#f0c15a", roughness: 0.35, metalness: 0.3, emissive: "#5a3a00", emissiveIntensity: 0.6 } as const;

const _o = new THREE.Object3D();
const FLOOR_L = floorLanterns(FLOOR_LANTERNS.lobby);
const HUNG = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const y = 5.1 + (i % 2) * 0.35;
  return { p: [Math.cos(a) * 9.2, y, Math.sin(a) * 7.4 - 0.5] as [number, number, number], c: i % 3 === 0 ? "#ffcf6a" : "#ffb347", cord: 6.55 - y };
}).filter((l) => Math.abs(l.p[0]) < 11 && Math.abs(l.p[2]) < 9);
const LOBBY_CONF = ["#f4c95d", "#ffb347", "#e8d9b0", "#e0553a", "#f4c95d"];

function prop(id: string): [number, number] {
  return PROPS.find((p) => p.id === id)!.position;
}

/* ------------------------------------------------------- centrepiece */

const DROPS = 40;
const COINS = 10;

function Centrepiece() {
  const [cx, cz] = prop("lobby-centrepiece");
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const orb = useRef<THREE.Mesh>(null);
  const water = useRef<THREE.MeshStandardMaterial>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const coins = useRef<THREE.InstancedMesh>(null);
  const jack = useRef<THREE.Group>(null);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    if (ring1.current) {
      ring1.current.rotation.y = t * 0.9;
      ring1.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.6) * 0.25;
    }
    if (ring2.current) {
      ring2.current.rotation.z = t * -0.7;
      ring2.current.rotation.x = 0.5 + Math.cos(t * 0.5) * 0.3;
    }
    if (orb.current) orb.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.04);
    if (water.current) water.current.emissiveIntensity = 0.75 + Math.sin(t * 1.7) * 0.2;
    if (jack.current) jack.current.rotation.y = Math.atan2(camera.position.x - cx, camera.position.z - cz);
    const d = drops.current;
    if (d) {
      for (let i = 0; i < DROPS; i++) {
        const a = (i / DROPS) * Math.PI * 2 * 3.0;
        const tt = (t * 0.42 + (i * 0.618) % 1) % 1;
        const r = 0.28 + tt * 1.5;
        _o.position.set(Math.cos(a) * r, 2.75 + 2.9 * tt - 4.5 * tt * tt, Math.sin(a) * r);
        _o.scale.setScalar(0.85 + 0.3 * Math.sin(i));
        _o.updateMatrix();
        d.setMatrixAt(i, _o.matrix);
      }
      d.instanceMatrix.needsUpdate = true;
    }
    const c = coins.current;
    if (c) {
      for (let i = 0; i < COINS; i++) {
        const a = (i / COINS) * Math.PI * 2 + t * 0.55;
        _o.position.set(Math.cos(a) * 2.35, 1.9 + Math.sin(t * 1.3 + i * 1.7) * 0.35 + (i % 3) * 0.45, Math.sin(a) * 2.35);
        _o.rotation.set(t * 1.5 + i, a, Math.PI / 2 + t * 0.8);
        _o.scale.setScalar(1);
        _o.updateMatrix();
        c.setMatrixAt(i, _o.matrix);
      }
      c.instanceMatrix.needsUpdate = true;
      _o.rotation.set(0, 0, 0);
    }
  });

  const jackA = useMemo(() => label("PROGRESSIVE JACKPOT", "#ffd166", { w: 1024, h: 160 }), []);
  const jackB = useMemo(() => label("$1,284,550", "#fff3b0", { w: 1024, h: 200 }), []);
  const halos = useMemo<Item[]>(
    () => [
      { p: [cx, 3.0, cz], s: 4.2, c: "#ffb347" },
      { p: [cx, 1.3, cz], s: 3.4, c: "#ff8a3a" },
      { p: [cx, 4.95, cz], s: 3.0, c: "#ffe08a" },
    ],
    [cx, cz]
  );
  const rimLamps = useMemo<Item[]>(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return { p: [Math.cos(a) * 2.0, 0.78, Math.sin(a) * 2.0] as [number, number, number], s: 1, c: "#ffd9a0" };
      }),
    []
  );
  const rimHalos = useMemo<Item[]>(() => rimLamps.map((l) => ({ ...l, p: [l.p[0] + cx, l.p[1], l.p[2] + cz], s: 0.9, c: "#ffb347" })), [rimLamps, cx, cz]);

  return (
    <>
      <group position={[cx, 0, cz]}>
        {/* stepped marble plinth */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[2.75, 2.8, 0.3, 28]} />
          <meshStandardMaterial color="#efe0c0" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[2.62, 0.05, 6, 40]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.3, 2.45, 0.36, 28]} />
          <meshStandardMaterial color="#e6d2aa" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[2.1, 2.25, 0.22, 28]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        <Inst items={rimLamps}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshBasicMaterial color={hdr("#ffd9a0", 2.4)} toneMapped={false} />
        </Inst>
        {/* basin with glowing liquid gold */}
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[1.95, 1.7, 0.3, 28, 1, true]} />
          <meshStandardMaterial {...GOLD} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.12, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[1.85, 28]} />
          <meshStandardMaterial ref={water} color="#ffb347" emissive="#ff9a2a" emissiveIntensity={0.8} roughness={0.15} />
        </mesh>
        {/* column and upper bowl */}
        <mesh position={[0, 1.9, 0]}>
          <cylinderGeometry args={[0.2, 0.36, 1.7, 10]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.95, 0.35, 0.34, 18, 1, true]} />
          <meshStandardMaterial {...GOLD} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.77, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.88, 18]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff9a2a" emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, 2.85, 0]}>
          <cylinderGeometry args={[0.1, 0.2, 0.9, 8]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        {/* jackpot orb with two animated halo rings */}
        <mesh ref={orb} position={[0, 3.0, 0]}>
          <icosahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial color="#ffcf5a" emissive="#ffa21f" emissiveIntensity={1.0} roughness={0.3} flatShading />
        </mesh>
        <mesh ref={ring1} position={[0, 3.0, 0]}>
          <torusGeometry args={[1.15, 0.06, 8, 40]} />
          <meshBasicMaterial color={hdr("#ffe08a", 2.6)} toneMapped={false} />
        </mesh>
        <mesh ref={ring2} position={[0, 3.0, 0]}>
          <torusGeometry args={[0.95, 0.045, 8, 36]} />
          <meshBasicMaterial color={hdr("#ff9ad0", 2.2)} toneMapped={false} />
        </mesh>
        {/* arcing coins and water */}
        <instancedMesh ref={coins} args={[undefined, undefined, COINS]} frustumCulled={false}>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 14]} />
          <meshStandardMaterial {...GOLD} emissiveIntensity={0.9} />
        </instancedMesh>
        <instancedMesh ref={drops} args={[undefined, undefined, DROPS]} frustumCulled={false}>
          <sphereGeometry args={[0.065, 6, 5]} />
          <meshBasicMaterial color={hdr("#ffe6a8", 2.0)} toneMapped={false} />
        </instancedMesh>
        {/* jackpot display, always turns to face the viewer */}
        <group ref={jack} position={[0, 4.95, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <boxGeometry args={[2.7, 1.1, 0.08]} />
            <meshStandardMaterial color="#1b0f1c" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[2.84, 1.24, 0.06]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          <Glow position={[0, 0.52, 0.03]} size={[2.6, 0.045, 0.03]} color="#ffd166" k={2} />
          <Glow position={[0, -0.52, 0.03]} size={[2.6, 0.045, 0.03]} color="#ffd166" k={2} />
          <Glow position={[-1.3, 0, 0.03]} size={[0.045, 1.0, 0.03]} color="#ffd166" k={2} />
          <Glow position={[1.3, 0, 0.03]} size={[0.045, 1.0, 0.03]} color="#ffd166" k={2} />
          <mesh position={[0, 0.25, 0.03]}>
            <planeGeometry args={[2.5, 0.42]} />
            <meshBasicMaterial map={jackA} transparent toneMapped={false} color={hdr("#fff", 1.3)} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.17, 0.03]}>
            <planeGeometry args={[2.5, 0.52]} />
            <meshBasicMaterial map={jackB} transparent toneMapped={false} color={hdr("#fff", 1.5)} depthWrite={false} />
          </mesh>
        </group>
        <mesh position={[0, 5.7, 0]}>
          <coneGeometry args={[0.3, 0.5, 4]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      </group>
      <Sparkles position={[cx, 0.9, cz]} count={80} radius={2.6} height={4.6} />
      <Halos items={halos} k={0.42} />
      <Halos items={rimHalos} k={0.4} />
      <Blobs spots={[{ x: cx, z: cz, r: 3.9 }]} />
    </>
  );
}

/* ----------------------------------------------------------- pillars */

function Pillars() {
  const spots = useMemo(() => PROPS.filter((p) => p.id.startsWith("lobby-pillar")).map((p) => p.position), []);
  const part = (y: number, s?: [number, number, number]): Item[] => spots.map(([x, z]) => ({ p: [x, y, z], s }));
  const halos = useMemo<Item[]>(() => spots.map(([x, z]) => ({ p: [x, 0.75, z], s: 2.2, c: "#ffb347" })), [spots]);
  return (
    <>
      <Inst items={part(0.2)}>
        <boxGeometry args={[1.6, 0.4, 1.6]} />
        <meshStandardMaterial color="#d8c39c" roughness={0.6} />
      </Inst>
      <Inst items={part(0.55)}>
        <cylinderGeometry args={[0.8, 0.86, 0.3, 14]} />
        <meshStandardMaterial {...GOLD} />
      </Inst>
      <Inst items={part(3.45)}>
        <cylinderGeometry args={[0.5, 0.56, 5.5, 12]} />
        <meshStandardMaterial color="#f3e6c9" roughness={0.5} flatShading />
      </Inst>
      <Inst items={spots.map(([x, z]) => ({ p: [x, 1.3, z] as [number, number, number], rx: Math.PI / 2 }))}>
        <torusGeometry args={[0.6, 0.07, 6, 18]} />
        <meshStandardMaterial {...GOLD} />
      </Inst>
      <Inst items={spots.map(([x, z]) => ({ p: [x, 5.3, z] as [number, number, number], rx: Math.PI / 2 }))}>
        <torusGeometry args={[0.58, 0.07, 6, 18]} />
        <meshStandardMaterial {...GOLD} />
      </Inst>
      <Inst items={spots.map(([x, z]) => ({ p: [x, 0.76, z] as [number, number, number], rx: Math.PI / 2 }))}>
        <torusGeometry args={[0.84, 0.045, 6, 22]} />
        <meshBasicMaterial color={hdr("#ffb347", 2.2)} toneMapped={false} />
      </Inst>
      <Inst items={part(6.3)}>
        <cylinderGeometry args={[0.9, 0.52, 0.5, 14]} />
        <meshStandardMaterial color="#e8d4a8" roughness={0.55} />
      </Inst>
      <Inst items={part(6.75)}>
        <boxGeometry args={[1.7, 0.5, 1.7]} />
        <meshStandardMaterial {...GOLD} emissiveIntensity={0.4} />
      </Inst>
      <Halos items={halos} k={0.55} />
      <Blobs spots={spots.map(([x, z]) => ({ x, z, r: 1.6 }))} />
    </>
  );
}

/* ----------------------------------------------------------- ceiling */

function CeilingWork() {
  const h = ROOMS.lobby.height;
  const lamps = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const x of [-8, 8]) for (const z of [-7, -1, 5]) out.push({ p: [x, h - 0.04, z] });
    for (const x of [-4, 4]) for (const z of [-7.5, 6.5]) out.push({ p: [x, h - 0.04, z] });
    return out;
  }, [h]);
  const lampHalos = useMemo<Item[]>(() => lamps.map((l) => ({ p: [l.p[0], l.p[1] - 0.25, l.p[2]], s: 1.6, c: "#ffd9a0" })), [lamps]);
  const beamsX = [-8.5, 3.5, 7.5].map((z) => ({ p: [0, h - 0.2, z] as [number, number, number], s: [23.6, 0.4, 0.5] as [number, number, number] }));
  const beamsZ = [-8, 0, 8].map((x) => ({ p: [x, h - 0.2, 0] as [number, number, number], s: [0.5, 0.4, 19.6] as [number, number, number] }));
  return (
    <>
      <Inst items={[...beamsX, ...beamsZ]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a9703e" roughness={0.7} />
      </Inst>
      <Inst items={lamps}>
        <cylinderGeometry args={[0.38, 0.38, 0.06, 14]} />
        <meshBasicMaterial color={hdr("#ffe6b8", 2.0)} toneMapped={false} />
      </Inst>
      <Halos items={lampHalos} k={0.28} />
      {/* rosette and cove ring round the main chandelier */}
      <mesh position={[0, h - 0.03, -1]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[4.4, 36]} />
        <meshStandardMaterial color="#f7e5bd" roughness={0.9} emissive="#f7e5bd" emissiveIntensity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, h - 0.07, -1]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[4.4, 0.09, 6, 48]} />
        <meshBasicMaterial color={hdr("#ffb347", 2.0)} toneMapped={false} />
      </mesh>
      <mesh position={[0, h - 0.07, -1]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[3.2, 0.05, 6, 48]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <Chandelier position={[0, h - 0.35, -1]} radius={3.2} bulbs={20} tiers={2} drop={0.3} color="#ffd9a0" />
      <Chandelier position={[-7, h - 0.9, 0]} radius={1.2} bulbs={10} tiers={2} drop={0.6} color="#ffd9a0" />
      <Chandelier position={[7, h - 0.9, 0]} radius={1.2} bulbs={10} tiers={2} drop={0.6} color="#ffd9a0" />
      <Chandelier position={[0, h - 0.9, 6.5]} radius={1.1} bulbs={9} tiers={2} drop={0.6} color="#ffd9a0" />
    </>
  );
}

/* ----------------------------------------------------------- rest */

const inLobby = (x: number, z: number) => roomAt(x, z) === "lobby";

const WALL_LANTERNS = [
  ...[-9, -5, 5, 9].map((x) => ({ x, y: 3.3, z: 9.8, ry: Math.PI })),
  ...[-6.5, 6.5, -9, 9].map((z) => ({ x: -11.8, y: 3.4, z, ry: Math.PI / 2 })),
  ...[-6.5, 6.5, -9, 9].map((z) => ({ x: 11.8, y: 3.4, z, ry: -Math.PI / 2 })),
  ...[-11, -4.2, 4.2, 11].map((x) => ({ x, y: 3.5, z: -9.8, ry: 0 })),
];

const WL = wallLanternItems(WALL_LANTERNS);
export const LOBBY_LANTERNS: LanternItem[] = [...FLOOR_L, ...HUNG, ...WL.lanterns];
export const LOBBY_BRACKETS: Item[] = WL.brackets;

export default function Lobby() {
  const bars = BARS.filter((b) => b.room === "lobby");
  const benches = BENCHES.filter((b) => inLobby(b.x, b.z));
  const ropes = ROPES.filter((r) => inLobby(r.a[0], r.a[1] + 1));
  const sofas = SOFAS.filter((b) => inLobby(b.x, b.z));
  const tables = TABLES.filter((b) => inLobby(b.x, b.z));
  const tFrame = (k: Parameters<typeof art>[0]) => art(k);
  return (
    <>
      <Centrepiece />
      <Pillars />
      <CeilingWork />
      {bars.map((b, i) => (
        <Bar key={i} x={b.x} z={b.z} ry={b.ry} len={b.len} kind={b.kind} accent={b.kind === "bar" ? T.accent : "#ffd166"} />
      ))}
      <SignBoard position={[-7.5, 3.55, -9.78]} ry={0} w={3.0} h={0.7} text="THE GOLD BAR" color="#ffd166" />
      <SignBoard position={[7.5, 3.55, -9.78]} ry={0} w={3.0} h={0.7} text="CASHIER" color="#7df9a8" />
      <Ropes spots={ropes} />
      <Benches spots={benches} />
      <Sofas spots={sofas} />
      {tables.map((t, i) => (
        <RoundTable key={i} x={t.x} z={t.z} r={t.r} c={t.c} />
      ))}
      <Confetti bounds={ROOMS.lobby.bounds} count={45} colors={LOBBY_CONF} seed={3} />
      {/* wall art */}
      <Frame position={[-7.5, 3.5, 9.8]} ry={Math.PI} w={1.8} h={2.25} texture={tFrame("sun")} />
      <Frame position={[0, 3.6, 9.8]} ry={Math.PI} w={1.4} h={1.75} texture={tFrame("crown")} />
      <Frame position={[7.5, 3.5, 9.8]} ry={Math.PI} w={1.8} h={2.25} texture={tFrame("cards")} />
      <Frame position={[-11.8, 3.5, -6.4]} ry={Math.PI / 2} w={1.6} h={2.0} texture={tFrame("dice")} />
      <Frame position={[-11.8, 3.5, 6.4]} ry={Math.PI / 2} w={1.6} h={2.0} texture={tFrame("wheel")} />
      <Frame position={[11.8, 3.5, -6.4]} ry={-Math.PI / 2} w={1.6} h={2.0} texture={tFrame("seven")} />
      <Frame position={[11.8, 3.5, 6.4]} ry={-Math.PI / 2} w={1.6} h={2.0} texture={tFrame("horse")} />
    </>
  );
}
