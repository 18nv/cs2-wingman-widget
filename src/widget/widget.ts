import { trackEvent } from '../shared/analytics';
import { fetchWingmanData, type WingmanData } from '../shared/api';
import { paramsToConfig } from '../shared/config';
import { wingmanTierKey } from '../shared/ranks';
import type { WidgetConfig } from '../shared/types';
import './widget.css';

function render(container: HTMLElement, config: WidgetConfig, data: WingmanData) {
  const tierKey = wingmanTierKey(data.rankId);
  const recent = data.recentGames.slice(0, config.matchCount);

  // Steam profile picture
  let avatarHtml = '';
  if (config.showAvatar && config.steamId) {
    avatarHtml = `<img class="avatar" src="https://unavatar.io/steam/${config.steamId}" alt="" onerror="this.style.display='none'">`;
  }

  // Wingman rank icon ONLY (no text name like Silver I / MG2)
  let rankIconHtml = '';
  if (data.rank.icon) {
    rankIconHtml = `<img class="rank-icon" src="${data.rank.icon}" alt="${data.rank.name}" title="${data.rank.name}">`;
  }

  // Rank change in the selected recent matches window (e.g. +1, -1, ±0)
  let changeHtml = '';
  if (config.showChange) {
    const rankedInWindow = recent.filter((m) => typeof m.rank === 'number' && m.rank! > 0);
    const diff = rankedInWindow.length >= 2
      ? rankedInWindow[0].rank! - rankedInWindow[rankedInWindow.length - 1].rank!
      : data.rankChange;

    if (diff !== 0) {
      const cls = diff > 0 ? 'positive' : 'negative';
      const prefix = diff > 0 ? '+' : '';
      const word = Math.abs(diff) === 1 ? 'rank' : 'ranks';
      changeHtml = `<span class="change ${cls}">(${prefix}${diff} ${word})</span>`;
    } else if (rankedInWindow.length >= 2) {
      changeHtml = `<span class="change neutral">(±0)</span>`;
    }
  }

  // Overall rank movement summary (e.g. ↑1 ↓0)
  let rankMovementHtml = '';
  if (config.showChange && (data.rankUps > 0 || data.rankDowns > 0)) {
    const parts: string[] = [];
    if (data.rankUps > 0) parts.push(`<span class="rank-up">↑${data.rankUps}</span>`);
    if (data.rankDowns > 0) parts.push(`<span class="rank-down">↓${data.rankDowns}</span>`);
    rankMovementHtml = `<span class="rank-movement">${parts.join(' ')}</span>`;
  }

  // Stats — K/D ratio, AVG kills, and AIM rating from recent matches
  let statsHtml = '';
  if (config.showStats) {
    const withKd = recent.filter((g) => g.kills != null && g.deaths != null);
    const totalKills = withKd.reduce((s, g) => s + g.kills!, 0);
    const totalDeaths = withKd.reduce((s, g) => s + g.deaths!, 0);
    const avgKills = withKd.length > 0 ? (totalKills / withKd.length).toFixed(1) : '—';
    const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : '—';
    statsHtml = `
      <div class="stats">
        <div class="stat"><span class="stat-val">${avgKills}</span><span class="stat-lbl">AVG</span></div>
        <div class="stat"><span class="stat-val">${kd}</span><span class="stat-lbl">K/D</span></div>
        <div class="stat"><span class="stat-val">${data.aimRating.toFixed(1)}</span><span class="stat-lbl">AIM</span></div>
      </div>`;
  }

  // W/L history as colored letters
  let historyHtml = '';
  if (config.showMatchHistory) {
    const letters = [...recent]
      .reverse()
      .map((g) => {
        const cls = g.outcome === 'win' ? 'w' : g.outcome === 'tie' ? 't' : 'l';
        const lbl = g.outcome === 'win' ? 'W' : g.outcome === 'tie' ? 'T' : 'L';
        return `<span class="${cls}">${lbl}</span>`;
      })
      .join(' ');
    historyHtml = `<div class="history">${letters}</div>`;
  }

  container.innerHTML = `
    <div class="widget wm-${tierKey}">
      <div class="top-row">
        ${avatarHtml}
        <div class="identity">
          ${config.showName ? `<div class="name">${data.name}</div>` : ''}
          <div class="rank-row">
            ${rankIconHtml}
            ${changeHtml}
            ${rankMovementHtml}
          </div>
        </div>
        ${statsHtml}
      </div>
      ${historyHtml}
    </div>
  `;
}

function renderError(container: HTMLElement, message: string) {
  container.innerHTML = `
    <div class="widget wm-gray">
      <div class="top-row">
        <div class="identity">
          <div class="name">Error</div>
          <div class="rank-row"><span class="change negative">${message}</span></div>
        </div>
      </div>
    </div>`;
}

function renderLoading(container: HTMLElement) {
  container.innerHTML = `
    <div class="widget wm-gray loading">
      <div class="top-row">
        <div class="identity">
          <div class="name">Loading...</div>
          <div class="rank-row"><span class="change neutral">Pobieranie danych...</span></div>
        </div>
      </div>
    </div>`;
}

async function init() {
  const container = document.getElementById('app')!;
  const params = new URLSearchParams(window.location.search);
  const config = paramsToConfig(params);

  if (!config.steamId) {
    renderError(container, 'No Steam ID provided.');
    return;
  }

  trackEvent('widget_loaded', { steamId: config.steamId });

  renderLoading(container);

  async function update() {
    try {
      const data = await fetchWingmanData(config.steamId);
      render(container, config, data);
    } catch (e) {
      renderError(container, e instanceof Error ? e.message : 'Failed to fetch');
    }
  }

  await update();
  setInterval(update, config.refreshInterval * 1000);
}

init();
