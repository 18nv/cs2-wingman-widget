import { trackEvent } from "../shared/analytics";
import { fetchWingmanData, type WingmanData } from "../shared/api";
import { configToParams } from "../shared/config";
import { wingmanTierKey } from "../shared/ranks";
import { DEFAULT_CONFIG, type WidgetConfig } from "../shared/types";
import "./customizer.css";

let currentConfig: WidgetConfig = { ...DEFAULT_CONFIG };
let previewData: WingmanData | null = null;
let previewError: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastTrackedSteamId: string | null = null;

function getWidgetUrl(): string {
  const params = configToParams(currentConfig);
  const base =
    window.location.origin + window.location.pathname.replace(/\/$/, "");
  return `${base}/widget/?${params.toString()}`;
}

function renderPreview() {
  const previewEl = document.getElementById("preview-widget")!;

  if (previewError) {
    previewEl.innerHTML = `
      <div class="wp wm-gray">
        <div class="wp-top"><div class="wp-identity"><div class="wp-name">Error</div><div class="wp-rank-row"><span class="wp-change negative">${previewError}</span></div></div></div>
      </div>`;
    return;
  }

  if (!previewData) {
    previewEl.innerHTML = `
      <div class="wp wm-gray">
        <div class="wp-top"><div class="wp-identity"><div class="wp-name">Enter a Steam ID</div><div class="wp-rank-row"><span class="wp-change neutral">Wpisz Steam64 ID</span></div></div></div>
      </div>`;
    return;
  }

  const data = previewData;
  const config = currentConfig;
  const tierKey = wingmanTierKey(data.rankId);
  const recent = data.recentGames.slice(0, config.matchCount);

  // Steam avatar
  let avatarHtml = "";
  if (config.showAvatar && config.steamId) {
    avatarHtml = `<img class="wp-avatar" src="https://unavatar.io/steam/${config.steamId}" alt="" onerror="this.style.display='none'">`;
  }

  // Wingman rank icon ONLY (no text)
  let rankIconHtml = "";
  if (data.rank.icon) {
    rankIconHtml = `<img class="wp-rank-icon" src="${data.rank.icon}" alt="${data.rank.name}" title="${data.rank.name}">`;
  }

  let changeHtml = "";
  if (config.showChange) {
    const rankedInWindow = recent.filter((m) => typeof m.rank === "number" && m.rank! > 0);
    const diff = rankedInWindow.length >= 2
      ? rankedInWindow[0].rank! - rankedInWindow[rankedInWindow.length - 1].rank!
      : data.rankChange;

    if (diff !== 0) {
      const cls = diff > 0 ? "positive" : "negative";
      const prefix = diff > 0 ? "+" : "";
      const word = Math.abs(diff) === 1 ? "rank" : "ranks";
      changeHtml = `<span class="wp-change ${cls}">(${prefix}${diff} ${word})</span>`;
    } else if (rankedInWindow.length >= 2) {
      changeHtml = `<span class="wp-change neutral">(±0)</span>`;
    }
  }

  let rankMovementHtml = "";
  if (config.showChange && (data.rankUps > 0 || data.rankDowns > 0)) {
    const parts: string[] = [];
    if (data.rankUps > 0) parts.push(`<span class="wp-rank-up">↑${data.rankUps}</span>`);
    if (data.rankDowns > 0) parts.push(`<span class="wp-rank-down">↓${data.rankDowns}</span>`);
    rankMovementHtml = `<span class="wp-rank-movement">${parts.join(" ")}</span>`;
  }

  let statsHtml = "";
  if (config.showStats) {
    const withKd = recent.filter((g) => g.kills != null && g.deaths != null);
    const totalKills = withKd.reduce((s, g) => s + g.kills!, 0);
    const totalDeaths = withKd.reduce((s, g) => s + g.deaths!, 0);
    const avgKills = withKd.length > 0 ? (totalKills / withKd.length).toFixed(1) : "—";
    const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : "—";
    statsHtml = `
      <div class="wp-stats">
        <div class="wp-stat"><span class="wp-stat-val">${avgKills}</span><span class="wp-stat-lbl">AVG</span></div>
        <div class="wp-stat"><span class="wp-stat-val">${kd}</span><span class="wp-stat-lbl">K/D</span></div>
        <div class="wp-stat"><span class="wp-stat-val">${data.aimRating.toFixed(1)}</span><span class="wp-stat-lbl">AIM</span></div>
      </div>`;
  }

  let historyHtml = "";
  if (config.showMatchHistory) {
    const letters = [...recent]
      .reverse()
      .map((g) => {
        const cls = g.outcome === "win" ? "w" : g.outcome === "tie" ? "t" : "l";
        const lbl = g.outcome === "win" ? "W" : g.outcome === "tie" ? "T" : "L";
        return `<span class="${cls}">${lbl}</span>`;
      })
      .join(" ");
    historyHtml = `<div class="wp-history">${letters}</div>`;
  }

  previewEl.innerHTML = `
    <div class="wp wm-${tierKey}">
      <div class="wp-top">
        ${avatarHtml}
        <div class="wp-identity">
          ${config.showName ? `<div class="wp-name">${data.name}</div>` : ""}
          <div class="wp-rank-row">
            ${rankIconHtml}
            ${changeHtml}
            ${rankMovementHtml}
          </div>
        </div>
        ${statsHtml}
      </div>
      ${historyHtml}
    </div>`;
}

function updateGeneratedUrl() {
  const urlEl = document.getElementById("generated-url") as HTMLInputElement;
  if (currentConfig.steamId) {
    urlEl.value = getWidgetUrl();
  } else {
    urlEl.value = "";
  }
}

function setSteamIdError(msg: string | null) {
  const el = document.getElementById("steam-id-error")!;
  if (msg) {
    el.innerHTML = msg;
    el.removeAttribute("hidden");
  } else {
    el.innerHTML = "";
    el.setAttribute("hidden", "");
  }
}

function setSteamIdInfo(msg: string | null) {
  const el = document.getElementById("steam-id-info")!;
  if (msg) {
    el.innerHTML = msg;
    el.removeAttribute("hidden");
  } else {
    el.innerHTML = "";
    el.setAttribute("hidden", "");
  }
}

async function loadPreview() {
  if (!currentConfig.steamId) {
    previewData = null;
    previewError = null;
    setSteamIdError(null);
    setSteamIdInfo(null);
    renderPreview();
    return;
  }

  try {
    previewError = null;
    setSteamIdError(null);
    setSteamIdInfo(null);
    previewData = await fetchWingmanData(currentConfig.steamId);
    if (previewData.recentGames.length === 0) {
      setSteamIdInfo(
        `Nie znaleziono ostatnich meczów Wingman. Ranga Wingman jest widoczna, ale zagraj co najmniej 1 mecz, aby wypełnić statystyki K/D i bilans rang.`
      );
    }
    if (currentConfig.steamId !== lastTrackedSteamId) {
      trackEvent("steam_id_entered", { steamId: currentConfig.steamId });
      lastTrackedSteamId = currentConfig.steamId;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load";
    previewError = msg;
    previewData = null;
    if (msg === "Profile not found on Leetify") {
      setSteamIdError(
        `Nie znaleziono profilu Leetify dla tego Steam ID.<br>` +
        `<a href="https://leetify.com" target="_blank" rel="noopener">Załóż darmowe konto na Leetify</a> ` +
        `i upewnij się, że masz włączone śledzenie meczów.`
      );
    }
  }
  renderPreview();
  updateGeneratedUrl();
}

function debouncedLoadPreview() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadPreview, 600);
}

function bindControls() {
  const steamInput = document.getElementById("steam-id") as HTMLInputElement;
  steamInput.addEventListener("input", () => {
    currentConfig.steamId = steamInput.value.trim();
    updateGeneratedUrl();
    debouncedLoadPreview();
  });

  const checkboxMap: Record<string, keyof WidgetConfig> = {
    "show-avatar": "showAvatar",
    "show-name": "showName",
    "show-change": "showChange",
    "show-stats": "showStats",
    "show-history": "showMatchHistory",
  };

  for (const [id, key] of Object.entries(checkboxMap)) {
    const el = document.getElementById(id) as HTMLInputElement;
    el.checked = currentConfig[key] as boolean;
    el.addEventListener("change", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (currentConfig as any)[key] = el.checked;
      renderPreview();
      updateGeneratedUrl();
    });
  }

  const matchCountEl = document.getElementById(
    "match-count",
  ) as HTMLSelectElement;
  matchCountEl.value = String(currentConfig.matchCount);
  matchCountEl.addEventListener("change", () => {
    currentConfig.matchCount = parseInt(matchCountEl.value, 10);
    renderPreview();
    updateGeneratedUrl();
  });

  const refreshEl = document.getElementById(
    "refresh-interval",
  ) as HTMLSelectElement;
  refreshEl.value = String(currentConfig.refreshInterval);
  refreshEl.addEventListener("change", () => {
    currentConfig.refreshInterval = parseInt(refreshEl.value, 10);
    updateGeneratedUrl();
  });

  const mapEl = document.getElementById("preview-map") as HTMLSelectElement;
  mapEl.addEventListener("change", () => {
    const previewArea = document.getElementById("preview-widget")!;
    previewArea.style.backgroundImage = `url('https://leetify.com/assets/images/maps/${mapEl.value}.jpg')`;
  });

  document.getElementById("copy-url")!.addEventListener("click", () => {
    const urlEl = document.getElementById("generated-url") as HTMLInputElement;
    if (urlEl.value) {
      navigator.clipboard.writeText(urlEl.value);
      trackEvent("widget_url_copied", { steamId: currentConfig.steamId });
      const btn = document.getElementById("copy-url")!;
      btn.textContent = "Skopiowano!";
      setTimeout(() => (btn.textContent = "Kopiuj"), 1500);
    }
  });

  document.getElementById("reset-btn")!.addEventListener("click", () => {
    const steamId = currentConfig.steamId;
    currentConfig = { ...DEFAULT_CONFIG, steamId };

    for (const [id, key] of Object.entries(checkboxMap)) {
      (document.getElementById(id) as HTMLInputElement).checked = currentConfig[
        key
      ] as boolean;
    }
    matchCountEl.value = String(currentConfig.matchCount);
    refreshEl.value = String(currentConfig.refreshInterval);
    renderPreview();
    updateGeneratedUrl();
  });
}

function init() {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="customizer">
      <header class="header">
        <h1 class="title">CS2 Wingman Widget</h1>
        <p class="subtitle">Widget OBS dla trybu Wingman (Skrzydłowy) CS2</p>
      </header>

      <div class="layout">
        <div class="panel settings-panel">
          <h2 class="panel-title">Ustawienia</h2>

          <div class="field">
            <label class="field-label" for="steam-id">Steam ID (Steam64)</label>
            <input type="text" id="steam-id" class="input" placeholder="np. 76561198012345678">
            <span class="field-hint">Twój Steam64 ID znajdziesz na <a href="https://steamid.io" target="_blank" rel="noopener">steamid.io</a></span>
            <span class="field-hint">Twój profil <a href="https://leetify.com" target="_blank" rel="noopener">Leetify</a> musi być publiczny</span>
            <div id="steam-id-error" class="field-error" hidden></div>
            <div id="steam-id-info" class="field-info" hidden></div>
          </div>

          <div class="section">
            <h3 class="section-title">Opcje wyświetlania</h3>
            <label class="checkbox-row"><input type="checkbox" id="show-avatar" checked><span>Pokaż profilowe Steam</span></label>
            <label class="checkbox-row"><input type="checkbox" id="show-name" checked><span>Pokaż nick gracza</span></label>
            <label class="checkbox-row"><input type="checkbox" id="show-change" checked><span>Pokaż bilans rang (+/- rangi)</span></label>
            <label class="checkbox-row"><input type="checkbox" id="show-stats" checked><span>Pokaż statystyki (AVG zabójstw, K/D)</span></label>
            <label class="checkbox-row"><input type="checkbox" id="show-history" checked><span>Pokaż historię meczów (W L W L...)</span></label>
          </div>

          <div class="field">
            <label class="field-label" for="match-count">Liczba ostatnich meczów do analizy</label>
            <select id="match-count" class="input">
              <option value="3">3</option>
              <option value="5" selected>5</option>
              <option value="8">8</option>
              <option value="10">10</option>
            </select>
            <span class="field-hint">Używane do statystyk K/D, bilansu rang i historii W/L</span>
          </div>

          <div class="field">
            <label class="field-label" for="refresh-interval">Częstotliwość odświeżania</label>
            <select id="refresh-interval" class="input">
              <option value="60" selected>1 minuta</option>
              <option value="180">3 minuty</option>
              <option value="300">5 minut</option>
            </select>
          </div>

          <button class="btn btn-secondary" id="reset-btn">Przywróć domyślne</button>
        </div>

        <div class="panel preview-panel">
          <h2 class="panel-title">Podgląd widgetu</h2>
          <div id="preview-widget" class="preview-area"></div>

          <div class="field" style="margin-top: 16px;">
            <select id="preview-map" class="input">
              <option value="de_shortdust">Short Dust 2</option>
              <option value="de_lake">Lake</option>
              <option value="de_inferno">Inferno</option>
              <option value="de_overpass">Overpass</option>
              <option value="de_vertigo">Vertigo</option>
              <option value="de_nuke">Nuke</option>
              <option value="de_anubis">Anubis</option>
            </select>
          </div>

          <div class="field" style="margin-top: 16px;">
            <label class="field-label">Link do widgetu (Widget URL)</label>
            <div class="url-row">
              <input type="text" id="generated-url" class="input url-input" readonly placeholder="Wpisz Steam ID, aby wygenerować link">
              <button class="btn btn-primary" id="copy-url">Kopiuj</button>
            </div>
            <span class="field-hint">Dodaj ten URL jako źródło Przeglądarka (Browser Source) w OBS (zalecany rozmiar: 520×120)</span>
          </div>
        </div>
      </div>

      <footer class="footer">
        <p>CS2 Wingman Widget · Dane z <a href="https://leetify.com" target="_blank">Leetify</a></p>
      </footer>
    </div>
  `;

  bindControls();

  const params = new URLSearchParams(window.location.search);
  const idFromUrl = params.get("id");
  if (idFromUrl) {
    const steamInput = document.getElementById("steam-id") as HTMLInputElement;
    steamInput.value = idFromUrl;
    currentConfig.steamId = idFromUrl;
    loadPreview();
  } else {
    renderPreview();
  }
}

init();
