"use client";

import { Brackets, Crates, Lanterns, Plants } from "./rooms/kit";
import { CRATES, PLANTS } from "./rooms/placements";
import Shell, { DOOR_LANTERNS } from "./rooms/Shell";
import Lobby, { LOBBY_BRACKETS, LOBBY_LANTERNS } from "./rooms/Lobby";
import Tables, { TABLES_BRACKETS, TABLES_LANTERNS } from "./rooms/Tables";
import Slots, { SLOTS_BRACKETS, SLOTS_LANTERNS } from "./rooms/Slots";
import Arcade, { ARCADE_BRACKETS, ARCADE_LANTERNS } from "./rooms/Arcade";

const ALL_LANTERNS = [...DOOR_LANTERNS, ...LOBBY_LANTERNS, ...TABLES_LANTERNS, ...SLOTS_LANTERNS, ...ARCADE_LANTERNS];
const ALL_BRACKETS = [...LOBBY_BRACKETS, ...TABLES_BRACKETS, ...SLOTS_BRACKETS, ...ARCADE_BRACKETS];
const ALL_PLANTS = [...PLANTS.lobby, ...PLANTS.tables, ...PLANTS.slots, ...PLANTS.arcade];

/**
 * The whole building. Light budget (7 real lights, none cast shadows):
 *   1 hemisphere, 1 directional fill, lobby point, 2 table-room points, slots point, arcade point.
 * Everything else that looks lit is emissive geometry plus additive halo billboards.
 * Plants, lanterns and crates are batched across all rooms so they cost a few draw calls in total.
 */
export default function Rooms() {
  return (
    <>
      <hemisphereLight args={["#ffe9cf", "#5a3040", 1.15]} />
      <directionalLight position={[6, 14, 8]} intensity={0.55} color="#fff0d8" />
      <pointLight position={[0, 5.2, -1]} color="#ffd9a0" intensity={80} distance={26} decay={1.6} />
      <pointLight position={[0, 4.8, -16]} color="#ffe2b0" intensity={120} distance={26} decay={1.6} />
      <pointLight position={[0, 4.8, -28]} color="#ffe2b0" intensity={110} distance={26} decay={1.6} />
      <pointLight position={[-24, 4.0, 0]} color="#ffb4ea" intensity={130} distance={28} decay={1.5} />
      <pointLight position={[24, 4.0, 0]} color="#b4f4ff" intensity={130} distance={28} decay={1.5} />
      <Shell />
      <Lobby />
      <Tables />
      <Slots />
      <Arcade />
      <Plants spots={ALL_PLANTS} />
      <Crates spots={CRATES} />
      <Lanterns items={ALL_LANTERNS} halo={1.6} />
      <Brackets items={ALL_BRACKETS} />
    </>
  );
}
