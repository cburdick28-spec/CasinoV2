import type { ComponentType } from "react";
import type { Vec3 } from "./bridge";
import * as slots from "./slots";
import * as blackjack from "./blackjack";
import * as poker from "./poker";
import * as baccarat from "./baccarat";
import * as war from "./war";
import * as roulette from "./roulette";
import * as craps from "./craps";
import * as sicbo from "./sicbo";
import * as higherlower from "./higherlower";
import * as videopoker from "./videopoker";
import * as keno from "./keno";
import * as wheel from "./wheel";
import * as crash from "./crash";
import * as limbo from "./limbo";
import * as mines from "./mines";
import * as coinflip from "./coinflip";
import * as plinko from "./plinko";
import * as horseracing from "./horse-racing";

/** What every in-world game module exports. */
export interface GameModule {
  /** Seated camera, in the station's local space (the station faces +z, metres, y up). */
  camera: { eye: Vec3; target: Vec3 };
  /** DOM-side logic: talks to /api/games/<slug>, drives the bar and the view. Mounted while seated. */
  Controller: ComponentType;
  /** R3F scene content in the station's local space, mounted while seated (reads useGameView). */
  Stage?: ComponentType;
}

export const GAME_MODULES: Record<string, GameModule> = {
  "slots": slots,
  "blackjack": blackjack,
  "poker": poker,
  "baccarat": baccarat,
  "war": war,
  "roulette": roulette,
  "craps": craps,
  "sicbo": sicbo,
  "higherlower": higherlower,
  "videopoker": videopoker,
  "keno": keno,
  "wheel": wheel,
  "crash": crash,
  "limbo": limbo,
  "mines": mines,
  "coinflip": coinflip,
  "plinko": plinko,
  "horse-racing": horseracing,
};

export const isInWorldGame = (slug: string | null | undefined): slug is string => !!slug && slug in GAME_MODULES;
