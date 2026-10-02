"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DURATION = 1100; // matches FLIP_DURATION / the old .coin-3d transition

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

let headsTexture: THREE.CanvasTexture | null = null;
function getHeadsTexture(): THREE.CanvasTexture {
  if (headsTexture) return headsTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(95, 85, 10, 128, 128, 150);
  grad.addColorStop(0, "#fff6d9");
  grad.addColorStop(0.6, "#ffd54a");
  grad.addColorStop(1, "#9a6f10");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = "#3a2a00";
  ctx.font = "900 140px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("H", 128, 136);
  headsTexture = new THREE.CanvasTexture(canvas);
  headsTexture.needsUpdate = true;
  return headsTexture;
}

let tailsTexture: THREE.CanvasTexture | null = null;
function getTailsTexture(): THREE.CanvasTexture {
  if (tailsTexture) return tailsTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(95, 85, 10, 128, 128, 150);
  grad.addColorStop(0, "#f2f2f2");
  grad.addColorStop(0.6, "#b9b9b9");
  grad.addColorStop(1, "#6b6b6b");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = "#222222";
  ctx.font = "900 140px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("T", 128, 136);
  tailsTexture = new THREE.CanvasTexture(canvas);
  tailsTexture.needsUpdate = true;
  return tailsTexture;
}

/**
 * A real 3D coin: a short cylinder whose two caps carry canvas-texture H/T
 * faces. `rotation` is the same target-rotation-in-degrees value the page
 * already computes from the real server result before animating — this
 * component just tweens its own displayed rotation toward that target
 * instead of letting a CSS transition do it.
 */
export default function CoinScene3D({ rotation, flipping }: { rotation: number; flipping: boolean }) {
  const spinRef = useRef<THREE.Group>(null);
  const fromRef = useRef(0);
  const toRef = useRef(0);
  const startRef = useRef(Date.now());
  const prevRotationRef = useRef(rotation);
  const materials = useMemo<THREE.Material[]>(
    () => [
      new THREE.MeshStandardMaterial({ color: "#c9a227", metalness: 0.85, roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: getHeadsTexture(), metalness: 0.3, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ map: getTailsTexture(), metalness: 0.3, roughness: 0.4 }),
    ],
    []
  );

  useEffect(() => {
    if (rotation !== prevRotationRef.current) {
      fromRef.current = prevRotationRef.current;
      toRef.current = rotation;
      startRef.current = Date.now();
      prevRotationRef.current = rotation;
    }
  }, [rotation]);

  useFrame(() => {
    const g = spinRef.current;
    if (!g) return;
    const elapsed = Date.now() - startRef.current;
    const t = Math.min(1, elapsed / DURATION);
    const eased = easeOut(t);
    const current = fromRef.current + (toRef.current - fromRef.current) * eased;
    g.rotation.y = THREE.MathUtils.degToRad(current);

    if (flipping) {
      const arc = Math.sin(t * Math.PI);
      g.position.y = arc * 0.9;
      g.scale.setScalar(1 + arc * 0.08);
    } else {
      g.position.y = 0;
      g.scale.setScalar(1);
    }
  });

  return (
    <group position={[0, 0.3, 0]}>
      <group ref={spinRef}>
        {/* static tilt so the coin's flat faces point at the camera; the
            flip spin itself happens on the parent group around world Y */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow material={materials}>
            <cylinderGeometry args={[0.9, 0.9, 0.18, 48]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
