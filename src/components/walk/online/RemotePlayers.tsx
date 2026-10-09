"use client";

import { Suspense, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { FONT_URL } from "../stations/common";
import Avatar3D from "./Avatar3D";
import { usePlayers, type RemotePlayer } from "./presence";

/** Everyone else in the casino: positions are eased toward the latest server sample so 2-3 updates/s look smooth. */
function Remote({ p }: { p: RemotePlayer }) {
  const g = useRef<THREE.Group>(null);
  const walk = useRef(0);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const first = useRef(true);

  useFrame((_, dt) => {
    const grp = g.current;
    if (!grp) return;
    if (first.current) {
      grp.position.set(p.x, 0, p.z);
      grp.rotation.y = p.yaw;
      first.current = false;
    }
    const k = 1 - Math.exp(-dt * 8);
    const dx = p.x - grp.position.x;
    const dz = p.z - grp.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 6) grp.position.set(p.x, 0, p.z); // teleported (changed rooms)
    else {
      grp.position.x += dx * k;
      grp.position.z += dz * k;
    }
    // yaw is the camera heading (0 looks toward +z): the avatar faces +z, so it matches directly
    const dy = THREE.MathUtils.euclideanModulo(p.yaw - grp.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    grp.rotation.y += dy * k;
    walk.current = THREE.MathUtils.lerp(walk.current, dist > 0.05 && !p.seated ? 1 : 0, 1 - Math.exp(-dt * 10));
    const m = walk.current > 0.15;
    if (m !== movingRef.current) {
      movingRef.current = m;
      setMoving(m);
    }
  });

  return (
    <group ref={g}>
      <Avatar3D config={p.avatar} walk={moving ? 1 : 0} seated={!!p.seated} />
      <Suspense fallback={null}>
        <NameTag name={p.name} y={p.seated ? 1.62 : 1.95} />
      </Suspense>
    </group>
  );
}

function NameTag({ name, y }: { name: string; y: number }) {
  const ref = useRef<THREE.Group>(null);
  const parentQ = useRef(new THREE.Quaternion());
  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g?.parent) return;
    // face the camera regardless of how the avatar (parent) is turned
    g.parent.getWorldQuaternion(parentQ.current).invert();
    g.quaternion.copy(parentQ.current).multiply(camera.quaternion);
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <Text font={FONT_URL} fontSize={0.13} anchorX="center" anchorY="middle" color="#fff4d6" outlineWidth={0.012} outlineColor="#1a0f1c" material-toneMapped={false}>
        {name}
      </Text>
    </group>
  );
}

export default function RemotePlayers() {
  const players = usePlayers();
  return (
    <>
      {players.map((p) => (
        <Remote key={p.id} p={p} />
      ))}
    </>
  );
}
