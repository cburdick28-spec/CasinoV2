"use client";

import { useSeated } from "../games/bridge";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshBasicMaterial, SphereGeometry, MeshStandardMaterial, DoubleSide } from "three";
import { C, Kit, KitMeshes, bigCard, chipStack, die, flatCard, flatRing, kitCache, lighten, pip, railOval, rand, shade, type Vec3 } from "./kit";
import { Bob, Halo, Spin } from "./common";

const Y = 0.875; // felt surface height

/* ------------------------------ table shells ------------------------------ */

export function tableOval(k: Kit, rx: number, rz: number, felt: string, rim: string, trim: string = C.gold, skirt: string = C.woodDark, glow: string = C.gold) {
  const sc = (f: number): Vec3 => [rx * f, 1, rz * f];
  k.tor(1, 0.016, glow, [0, 0.735, 0], { rot: [Math.PI / 2, 0, 0], scale: [rx * 0.99, rz * 0.99, 1], layer: "glow", i: 1.7, seg: 56 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    k.box(0.1, 0.62, 0.06, C.goldDeep, [Math.cos(a) * rx * 0.81, 0.45, Math.sin(a) * rz * 0.81], { rot: [0, Math.PI / 2 - a, 0], r: 0.02 });
  }
  k.cyl(1, 1, 0.07, shade(C.woodDark, 0.3), [0, 0.035, 0], { scale: sc(0.9), seg: 40 });
  k.cyl(1, 1, 0.72, skirt, [0, 0.4, 0], { scale: sc(0.8), seg: 40 });
  k.cyl(1, 1, 0.045, trim, [0, 0.3, 0], { scale: sc(0.815), seg: 40 });
  k.cyl(1, 1, 0.1, C.wood, [0, 0.8, 0], { scale: sc(1), seg: 40 });
  k.cyl(1, 1, 0.025, trim, [0, 0.7, 0], { scale: sc(0.99), seg: 40 });
  k.cyl(1, 1, 0.03, felt, [0, 0.862, 0], { scale: sc(0.97), seg: 40 });
  railOval(k, rx * 0.975, rz * 0.975, 0.885, 0.065, rim);
  railOval(k, rx * 0.86, rz * 0.86, Y + 0.002, 0.006, trim);
}

function tableHalf(k: Kit, rx: number, rz: number, felt: string, rim: string, trim: string = C.gold, skirt: string = C.woodDark) {
  const sc = (f: number): Vec3 => [rx * f, 1, rz * f];
  const P = Math.PI;
  const w = (r: number, h: number, y: number, col: string, f: number) => k.wedge(r, h, -P / 2, P, col, [0, y, 0], { scale: sc(f), seg: 32 });
  w(1, 0.07, 0.035, shade(C.woodDark, 0.3), 0.9);
  w(1, 0.72, 0.4, skirt, 0.8);
  w(1, 0.045, 0.3, trim, 0.815);
  w(1, 0.1, 0.8, C.wood, 1);
  w(1, 0.03, 0.862, felt, 0.97);
  k.tor(1, 0.016, "#ff6a5a", [0, 0.735, 0], { rot: [Math.PI / 2, 0, 0], scale: [rx * 0.99, rz * 0.99, 1], arc: P, layer: "glow", i: 1.7, seg: 40 });
  k.box(rx * 1.8, 0.07, 0.1, shade(C.woodDark, 0.3), [0, 0.035, 0]);
  k.box(rx * 1.6, 0.72, 0.1, skirt, [0, 0.4, 0]);
  k.box(rx * 2, 0.1, 0.1, C.wood, [0, 0.8, 0]);
  k.box(rx * 2, 0.14, 0.12, rim, [0, 0.88, -0.02], { r: 0.05 });
  k.tor(1, 0.065, rim, [0, 0.885, 0], { rot: [Math.PI / 2, 0, 0], scale: [rx * 0.975, rz * 0.975, 1], arc: P, seg: 40 });
  k.tor(1, 0.006, trim, [0, Y + 0.002, 0], { rot: [Math.PI / 2, 0, 0], scale: [rx * 0.86, rz * 0.86, 1], arc: P, seg: 40 });
}

/* ------------------------------ BLACKJACK ------------------------------ */

const bjTable = () =>
  kitCache("bj-table", (k) => {
    k.at([0, 0, -0.45], null, null, () => {
      tableHalf(k, 1.2, 1.05, "#1f8a57", C.crimson, C.gold, "#7d1f34");
      for (let i = 0; i < 5; i++) {
        const a = (i - 2) * 0.5;
        const x = Math.sin(a) * 0.74;
        const z = Math.cos(a) * 0.74;
        flatRing(k, x, Y + 0.002, z, 0.1, C.gold, 0.008);
        flatCard(k, x * 0.82 - 0.03, Y + 0.002, z * 0.82, a, i % 2 ? "h" : "s");
        flatCard(k, x * 0.82 + 0.035, Y + 0.011, z * 0.82 - 0.02, a + 0.15, i === 2 ? "d" : "c");
        chipStack(k, x * 1.17, Y, z * 1.12, [C.red, C.red, C.paper, C.blue, C.blue].slice(0, 2 + (i % 4)));
        chipStack(k, x * 1.17 + 0.07, Y, z * 1.12, [C.gold, C.gold, C.gold].slice(0, 1 + ((i + 1) % 3)));
      }
      k.tor(0.48, 0.006, C.gold, [0, Y + 0.002, 0], { rot: [Math.PI / 2, 0, 0.45], scale: [1, 1, 0.3], arc: Math.PI - 0.9 });
      flatCard(k, -0.06, Y + 0.002, 0.14, 0.05, "back");
      flatCard(k, 0.06, Y + 0.002, 0.14, -0.05, "s");
      k.box(0.17, 0.12, 0.12, C.ink, [0.62, Y + 0.06, 0.2], { r: 0.02, rot: [0, -0.3, 0] });
      k.box(0.12, 0.012, 0.1, C.orange, [0.62, Y + 0.126, 0.2], { rot: [0, -0.3, 0] });
      // dealer's chip tray
      k.box(1.0, 0.045, 0.14, C.ink, [0, Y + 0.02, 0.02], { r: 0.015 });
      for (let i = 0; i < 9; i++) chipStack(k, -0.4 + i * 0.1, Y + 0.04, 0.02, [[C.red, C.blue, C.gold, C.green, C.pink, C.paper, C.violet, C.orange, C.cyan][i], [C.red, C.blue, C.gold, C.green, C.pink, C.paper, C.violet, C.orange, C.cyan][i], [C.red, C.blue, C.gold, C.green, C.pink, C.paper, C.violet, C.orange, C.cyan][i]], 0.04);
      // neon arch behind the dealer
      k.tor(0.98, 0.03, C.red, [0, Y + 0.05, -0.0], { arc: Math.PI, layer: "glow", i: 2.1 });
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI;
        k.sph(0.045, i % 2 ? C.lemon : C.paper, [Math.cos(a) * 0.98, Y + 0.05 + Math.sin(a) * 0.98, 0.03], { layer: i % 2 ? "a" : "b", seg: 8, i: 1.4 });
      }
      k.box(0.14, 0.1, 0.14, C.goldDeep, [-0.98, Y + 0.05, 0], { r: 0.03 });
      k.box(0.14, 0.1, 0.14, C.goldDeep, [0.98, Y + 0.05, 0], { r: 0.03 });
    });
  });

const bjCards = () =>
  kitCache("bj-cards", (k) => {
    k.at([-0.28, 0.5, 0.2], [0, 0.12, -0.2], null, () => bigCard(k, 0.5, 0.72, "s"));
    k.at([0.28, 0.5, 0.2], [0, -0.12, 0.2], null, () => bigCard(k, 0.5, 0.72, "h"));
  });

export function Blackjack() {
  const seated = useSeated("blackjack"); // the big floating showcase cards would block the seated view
  return (
    <>
      <KitMeshes built={bjTable()} />
      {!seated && (
        <Bob amp={0.04} speed={1.3} position={[0, Y + 0.45, -0.4]}>
          <KitMeshes built={bjCards()} />
        </Bob>
      )}
    </>
  );
}

/* ------------------------------ TEXAS HOLD'EM ------------------------------ */

const pokerTable = (seated = false) =>
  kitCache(seated ? "poker-table-seated" : "poker-table", (k) => {
    tableOval(k, 1.2, 0.92, "#17705e", C.violet, C.gold, "#4a2f8f", "#a58bff");
    const seats = 7;
    for (let i = 0; i < seats; i++) {
      const ang = -Math.PI * 0.45 + (i / (seats - 1)) * Math.PI * 0.9;
      const px = Math.sin(ang) * 0.92;
      const pz = Math.cos(ang) * 0.62;
      if (seated && Math.abs(ang) < 0.9) continue; // the Stage deals the cards in the middle seats
      if (!seated) flatCard(k, px - 0.035, Y + 0.002, pz * 1.0, ang * 0.8, "back", i % 2 ? C.blue : C.crimson);
      if (!seated) flatCard(k, px + 0.035, Y + 0.002, pz * 1.0, ang * 0.8 + 0.12, "back", i % 2 ? C.blue : C.crimson);
      chipStack(k, px * 1.08, Y, pz * 1.18 - 0.05, [C.red, C.paper, C.red, C.green, C.green].slice(0, 2 + (i % 4)));
    }
    // community cards
    const suits = ["h", "s", "d", "c", "h"] as const;
    if (!seated) for (let i = 0; i < 5; i++) flatCard(k, (i - 2) * 0.125, Y + 0.002, 0.0, 0, suits[i], C.crimson, 1.1);
    // pot
    chipStack(k, -0.2, Y, -0.22, [C.gold, C.gold, C.red, C.red, C.violet, C.violet, C.paper]);
    chipStack(k, -0.12, Y, -0.27, [C.blue, C.blue, C.blue, C.green]);
    chipStack(k, 0.2, Y, -0.22, [C.red, C.paper, C.red, C.paper, C.gold]);
    // dealer button
    k.cyl(0.04, 0.04, 0.012, C.paper, [0.45, Y + 0.006, -0.3], { seg: 16 });
    k.cyl(0.026, 0.026, 0.014, C.gold, [0.45, Y + 0.007, -0.3], { seg: 16 });
    // deck
    k.box(0.1, 0.05, 0.14, C.crimson, [-0.58, Y + 0.025, -0.4], { r: 0.01, rot: [0, 0.3, 0] });
    // pedestal for the big chip
    if (seated) return;
    k.cyl(0.07, 0.11, 0.16, C.goldDeep, [0, Y + 0.08, -0.55]);
    k.cyl(0.03, 0.03, 0.5, C.goldDeep, [0, Y + 0.38, -0.55], { seg: 10 });
  });

const bigChip = () =>
  kitCache("big-chip", (k) => {
    k.at([0, 0, 0], [Math.PI / 2, 0, 0], null, () => {
      k.cyl(0.46, 0.46, 0.1, C.violet, [0, 0, 0], { seg: 32 });
      k.cyl(0.4, 0.4, 0.108, C.paper, [0, 0, 0], { seg: 32 });
      k.cyl(0.34, 0.34, 0.115, C.violet, [0, 0, 0], { seg: 32 });
      k.cyl(0.255, 0.255, 0.12, lighten(C.violet, 0.3), [0, 0, 0], { seg: 32 });
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.box(0.12, 0.14, 0.108, C.paper, [Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0], { rot: [0, 0, a], r: 0.015 });
    }
    k.tor(0.46, 0.035, C.gold, [0, 0, 0.05], { seg: 36, layer: "glow", i: 1.4 });
    k.tor(0.46, 0.035, C.gold, [0, 0, -0.05], { seg: 36, layer: "glow", i: 1.4 });
    for (const sz of [1, -1]) {
      k.at([0, 0, 0.062 * sz], sz < 0 ? [0, Math.PI, 0] : null, null, () => pip(k, "s", 0.3, C.paper));
    }
  });

export function Poker() {
  const seated = useSeated("poker"); // the Stage deals the real cards; the floating chip would block the view
  if (seated) return <KitMeshes built={pokerTable(true)} />;
  return (
    <>
      <KitMeshes built={pokerTable()} />
      <Spin axis="y" speed={0.9} position={[0, Y + 0.95, -0.55]}>
        <KitMeshes built={bigChip()} />
      </Spin>
      <Halo position={[0, Y + 0.95, -0.55]} size={1.9} color="#a58bff" opacity={0.35} />
    </>
  );
}

/* ------------------------------ BACCARAT ------------------------------ */

const baccTable = (seated = false) =>
  kitCache(seated ? "bacc-table-seated" : "bacc-table", (k) => {
    k.at([0, 0, 0.12], null, null, () => {
      tableOval(k, 1.2, 0.9, "#1d5fae", C.goldDeep, C.gold, "#1c3f87", "#6ea8ff");
      // player / banker / tie zones
      k.box(0.5, 0.004, 0.26, "#3d78d6", [-0.45, Y + 0.002, 0.18], { rot: [0, 0.18, 0] });
      k.box(0.5, 0.004, 0.26, "#d9483b", [0.45, Y + 0.002, 0.18], { rot: [0, -0.18, 0] });
      k.box(0.3, 0.004, 0.18, "#2f9e6a", [0, Y + 0.002, 0.34]);
      for (const [x, z, r] of [[-0.45, 0.18, 0.18], [0.45, 0.18, -0.18], [0, 0.34, 0]] as const) {
        k.box(0.5 - (x === 0 ? 0.2 : 0), 0.006, 0.012, C.gold, [x, Y + 0.004, z + 0.125], { rot: [0, r, 0] });
      }
      // seat numbers
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.42 + (i / 6) * Math.PI * 0.84;
        flatRing(k, Math.sin(a) * 1.0, Y + 0.002, Math.cos(a) * 0.7, 0.045, C.gold, 0.006);
        if (!seated) chipStack(k, Math.sin(a) * 0.94, Y, Math.cos(a) * 0.52, [C.gold, C.blue, C.gold, C.paper].slice(0, 2 + (i % 3)));
      }
      // hands
      if (!seated) {
        flatCard(k, -0.5, Y + 0.002, -0.12, 0.2, "h");
        flatCard(k, -0.4, Y + 0.002, -0.12, -0.1, "s");
        flatCard(k, 0.4, Y + 0.002, -0.12, 0.1, "d");
        flatCard(k, 0.5, Y + 0.002, -0.14, 1.5, "c");
      }
      // shoe
      k.box(0.2, 0.12, 0.16, C.goldDeep, [0.0, Y + 0.06, -0.12], { r: 0.03 });
      k.box(0.16, 0.05, 0.12, C.crimson, [0.0, Y + 0.14, -0.1], { r: 0.015, rot: [0.2, 0, 0] });
      // scoreboard tower
      k.box(0.12, 0.9, 0.08, C.goldDeep, [-0.42, Y + 0.45, -0.55], { r: 0.02 });
      k.box(0.12, 0.9, 0.08, C.goldDeep, [0.42, Y + 0.45, -0.55], { r: 0.02 });
      k.box(1.18, 1.0, 0.1, C.goldDeep, [0, Y + 1.0, -0.55], { r: 0.04 });
      k.box(1.04, 0.86, 0.04, "#0c1a3a", [0, Y + 1.0, -0.495], { layer: "scr", i: 0.55 });
      for (let c = 0; c < 12; c++) {
        const colH = 3 + Math.floor(rand(c + 3) * 4);
        for (let r = 0; r < colH; r++) {
          const v = rand(c * 7 + r * 3 + 1);
          const col = v < 0.42 ? "#ff5448" : v < 0.88 ? "#4d8cff" : "#4be39a";
          k.sph(0.04, col, [-0.5 + c * 0.091, Y + 1.29 - r * 0.098, -0.47], { layer: v > 0.6 ? "a" : v > 0.3 ? "b" : "glow", seg: 8, scale: [1, 1, 0.5], i: 1.5 });
        }
      }
      k.box(1.04, 0.05, 0.05, C.gold, [0, Y + 1.48, -0.485], { layer: "glow", i: 1.3 });
    });
  });

export function Baccarat() {
  const seated = useSeated("baccarat"); // the Stage deals the real hands
  return <KitMeshes built={baccTable(seated)} />;
}

/* ------------------------------ CASINO WAR ------------------------------ */

const warTable = (seated = false) =>
  kitCache(seated ? "war-table-seated" : "war-table", (k) => {
    tableOval(k, 1.15, 1.0, "#a32a43", C.orange, C.gold, "#8a3a14", "#ffa24a");
    flatRing(k, 0, Y + 0.003, 0.12, 0.17, C.gold, 0.01);
    flatRing(k, 0, Y + 0.003, 0.12, 0.13, C.gold, 0.006);
    if (!seated) {
      flatCard(k, -0.3, Y + 0.002, 0.2, 0.15, "s", C.crimson, 1.25);
      flatCard(k, 0.3, Y + 0.002, 0.2, -0.15, "h", C.crimson, 1.25);
      flatCard(k, -0.5, Y + 0.002, 0.45, 0.4, "back", C.navy);
      flatCard(k, 0.5, Y + 0.002, 0.45, -0.4, "back", C.navy);
    }
    chipStack(k, -0.62, Y, 0.1, [C.orange, C.paper, C.orange, C.orange]);
    chipStack(k, 0.62, Y, 0.1, [C.orange, C.orange, C.paper, C.blue, C.orange]);
    if (seated) return; // the Stage deals the real cards where these chips and the shield pedestal stand
    chipStack(k, 0, Y, 0.62, [C.gold, C.gold, C.gold, C.red, C.gold, C.gold]);
    chipStack(k, 0.09, Y, 0.65, [C.gold, C.red, C.gold]);
    // shield pedestal
    k.cyl(0.14, 0.2, 0.1, C.goldDeep, [0, Y + 0.05, -0.55]);
    k.cyl(0.04, 0.04, 0.72, C.woodDark, [0, Y + 0.4, -0.55], { seg: 10 });
  });

const warShield = () =>
  kitCache("war-shield", (k) => {
    // two crossed swords behind the shield
    for (const s of [-1, 1]) {
      k.at([0, 0.05, -0.05], [0, 0, s * 0.62], null, () => {
        k.box(0.09, 1.3, 0.03, C.steel, [0, 0.12, 0], { r: 0.012 });
        k.box(0.05, 0.1, 0.04, C.paper, [0, 0.8, 0], { r: 0.01 });
        k.cone(0.045, 0.2, C.steel, [0, 0.85 + 0.15, 0], { scale: [1, 1, 0.35] });
        k.box(0.38, 0.06, 0.06, C.gold, [0, -0.38, 0], { r: 0.02 });
        k.cyl(0.03, 0.03, 0.26, C.woodDark, [0, -0.55, 0], { seg: 8 });
        k.sph(0.05, C.gold, [0, -0.7, 0], { seg: 8 });
      });
    }
    // shield with gold rim and a star
    const shield = (w: number, hh: number, col: string, z: number) => {
      k.box(w, hh, 0.06, col, [0, 0.1, z], { r: 0.05 });
      k.cone(w / 2, 0.55 * (w / 0.64), col, [0, 0.1 - hh / 2 - 0.02, z], { rot: [0, Math.PI / 4, Math.PI], scale: [1, 1, 0.1], seg: 4 });
    };
    shield(0.74, 0.58, C.gold, -0.01);
    shield(0.64, 0.5, C.crimson, 0.03);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.cone(0.07, 0.2, C.gold, [Math.sin(a) * 0.12, 0.04 + Math.cos(a) * 0.12, 0.08], { rot: [0, 0, -a], seg: 4, scale: [1, 1, 0.4] });
    }
    k.sph(0.07, C.lemon, [0, 0.04, 0.09], { seg: 8, layer: "glow", i: 1.6, scale: [1, 1, 0.5] });
  });

export function War() {
  const seated = useSeated("war"); // the floating shield would block the seated view
  if (seated) return <KitMeshes built={warTable(true)} />;
  return (
    <>
      <KitMeshes built={warTable()} />
      <Bob amp={0.03} speed={1.1} sway={0.04} position={[0, Y + 1.0, -0.55]}>
        <KitMeshes built={warShield()} />
      </Bob>
    </>
  );
}

/* ------------------------------ ROULETTE ------------------------------ */

const rouTable = () =>
  kitCache("rou-table", (k) => {
    tableOval(k, 1.25, 0.92, "#17795a", C.woodDark, C.gold, "#6a2a2e", "#ff6a5a");
    // number grid 3 x 12 plus zero
    k.box(0.1, 0.004, 0.24, C.green, [-0.55, Y + 0.002, 0.28]);
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 3; r++) {
        const n = c * 3 + r + 1;
        const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n);
        k.box(0.074, 0.006, 0.074, red ? C.red : C.ink, [-0.43 + c * 0.082, Y + 0.003, 0.2 + r * 0.082], { r: 0.004 });
      }
    }
    k.box(1.0, 0.005, 0.01, C.paper, [0.06, Y + 0.002, 0.46]);
    for (let i = 0; i < 3; i++) k.box(0.32, 0.005, 0.07, i === 1 ? C.red : C.ink, [-0.24 + i * 0.33, Y + 0.003, 0.58], { r: 0.004 });
    chipStack(k, -0.2, Y, 0.3, [C.red, C.paper, C.red]);
    chipStack(k, 0.15, Y, 0.25, [C.blue, C.blue, C.gold, C.blue]);
    chipStack(k, 0.5, Y, 0.35, [C.gold, C.gold, C.green]);
    chipStack(k, 0.3, Y, 0.55, [C.violet, C.paper, C.violet, C.violet, C.violet]);
    // wheel stand
    k.cyl(0.18, 0.24, 0.12, C.woodDark, [0, Y + 0.06, -0.45]);
  });
const rouPole = () => kitCache("rou-pole", (k) => k.cyl(0.05, 0.05, 0.4, C.goldDeep, [0, Y + 0.3, -0.45], { seg: 10 }));

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const rouBowl = () =>
  kitCache("rou-bowl", (k) => {
    k.cyl(0.6, 0.5, 0.16, C.wood, [0, -0.02, 0], { seg: 36 });
    k.cyl(0.5, 0.5, 0.01, shade(C.woodDark, 0.2), [0, 0.065, 0], { seg: 36 });
    const ring = (R: number, tube: number, y: number, col: string) => k.tor(R, tube, col, [0, y, 0], { rot: [Math.PI / 2, 0, 0], seg: 44, scale: [1, 1, 0.6] });
    ring(0.585, 0.055, 0.08, C.gold);
    ring(0.52, 0.05, 0.1, shade(C.woodDark, 0.1));
    ring(0.47, 0.04, 0.085, C.wood);
    ring(0.425, 0.03, 0.07, C.goldDeep);
    ring(0.585, 0.02, 0.12, C.gold);
  });
const rouWheel = () =>
  kitCache("rou-wheel", (k) => {
    k.cyl(0.34, 0.34, 0.05, C.goldDeep, [0, 0.0, 0], { seg: 36 });
    const N = 24;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const n = i + 1;
      const col = i === 0 ? C.green : REDS.has(n) ? C.red : C.ink;
      k.wedge(0.33, 0.07, a - Math.PI / N + 0.012, (Math.PI * 2) / N - 0.024, col, [0, 0.01, 0], { seg: 3 });
      k.box(0.014, 0.08, 0.1, C.gold, [Math.sin(a + Math.PI / N) * 0.29, 0.02, Math.cos(a + Math.PI / N) * 0.29], { rot: [0, a + Math.PI / N, 0] });
    }
    k.cyl(0.21, 0.21, 0.09, C.goldDeep, [0, 0.02, 0], { seg: 28 });
    k.cyl(0.17, 0.17, 0.1, C.wood, [0, 0.03, 0], { seg: 28 });
    k.cone(0.12, 0.2, C.gold, [0, 0.16, 0], { seg: 20 });
    k.sph(0.04, C.gold, [0, 0.27, 0], { seg: 10 });
    for (let i = 0; i < 4; i++) {
      k.box(0.2, 0.025, 0.025, C.gold, [0, 0.12, 0], { rot: [0, (i * Math.PI) / 2, 0], scale: [1, 1, 1] });
      k.sph(0.025, C.gold, [Math.cos((i * Math.PI) / 2) * 0.1, 0.12, Math.sin((i * Math.PI) / 2) * 0.1], { seg: 8 });
    }
  });

const ballGeo = new SphereGeometry(0.03, 12, 8);
const ballMat = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false });

export function Roulette() {
  const seated = useSeated("roulette"); // the in-world Stage draws its own wheel on the pedestal
  const ball = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ball.current) {
      ball.current.rotation.y = -t * 4.2;
    }
  });
  return (
    <>
      <KitMeshes built={rouTable()} />
      {!seated && (
        <>
          <KitMeshes built={rouPole()} />
          <group position={[0, Y + 0.85, -0.42]} rotation={[0.62, 0, 0]} scale={1.2}>
            <KitMeshes built={rouBowl()} />
            <Spin axis="y" speed={1.1} position={[0, 0.07, 0]}>
              <KitMeshes built={rouWheel()} />
            </Spin>
            <group ref={ball} position={[0, 0.14, 0]}>
              <mesh geometry={ballGeo} material={ballMat} position={[0.435, 0, 0]} />
            </group>
          </group>
        </>
      )}
    </>
  );
}

/* ------------------------------ CRAPS ------------------------------ */

const crapsTable = () =>
  kitCache("craps-table", (k) => {
    const W = 2.2;
    const D = 1.2;
    k.box(W * 0.9, 0.07, D * 0.88, shade(C.woodDark, 0.3), [0, 0.035, 0], { r: 0.02 });
    k.box(W * 0.8, 0.72, D * 0.7, "#14573f", [0, 0.4, 0], { r: 0.04 });
    k.box(W * 0.82, 0.045, D * 0.72, C.gold, [0, 0.3, 0], { r: 0.015 });
    k.box(W * 0.985, 0.02, D * 0.985, "#ff6a5a", [0, 0.735, 0], { r: 0.008, layer: "glow", i: 1.7 });
    for (let i = 0; i < 7; i++) {
      const x = -0.8 + i * 0.267;
      k.box(0.09, 0.6, 0.05, C.goldDeep, [x, 0.45, D * 0.35 + 0.015], { r: 0.02 });
      k.box(0.09, 0.6, 0.05, C.goldDeep, [x, 0.45, -D * 0.35 - 0.015], { r: 0.02 });
    }
    k.box(W, 0.12, D, C.wood, [0, 0.8, 0], { r: 0.05 });
    k.box(W * 0.94, 0.03, D * 0.92, "#168a5c", [0, 0.862, 0], { r: 0.02 });
    // tall padded rails with foam spikes
    const rail = (w: number, d: number, x: number, z: number) => k.box(w, 0.2, d, C.crimson, [x, 0.95, z], { r: 0.07 });
    rail(W, 0.16, 0, D / 2 - 0.08);
    rail(W, 0.16, 0, -D / 2 + 0.08);
    rail(0.16, D - 0.2, W / 2 - 0.08, 0);
    rail(0.16, D - 0.2, -W / 2 + 0.08, 0);
    for (let i = 0; i < 20; i++) {
      const x = -0.95 + i * 0.1;
      k.cone(0.03, 0.09, C.cream, [x, 0.9, D / 2 - 0.2], { rot: [Math.PI / 2, 0, 0], seg: 6 });
      k.cone(0.03, 0.09, C.cream, [x, 0.9, -D / 2 + 0.2], { rot: [-Math.PI / 2, 0, 0], seg: 6 });
    }
    for (let i = 0; i < 9; i++) {
      const z = -0.4 + i * 0.1;
      k.cone(0.03, 0.09, C.cream, [W / 2 - 0.2, 0.9, z], { rot: [0, 0, Math.PI / 2], seg: 6 });
      k.cone(0.03, 0.09, C.cream, [-W / 2 + 0.2, 0.9, z], { rot: [0, 0, -Math.PI / 2], seg: 6 });
    }
    // layout: pass line, number boxes
    k.box(1.6, 0.004, 0.035, C.paper, [0, Y + 0.002, 0.38], { r: 0.003 });
    k.box(1.6, 0.004, 0.035, C.gold, [0, Y + 0.002, -0.38], { r: 0.003 });
    const nums = [C.ink, C.ink, C.red, C.red, C.ink, C.ink];
    for (let i = 0; i < 6; i++) {
      k.box(0.2, 0.005, 0.15, nums[i], [-0.55 + i * 0.22, Y + 0.003, -0.28], { r: 0.01 });
      k.box(0.2, 0.006, 0.01, C.gold, [-0.55 + i * 0.22, Y + 0.004, -0.2]);
    }
    k.box(0.9, 0.005, 0.13, C.orange, [0.0, Y + 0.003, 0.18], { r: 0.01 });
    chipStack(k, -0.6, Y, 0.3, [C.red, C.paper, C.red, C.red]);
    chipStack(k, 0.7, Y, 0.25, [C.blue, C.blue, C.gold]);
    chipStack(k, 0.2, Y, 0.5, [C.green, C.green, C.paper, C.green]);
    // puck and stick
    k.cyl(0.05, 0.05, 0.014, C.paper, [0.5, Y + 0.007, -0.28], { seg: 18 });
    k.cyl(0.035, 0.035, 0.016, C.ink, [0.5, Y + 0.008, -0.28], { seg: 18 });
  });
const crapsRestDice = () =>
  kitCache("craps-rest-dice", (k) => {
    k.box(0.9, 0.012, 0.014, C.wood, [0.2, Y + 0.12, 0.05], { rot: [0, 0.35, 0.12] });
    k.at([-0.35, Y + 0.035, 0.12], [0, 0.6, 0], null, () => die(k, 0.07, C.paper, C.ink));
    k.at([-0.22, Y + 0.035, 0.18], [0, -0.4, 0], null, () => die(k, 0.07, C.red, C.paper));
  });

const crapsDie = (key: string, body: string, pipc: string) =>
  kitCache("craps-die-" + key, (k) => die(k, 0.34, body, pipc));

export function Craps() {
  const seated = useSeated("craps"); // the in-world Stage tumbles the real dice on the layout
  const d1 = useRef<Group>(null);
  const d2 = useRef<Group>(null);
  const a = useMemo(() => crapsDie("w", C.paper, C.ink), []);
  const b = useMemo(() => crapsDie("r", C.red, C.paper), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g1 = d1.current;
    const g2 = d2.current;
    if (g1) {
      g1.position.y = 1.55 + Math.sin(t * 1.5) * 0.12;
      g1.rotation.x = t * 0.9;
      g1.rotation.z = t * 0.55;
    }
    if (g2) {
      g2.position.y = 1.5 + Math.sin(t * 1.5 + 2.0) * 0.12;
      g2.rotation.y = t * 0.8;
      g2.rotation.x = -t * 0.6 + 1;
    }
  });
  return (
    <>
      <KitMeshes built={crapsTable()} />
      {!seated && (
        <>
          <KitMeshes built={crapsRestDice()} />
          <group ref={d1} position={[-0.3, 1.55, -0.05]}>
            <KitMeshes built={a} />
          </group>
          <group ref={d2} position={[0.25, 1.5, 0.05]}>
            <KitMeshes built={b} />
          </group>
          <Halo position={[0, 1.5, 0]} size={1.8} color="#ff8a5a" opacity={0.2} />
        </>
      )}
    </>
  );
}

/* ------------------------------ SIC BO ------------------------------ */

const sicTable = () =>
  kitCache("sic-table", (k) => {
    tableOval(k, 1.15, 1.15, "#0f7a74", C.crimson, C.gold, "#0f4a52", "#5df0d8");
    // 6 single-number tiles
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.sin(a) * 0.62;
      const z = Math.cos(a) * 0.62;
      k.at([x, Y + 0.004, z], [0, a, 0], null, () => {
        k.box(0.26, 0.007, 0.26, i % 2 ? C.red : C.cream, [0, 0, 0], { r: 0.012 });
        const pc = i % 2 ? C.paper : C.ink;
        const layout: [number, number][][] = [[[0, 0]], [[-1, 1], [1, -1]], [[-1, 1], [0, 0], [1, -1]], [[-1, 1], [1, 1], [-1, -1], [1, -1]], [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]], [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]]];
        for (const [px, pz] of layout[i]) k.sph(0.03, pc, [px * 0.065, 0.006, pz * 0.065], { seg: 8, scale: [1, 0.4, 1] });
      });
    }
    // outer ring of total bets
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      k.at([Math.sin(a) * 0.98, Y + 0.004, Math.cos(a) * 0.98], [0, a, 0], null, () => {
        k.box(0.15, 0.006, 0.12, i % 2 ? C.gold : C.orange, [0, 0, 0], { r: 0.008 });
        k.box(0.06, 0.008, 0.04, C.ink, [0, 0.002, 0]);
      });
    }
    chipStack(k, 0.2, Y, 0.3, [C.red, C.paper, C.red]);
    chipStack(k, -0.3, Y, 0.35, [C.gold, C.gold, C.blue, C.gold]);
    chipStack(k, 0.5, Y, -0.1, [C.green, C.green, C.paper]);
    // cage base
    k.cyl(0.26, 0.32, 0.14, C.goldDeep, [0, Y + 0.07, 0]);
    k.cyl(0.2, 0.26, 0.05, C.crimson, [0, Y + 0.16, 0]);
  });

const sicCage = () =>
  kitCache("sic-cage", (k) => {
    for (let i = 0; i < 4; i++) k.tor(0.34, 0.012, C.gold, [0, 0, 0], { rot: [0, (i * Math.PI) / 4, 0], seg: 28 });
    k.tor(0.34, 0.014, C.gold, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], seg: 28 });
    k.tor(0.22, 0.01, C.gold, [0, 0.26, 0], { rot: [Math.PI / 2, 0, 0], seg: 24 });
    k.sph(0.04, C.red, [0, 0.36, 0], { seg: 10 });
  });
const sicDice = () =>
  kitCache("sic-dice", (k) => {
    k.at([-0.1, -0.15, 0.03], [0.4, 0.5, 0.2], null, () => die(k, 0.15, C.paper, C.ink));
    k.at([0.1, -0.2, -0.06], [0.1, 1.2, -0.3], null, () => die(k, 0.15, C.red, C.paper));
    k.at([0.0, -0.05, 0.12], [-0.4, 0.2, 0.6], null, () => die(k, 0.15, C.gold, C.ink));
  });
const domeGeo = new SphereGeometry(0.345, 24, 16);
const domeMat = new MeshStandardMaterial({ color: "#bff4ff", transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.1, side: DoubleSide });

export function SicBo() {
  const seated = useSeated("sicbo"); // the in-world Stage tumbles the real dice under the dome
  const dice = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = dice.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.set(Math.sin(t * 13) * 0.025, Math.sin(t * 17) * 0.03, Math.cos(t * 11) * 0.025);
    g.rotation.set(t * 2.2, t * 3.1, t * 1.7);
  });
  return (
    <>
      <KitMeshes built={sicTable()} />
      <group position={[0, Y + 0.51, 0]}>
        {!seated && (
          <Spin axis="y" speed={0.6}>
            <KitMeshes built={sicCage()} />
          </Spin>
        )}
        <mesh geometry={domeGeo} material={domeMat} />
        {!seated && (
          <group ref={dice}>
            <KitMeshes built={sicDice()} />
          </group>
        )}
      </group>
      {!seated && <Halo position={[0, Y + 0.51, 0]} size={1.2} color="#7df9ff" opacity={0.25} />}
    </>
  );
}

/* ------------------------------ HIGHER / LOWER ------------------------------ */

const hlTable = (seated = false) =>
  kitCache(seated ? "hl-table-seated" : "hl-table", (k) => {
    tableOval(k, 1.15, 0.95, "#34318a", C.cyan, C.gold, "#26226a", "#5de6ff");
    // ascending row of cards
    const suits = ["c", "d", "s", "h", "d", "c", "h"] as const;
    for (let i = 0; i < 7 && !seated; i++) {
      const x = (i - 3) * 0.14;
      flatCard(k, x, Y + 0.002 + i * 0.001, 0.52 - Math.abs(i - 3) * 0.02, (i - 3) * -0.09, suits[i]);
    }
    k.box(0.5, 0.004, 0.12, C.green, [0.62, Y + 0.002, 0.1], { r: 0.01, rot: [0, -0.3, 0] });
    k.box(0.5, 0.004, 0.12, C.red, [-0.62, Y + 0.002, 0.1], { r: 0.01, rot: [0, 0.3, 0] });
    chipStack(k, 0.7, Y, 0.35, [C.green, C.green, C.paper]);
    chipStack(k, -0.7, Y, 0.35, [C.red, C.red, C.paper, C.red]);
    if (seated) return; // the Stage deals the real cards where the middle chips and the card stand are
    chipStack(k, 0, Y, 0.18, [C.cyan, C.gold, C.cyan]);
    // card stand
    k.box(0.22, 0.05, 0.22, C.goldDeep, [0, Y + 0.025, -0.35], { r: 0.02 });
    k.box(0.05, 0.4, 0.05, C.goldDeep, [0, Y + 0.2, -0.35], { r: 0.015 });
  });

const hlCard = () =>
  kitCache("hl-card", (k) => {
    bigCard(k, 0.54, 0.76, "s");
    k.at([0, 0, -0.0], [0, Math.PI, 0], null, () => {
      k.box(0.54, 0.76, 0.035, C.paper, [0, 0, 0], { r: 0.02 });
      k.box(0.46, 0.68, 0.01, C.violet, [0, 0, 0.02]);
      k.box(0.3, 0.46, 0.01, lighten(C.violet, 0.35), [0, 0, 0.03], { rot: [0, 0, Math.PI / 4], scale: [0.7, 1, 1] });
      k.sph(0.07, C.gold, [0, 0, 0.04], { seg: 10, layer: "glow", i: 1.6, scale: [1, 1, 0.4] });
    });
  });
const arrowUp = () =>
  kitCache("hl-up", (k) => {
    k.cone(0.2, 0.3, C.lime, [0, 0.22, 0], { layer: "glow", i: 1.6, seg: 4, rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.45] });
    k.box(0.13, 0.28, 0.07, C.lime, [0, -0.08, 0], { layer: "glow", i: 1.6, r: 0.02 });
  });
const arrowDown = () =>
  kitCache("hl-down", (k) => {
    k.cone(0.2, 0.3, "#ff5d6c", [0, -0.22, 0], { layer: "glow", i: 1.6, seg: 4, rot: [Math.PI, Math.PI / 4, 0], scale: [1, 1, 0.45] });
    k.box(0.13, 0.28, 0.07, "#ff5d6c", [0, 0.08, 0], { layer: "glow", i: 1.6, r: 0.02 });
  });

export function HigherLower() {
  const seated = useSeated("higherlower"); // the floating card, arrows and halos would block the seated view
  const card = useRef<Group>(null);
  const up = useRef<Group>(null);
  const down = useRef<Group>(null);
  const cardKit = useMemo(() => hlCard(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const u = (t % 5) / 5;
    const f = u < 0.2 ? u / 0.2 : 1;
    const e = f * f * (3 - 2 * f);
    const flips = Math.floor(t / 5);
    if (card.current) {
      card.current.rotation.y = (flips + e) * Math.PI;
      card.current.position.y = Y + 0.75 + Math.sin(f * Math.PI) * 0.12 + Math.sin(t * 1.6) * 0.02;
    }
    if (up.current) up.current.position.y = Y + 0.95 + Math.sin(t * 3) * 0.07;
    if (down.current) down.current.position.y = Y + 0.95 - Math.sin(t * 3) * 0.07;
  });
  if (seated) return <KitMeshes built={hlTable(true)} />;
  return (
    <>
      <KitMeshes built={hlTable()} />
      <group ref={card} position={[0, Y + 0.75, -0.35]}>
        <KitMeshes built={cardKit} />
      </group>
      <group ref={up} position={[0.62, Y + 0.95, -0.35]}>
        <KitMeshes built={arrowUp()} />
      </group>
      <group ref={down} position={[-0.62, Y + 0.95, -0.35]}>
        <KitMeshes built={arrowDown()} />
      </group>
      <Halo position={[0.62, Y + 0.95, -0.3]} size={0.9} color="#9be564" opacity={0.3} />
      <Halo position={[-0.62, Y + 0.95, -0.3]} size={0.9} color="#ff5d6c" opacity={0.3} />
    </>
  );
}

