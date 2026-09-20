#!/usr/bin/env node
/**
 * Exporta snapshot real do Hub Comms local para o Hub Msgs Dashboard.
 * Não inventa métricas: se as APIs falharem ou vierem vazias, o JSON reflete isso.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const HUB_BASE = (process.env.HUB_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = resolve(process.env.OUT || "snapshot.json");

async function getJson(path) {
  const res = await fetch(`${HUB_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

function needsAction(m) {
  if (m.priority === "urgent" || m.priority === "high") return true;
  if (m.status === "unread") return true;
  return false;
}

function mapMessage(m) {
  return {
    id: m.id,
    channelType: m.channelType || "",
    channelLabel: m.channel?.label || "",
    from: m.fromName || m.fromHandle || "",
    preview: m.preview || (m.body ? String(m.body).slice(0, 160) : "") || m.subject || "",
    receivedAt: m.receivedAt || null,
    status: m.status || "",
    priority: m.priority || "normal",
    triageLabel: m.triageLabel || "",
    group: m.group?.name || "",
    needsAction: needsAction(m),
  };
}

function mapChannel(c) {
  return {
    id: c.id,
    type: c.type,
    label: c.label,
    slot: c.slot,
    status: c.status,
    lastSyncAt: c.lastSyncAt || null,
    lastError: c.lastError || null,
  };
}

async function main() {
  const [channelsRes, messagesRes] = await Promise.all([
    getJson("/api/channels"),
    getJson("/api/messages"),
  ]);

  const channels = Array.isArray(channelsRes.channels) ? channelsRes.channels.map(mapChannel) : [];
  const messages = Array.isArray(messagesRes.messages) ? messagesRes.messages.map(mapMessage) : [];

  const volume = {};
  for (const m of messages) {
    const k = m.channelType || "unknown";
    volume[k] = (volume[k] || 0) + 1;
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: "hub-comms",
    hubBase: HUB_BASE,
    channels,
    messages,
    volume,
  };

  writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`OK → ${OUT}`);
  console.log(`canais=${channels.length} mensagens=${messages.length}`);
  if (!channels.length && !messages.length) {
    console.log("Aviso: snapshot vazio (Hub sem dados ou seed vazio) — painel ficará em Sem dados.");
  }
}

main().catch((err) => {
  console.error("Falha ao ler Hub Comms:", err.message || err);
  console.error(`Confirme: ${HUB_BASE}/api/health e npm run dev no hub-comms.`);
  process.exit(1);
});
