# @snaps/client

Framework-agnostic UI kit for **Snaps** client admin panels, distributed as
**Web Components (Custom Elements)**. Drop a single `<script>` and use the
elements from Angular, Vue, vanilla HTML, or React.

> Governance, plans and instructions for this repo live in the **Snaps DB**
> (DB-First architecture). See `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`.

## Components

| Custom element | React export | Purpose |
|---|---|---|
| `<snaps-support-board>` | `SupportBoard` | Lista de chamados (split-view ativos/histórico) |
| `<snaps-roadmap-board>` | `RoadmapBoard` | Roadmap read-only por sprint |
| `<snaps-bug-report-form>` | `BugReportForm` | Bug + auto-detecção de environment + evidências |
| `<snaps-feature-request-form>` | `FeatureRequestForm` | Pedido de feature (dor/oportunidade) |
| `<snaps-governance-docs>` | `GovernanceDocs` | Docs read-only (estilo GitHub Pages) |

## Uso (via CDN / `<script>`)

```html
<script src="https://cdn.jsdelivr.net/npm/@snaps/client/dist/snaps-client.umd.js"></script>

<snaps-support-board
  project-id="..."
  api-key="..."
  api-url="https://snaps-api.fly.dev"
  style="--snaps-primary: #e11d48;"
></snaps-support-board>
```

Os custom elements se auto-registram ao carregar o bundle UMD. O CSS (Tailwind)
é injetado dentro do Shadow DOM de cada componente, então não há vazamento de
estilo para a página hospedeira.

## Uso (React / npm)

```bash
npm install @snaps/client
```

```tsx
import { SupportBoard, SnapsPublicClient } from '@snaps/client';
```

## Customização de tema

Sobrescreva as CSS variables no host (`--snaps-primary`, `--snaps-bg`,
`--snaps-text`, `--snaps-radius`, `--snaps-font`, …).

## Desenvolvimento

```bash
npm install
npm run build      # gera dist/snaps-client.umd.js + .es.js + index.d.ts
# abra test.html no navegador para validar os custom elements
```
