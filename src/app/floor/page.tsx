"use client";

import dynamic from "next/dynamic";
import GameShell from "@/components/GameShell";

// Three.js touches the WebGL canvas directly, so it can only run in the browser.
const CasinoFloor3D = dynamic(() => import("@/components/CasinoFloor3D"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-[18px] border border-[var(--border)] flex items-center justify-center text-muted"
      style={{ height: "70vh", minHeight: 420 }}
    >
      Building the floor...
    </div>
  ),
});

export default function FloorPage() {
  return (
    <GameShell title="3D Casino Floor" emoji={"\u{1F3DB}\u{FE0F}"} subtitle="Walk the floor in 3D and click a podium to jump into any game.">
      <CasinoFloor3D />
    </GameShell>
  );
}
