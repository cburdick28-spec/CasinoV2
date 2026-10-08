import type { SlotResult } from "./slotMachines";

/** The reels announce when a round has fully settled; the slots Controller listens and reveals the result. */
type SettleListener = (machineId: string, result: SlotResult) => void;
const settleListeners = new Set<SettleListener>();

export function onSlotSettled(fn: SettleListener) {
  settleListeners.add(fn);
  return () => {
    settleListeners.delete(fn);
  };
}

export function notifySlotSettled(machineId: string, result: SlotResult) {
  settleListeners.forEach((l) => l(machineId, result));
}
