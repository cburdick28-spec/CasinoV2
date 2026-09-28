import { shuffle } from "@/lib/rng";

export const GRID_SIZE = 25; // 5x5 board
export const MIN_MINES = 1;
export const MAX_MINES = 24;
const HOUSE_EDGE = 0.97;

export interface MinesState {
  bet: number;
  minesCount: number;
  mines: number[]; // hidden tile indices holding a mine — never sent to the client mid-round
  revealed: number[];
}

/** Fair-odds multiplier for having safely revealed `revealed` tiles out of `GRID_SIZE`, with `minesCount` mines, scaled by a house edge. */
export function multiplierFor(minesCount: number, revealed: number): number {
  let mult = 1;
  for (let i = 0; i < revealed; i++) {
    mult *= (GRID_SIZE - i) / (GRID_SIZE - minesCount - i);
  }
  return mult * HOUSE_EDGE;
}

export function newMines(minesCount: number): number[] {
  const positions = shuffle(Array.from({ length: GRID_SIZE }, (_, i) => i));
  return positions.slice(0, minesCount).sort((a, b) => a - b);
}

export function currentPayout(state: MinesState): number {
  return Math.floor(state.bet * multiplierFor(state.minesCount, state.revealed.length));
}
