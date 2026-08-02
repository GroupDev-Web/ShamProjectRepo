(function () {
  "use strict";

  const OWNER = "GroupDev-Web";
  const REPO = "ShamProjectRepo";
  const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;

  async function fetchAppNames() {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error(`Couldn't list the catalog (${response.status}).`);
    const entries = await response.json();
    return entries
      .filter((entry) => entry.type === "dir")
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  }

  async function main() {
    const statusEl = document.getElementById("status");
    const listEl = document.getElementById("appList");

    let names = [];
    try {
      names = await fetchAppNames();
    } catch (error) {
      statusEl.textContent = `Couldn't load the catalog: ${error.message}`;
      statusEl.classList.add("error");
      return;
    }

    statusEl.hidden = true;
    listEl.hidden = false;

    if (!names.length) {
      statusEl.hidden = false;
      statusEl.textContent = "The catalog is empty right now.";
      return;
    }

    for (const name of names) {
      const item = document.createElement("li");
      item.textContent = name;
      listEl.appendChild(item);
    }
  }

  main();
})();
