const STORAGE_KEY = "hub-msgs-dashboard-v1";
const SCHEMA_EXAMPLE = {
  generatedAt: "2026-09-20T21:00:00-03:00",
  source: "hub-canais|manual|csv",
  channels: [
    {
      id: "wa-1",
      type: "whatsapp",
      label: "WA principal",
      slot: 1,
      status: "connected",
      lastSyncAt: null,
      lastError: null
    }
  ],
  messages: [
    {
      id: "m1",
      channelType: "whatsapp",
      channelLabel: "WA principal",
      from: "Exemplo",
      preview: "Texto — substitua por export real",
      receivedAt: "2026-09-20T20:00:00-03:00",
      status: "unread",
      priority: "normal",
      triageLabel: "",
      group: "Trabalho",
      needsAction: true
    }
  ]
};

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  sms: "SMS"
};

let state = { channels: [], messages: [], volume: null, source: null, generatedAt: null };
let filter = "action";

const $ = (id) => document.getElementById(id);

function statusClass(s) {
  if (s === "connected") return "ok";
  if (s === "mock") return "info";
  if (s === "connecting") return "warn";
  if (s === "error") return "bad";
  return "muted";
}

function hasData() {
  return (state.channels && state.channels.length) || (state.messages && state.messages.length);
}

function computeVolume() {
  if (state.volume && typeof state.volume === "object" && !Array.isArray(state.volume)) {
    return state.volume;
  }
  const out = {};
  for (const m of state.messages || []) {
    const k = m.channelType || "unknown";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function actionQueue(mode) {
  const msgs = state.messages || [];
  if (mode === "all") return msgs;
  if (mode === "urgent") return msgs.filter((m) => m.priority === "urgent" || m.priority === "high");
  if (mode === "unread") return msgs.filter((m) => m.status === "unread");
  return msgs.filter(
    (m) =>
      m.needsAction === true ||
      m.needsAction === "true" ||
      m.priority === "urgent" ||
      (m.status === "unread" && (m.priority === "high" || m.priority === "urgent"))
  );
}

function render() {
  const loaded = hasData();
  $("sourcePill").textContent = loaded ? `Fonte: ${state.source || "import"}` : "Sem dados";
  $("sourcePill").className = "pill" + (loaded ? "" : " muted");
  $("updatedPill").textContent = state.generatedAt
    ? `Gerado: ${new Date(state.generatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
    : "—";

  const channels = state.channels || [];
  const active = channels.filter((c) => c.status === "connected" || c.status === "mock").length;
  const queue = actionQueue("action");
  const msgs = state.messages || [];

  $("statChannels").textContent = loaded ? `${active}/${channels.length || "—"}` : "—";
  $("statAction").textContent = loaded ? String(queue.length) : "—";
  $("statMsgs").textContent = loaded ? String(msgs.length) : "—";
  $("statChannelCount").textContent = loaded ? String(channels.length) : "—";

  if (!channels.length) {
    $("channelsEmpty").classList.remove("hidden");
    $("channelsTable").classList.add("hidden");
  } else {
    $("channelsEmpty").classList.add("hidden");
    $("channelsTable").classList.remove("hidden");
    $("channelsTable").innerHTML = `
      <table>
        <thead><tr><th>Canal</th><th>Conta</th><th>Slot</th><th>Status</th><th>Último sync</th><th>Erro</th></tr></thead>
        <tbody>
          ${channels
            .map((c) => {
              const label = CHANNEL_LABELS[c.type] || c.type || "—";
              const sync = c.lastSyncAt
                ? new Date(c.lastSyncAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                : "—";
              return `<tr>
                <td>${esc(label)}</td>
                <td>${esc(c.label || c.id || "—")}</td>
                <td>${esc(String(c.slot ?? "—"))}</td>
                <td><span class="badge ${statusClass(c.status)}">${esc(c.status || "—")}</span></td>
                <td>${esc(sync)}</td>
                <td>${esc(c.lastError || "—")}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  const vol = computeVolume();
  const entries = Object.entries(vol);
  if (!entries.length) {
    $("volumeEmpty").classList.remove("hidden");
    $("volumeList").classList.add("hidden");
  } else {
    $("volumeEmpty").classList.add("hidden");
    $("volumeList").classList.remove("hidden");
    const max = Math.max(...entries.map(([, n]) => Number(n) || 0), 1);
    $("volumeList").innerHTML = entries
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([k, n]) => {
        const pct = Math.round((Number(n) / max) * 100);
        return `<li>
          <div>
            <strong>${esc(CHANNEL_LABELS[k] || k)}</strong>
            <div class="bar"><span style="width:${pct}%"></span></div>
          </div>
          <span>${esc(String(n))}</span>
        </li>`;
      })
      .join("");
  }

  const filtered = actionQueue(filter);
  if (!filtered.length) {
    $("queueEmpty").classList.remove("hidden");
    $("queueTable").classList.add("hidden");
    $("queueEmpty").textContent = loaded
      ? "Nenhuma mensagem neste filtro."
      : "Nada na fila. Importe mensagens com needsAction, prioridade ou status.";
  } else {
    $("queueEmpty").classList.add("hidden");
    $("queueTable").classList.remove("hidden");
    $("queueTable").innerHTML = `
      <table>
        <thead><tr><th>Quando</th><th>Canal</th><th>De</th><th>Preview</th><th>Prioridade</th><th>Status</th><th>Grupo</th></tr></thead>
        <tbody>
          ${filtered
            .map((m) => {
              const when = m.receivedAt
                ? new Date(m.receivedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                : "—";
              return `<tr>
                <td>${esc(when)}</td>
                <td>${esc(CHANNEL_LABELS[m.channelType] || m.channelType || m.channelLabel || "—")}</td>
                <td>${esc(m.from || "—")}</td>
                <td>${esc(m.preview || "")}</td>
                <td>${esc(m.priority || "—")}</td>
                <td>${esc(m.status || "—")}</td>
                <td>${esc(m.group || m.triageLabel || "—")}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  updateHubLinks();
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function updateHubLinks() {
  const base = ($("hubBase").value || "http://localhost:3000").replace(/\/$/, "");
  $("openInbox").href = base + "/inbox";
  $("openChannels").href = base + "/channels";
  localStorage.setItem(STORAGE_KEY + ":hubBase", base);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") state = parsed;
    }
    const hub = localStorage.getItem(STORAGE_KEY + ":hubBase");
    if (hub) $("hubBase").value = hub;
    const api = localStorage.getItem(STORAGE_KEY + ":apiUrl");
    if (api) $("apiUrl").value = api;
  } catch (_) {}
}

function normalizePayload(data) {
  if (Array.isArray(data)) {
    return { messages: data, channels: [], source: "array", generatedAt: null, volume: null };
  }
  return {
    channels: Array.isArray(data.channels) ? data.channels : [],
    messages: Array.isArray(data.messages) ? data.messages : [],
    volume: data.volume && typeof data.volume === "object" ? data.volume : null,
    source: data.source || "json",
    generatedAt: data.generatedAt || data.exportedAt || null
  };
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (lines.length < 2) return { channels: [], messages: [], source: "csv", generatedAt: null };
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const messages = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    messages.push({
      id: row.id || `csv-${i}`,
      channelType: row.channelType || row.channel || "",
      channelLabel: row.channelLabel || "",
      from: row.from || row.sender || "",
      preview: row.preview || row.body || row.text || "",
      receivedAt: row.receivedAt || row.date || "",
      status: row.status || "",
      priority: row.priority || "",
      triageLabel: row.triageLabel || "",
      group: row.group || "",
      needsAction: String(row.needsAction || "").toLowerCase() === "true" || row.needsAction === "1"
    });
  }
  return { channels: [], messages, source: "csv", generatedAt: null, volume: null };
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function handleFile(file) {
  const text = await file.text();
  const name = (file.name || "").toLowerCase();
  let payload;
  if (name.endsWith(".csv") || file.type === "text/csv") {
    payload = parseCsv(text);
  } else {
    payload = normalizePayload(JSON.parse(text));
    if (!payload.source || payload.source === "json") payload.source = "json:" + (file.name || "file");
  }
  state = payload;
  persist();
  render();
}

async function fetchApi() {
  const url = $("apiUrl").value.trim();
  if (!url) {
    alert("Informe a URL do snapshot do Hub Canais.");
    return;
  }
  localStorage.setItem(STORAGE_KEY + ":apiUrl", url);
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  state = normalizePayload(data);
  if (!state.source) state.source = "hub-canais";
  persist();
  render();
}

function wire() {
  $("fileInput").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      await handleFile(f);
    } catch (err) {
      alert("Falha ao importar: " + (err && err.message ? err.message : err));
    }
    e.target.value = "";
  });
  $("clearBtn").addEventListener("click", () => {
    state = { channels: [], messages: [], volume: null, source: null, generatedAt: null };
    persist();
    render();
  });
  $("schemaBtn").addEventListener("click", () => {
    $("schemaPre").textContent = JSON.stringify(SCHEMA_EXAMPLE, null, 2);
    $("schemaDialog").showModal();
  });
  $("fetchBtn").addEventListener("click", async () => {
    try {
      await fetchApi();
    } catch (err) {
      alert("Falha na API: " + (err && err.message ? err.message : err));
    }
  });
  $("hubBase").addEventListener("change", updateHubLinks);
  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.filter;
      render();
    });
  });
  document.querySelectorAll("[data-jump]").forEach((a) => {
    a.addEventListener("click", () => {
      filter = a.dataset.jump;
      document.querySelectorAll(".chip").forEach((b) => {
        b.classList.toggle("active", b.dataset.filter === filter);
      });
      render();
    });
  });

  const params = new URLSearchParams(location.search);
  const dataUrl = params.get("data");
  if (dataUrl) {
    $("apiUrl").value = dataUrl;
    fetchApi().catch(() => {});
  }
}

loadPersisted();
wire();
render();
