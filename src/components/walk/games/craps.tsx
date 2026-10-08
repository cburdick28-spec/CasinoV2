"use client";

import { useEffect } from "react";
import { useGameController } from "./useGameController";
import type { Vec3 } from "./bridge";

/** PLACEHOLDER: replaced by the real in-world craps. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.9, 2.4], target: [0, 0.95, 0] };

export function Controller() {
  const g = useGameController("craps");
  useEffect(() => {
    g.setBar({ status: "This table is being set up", hint: "Esc / W A S D to step away" });
  }, [g]);
  return null;
}
