import type { LeetifyGame, LeetifyMatch, LeetifyMatchDetails, LeetifyProfile } from './types';
import { getWingmanRank, type WingmanRank } from './ranks';

// Leetify's real, documented Public API (see https://api-public-docs.cs-prod.leetify.com/).
const API_BASE = 'https://api-public.cs-prod.leetify.com/v3/profile';
const MATCHES_BASE = 'https://api-public.cs-prod.leetify.com/v3/profile/matches';
const LEETIFY_KEY = import.meta.env.VITE_LEETIFY_KEY as string | undefined;
const AVATAR_PROXY = import.meta.env.VITE_AVATAR_PROXY_URL as string | undefined;

// rank_type that marks a Wingman match in recent_matches.
const WINGMAN_RANK_TYPE = 7;

export interface WingmanData {
  name: string;
  avatarUrl: string;
  /** Current wingman skill group id (1–18, 0 = unranked) */
  rankId: number;
  /** Resolved rank info */
  rank: WingmanRank;
  /** Rank change in skill groups between last two wingman matches (e.g. +1, -1, 0) */
  rankChange: number;
  /** Recent wingman matches (newest first) */
  recentGames: LeetifyGame[];
  /** Number of rank-ups detected in recent matches */
  rankUps: number;
  /** Number of rank-downs detected in recent matches */
  rankDowns: number;
  /** Aim rating from Leetify */
  aimRating: number;
}

export async function fetchWingmanData(steamId: string): Promise<WingmanData> {
  const headers: Record<string, string> = {};
  if (LEETIFY_KEY) headers._leetify_key = LEETIFY_KEY;

  const res = await fetch(`${API_BASE}?steam64_id=${encodeURIComponent(steamId)}`, { headers });
  if (res.status === 404) throw new Error('Profile not found on Leetify');
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data: LeetifyProfile = await res.json();

  // Filter wingman matches only
  const wingmanGames = (data.recent_matches ?? []).filter(
    (m) => m.rank_type === WINGMAN_RANK_TYPE,
  );

  // Fetch avatar and kills in parallel
  const [avatarUrl] = await Promise.all([
    fetchAvatarUrl(steamId),
    enrichWithKills(steamId, wingmanGames, headers),
  ]);

  // Current wingman rank from profile (ranks.wingman is the skill group id 1-18)
  const currentRankId = data.ranks.wingman ?? 0;

  // Calculate rank change between last two wingman matches
  const rankedMatches = wingmanGames.filter((m) => typeof m.rank === 'number' && m.rank! > 0);
  const rankChange = rankedMatches.length >= 2 ? rankedMatches[0].rank! - rankedMatches[1].rank! : 0;

  // Count rank ups and downs across recent matches
  let rankUps = 0;
  let rankDowns = 0;
  for (let i = 0; i < rankedMatches.length - 1; i++) {
    const diff = rankedMatches[i].rank! - rankedMatches[i + 1].rank!;
    if (diff > 0) rankUps += diff;
    if (diff < 0) rankDowns += Math.abs(diff);
  }

  return {
    name: data.name,
    avatarUrl,
    rankId: currentRankId,
    rank: getWingmanRank(currentRankId),
    rankChange,
    recentGames: wingmanGames,
    rankUps,
    rankDowns,
    aimRating: data.rating.aim,
  };
}

// Resolves a Steam avatar URL. First checks custom Worker proxy if configured,
// then falls back to Steam Community XML via public CORS proxy.
export async function fetchAvatarUrl(steamId: string): Promise<string> {
  // 1. Check custom Cloudflare Worker proxy if set
  if (AVATAR_PROXY) {
    try {
      const res = await fetch(`${AVATAR_PROXY}?steam64_id=${encodeURIComponent(steamId)}`);
      if (res.ok) {
        const body = (await res.json()) as { avatarUrl?: unknown };
        if (typeof body.avatarUrl === 'string' && body.avatarUrl) return body.avatarUrl;
      }
    } catch {
      // fallback to public proxy
    }
  }

  // 2. Fetch directly from Steam Community XML via allorigins CORS proxy
  try {
    const steamXml = `https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}/?xml=1`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(steamXml)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const body = (await res.json()) as { contents?: string };
      if (body.contents) {
        const match = body.contents.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/)
          || body.contents.match(/<avatarFull>(.*?)<\/avatarFull>/)
          || body.contents.match(/<avatarMedium><!\[CDATA\[(.*?)\]\]><\/avatarMedium>/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
  } catch {
    // leave empty
  }

  return '';
}

// Attaches kills/deaths to each match from the match-list endpoint.
async function enrichWithKills(
  steamId: string,
  matches: LeetifyMatch[],
  headers: Record<string, string>,
): Promise<void> {
  try {
    const res = await fetch(
      `${MATCHES_BASE}?steam64_id=${encodeURIComponent(steamId)}`,
      { headers },
    );
    if (!res.ok) return;
    const details = (await res.json()) as LeetifyMatchDetails[];

    const byId = new Map<string, { kills: number; deaths: number }>();
    for (const detail of details) {
      const me = detail.stats?.find((p) => p.steam64_id === steamId);
      if (me) byId.set(detail.id, { kills: me.total_kills, deaths: me.total_deaths });
    }

    for (const m of matches) {
      const stat = byId.get(m.id);
      if (stat) {
        m.kills = stat.kills;
        m.deaths = stat.deaths;
      }
    }
  } catch {
    // Leave kills/deaths undefined; the widget handles missing data.
  }
}
