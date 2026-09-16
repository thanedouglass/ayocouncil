/**
 * The 6-Stone Infinity Orbit registry — single source of truth shared by the
 * 3D canvas (stone meshes) and the 2D HUD (seat card accents).
 *
 * Six stones orbit the Singularity Core. The core itself is the seventh
 * clickable node and belongs to the Mystic-Cosmologist seat.
 */
export type StoneKey = 'ruby' | 'amber' | 'violet' | 'cyan' | 'emerald' | 'azure' | 'core';

export interface Stone {
  key: StoneKey;
  name: string;
  role: string;
  color: string;
  seatId: string;
}

export const STONES: Stone[] = [
  { key: 'ruby',    name: 'Ruby',    role: 'Crisis Triage', color: '#FF415F', seatId: 'seat_2_existentialist' },
  { key: 'amber',   name: 'Amber',   role: 'Sovereignty',   color: '#FFC32D', seatId: 'seat_5_pragmatist' },
  { key: 'violet',  name: 'Violet',  role: 'Dialectic',     color: '#B955FF', seatId: 'seat_7_dialectical' },
  { key: 'cyan',    name: 'Cyan',    role: 'Intake',        color: '#00F0FF', seatId: 'seat_3_cyberneticist' },
  { key: 'emerald', name: 'Emerald', role: 'Synthesis',     color: '#2DF5A5', seatId: 'seat_1_stoic_empiricist' },
  { key: 'azure',   name: 'Azure',   role: 'Egress',        color: '#5A96FF', seatId: 'seat_6_psychoanalytic' }
];

export const CORE_STONE: Stone = {
  key: 'core',
  name: 'Singularity',
  role: 'Consensus Core',
  color: '#FFFFFF',
  seatId: 'seat_4_mystic_cosmologist'
};

export const FLARE_MAGENTA = '#FF1493';

const seatIndex = new Map<string, Stone>(
  [...STONES, CORE_STONE].map((s) => [s.seatId, s])
);

/** Accent stone for a council seat (defaults to the core's white). */
export function stoneForSeat(seatId: string): Stone {
  return seatIndex.get(seatId) ?? CORE_STONE;
}

export function stoneByKey(key: StoneKey): Stone {
  return [...STONES, CORE_STONE].find((s) => s.key === key) ?? CORE_STONE;
}
