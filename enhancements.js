/* Timer enhancements: persistent forced values + forced lap display */
(() => {
  const STORAGE_KEY = "timer-forced-presets-v1";
  const LAST_KEY = "timer-forced-last-v1";
  const input = document.getElementById("secretInput");
  const form = document.getElementById("secretForm");
  const card = document.querySelector(".secret-modal-card");
  const modal = document.getElementById("secretModal");
  const saveBtn = document.getElementById("secretSave");
  const cancelBtn = document.getElementById("secretCancel");
  const timerTab = document.getElementById("tab-timer");
  const lapsBox = document.getElementById("laps");
  if (!input || !form || !card || !modal) return;

  const read = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (_) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  };

  let presets = read(STORAGE_KEY, []);
  if (!Array.isArray(presets)) presets = [];
  let last = String(read(LAST_KEY, ""));

  function clean(v) { return String(v || "").replace(/\D/g, ""); }
  function display(v) {
    const d = clean(v);
    return d || "—";
  }

  const originalCardHTML = card.innerHTML;
  card.innerHTML = `
    <div id="secretTitle" class="secret-title">Число для форсирования</div>
    <form id="secretFormEnhanced" class="secret-form">
      <input id="secretInputEnhanced" class="secret-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" enterkeyhint="done" placeholder="Например 1234" />
      <div class="secret-actions">
        <button type="button" id="secretCancelEnhanced" class="secret-btn">Отмена</button>
        <button type="submit" id="secretSaveEnhanced" class="secret-btn secret-btn-primary">Применить</button>
      </div>
    </form>
    <div class="preset-heading">Сохранённые числа</div>
    <div id="presetList" class="preset-list"></div>
    <div class="preset-hint">Нажмите на число, чтобы выбрать его. Свайп/кнопка удаления — для удаления.</div>
  `;

  const inp = document.getElementById("secretInputEnhanced");
  const frm = document.getElementById("secretFormEnhanced");
  const cancel = document.getElementById("secretCancelEnhanced");
  const list = document.getElementById("presetList");

  function savePresets() { write(STORAGE_KEY, presets); }

  function renderPresets() {
    list.innerHTML = "";
    if (!presets.length) {
      const empty = document.createElement("div");
      empty.className = "preset-empty";
      empty.textContent = "Пока нет сохранённых чисел";
      list.appendChild(empty);
      return;
    }
    presets.forEach((value, index) => {
      const row = document.createElement("div");
      row.className = "preset-row";
      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = "preset-value";
      choose.textContent = value;
      choose.addEventListener("click", () => {
        inp.value = value;
        last = value;
        write(LAST_KEY, last);
        applyValue(value);
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "preset-delete";
      del.setAttribute("aria-label", "Удалить");
      del.textContent = "×";
      del.addEventListener("click", () => {
        presets.splice(index, 1);
        savePresets();
        renderPresets();
      });
      row.append(choose, del);
      list.appendChild(row);
    });
  }

  function applyValue(value) {
    const v = clean(value);
    if (!v) return;
    inp.value = v;
    last = v;
    write(LAST_KEY, last);
    /* Let the original app's state update without requiring a rewrite of its main code. */
    const nativeInput = document.getElementById("secretInput");
    if (nativeInput) nativeInput.value = v;
    try {
      if (typeof window.applySecretDigits === "function") window.applySecretDigits();
    } catch (_) {}
    modal.classList.remove("open");
  }

  frm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = clean(inp.value);
    if (!value) return;
    applyValue(value);
  });

  cancel.addEventListener("click", () => {
    modal.classList.remove("open");
  });

  /* Capture the existing Timer tab click in the bubbling phase, replacing the old modal contents. */
  if (timerTab) timerTab.addEventListener("click", () => {
    inp.value = last || "";
    renderPresets();
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
  });

  /* Keep the stored last value when the original app opens the modal. */
  const observer = new MutationObserver(() => {
    if (modal.classList.contains("open")) {
      inp.value = last || "";
      renderPresets();
    }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ["class"] });

  /* Add a tiny Save button to the current value when the modal is open. */
  const actions = frm.querySelector(".secret-actions");
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "secret-btn";
  addBtn.textContent = "В список";
  addBtn.addEventListener("click", () => {
    const value = clean(inp.value);
    if (!value) return;
    if (!presets.includes(value)) {
      presets.unshift(value);
      savePresets();
      renderPresets();
    }
  });
  actions.insertBefore(addBtn, actions.lastElementChild);

  /* Make lap rows duplicate the visible forced value after Stop / Lap. */
  function visibleTime() {
    const a = id => document.getElementById(id)?.textContent || "00";
    return `${a("mm")}:${a("ss")},${a("cc")}`;
  }
  function syncFirstLap() {
    const row = lapsBox?.firstElementChild;
    if (row) {
      const val = row.querySelector(".time-val");
      if (val) val.textContent = visibleTime();
    }
  }
  const right = document.getElementById("rightBtn");
  const left = document.getElementById("leftBtn");
  if (right) right.addEventListener("click", () => setTimeout(syncFirstLap, 0));
  if (left) left.addEventListener("click", () => setTimeout(syncFirstLap, 0));

  /* Add a visible remove/save action without changing the original secret mechanism. */
  const style = document.createElement("style");
  style.textContent = `
    .secret-modal-card { max-height: min(78vh, 620px); overflow:auto; }
    .preset-heading { font-size:16px; color:#b0b0b5; margin-top:2px; }
    .preset-list { display:flex; flex-direction:column; gap:7px; max-height:210px; overflow:auto; }
    .preset-row { display:flex; align-items:center; gap:8px; background:#2c2c2e; border-radius:10px; overflow:hidden; }
    .preset-value { flex:1; border:0; background:transparent; color:#fff; text-align:left; padding:11px 13px; font-size:18px; font-variant-numeric:tabular-nums; }
    .preset-delete { border:0; background:transparent; color:#8e8e93; font-size:25px; width:42px; height:42px; }
    .preset-empty { color:#777; font-size:15px; text-align:center; padding:8px; }
    .preset-hint { color:#777; font-size:12px; line-height:1.35; text-align:center; }
    .secret-actions { flex-wrap:wrap; }
  `;
  document.head.appendChild(style);

  renderPresets();
})();
