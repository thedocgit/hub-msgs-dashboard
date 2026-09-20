# Hub Msgs Dashboard

Painel estático (pt-BR) de integração de mensagens do setor Sites / Hub Comms.

**Regra:** zero métricas inventadas. O painel fica vazio até importar JSON/CSV ou apontar a API do Hub Canais.

## Como alimentar dados

1. **Importar arquivo** — botão *Importar JSON/CSV* (schema em `schema.example.json`).
2. **URL Hub Canais** — cole o endpoint de snapshot e clique *Buscar API*, ou abra `?data=https://…`.
3. **CSV** — colunas: `channelType,channelLabel,from,preview,receivedAt,status,priority,triageLabel,group,needsAction`.

## Hook Hub Canais

O dashboard espera um JSON com `channels` e `messages` (e opcionalmente `volume` / `generatedAt` / `source`). Quando o Hub Canais expuser `GET /api/dashboard-snapshot` (ou equivalente), basta colar a URL no campo do painel.

Atalhos de triagem apontam para o Hub Comms local (`http://localhost:3000/inbox` e `/channels`) — ajuste a base no rodapé da seção.

## Deploy estático

Qualquer host de arquivos estáticos (Vercel, GitHub Pages, Netlify). Pasta raiz = este diretório.
