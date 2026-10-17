import type { RankTier } from './types';

// Premier rating tiers (kept for backwards compat if needed)
export const RANK_TIERS: RankTier[] = [
  {
    min: 0,
    max: 4999,
    name: 'Gray',
    key: 'gray',
    color: '#9ca3af',
    colorLight: '#d1d5db',
    gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)',
  },
  {
    min: 5000,
    max: 9999,
    name: 'Light Blue',
    key: 'lightblue',
    color: '#7ec8e3',
    colorLight: '#bae6fd',
    gradient: 'linear-gradient(135deg, #5b8fa8, #7ec8e3)',
  },
  {
    min: 10000,
    max: 14999,
    name: 'Blue',
    key: 'blue',
    color: '#3b82f6',
    colorLight: '#93c5fd',
    gradient: 'linear-gradient(135deg, #1e3a6e, #3b82f6)',
  },
  {
    min: 15000,
    max: 19999,
    name: 'Purple',
    key: 'purple',
    color: '#a855f7',
    colorLight: '#d8b4fe',
    gradient: 'linear-gradient(135deg, #6b21a8, #a855f7)',
  },
  {
    min: 20000,
    max: 24999,
    name: 'Pink',
    key: 'pink',
    color: '#ec4899',
    colorLight: '#f9a8d4',
    gradient: 'linear-gradient(135deg, #be185d, #ec4899)',
  },
  {
    min: 25000,
    max: 29999,
    name: 'Red',
    key: 'red',
    color: '#ef4444',
    colorLight: '#fca5a5',
    gradient: 'linear-gradient(135deg, #7f1d1d, #ef4444)',
  },
  {
    min: 30000,
    max: 999999,
    name: 'Gold',
    key: 'gold',
    color: '#eab308',
    colorLight: '#fde047',
    gradient: 'linear-gradient(135deg, #92700c, #eab308)',
  },
];

export function getRankTier(rating: number): RankTier {
  return RANK_TIERS.find((t) => rating >= t.min && rating <= t.max) ?? RANK_TIERS[0];
}

export function formatRating(rating: number): string {
  return rating.toLocaleString('en-US');
}

// ─── Wingman Ranks ───────────────────────────────────────────────────────
// Wingman uses classic CS skill groups (1–18). `rank` in Leetify's
// recent_matches holds the integer skill group id after each Wingman match.

export interface WingmanRank {
  id: number;
  name: string;
  shortName: string;
  /** CSS color for this rank tier */
  color: string;
  /** URL to the official Valve rank icon (Steam CDN) */
  icon: string;
}

const STEAM_RANK_ICON = (id: number) =>
  `https://static.csstats.gg/images/ranks/${id}.png`;

export const WINGMAN_RANKS: WingmanRank[] = [
  { id: 0,  name: 'Unranked',                shortName: 'N/A',   color: '#6b7280', icon: '' },
  { id: 1,  name: 'Silver I',                shortName: 'S1',    color: '#9ca3af', icon: STEAM_RANK_ICON(1) },
  { id: 2,  name: 'Silver II',               shortName: 'S2',    color: '#9ca3af', icon: STEAM_RANK_ICON(2) },
  { id: 3,  name: 'Silver III',              shortName: 'S3',    color: '#9ca3af', icon: STEAM_RANK_ICON(3) },
  { id: 4,  name: 'Silver IV',               shortName: 'S4',    color: '#9ca3af', icon: STEAM_RANK_ICON(4) },
  { id: 5,  name: 'Silver Elite',            shortName: 'SE',    color: '#b0b8c4', icon: STEAM_RANK_ICON(5) },
  { id: 6,  name: 'Silver Elite Master',     shortName: 'SEM',   color: '#b0b8c4', icon: STEAM_RANK_ICON(6) },
  { id: 7,  name: 'Gold Nova I',             shortName: 'GN1',   color: '#eab308', icon: STEAM_RANK_ICON(7) },
  { id: 8,  name: 'Gold Nova II',            shortName: 'GN2',   color: '#eab308', icon: STEAM_RANK_ICON(8) },
  { id: 9,  name: 'Gold Nova III',           shortName: 'GN3',   color: '#eab308', icon: STEAM_RANK_ICON(9) },
  { id: 10, name: 'Gold Nova Master',        shortName: 'GNM',   color: '#f59e0b', icon: STEAM_RANK_ICON(10) },
  { id: 11, name: 'Master Guardian I',       shortName: 'MG1',   color: '#3b82f6', icon: STEAM_RANK_ICON(11) },
  { id: 12, name: 'Master Guardian II',      shortName: 'MG2',   color: '#3b82f6', icon: STEAM_RANK_ICON(12) },
  { id: 13, name: 'Master Guardian Elite',   shortName: 'MGE',   color: '#60a5fa', icon: STEAM_RANK_ICON(13) },
  { id: 14, name: 'Distinguished Master Guardian', shortName: 'DMG', color: '#a855f7', icon: STEAM_RANK_ICON(14) },
  { id: 15, name: 'Legendary Eagle',         shortName: 'LE',    color: '#ec4899', icon: STEAM_RANK_ICON(15) },
  { id: 16, name: 'Legendary Eagle Master',  shortName: 'LEM',   color: '#ef4444', icon: STEAM_RANK_ICON(16) },
  { id: 17, name: 'Supreme Master First Class', shortName: 'SMFC', color: '#f87171', icon: STEAM_RANK_ICON(17) },
  { id: 18, name: 'The Global Elite',        shortName: 'GE',    color: '#facc15', icon: STEAM_RANK_ICON(18) },
];

export function getWingmanRank(id: number): WingmanRank {
  return WINGMAN_RANKS.find((r) => r.id === id) ?? WINGMAN_RANKS[0];
}

/** Map a wingman rank id to a CSS-friendly tier key for coloring */
export function wingmanTierKey(id: number): string {
  if (id <= 0) return 'gray';
  if (id <= 6) return 'silver';
  if (id <= 10) return 'gold';
  if (id <= 13) return 'blue';
  if (id === 14) return 'purple';
  if (id <= 16) return 'red';
  if (id === 17) return 'red';
  return 'gold'; // GE
}
