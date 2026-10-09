/** A player's look. Stored as JSON in users.avatar; everything is validated on both ends. */
export interface AvatarConfig {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  /** 0 bald, 1 short, 2 long, 3 spiky */
  hairStyle: number;
  /** 0 none, 1 top hat, 2 cap, 3 crown */
  hat: number;
}

export const SKIN_TONES = ["#f7d7c0", "#e8b894", "#c98f65", "#9a6540", "#6b4328", "#3f2a1c"];
export const CLOTHING = ["#c1273a", "#e8793a", "#f2c14e", "#3fa66b", "#2f8fd8", "#6a4fd0", "#d94fa0", "#2b2f3a", "#e9e9ef"];
export const HAIR_COLORS = ["#16110d", "#4a2c17", "#8a5a2b", "#d9b36a", "#b5392b", "#9aa0ad", "#6a4fd0", "#2f8fd8"];
export const HAIR_STYLES = ["Bald", "Short", "Long", "Spiky"];
export const HATS = ["None", "Top hat", "Cap", "Crown"];

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: SKIN_TONES[1],
  shirt: CLOTHING[0],
  pants: CLOTHING[7],
  hair: HAIR_COLORS[1],
  hairStyle: 1,
  hat: 0,
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const int = (v: unknown, max: number, d: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : d);
const hex = (v: unknown, d: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : d);

export function sanitizeAvatar(raw: unknown): AvatarConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    skin: hex(o.skin, DEFAULT_AVATAR.skin),
    shirt: hex(o.shirt, DEFAULT_AVATAR.shirt),
    pants: hex(o.pants, DEFAULT_AVATAR.pants),
    hair: hex(o.hair, DEFAULT_AVATAR.hair),
    hairStyle: int(o.hairStyle, HAIR_STYLES.length - 1, DEFAULT_AVATAR.hairStyle),
    hat: int(o.hat, HATS.length - 1, DEFAULT_AVATAR.hat),
  };
}

export function parseAvatar(text: string | null | undefined): AvatarConfig {
  if (!text) return DEFAULT_AVATAR;
  try {
    return sanitizeAvatar(JSON.parse(text));
  } catch {
    return DEFAULT_AVATAR;
  }
}
