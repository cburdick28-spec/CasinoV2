/**
 * Layout contract for the walkable casino. Units are metres, y is up, the floor
 * plane is x/z. Everything that places or collides with something reads from here
 * so the controller, room art, stations and minimap can never disagree.
 *
 *                      N (-z)
 *              +-----------------+
 *              |   TABLE ROOM    |   x -16..16, z -34..-10
 *              +------[door]-----+
 *   +----------+                 +----------+
 *   | SLOTS    [door] LOBBY [door]  ARCADE   |
 *   | HALL     |    (hub)        |  (HIGH    |
 *   +----------+                 +  ROLLER)  +
 *                 +---------+
 *                 | spawn   |   (south wall is solid)
 *                 +---------+
 */

export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export type RoomId = "lobby" | "tables" | "slots" | "arcade";

export interface Room {
  id: RoomId;
  name: string;
  tagline: string;
  bounds: Bounds;
  height: number;
  /** Palette the room builder should use. Warm and painterly, one accent per room. */
  theme: { floor: string; wall: string; trim: string; accent: string; light: string; ambient: string };
}

export type DoorAxis = "x" | "z";

export interface Door {
  id: string;
  between: [RoomId, RoomId];
  /** Centre of the opening on the floor plane. */
  center: [number, number];
  /** "x" means the wall runs along x (door in a north/south wall); "z" means it runs along z. */
  axis: DoorAxis;
  width: number;
  height: number;
}

export interface Station {
  slug: string; // matches /games/<slug>
  room: RoomId;
  position: [number, number];
  /** Radians. 0 faces +z (south), Math.PI faces -z (north), Math.PI/2 faces +x. */
  yaw: number;
  /** The player gets an "E to play" prompt inside this distance of the centre. */
  interactRadius: number;
  /** Solid circle the player cannot walk into. */
  colliderRadius: number;
}

export interface Prop {
  id: string;
  room: RoomId;
  position: [number, number];
  colliderRadius: number;
}

export const WALL_THICKNESS = 0.4;
export const EYE_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.35;
export const DOOR_WIDTH = 4;
export const DOOR_HEIGHT = 3.4;

export const ROOMS: Record<RoomId, Room> = {
  lobby: {
    id: "lobby",
    name: "Grand Lobby",
    tagline: "Where every night begins",
    bounds: { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },
    height: 7,
    theme: { floor: "#7a2f3a", wall: "#d9b88a", trim: "#f4c95d", accent: "#ffb347", light: "#ffd9a0", ambient: "#3a2230" },
  },
  tables: {
    id: "tables",
    name: "Table Room",
    tagline: "Cards, dice and the wheel",
    bounds: { minX: -16, maxX: 16, minZ: -34, maxZ: -10 },
    height: 6,
    theme: { floor: "#164a3a", wall: "#8a5a3c", trim: "#d9a441", accent: "#37c98f", light: "#ffe2b0", ambient: "#10261f" },
  },
  slots: {
    id: "slots",
    name: "Slots Hall",
    tagline: "Reels, jackpots and keno",
    bounds: { minX: -36, maxX: -12, minZ: -9, maxZ: 9 },
    height: 5.5,
    theme: { floor: "#3b2a6b", wall: "#5b3f8f", trim: "#ff8fd1", accent: "#b78cff", light: "#ffc8ee", ambient: "#1c1233" },
  },
  arcade: {
    id: "arcade",
    name: "High Roller Arcade",
    tagline: "Crash, limbo, mines and more",
    bounds: { minX: 12, maxX: 36, minZ: -9, maxZ: 9 },
    height: 5.5,
    theme: { floor: "#0f4a5c", wall: "#1d6f86", trim: "#7df9ff", accent: "#35e0c2", light: "#bff6ff", ambient: "#0a2230" },
  },
};

export const ROOM_ORDER: RoomId[] = ["lobby", "tables", "slots", "arcade"];

export const DOORS: Door[] = [
  { id: "lobby-tables", between: ["lobby", "tables"], center: [0, -10], axis: "x", width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { id: "lobby-slots", between: ["lobby", "slots"], center: [-12, 0], axis: "z", width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { id: "lobby-arcade", between: ["lobby", "arcade"], center: [12, 0], axis: "z", width: DOOR_WIDTH, height: DOOR_HEIGHT },
];

/** Where the player starts: south end of the lobby, looking north at the centrepiece. */
export const SPAWN = { x: 0, z: 7, yaw: Math.PI };

export const STATIONS: Station[] = [
  // Table Room: two rows of four, centre aisle stays clear for walking in from the lobby
  { slug: "blackjack", room: "tables", position: [-12, -20], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },
  { slug: "poker", room: "tables", position: [-4, -20], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },
  { slug: "baccarat", room: "tables", position: [4, -20], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },
  { slug: "war", room: "tables", position: [12, -20], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },
  { slug: "roulette", room: "tables", position: [-12, -29], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },
  { slug: "craps", room: "tables", position: [-4, -29], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },
  { slug: "sicbo", room: "tables", position: [4, -29], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },
  { slug: "higherlower", room: "tables", position: [12, -29], yaw: 0, interactRadius: 3.4, colliderRadius: 1.5 },

  // Slots Hall: machines on the north and south sides, centre line (z = 0) clear
  { slug: "slots", room: "slots", position: [-30, -5], yaw: 0, interactRadius: 3.2, colliderRadius: 1.2 },
  { slug: "videopoker", room: "slots", position: [-18, -5], yaw: 0, interactRadius: 3.2, colliderRadius: 1.2 },
  { slug: "keno", room: "slots", position: [-30, 5], yaw: Math.PI, interactRadius: 3.2, colliderRadius: 1.2 },
  { slug: "wheel", room: "slots", position: [-18, 5], yaw: Math.PI, interactRadius: 3.2, colliderRadius: 1.2 },

  // High Roller Arcade: two rows of three
  { slug: "crash", room: "arcade", position: [20, -5], yaw: 0, interactRadius: 3.2, colliderRadius: 1.3 },
  { slug: "limbo", room: "arcade", position: [26, -5], yaw: 0, interactRadius: 3.2, colliderRadius: 1.3 },
  { slug: "mines", room: "arcade", position: [32, -5], yaw: 0, interactRadius: 3.2, colliderRadius: 1.3 },
  { slug: "coinflip", room: "arcade", position: [20, 5], yaw: Math.PI, interactRadius: 3.2, colliderRadius: 1.3 },
  { slug: "plinko", room: "arcade", position: [26, 5], yaw: Math.PI, interactRadius: 3.2, colliderRadius: 1.3 },
  { slug: "horse-racing", room: "arcade", position: [32, 5], yaw: Math.PI, interactRadius: 3.2, colliderRadius: 1.3 },
];

/** Large set pieces that block walking but are not games. Room builders put art here. */
export const PROPS: Prop[] = [
  { id: "lobby-centrepiece", room: "lobby", position: [0, -1], colliderRadius: 2.8 },
  { id: "lobby-pillar-nw", room: "lobby", position: [-8, -6], colliderRadius: 0.7 },
  { id: "lobby-pillar-ne", room: "lobby", position: [8, -6], colliderRadius: 0.7 },
  { id: "lobby-pillar-sw", room: "lobby", position: [-8, 6], colliderRadius: 0.7 },
  { id: "lobby-pillar-se", room: "lobby", position: [8, 6], colliderRadius: 0.7 },
];

/** Axis aligned wall box used for collision and for drawing wall geometry. */
export interface WallBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  room: RoomId;
}

type Side = "north" | "south" | "west" | "east";

/** Sides each room is responsible for, so shared walls are only built once. */
const OWNED_SIDES: Record<RoomId, Side[]> = {
  lobby: ["north", "south", "west", "east"],
  tables: ["north", "west", "east", "south"], // south is shared with the lobby's north wall, handled below
  slots: ["north", "south", "west"],
  arcade: ["north", "south", "east"],
};

function sideSegments(room: Room, side: Side): { fixed: number; from: number; to: number; alongX: boolean } {
  const b = room.bounds;
  switch (side) {
    case "north":
      return { fixed: b.minZ, from: b.minX, to: b.maxX, alongX: true };
    case "south":
      return { fixed: b.maxZ, from: b.minX, to: b.maxX, alongX: true };
    case "west":
      return { fixed: b.minX, from: b.minZ, to: b.maxZ, alongX: false };
    case "east":
      return { fixed: b.maxX, from: b.minZ, to: b.maxZ, alongX: false };
  }
}

/** Cuts door gaps out of a straight wall run and returns the solid pieces. */
function cutDoors(from: number, to: number, gaps: [number, number][]): [number, number][] {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  const pieces: [number, number][] = [];
  let cursor = from;
  for (const [g0, g1] of sorted) {
    if (g0 > cursor) pieces.push([cursor, g0]);
    cursor = Math.max(cursor, g1);
  }
  if (cursor < to) pieces.push([cursor, to]);
  return pieces;
}

function buildWalls(): WallBox[] {
  const walls: WallBox[] = [];
  const t = WALL_THICKNESS / 2;
  for (const id of ROOM_ORDER) {
    const room = ROOMS[id];
    for (const side of OWNED_SIDES[id]) {
      const { fixed, from, to, alongX } = sideSegments(room, side);
      let gaps: [number, number][] = DOORS.filter((d) => {
        if (!d.between.includes(id)) return false;
        if (alongX) return d.axis === "x" && Math.abs(d.center[1] - fixed) < 0.01;
        return d.axis === "z" && Math.abs(d.center[0] - fixed) < 0.01;
      }).map((d) => {
        const c = alongX ? d.center[0] : d.center[1];
        return [c - d.width / 2, c + d.width / 2];
      });
      // The Table Room is wider than the lobby. Its south wall only needs the two stubs
      // outside the lobby's span, because the lobby's own north wall already covers the rest.
      if (id === "tables" && side === "south") {
        gaps = [[ROOMS.lobby.bounds.minX, ROOMS.lobby.bounds.maxX]];
      }
      cutDoors(from, to, gaps).forEach(([a, b], i) => {
        walls.push({
          id: `${id}-${side}-${i}`,
          minX: alongX ? a : fixed - t,
          maxX: alongX ? b : fixed + t,
          minZ: alongX ? fixed - t : a,
          maxZ: alongX ? fixed + t : b,
          height: room.height,
          room: id,
        });
      });
    }
  }
  return walls;
}

export const WALLS: WallBox[] = buildWalls();

export function roomAt(x: number, z: number): RoomId | null {
  for (const id of ROOM_ORDER) {
    const b = ROOMS[id].bounds;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return id;
  }
  return null;
}

export function stationBySlug(slug: string): Station | undefined {
  return STATIONS.find((s) => s.slug === slug);
}

/** Overall extent of the building, handy for the minimap. */
export const WORLD_BOUNDS: Bounds = {
  minX: Math.min(...ROOM_ORDER.map((r) => ROOMS[r].bounds.minX)),
  maxX: Math.max(...ROOM_ORDER.map((r) => ROOMS[r].bounds.maxX)),
  minZ: Math.min(...ROOM_ORDER.map((r) => ROOMS[r].bounds.minZ)),
  maxZ: Math.max(...ROOM_ORDER.map((r) => ROOMS[r].bounds.maxZ)),
};
