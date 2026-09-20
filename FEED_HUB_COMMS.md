# Ligar feed real do Hub Comms → Hub Msgs Dashboard

**Regra:** zero métricas inventadas. O painel só mostra o que vier do Hub (ou de um JSON/CSV exportado dele).

## Pré-requisito

Hub Comms rodando local:

```bash
cd hub-comms
npm run dev
```

Base padrão: `http://localhost:3000`

APIs reais já existentes:

| Endpoint | Uso |
|----------|-----|
| `GET /api/channels` | status das contas |
| `GET /api/messages` | fila / volume (até 100) |
| `GET /api/reports?format=json` | stats agregados (opcional) |
| `GET /api/health` | saúde do app |

Ainda **não** existe `GET /api/dashboard-snapshot`. Até o Hub Canais expor isso, use o script abaixo ou import manual.

## Opção A — script de export (recomendado)

Na pasta do dashboard:

```bash
node export-from-hub.mjs
# gera snapshot.json a partir de localhost:3000
```

Depois: abra o painel → **Importar JSON/CSV** → escolha `snapshot.json`.

Variáveis opcionais:

```bash
HUB_BASE=http://127.0.0.1:3000 node export-from-hub.mjs
OUT=meu-snapshot.json node export-from-hub.mjs
```

## Opção B — montar JSON à mão

1. Abra `http://localhost:3000/api/channels` e `http://localhost:3000/api/messages` no navegador.
2. Salve as respostas e normalize para o schema do dashboard (`schema.example.json`).
3. Importe no painel.

### Mapeamento Message (Hub → Dashboard)

| Hub Comms | Dashboard |
|-----------|-----------|
| `id` | `id` |
| `channelType` | `channelType` |
| `channel.label` | `channelLabel` |
| `fromName` / `fromHandle` | `from` |
| `preview` / `body` (curto) | `preview` |
| `receivedAt` | `receivedAt` |
| `status` | `status` |
| `priority` | `priority` |
| `triageLabel` | `triageLabel` |
| `group.name` | `group` |
| `status===unread` ou `priority` urgent/high | `needsAction: true` |

### Mapeamento ChannelAccount

| Hub | Dashboard |
|-----|-----------|
| `id`, `type`, `label`, `slot`, `status`, `lastSyncAt`, `lastError` | mesmos campos |

## Opção C — URL no painel (quando houver snapshot)

Quando existir endpoint CORS-friendly com o schema do dashboard:

1. Campo **URL Hub Canais** no painel → cole a URL.
2. Ou abra `https://hub-msgs-dashboard.vercel.app/?data=http://localhost:3000/api/dashboard-snapshot`

**Nota:** o Vercel público **não** alcança `localhost` do seu PC. Para feed ao vivo no site público, o snapshot precisa de URL pública (túnel/API) ou use o painel **local** (`index.html` na Laura12) com Hub em `localhost:3000`.

## Atalhos de triagem

No painel, base Hub Comms (padrão `http://localhost:3000`):

- Inbox: `/inbox`
- Canais: `/channels`

## Checklist anti-fake

- [ ] Hub `npm run dev` OK (`/api/health`)
- [ ] Export gerou `channels` e/ou `messages` reais
- [ ] Painel mostra fonte `hub-comms` / arquivo — não dados de exemplo
- [ ] Se vazio no Hub, painel fica vazio (correto)
