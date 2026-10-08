"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// Three.js touches WebGL directly, so the walk only runs in the browser.
// This loading placeholder sits outside any Canvas, so a div is fine here.
const CasinoWalk = dynamic(() => import("@/components/walk/CasinoWalk"), {
  ssr: false,
  loading: () => (
    <div
      className="flex w-full items-center justify-center text-muted"
      style={{ height: "calc(100vh - 140px)", minHeight: 520, borderRadius: 18, background: "#1a0f1c", border: "1px solid var(--border)" }}
    >
      Unlocking the doors...
    </div>
  ),
});

export default function FloorPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-3 py-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <h1 className="text-lg font-extrabold gold-text">Walk the Casino</h1>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; Back to the lobby
        </Link>
      </div>
      <CasinoWalk />
    </div>
  );
}
