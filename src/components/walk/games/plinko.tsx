"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import PlinkoScene3D from "@/components/three/PlinkoScene3D";
import { FONT_URL } from "../stations/common";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameSession, useGameView, type GameBar, type Vec3 } from "./bridge";

/** Facing the peg board; the board fills the upper-middle of the view. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.6, 2.6], target: [0, 1.05, 0] };

const ROWS = 12;
const MAX_BALLS = 10;
const BALL_COUNTS = [1, 2, 3, 5, 10].filter((n) => n <= MAX_BALLS);
const BALL_COLORS = ["#ffd54a", "#ff5470", "#34d399", "#60a5fa", "#c084fc", "#fb923c", "#f472b6", "#a3e635", "#22d3ee", "#f87171"];
type Risk = "low" | "medium" | "high";
const RISKS: Risk[] = ["low", "medium", "high"];

const MULTIPLIERS: Record<Risk, number[]> = {
  low: [8, 3, 1.5, 1.2, 1, 0.5, 0.3, 0.5, 1, 1.2, 1.5, 3, 8],
  medium: [24, 8, 3, 1.5, 0.7, 0.4, 0.2, 0.4, 0.7, 1.5, 3, 8, 24],
  high: [76, 15, 6, 2, 0.5, 0.2, 0.1, 0.2, 0.5, 2, 6, 15, 76],
};

/** Bucket colour by payout: red = jackpot, amber/green = win, blue = loss. */
function multColor(m: number): string {
  if (m >= 10) return "#ef4444";
  if (m >= 3) return "#f97316";
  if (m >= 1.2) return "#eab308";
  if (m >= 1) return "#22c55e";
  return "#3b82f6";
}

const money = (n: number) => `$${n.toLocaleString()}`;

interface BallResult {
  path: number[];
  bucket: number;
  multiplier: number;
  payout: number;
}
interface LiveBall {
  x: number;
  row: number;
  color: string;
}
interface View {
  risk: Risk;
  liveBalls: LiveBall[];
  landed: number[];
  /** Bumps on every drop so the scene remounts and the balls start at the hopper. */
  seq: number;
}

function barFor(risk: Risk, balls: number, bet: number, balance: number, status?: string): GameBar {
  const total = bet * balls;
  return {
    bet: true,
    status,
    choices: [
      { id: "risk", label: "Risk", items: RISKS.map((x) => ({ id: x, label: x[0].toUpperCase() + x.slice(1), active: x === risk })) },
      { id: "balls", label: "Balls", items: BALL_COUNTS.map((n) => ({ id: String(n), label: String(n), active: n === balls })) },
    ],
    buttons: [{ id: "drop", label: `Drop ${balls > 1 ? `${balls} Balls` : "Ball"} - ${money(total)}`, primary: true, disabled: total > balance }],
    hint: total > balance ? "Not enough balance for that many balls: lower the bet or ball count" : undefined,
  };
}

/* ------------------------------ DOM side: logic ------------------------------ */

export function Controller() {
  const g = useGameController("plinko");
  const bet = useGameSession((s) => s.bet);
  const balance = useGameSession((s) => s.balance);
  const [risk, setRisk] = useState<Risk>("medium");
  const [balls, setBalls] = useState(1);
  const [summary, setSummary] = useState<string | undefined>(undefined);
  const r = useRef({ seq: 0, live: [] as LiveBall[], landed: [] as number[], timer: null as ReturnType<typeof setTimeout> | null, dropping: false });

  const publishView = (riskNow: Risk) => {
    const s = r.current;
    g.setView({ risk: riskNow, liveBalls: s.live, landed: s.landed, seq: s.seq } satisfies View);
  };

  // Keep the bar (button label, affordability) in step with the bet stepper, balance and selections.
  useEffect(() => {
    g.update(barFor(risk, balls, bet, balance, summary));
  }, [g, risk, balls, bet, balance, summary]);

  // The board shows the multiplier table of the chosen risk.
  useEffect(() => {
    publishView(risk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risk]);

  useEffect(() => {
    const s = r.current;
    return () => {
      if (s.timer) clearTimeout(s.timer);
      s.timer = null;
      if (s.dropping) g.refresh(); // stood up mid-drop: the server already settled it
    };
  }, [g]);

  const drop = async () => {
    const s = r.current;
    if (s.dropping) return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    if (bet * balls > g.balance()) {
      g.message("lose", "Not enough balance for that many balls");
      return;
    }
    s.dropping = true;
    g.setBusy(true);
    g.clearMessage();
    setSummary(undefined);
    s.landed = [];
    const res = await g.request<{ results?: BallResult[]; totalStake?: number; totalPayout?: number; error?: string }>("POST", { bet, risk, balls });
    if (!res.ok || !res.data.results) {
      s.dropping = false;
      g.setBusy(false);
      g.message("lose", res.data.error || "Something went wrong");
      g.toast("lose", res.data.error || "Something went wrong");
      publishView(risk);
      return;
    }
    const results = res.data.results;
    const totalStake = res.data.totalStake ?? bet * balls;
    const totalPayout = res.data.totalPayout ?? 0;
    const table = MULTIPLIERS[risk];

    s.seq += 1;
    s.live = results.map((_, i) => ({ x: 50, row: -1, color: BALL_COLORS[i % BALL_COLORS.length] }));
    publishView(risk);

    // One row per 180 ms, from the server's real paths (same stepping as the page).
    let row = 0;
    const step = () => {
      if (row >= ROWS) {
        s.timer = null;
        s.dropping = false;
        s.landed = results.map((x) => x.bucket);
        publishView(risk);
        g.setBusy(false);
        const net = totalPayout - totalStake;
        const text = `${net >= 0 ? "+" : "-"}${money(Math.abs(net))} across ${results.length} ball${results.length === 1 ? "" : "s"}`;
        setSummary(`Landed: ${results.map((x) => `${x.multiplier}x`).join(", ")}`);
        g.message(net >= 0 ? "win" : "lose", text);
        g.toast(net >= 0 ? "win" : "lose", `${net >= 0 ? "+" : "-"}${money(Math.abs(net))}`);
        if (results.some((x) => x.multiplier >= Math.max(...table) * 0.5)) g.celebrate();
        g.refresh();
        return;
      }
      const at = row;
      s.live = s.live.map((b, i) => ({ ...b, x: b.x + (results[i].path[at] === 1 ? 1 : -1) * (50 / (ROWS + 2)), row: at }));
      publishView(risk);
      row++;
      s.timer = setTimeout(step, 180);
    };
    step();
  };

  useActionHandler((id) => {
    if (r.current.dropping) return;
    if (id === "drop") void drop();
    else if (id.startsWith("risk:")) {
      const x = id.slice(5) as Risk;
      if (RISKS.includes(x)) {
        r.current.landed = [];
        setSummary(undefined);
        setRisk(x);
      }
    } else if (id.startsWith("balls:")) {
      const n = Number(id.slice(6));
      if (BALL_COUNTS.includes(n)) setBalls(n);
    }
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

const HALF_W = 2.6;
const SPACING = 0.32;

/** The existing peg board standing in front of the station's panel, with the bucket multipliers painted in. */
export function Stage() {
  const v = useGameView<View>();
  const risk = v?.risk ?? "medium";
  const table = MULTIPLIERS[risk];
  const landed = v?.landed ?? [];
  const counts = table.map((_, i) => landed.filter((b) => b === i).length);
  const bottomY = (ROWS / 2) * SPACING + 0.4 - 0.4 - (ROWS - 1) * SPACING;
  return (
    <group position={[0, 1.41, 0.3]} scale={0.3}>
      <PlinkoScene3D key={v?.seq ?? 0} rows={ROWS} liveBalls={v?.liveBalls ?? []} bucketCount={table.length} bucketColors={table.map(multColor)} />
      <Suspense fallback={null}>
        <group position={[0, -0.9, 0]}>
          {table.map((m, i) => {
            const x = ((i + 0.5 - table.length / 2) / ((ROWS + 2) / 2)) * HALF_W;
            const hit = counts[i] > 0;
            return (
              <group key={i} position={[x, bottomY - 0.5, 0.16]}>
                {hit && (
                  <mesh position={[0, 0, -0.01]}>
                    <planeGeometry args={[0.36, 0.22]} />
                    <meshBasicMaterial color="#ffd54a" toneMapped={false} />
                  </mesh>
                )}
                <Text font={FONT_URL} fontSize={0.16} anchorX="center" anchorY="middle" color={hit ? "#1a1230" : "#fbefd5"} material-toneMapped={false}>
                  {`${m}x`}
                </Text>
                {counts[i] > 1 && (
                  <Text font={FONT_URL} position={[0.15, 0.12, 0.02]} fontSize={0.1} anchorX="center" anchorY="middle" color="#ff5470" outlineWidth={0.012} outlineColor="#ffffff" material-toneMapped={false}>
                    {`x${counts[i]}`}
                  </Text>
                )}
              </group>
            );
          })}
        </group>
      </Suspense>
    </group>
  );
}
