"use client";

const COLORS = ["#ffd54a", "#ffb300", "#7c5cff", "#34d399", "#ff5470", "#4fd1ff"];

export default function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 60 });
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const duration = 2 + Math.random() * 1.5;
        const drift = (Math.random() - 0.5) * 200;
        const color = COLORS[i % COLORS.length];
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}vw`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              // @ts-expect-error custom property used by the confettiFall keyframe
              "--drift": `${drift}px`,
            }}
          />
        );
      })}
    </div>
  );
}
