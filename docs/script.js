(function () {
  "use strict";

  const OWNER = "GroupDev-Web";
  const REPO = "ShamProjectRepo";
  const BRANCH = "main";
  const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
  const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;

  // Same table as the Android app — version.conf specs are release names, not API levels.
  const NAME_TO_API = {
    "4.4": 19, "4.4.2": 19, "4.4.3": 19, "4.4.4": 19,
    "5.0": 21, "5.1": 22,
    "6.0": 23,
    "7.0": 24, "7.1": 25,
    "8.0": 26, "8.1": 27,
    "9": 28, "9.0": 28,
    "10": 29,
    "11": 30,
    "12": 31, "12.1": 32,
    "13": 33,
    "14": 34,
    "15": 35,
    "16": 36,
  };

  function apiLevelFor(name) {
    const trimmed = String(name || "").trim();
    if (trimmed in NAME_TO_API) return NAME_TO_API[trimmed];
    const parts = trimmed.split(".");
    if (parts.length >= 2 && `${parts[0]}.${parts[1]}` in NAME_TO_API) return NAME_TO_API[`${parts[0]}.${parts[1]}`];
    if (parts[0] in NAME_TO_API) return NAME_TO_API[parts[0]];
    return null;
  }

  function parseVersionSpec(raw) {
    const spec = String(raw || "").trim();
    if (!spec) return { kind: "unresolvable" };
    if (spec.toLowerCase() === "all") return { kind: "all" };

    if (spec.endsWith("+")) {
      const api = apiLevelFor(spec.slice(0, -1));
      return api == null ? { kind: "unresolvable" } : { kind: "min", min: api };
    }
    if (spec.includes("&")) {
      const apis = spec.split("&").map((part) => apiLevelFor(part.trim()));
      if (apis.some((api) => api == null)) return { kind: "unresolvable" };
      return { kind: "list", apis: new Set(apis) };
    }
    if (spec.includes("-")) {
      const [a, b] = spec.split("-").map((part) => apiLevelFor(part.trim()));
      if (a == null || b == null) return { kind: "unresolvable" };
      return { kind: "range", min: Math.min(a, b), max: Math.max(a, b) };
    }
    const exact = apiLevelFor(spec);
    return exact == null ? { kind: "unresolvable" } : { kind: "list", apis: new Set([exact]) };
  }

  function specMatches(spec, deviceApi) {
    switch (spec.kind) {
      case "all": return true;
      case "min": return deviceApi >= spec.min;
      case "range": return deviceApi >= spec.min && deviceApi <= spec.max;
      case "list": return spec.apis.has(deviceApi);
      default: return false;
    }
  }

  function detectDeviceApi() {
    const match = navigator.userAgent.match(/Android\s+([0-9]+(?:\.[0-9]+)*)/i);
    if (!match) return null;
    return apiLevelFor(match[1]);
  }

  async function getText(url) {
    const response = await fetch(url, { headers: { Accept: "text/plain" } });
    if (!response.ok) throw new Error(`${response.status} for ${url}`);
    return (await response.text()).trim();
  }

  async function fetchApps() {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error(`Couldn't list the catalog (${response.status}).`);
    const entries = await response.json();
    const folders = entries.filter((entry) => entry.type === "dir").map((entry) => entry.name);

    const apps = [];
    for (const folder of folders) {
      try {
        const [description, versionSpecRaw] = await Promise.all([
          getText(`${RAW_BASE}${folder}/desc.desc`),
          getText(`${RAW_BASE}${folder}/version.conf`),
        ]);
        apps.push({
          name: folder,
          description,
          versionSpecRaw,
          apkUrl: `${RAW_BASE}${folder}/app.apk`,
        });
      } catch (error) {
        console.warn(`Skipping "${folder}" — missing/unreadable files.`, error);
      }
    }
    return apps;
  }

  function renderCard(app, deviceApi) {
    const card = document.createElement("article");
    const compatible = deviceApi == null || specMatches(parseVersionSpec(app.versionSpecRaw), deviceApi);
    card.className = "card" + (compatible ? "" : " incompatible");

    const title = document.createElement("h2");
    title.textContent = app.name;
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = app.description;
    card.appendChild(desc);

    if (!compatible) {
      const note = document.createElement("p");
      note.className = "incompatible-note";
      note.textContent = "Not supported on your detected Android version.";
      card.appendChild(note);
    }

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span>Supports: ${escapeHtml(app.versionSpecRaw)}</span>`;
    card.appendChild(meta);

    const download = document.createElement("a");
    download.className = "download";
    download.href = app.apkUrl;
    download.setAttribute("download", "");
    download.textContent = "Download APK";
    card.appendChild(download);

    return card;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  async function main() {
    const statusEl = document.getElementById("status");
    const gridEl = document.getElementById("grid");
    const searchEl = document.getElementById("search");
    const deviceNoteEl = document.getElementById("deviceNote");

    const deviceApi = detectDeviceApi();
    deviceNoteEl.textContent = deviceApi != null
      ? `Detected Android API ${deviceApi} — showing what's compatible.`
      : "Not browsing from Android — showing everything, unfiltered.";

    let apps = [];
    try {
      apps = await fetchApps();
    } catch (error) {
      statusEl.textContent = `Couldn't load the catalog: ${error.message}`;
      statusEl.classList.add("error");
      return;
    }

    statusEl.hidden = true;
    gridEl.hidden = false;

    function render() {
      const query = searchEl.value.trim().toLowerCase();
      gridEl.innerHTML = "";
      const filtered = apps.filter((app) => app.name.toLowerCase().includes(query));
      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "status";
        empty.textContent = "No apps match.";
        gridEl.appendChild(empty);
        return;
      }
      for (const app of filtered) {
        gridEl.appendChild(renderCard(app, deviceApi));
      }
    }

    searchEl.addEventListener("input", render);
    render();
  }

  main();
})();
