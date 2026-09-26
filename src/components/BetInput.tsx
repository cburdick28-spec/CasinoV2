"use client";

export default function BetInput({
  bet,
  setBet,
  max,
  disabled,
}: {
  bet: number;
  setBet: (n: number) => void;
  max: number;
  disabled?: boolean;
}) {
  const presets = [10, 25, 100, 500];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-muted">Bet</label>
      <input
        type="number"
        min={1}
        max={max}
        value={bet}
        disabled={disabled}
        onChange={(e) => setBet(Math.max(1, Math.min(max, Math.floor(Number(e.target.value) || 1))))}
        className="w-28"
      />
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled || p > max}
          className="btn btn-ghost !py-1 !px-2 text-xs"
          onClick={() => setBet(Math.min(max, p))}
        >
          ${p}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled || max < 1}
        className="btn btn-ghost !py-1 !px-2 text-xs"
        onClick={() => setBet(max)}
      >
        Max
      </button>
    </div>
  );
}
