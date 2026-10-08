"use client";

import type { ComponentType } from "react";
import { STATIONS } from "./world";
import { C } from "./stations/kit";
import { StationFrame, StationsClock } from "./stations/common";
import { Crash, CoinFlip, HorseRacing, Limbo, Mines, Plinko } from "./stations/arcade";
import { Keno, Slots, VideoPoker, Wheel } from "./stations/slots";
import { Baccarat, Blackjack, Craps, HigherLower, Poker, Roulette, SicBo, War } from "./stations/tables";

interface Entry {
  name: string;
  signY: number;
  accent: string;
  Model: ComponentType;
}

const REGISTRY: Record<string, Entry> = {
  blackjack: { name: "Blackjack", signY: 2.55, accent: C.red, Model: Blackjack },
  poker: { name: "Texas Hold'em", signY: 2.75, accent: C.violet, Model: Poker },
  baccarat: { name: "Baccarat", signY: 2.95, accent: C.blue, Model: Baccarat },
  war: { name: "Casino War", signY: 3.25, accent: C.orange, Model: War },
  roulette: { name: "Roulette", signY: 2.75, accent: C.red, Model: Roulette },
  craps: { name: "Craps", signY: 2.65, accent: C.red, Model: Craps },
  sicbo: { name: "Sic Bo", signY: 2.4, accent: C.teal, Model: SicBo },
  higherlower: { name: "Higher / Lower", signY: 2.5, accent: C.cyan, Model: HigherLower },
  slots: { name: "Slots", signY: 3.15, accent: C.red, Model: Slots },
  videopoker: { name: "Video Poker", signY: 2.95, accent: C.cyan, Model: VideoPoker },
  keno: { name: "Keno", signY: 3.0, accent: C.pink, Model: Keno },
  wheel: { name: "Wheel", signY: 3.2, accent: C.gold, Model: Wheel },
  crash: { name: "Crash", signY: 3.55, accent: C.red, Model: Crash },
  limbo: { name: "Limbo", signY: 3.5, accent: C.pink, Model: Limbo },
  mines: { name: "Mines", signY: 2.95, accent: C.teal, Model: Mines },
  coinflip: { name: "Coin Flip", signY: 3.5, accent: C.gold, Model: CoinFlip },
  plinko: { name: "Plinko", signY: 3.75, accent: C.pink, Model: Plinko },
  "horse-racing": { name: "Horse Racing", signY: 2.7, accent: C.lime, Model: HorseRacing },
};

export default function Stations() {
  return (
    <group>
      <StationsClock />
      <hemisphereLight args={["#fff1d6", "#6a4a5a", 0.9]} />
      {STATIONS.map((s) => {
        const e = REGISTRY[s.slug];
        if (!e) return null;
        return (
          <StationFrame key={s.slug} station={s} name={e.name} signY={e.signY} accent={e.accent}>
            <e.Model />
          </StationFrame>
        );
      })}
    </group>
  );
}
