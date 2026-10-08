import * as THREE from "three";

/**
 * Procedural canvas textures. Everything is created lazily on first use (client only)
 * and cached at module level so a re-mount never repaints anything.
 */
type G = CanvasRenderingContext2D;
const cache = new Map<string, THREE.CanvasTexture>();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tex(
  key: string,
  w: number,
  h: number,
  draw: (g: G, w: number, h: number) => void,
  opts: { repeat?: boolean; srgb?: boolean } = {}
): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

/** Calls fn for the 3x3 neighbourhood so features that cross the tile edge wrap seamlessly. */
function wrap9(w: number, h: number, fn: (dx: number, dy: number) => void) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy);
}

export function mix(a: string, b: string, t: number): string {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(THREE.SRGBColorSpace);
}

function speckle(g: G, w: number, h: number, seed: number, n: number, light: string, dark: string, alpha = 0.1) {
  const r = rng(seed);
  g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() > 0.5 ? light : dark;
    const s = r() < 0.15 ? 2 : 1;
    g.fillRect(r() * w, r() * h, s, s);
  }
  g.globalAlpha = 1;
}

function diamond(g: G, x: number, y: number, rx: number, ry: number) {
  g.beginPath();
  g.moveTo(x, y - ry);
  g.lineTo(x + rx, y);
  g.lineTo(x, y + ry);
  g.lineTo(x - rx, y);
  g.closePath();
}

function star4(g: G, x: number, y: number, r: number, pinch = 0.28) {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * pinch;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

/* ------------------------------------------------------------------ floors */

/** Lobby: burgundy carpet with a gold diamond lattice and rosettes. One tile = 4m. */
export function lobbyCarpet() {
  return tex("lobby-carpet", 512, 512, (g, w, h) => {
    const base = "#7a2f3a";
    const gold = "#e8b955";
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const grad = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, "rgba(255,170,120,0.10)");
    grad.addColorStop(1, "rgba(30,0,10,0.18)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    wrap9(w, h, (dx, dy) => {
      g.save();
      g.translate(dx, dy);
      for (let k = -4; k <= 6; k++) {
        g.strokeStyle = "rgba(232,185,85,0.7)";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(0, 256 * k);
        g.lineTo(512, 512 + 256 * k);
        g.stroke();
        g.beginPath();
        g.moveTo(0, 256 * k);
        g.lineTo(512, 256 * k - 512);
        g.stroke();
      }
      for (let a = 0; a <= 4; a++)
        for (let b = 0; b <= 4; b++) {
          const x = 128 * a;
          const y = 128 * b;
          if ((a + b) % 2 === 0) {
            g.fillStyle = "#4a1522";
            g.beginPath();
            g.arc(x, y, 17, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = gold;
            for (let p = 0; p < 4; p++) {
              g.beginPath();
              g.ellipse(x + Math.cos((p * Math.PI) / 2) * 8, y + Math.sin((p * Math.PI) / 2) * 8, 7, 4, (p * Math.PI) / 2, 0, Math.PI * 2);
              g.fill();
            }
            g.fillStyle = "#4a1522";
            g.beginPath();
            g.arc(x, y, 3.5, 0, Math.PI * 2);
            g.fill();
          } else {
            g.fillStyle = "rgba(255,200,150,0.07)";
            diamond(g, x, y, 46, 46);
            g.fill();
            g.strokeStyle = "rgba(232,185,85,0.55)";
            g.lineWidth = 2;
            diamond(g, x, y, 36, 36);
            g.stroke();
            g.fillStyle = gold;
            star4(g, x, y, 12, 0.35);
            g.fill();
          }
        }
      g.restore();
    });
    speckle(g, w, h, 11, 6000, "#ffd0b0", "#1a0008", 0.14);
  });
}

/** Table Room: felt-green carpet with a brass inlay frame and medallion. One tile = 4m. */
export function feltBrass() {
  return tex("felt-brass", 512, 512, (g, w, h) => {
    g.fillStyle = "#164a3a";
    g.fillRect(0, 0, w, h);
    const grad = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.62);
    grad.addColorStop(0, "rgba(70,190,140,0.30)");
    grad.addColorStop(1, "rgba(0,20,10,0.20)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 3, 9000, "#7fe0b0", "#021a10", 0.12);
    const brass = (a = 1) => `rgba(225,172,70,${a})`;
    wrap9(w, h, (dx, dy) => {
      g.save();
      g.translate(dx, dy);
      g.strokeStyle = brass();
      g.lineWidth = 6;
      g.strokeRect(22, 22, w - 44, h - 44);
      g.strokeStyle = brass(0.55);
      g.lineWidth = 2;
      g.strokeRect(36, 36, w - 72, h - 72);
      g.strokeStyle = brass(0.8);
      g.lineWidth = 3;
      diamond(g, w / 2, h / 2, w / 2 - 36, h / 2 - 36);
      g.stroke();
      diamond(g, w / 2, h / 2, w / 2 - 110, h / 2 - 110);
      g.stroke();
      g.beginPath();
      g.arc(w / 2, h / 2, 58, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = brass();
      star4(g, w / 2, h / 2, 40, 0.3);
      g.fill();
      g.fillStyle = "#164a3a";
      g.beginPath();
      g.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
      g.fill();
      for (const [cx, cy] of [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ]) {
        g.fillStyle = brass();
        g.beginPath();
        g.arc(cx, cy, 30, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#164a3a";
        g.beginPath();
        g.arc(cx, cy, 20, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = brass();
        star4(g, cx, cy, 16, 0.4);
        g.fill();
      }
      g.restore();
    });
  });
}

/** Slots Hall: dark violet carpet with neon flecks. Returns the colour map and an emissive map. One tile = 3m. */
export function neonCarpet() {
  const flecks = (key: string, emissive: boolean) =>
    tex(key, 512, 512, (g, w, h) => {
      g.fillStyle = emissive ? "#000" : "#1d1244";
      g.fillRect(0, 0, w, h);
      if (!emissive) {
        const grad = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, "rgba(120,70,200,0.22)");
        grad.addColorStop(1, "rgba(10,0,30,0.25)");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        speckle(g, w, h, 5, 8000, "#9a7aff", "#07021a", 0.12);
        g.strokeStyle = "rgba(160,120,255,0.18)";
        g.lineWidth = 2;
        wrap9(w, h, (dx, dy) => {
          g.save();
          g.translate(dx, dy);
          for (let k = -2; k <= 4; k++) {
            g.beginPath();
            g.moveTo(0, 256 * k);
            g.lineTo(512, 256 * k + 512);
            g.stroke();
            g.beginPath();
            g.moveTo(0, 256 * k);
            g.lineTo(512, 256 * k - 512);
            g.stroke();
          }
          g.restore();
        });
      }
      const r = rng(77);
      const cols = ["#ff8fd1", "#7df9ff", "#ffd166", "#b78cff", "#ff8fd1"];
      for (let i = 0; i < 70; i++) {
        const x = r() * w;
        const y = r() * h;
        const col = cols[Math.floor(r() * cols.length)];
        const kind = r();
        const size = 4 + r() * 9;
        wrap9(w, h, (dx, dy) => {
          const px = x + dx;
          const py = y + dy;
          if (px < -20 || py < -20 || px > w + 20 || py > h + 20) return;
          g.fillStyle = col;
          g.strokeStyle = col;
          g.globalAlpha = emissive ? 0.9 : 0.85;
          if (kind < 0.35) {
            star4(g, px, py, size * 1.4, 0.22);
            g.fill();
          } else if (kind < 0.6) {
            g.beginPath();
            g.arc(px, py, size * 0.4, 0, Math.PI * 2);
            g.fill();
          } else if (kind < 0.85) {
            g.lineWidth = 3;
            g.lineCap = "round";
            const a = r() * Math.PI;
            g.beginPath();
            g.moveTo(px - Math.cos(a) * size, py - Math.sin(a) * size);
            g.lineTo(px + Math.cos(a) * size, py + Math.sin(a) * size);
            g.stroke();
          } else {
            g.lineWidth = 2.5;
            g.beginPath();
            g.arc(px, py, size * 0.7, 0, Math.PI * 2);
            g.stroke();
          }
          g.globalAlpha = 1;
        });
      }
    });
  return { map: flecks("neon-carpet", false), glow: flecks("neon-carpet-glow", true) };
}

/** Arcade: glossy teal tiles with bevels, inlays and a sheen. One tile = 3m (2x2 big tiles). */
export function glossTiles() {
  return tex("gloss-tiles", 512, 512, (g, w, h) => {
    const s = w / 2;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const dark = (i + j) % 2 === 0;
        const x = i * s;
        const y = j * s;
        g.fillStyle = dark ? "#0d4254" : "#16708a";
        g.fillRect(x, y, s, s);
        const gr = g.createLinearGradient(x, y, x + s, y + s);
        gr.addColorStop(0, "rgba(255,255,255,0.20)");
        gr.addColorStop(0.5, "rgba(255,255,255,0.02)");
        gr.addColorStop(1, "rgba(0,0,0,0.28)");
        g.fillStyle = gr;
        g.fillRect(x, y, s, s);
        g.strokeStyle = dark ? "rgba(125,249,255,0.35)" : "rgba(255,200,120,0.35)";
        g.lineWidth = 3;
        diamond(g, x + s / 2, y + s / 2, s * 0.34, s * 0.34);
        g.stroke();
        g.fillStyle = dark ? "rgba(125,249,255,0.5)" : "rgba(255,190,100,0.55)";
        star4(g, x + s / 2, y + s / 2, 16, 0.3);
        g.fill();
        // glossy sheen band
        g.fillStyle = "rgba(255,255,255,0.07)";
        g.beginPath();
        g.moveTo(x, y + s * 0.62);
        g.lineTo(x + s * 0.4, y);
        g.lineTo(x + s * 0.62, y);
        g.lineTo(x, y + s * 0.84);
        g.fill();
      }
    g.strokeStyle = "#06222c";
    g.lineWidth = 6;
    g.strokeRect(0, 0, w, h);
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    speckle(g, w, h, 9, 2500, "#ffffff", "#000000", 0.06);
  });
}

/* ------------------------------------------------------------------ walls */

export type WallKind = "lobby" | "tables" | "slots" | "arcade";

/** Wainscot panel texture. One tile = 1.5m x 1.1m. */
export function wainscot(kind: WallKind) {
  return tex("wainscot-" + kind, 512, 376, (g, w, h) => {
    if (kind === "lobby") {
      g.fillStyle = "#8c3f45";
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, 21, 3000, "#ffb59a", "#2a0508", 0.08);
      const panel = (x: number) => {
        g.fillStyle = "#a0474e";
        g.fillRect(x + 34, 34, w / 2 - 68, h - 68);
        g.strokeStyle = "#f0c866";
        g.lineWidth = 5;
        g.strokeRect(x + 34, 34, w / 2 - 68, h - 68);
        g.strokeStyle = "rgba(255,230,170,0.55)";
        g.lineWidth = 2;
        g.strokeRect(x + 52, 52, w / 2 - 104, h - 104);
        g.fillStyle = "#f0c866";
        diamond(g, x + w / 4, h / 2, 22, 30);
        g.fill();
        g.fillStyle = "#6a2a30";
        diamond(g, x + w / 4, h / 2, 10, 15);
        g.fill();
      };
      panel(0);
      panel(w / 2);
    } else if (kind === "tables") {
      g.fillStyle = "#5a3520";
      g.fillRect(0, 0, w, h);
      const r = rng(31);
      for (let i = 0; i < 90; i++) {
        g.strokeStyle = r() > 0.5 ? "rgba(255,200,140,0.07)" : "rgba(20,5,0,0.16)";
        g.lineWidth = 1 + r() * 2;
        const x = r() * w;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + 10, h * 0.3, x - 10, h * 0.7, x + 4, h);
        g.stroke();
      }
      const panel = (x: number) => {
        g.fillStyle = "rgba(255,190,120,0.10)";
        g.fillRect(x + 36, 36, w / 2 - 72, h - 72);
        g.strokeStyle = "#2a1408";
        g.lineWidth = 8;
        g.strokeRect(x + 36, 36, w / 2 - 72, h - 72);
        g.strokeStyle = "#c98f45";
        g.lineWidth = 3;
        g.strokeRect(x + 46, 46, w / 2 - 92, h - 92);
        g.fillStyle = "#e5b455";
        for (const [px, py] of [
          [x + 60, 60],
          [x + w / 2 - 60, 60],
          [x + 60, h - 60],
          [x + w / 2 - 60, h - 60],
        ]) {
          g.beginPath();
          g.arc(px, py, 5, 0, Math.PI * 2);
          g.fill();
        }
      };
      panel(0);
      panel(w / 2);
    } else if (kind === "slots") {
      g.fillStyle = "#3a2370";
      g.fillRect(0, 0, w, h);
      const cw = w / 4;
      const ch = h / 3;
      for (let i = -1; i < 5; i++)
        for (let j = -1; j < 4; j++) {
          const cx = i * cw + (j % 2 ? cw / 2 : 0);
          const cy = j * ch + ch / 2;
          const gr = g.createRadialGradient(cx, cy, 4, cx, cy, cw * 0.55);
          gr.addColorStop(0, "rgba(190,140,255,0.55)");
          gr.addColorStop(1, "rgba(20,5,60,0.55)");
          g.fillStyle = gr;
          diamond(g, cx, cy, cw / 2, ch / 2 + 6);
          g.fill();
          g.strokeStyle = "rgba(15,0,50,0.8)";
          g.lineWidth = 3;
          g.stroke();
          g.fillStyle = "#ff8fd1";
          g.beginPath();
          g.arc(cx, cy, 4, 0, Math.PI * 2);
          g.fill();
        }
    } else {
      g.fillStyle = "#0f5a70";
      g.fillRect(0, 0, w, h);
      const panel = (x: number) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#1a7e98");
        gr.addColorStop(1, "#0d4f63");
        g.fillStyle = gr;
        g.fillRect(x + 12, 12, w / 2 - 24, h - 24);
        g.strokeStyle = "#7df9ff";
        g.lineWidth = 3;
        g.strokeRect(x + 28, 28, w / 2 - 56, h - 90);
        g.fillStyle = "#ffb347";
        g.fillRect(x + 12, h - 40, w / 2 - 24, 14);
        g.fillStyle = "#1c1008";
        for (let i = 0; i < 10; i++) {
          g.beginPath();
          g.moveTo(x + 12 + i * 24, h - 40);
          g.lineTo(x + 24 + i * 24, h - 40);
          g.lineTo(x + 12 + i * 24, h - 26);
          g.lineTo(x + 0 + i * 24, h - 26);
          g.fill();
        }
        g.fillStyle = "#cfeff5";
        for (const [px, py] of [
          [x + 22, 22],
          [x + w / 2 - 22, 22],
        ]) {
          g.beginPath();
          g.arc(px, py, 5, 0, Math.PI * 2);
          g.fill();
        }
      };
      panel(0);
      panel(w / 2);
    }
  });
}

/** Upper-wall paper. One tile = 2m x 2m. */
export function wallpaper(kind: WallKind, base: string) {
  return tex("paper-" + kind, 256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    if (kind === "lobby") {
      for (let x = 0; x < w; x += 32) {
        g.fillStyle = x % 64 === 0 ? "rgba(255,240,200,0.14)" : "rgba(120,70,30,0.08)";
        g.fillRect(x, 0, 16, h);
      }
      g.fillStyle = "rgba(190,130,50,0.7)";
      for (const [x, y] of [
        [64, 64],
        [192, 192],
        [192, 64],
        [64, 192],
      ]) {
        diamond(g, x, y, 10, 15);
        g.fill();
        g.fillStyle = "rgba(190,130,50,0.7)";
        g.beginPath();
        g.arc(x, y - 22, 3, 0, Math.PI * 2);
        g.arc(x, y + 22, 3, 0, Math.PI * 2);
        g.fill();
      }
    } else if (kind === "tables") {
      g.strokeStyle = "rgba(40,15,5,0.35)";
      g.lineWidth = 2;
      wrap9(w, h, (dx, dy) => {
        g.save();
        g.translate(dx, dy);
        diamond(g, w / 2, h / 2, w / 2, h / 2);
        g.stroke();
        g.restore();
      });
      g.fillStyle = "rgba(235,185,90,0.75)";
      for (const [x, y] of [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
        [w / 2, h / 2],
      ]) {
        star4(g, x, y, 12, 0.35);
        g.fill();
      }
    } else if (kind === "slots") {
      const r = rng(8);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = r() > 0.5 ? "rgba(255,143,209,0.5)" : "rgba(180,220,255,0.4)";
        const x = r() * w;
        const y = r() * h;
        wrap9(w, h, (dx, dy) => {
          star4(g, x + dx, y + dy, 4 + r() * 8, 0.25);
          g.fill();
        });
      }
    } else {
      g.strokeStyle = "rgba(125,249,255,0.22)";
      g.lineWidth = 2;
      for (let k = 0; k <= 4; k++) {
        g.beginPath();
        g.moveTo(0, k * 64);
        g.lineTo(w, k * 64);
        g.moveTo(k * 64, 0);
        g.lineTo(k * 64, h);
        g.stroke();
      }
      g.fillStyle = "rgba(255,179,71,0.5)";
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          if ((i * 3 + j * 5) % 4 === 0) {
            g.beginPath();
            g.arc(i * 64, j * 64, 5, 0, Math.PI * 2);
            g.fill();
          }
    }
    speckle(g, w, h, 19, 900, "#ffffff", "#000000", 0.05);
  });
}

/* --------------------------------------------------------------- decals */

/** Carpet runner. 128x512, tile along its length (one tile = 4m). */
export function runner(base: string, trim: string) {
  return tex(`runner-${base}-${trim}`, 128, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 4, 1500, "#ffffff", "#000000", 0.1);
    g.strokeStyle = trim;
    g.lineWidth = 5;
    g.strokeRect(8, -10, w - 16, h + 20);
    g.lineWidth = 2;
    g.strokeRect(18, -10, w - 36, h + 20);
    for (let i = 0; i < 4; i++) {
      const cy = i * 128 + 64;
      g.fillStyle = trim;
      diamond(g, w / 2, cy, 26, 40);
      g.fill();
      g.fillStyle = base;
      diamond(g, w / 2, cy, 15, 26);
      g.fill();
      g.fillStyle = trim;
      star4(g, w / 2, cy, 9, 0.3);
      g.fill();
    }
  });
}

/** Round lobby medallion, transparent outside. */
export function medallion() {
  return tex(
    "medallion",
    1024,
    1024,
    (g, w) => {
      const c = w / 2;
      g.clearRect(0, 0, w, w);
      const ring = (r0: number, r1: number, fill: string) => {
        g.fillStyle = fill;
        g.beginPath();
        g.arc(c, c, r1, 0, Math.PI * 2);
        g.arc(c, c, r0, 0, Math.PI * 2, true);
        g.fill();
      };
      g.fillStyle = "#3e1019";
      g.beginPath();
      g.arc(c, c, 500, 0, Math.PI * 2);
      g.fill();
      ring(480, 500, "#f0c866");
      ring(455, 462, "#f0c866");
      ring(300, 308, "#f0c866");
      // petal band
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24;
        g.save();
        g.translate(c + Math.cos(a) * 380, c + Math.sin(a) * 380);
        g.rotate(a);
        g.fillStyle = i % 2 ? "#a2404a" : "#c9953f";
        g.beginPath();
        g.ellipse(0, 0, 52, 22, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      // starburst in centre
      g.fillStyle = "#7a2f3a";
      g.beginPath();
      g.arc(c, c, 296, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16;
        g.fillStyle = i % 2 ? "#f0c866" : "#c9953f";
        g.beginPath();
        g.moveTo(c + Math.cos(a - 0.12) * 120, c + Math.sin(a - 0.12) * 120);
        g.lineTo(c + Math.cos(a) * 285, c + Math.sin(a) * 285);
        g.lineTo(c + Math.cos(a + 0.12) * 120, c + Math.sin(a + 0.12) * 120);
        g.fill();
      }
      g.fillStyle = "#3e1019";
      g.beginPath();
      g.arc(c, c, 130, 0, Math.PI * 2);
      g.fill();
      ring(120, 130, "#f0c866");
    },
    { repeat: false }
  );
}

/** Soft dark blob used as a fake contact shadow. */
export function blob() {
  return tex(
    "blob",
    128,
    128,
    (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(10,3,8,0.62)");
      gr.addColorStop(0.55, "rgba(10,3,8,0.28)");
      gr.addColorStop(1, "rgba(10,3,8,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    },
    { repeat: false }
  );
}

/** Vertical gradient: dark at the top and the bottom edge of a wall (fake ambient occlusion). */
export function wallShade() {
  return tex(
    "wall-shade",
    8,
    256,
    (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "rgba(15,4,12,0.55)");
      gr.addColorStop(0.2, "rgba(15,4,12,0.0)");
      gr.addColorStop(0.9, "rgba(15,4,12,0.0)");
      gr.addColorStop(1, "rgba(15,4,12,0.4)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    },
    { repeat: false }
  );
}

/** Floor strip along a wall: dark at the wall (canvas top) fading away. */
export function floorShade() {
  return tex(
    "floor-shade",
    8,
    128,
    (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "rgba(12,3,8,0.6)");
      gr.addColorStop(1, "rgba(12,3,8,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    },
    { repeat: false }
  );
}

/* ----------------------------------------------------------------- art */

export type ArtKind = "sun" | "cards" | "dice" | "seven" | "crown" | "horse" | "rocket" | "wheel";

export function art(kind: ArtKind) {
  return tex(
    "art-" + kind,
    256,
    320,
    (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      const pal: Record<ArtKind, [string, string]> = {
        sun: ["#ffb36b", "#e0566a"],
        cards: ["#1f6b55", "#0e3a2e"],
        dice: ["#5b3f8f", "#2b1a52"],
        seven: ["#2a1450", "#7a1f6a"],
        crown: ["#0f4a5c", "#07222c"],
        horse: ["#e8a85a", "#a65a3a"],
        rocket: ["#14305a", "#04101f"],
        wheel: ["#5a1f2a", "#240a10"],
      };
      sky.addColorStop(0, pal[kind][0]);
      sky.addColorStop(1, pal[kind][1]);
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      if (kind === "sun") {
        g.fillStyle = "#fff2b0";
        g.beginPath();
        g.arc(w / 2, 140, 54, 0, Math.PI * 2);
        g.fill();
        const hills = ["#b8425a", "#7a2a50", "#46204a"];
        hills.forEach((c, i) => {
          g.fillStyle = c;
          g.beginPath();
          g.moveTo(0, h);
          g.lineTo(0, 180 + i * 38);
          g.bezierCurveTo(70, 130 + i * 40, 150, 230 + i * 20, w, 170 + i * 36);
          g.lineTo(w, h);
          g.fill();
        });
      } else if (kind === "cards") {
        const card = (x: number, y: number, rot: number, suit: string, col: string) => {
          g.save();
          g.translate(x, y);
          g.rotate(rot);
          g.fillStyle = "#fbf3df";
          g.fillRect(-48, -68, 96, 136);
          g.fillStyle = col;
          g.font = "bold 70px serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(suit, 0, 6);
          g.font = "bold 24px serif";
          g.fillText("A", -32, -48);
          g.restore();
        };
        card(100, 170, -0.3, "♠", "#16110f");
        card(160, 160, 0.2, "♥", "#c4283a");
      } else if (kind === "dice") {
        const die = (x: number, y: number, rot: number, n: number) => {
          g.save();
          g.translate(x, y);
          g.rotate(rot);
          g.fillStyle = "#fbf3df";
          g.fillRect(-46, -46, 92, 92);
          g.fillStyle = "#c4283a";
          const spots: [number, number][][] = [[], [[0, 0]], [[-24, -24], [24, 24]], [[-24, -24], [0, 0], [24, 24]], [[-24, -24], [24, -24], [-24, 24], [24, 24]], [[-24, -24], [24, -24], [0, 0], [-24, 24], [24, 24]]];
          for (const [sx, sy] of spots[n]) {
            g.beginPath();
            g.arc(sx, sy, 8, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
        };
        die(96, 150, -0.25, 5);
        die(168, 200, 0.3, 3);
      } else if (kind === "seven") {
        g.fillStyle = "#ff8fd1";
        g.font = "bold 190px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.shadowColor = "#ff8fd1";
        g.shadowBlur = 24;
        g.fillText("7", w / 2, h / 2);
        g.shadowBlur = 0;
      } else if (kind === "crown") {
        g.fillStyle = "#ffd166";
        g.beginPath();
        g.moveTo(50, 210);
        g.lineTo(40, 110);
        g.lineTo(100, 160);
        g.lineTo(128, 90);
        g.lineTo(156, 160);
        g.lineTo(216, 110);
        g.lineTo(206, 210);
        g.closePath();
        g.fill();
        g.fillStyle = "#7df9ff";
        for (const x of [90, 128, 166]) {
          g.beginPath();
          g.arc(x, 190, 9, 0, Math.PI * 2);
          g.fill();
        }
      } else if (kind === "horse") {
        g.fillStyle = "#3a1608";
        g.beginPath();
        g.ellipse(120, 190, 64, 28, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(170, 175);
        g.lineTo(200, 120);
        g.lineTo(225, 130);
        g.lineTo(190, 195);
        g.fill();
        g.fillRect(70, 205, 9, 60);
        g.fillRect(100, 210, 9, 55);
        g.fillRect(140, 210, 9, 55);
        g.fillRect(168, 205, 9, 60);
      } else if (kind === "rocket") {
        g.fillStyle = "#e8eef8";
        g.beginPath();
        g.ellipse(w / 2, 160, 26, 70, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#ff5a6a";
        g.beginPath();
        g.ellipse(w / 2, 110, 26, 30, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = "#ffb347";
        g.beginPath();
        g.moveTo(w / 2 - 14, 225);
        g.lineTo(w / 2, 280);
        g.lineTo(w / 2 + 14, 225);
        g.fill();
      } else {
        g.strokeStyle = "#f0c866";
        g.lineWidth = 6;
        g.beginPath();
        g.arc(w / 2, 160, 80, 0, Math.PI * 2);
        g.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          g.fillStyle = i % 2 ? "#c4283a" : "#16110f";
          g.beginPath();
          g.moveTo(w / 2, 160);
          g.arc(w / 2, 160, 76, a, a + Math.PI / 6);
          g.fill();
        }
        g.fillStyle = "#f0c866";
        g.beginPath();
        g.arc(w / 2, 160, 12, 0, Math.PI * 2);
        g.fill();
      }
    },
    { repeat: false }
  );
}

/** Round white dot for point sprites. */
export function dotSprite() {
  return tex(
    "dot",
    64,
    64,
    (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.35, "rgba(255,255,255,0.7)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    },
    { repeat: false }
  );
}

/** Sign lettering on a transparent canvas (drei Text needs a CDN font fetch, this does not). */
export function label(text: string, color: string, opts: { w?: number; h?: number; glow?: string; font?: string } = {}) {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 256;
  return tex(
    `label-${text}-${color}-${w}x${h}`,
    w,
    h,
    (g) => {
      g.clearRect(0, 0, w, h);
      let size = h * 0.62;
      const font = opts.font ?? '"Trebuchet MS","Segoe UI",Arial,sans-serif';
      g.font = `800 ${size}px ${font}`;
      while (g.measureText(text).width > w * 0.9 && size > 12) {
        size -= 4;
        g.font = `800 ${size}px ${font}`;
      }
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = opts.glow ?? color;
      g.shadowBlur = h * 0.1;
      g.lineWidth = h * 0.03;
      g.strokeStyle = "rgba(20,8,26,0.9)";
      g.strokeText(text, w / 2, h / 2 + h * 0.03);
      g.fillStyle = color;
      g.fillText(text, w / 2, h / 2 + h * 0.03);
      g.shadowBlur = 0;
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.globalCompositeOperation = "source-atop";
      g.fillRect(0, h * 0.25, w, h * 0.12);
      g.globalCompositeOperation = "source-over";
    },
    { repeat: false }
  );
}
