# PRD — Tracklay Custom App Shopify v1.0

> Product Requirements Document para transformar o Tracklay em um Custom App Shopify.

---

## 1. Visão e Objetivo

### Visão
Transformar o Tracklay de um conjunto de arquivos estáticos e snippets manuais em um **Custom App Shopify instalável com 1 clique**, que automatiza 100% da configuração de first-party tracking para lojas Shopify.

### Objetivo do v1.0
Permitir que um merchant instale o Tracklay na sua loja Shopify sem:
- Copiar snippets manualmente
- Editar código do tema
- Criar metafields na mão
- Colar código em Custom Pixel
- Configurar GTM manualmente (o app gera instruções, não configura o GTM diretamente)

**Alcance:** Custom App (apenas a loja que instalou). Não é Public App nem multi-tenant nesta versão.

---

## 2. Escopo

### ✅ IN (v1.0)

| # | Funcionalidade |
|---|---|
| 1 | **App Embed Block** que injeta o script de tracking no `<head>` de todas as páginas |
| 2 | **Web Pixel Extension** que captura eventos do checkout e envia server-side |
| 3 | **Dashboard de configuração** dentro do admin Shopify (iframe) |
| 4 | **Persistência de config** (GTM ID, Worker URL, UUIDs, etc.) |
| 5 | **Status/Health check** — mostra se Worker está online, se embed está ativo, se pixel está conectado |
| 6 | **Onboarding de 1 tela** — merchant preenche 4 campos e clica "Ativar" |
| 7 | **Webhook** `app/uninstalled` — limpa dados quando desinstalado |
| 8 | **Instruções automáticas** para configuração do GTM (o app não acessa o GTM, só gera o passo a passo) |

### ❌ OUT (v1.0)

| # | Funcionalidade | Motivo |
|---|---|---|
| 1 | Multi-tenant / múltiplas lojas | Custom App = 1 loja |
| 2 | Billing / cobrança | Custom App não precisa |
| 3 | Dashboard de analytics/receita | Fora do escopo, requer BigQuery/DB pesado |
| 4 | Configuração automática do GTM | GTM não tem API pública para criar tags |
| 5 | Suporte a temas pré-Dawn (Online Store 1.0) | App Embed só funciona em temas 2.0 |
| 6 | Meta CAPI server-side | Requer infra adicional, virá na v1.1 |
| 7 | TikTok / Pinterest / outras plataformas | Focus no core GA4 + Meta Pixel |

---

## 3. Persona e Fluxo do Usuário

### Persona: Matheus (Dono de loja Shopify Plus)
- Tem uma loja suevich.com no Shopify Plus
- Usa GTM + GA4 + Meta Pixel
- Quer first-party tracking mas não quer editar código manualmente
- Não é desenvolvedor, mas consegue seguir instruções

### Fluxo de instalação (happy path)

```
1. Recebe link de instalação do Tracklay Custom App
   ↓
2. Clica "Instalar app" no admin Shopify
   ↓
3. Autoriza OAuth (scopes: write_pixels, read_customer_events, etc.)
   ↓
4. Redirecionado para o dashboard do app (iframe no admin)
   ↓
5. Onboarding: preenche GTM ID, GA4 ID, Worker URL, GTM Server URL
   ↓
6. Clica "Ativar Tracklay"
   ↓
7. App faz:
      a. Salva config no banco
      b. Ativa App Embed Block no tema atual
      c. Ativa Web Pixel Extension
      d. Gera instruções de configuração do GTM
   ↓
8. Merchant vai no Editor de Temas e confirma que o embed está ativo
   ↓
9. Merchant vai em Configurações > Eventos do cliente e confirma pixel
   ↓
10. Merchant configura triggers no GTM seguindo as instruções do app
   ↓
11. Publica GTM container
   ↓
12. Testa uma compra → vê eventos no GA4 em tempo real ✅
```

---

## 4. Arquitetura Técnica

### Stack Validada (abril/2026)

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | **React Router v7** + `@shopify/shopify-app-react-router` | Recomendação oficial da Shopify para novos apps |
| UI | React + **Polaris** (design system Shopify) | UX nativa do admin Shopify |
| Backend | Node.js (full-stack no React Router) | Loader/Action pattern |
| Banco de dados | **SQLite** (Prisma) | Suficiente para 1 loja, zero custo |
| Hospedagem | **Fly.io** ou **Railway** | Recomendados pela Shopify para Node |
| Shopify CLI | v3.x | Gerencia extensions, auth, deploy |

### Estrutura de Pastas

```
apps/shopify-custom/
├── app/
│   ├── entry.server.tsx          # CSP headers para App Bridge
│   ├── root.tsx                  # AppProvider + Polaris
│   ├── routes/
│   │   ├── _index.tsx            # Dashboard principal
│   │   ├── onboarding.tsx        # Tela de configuração inicial
│   │   ├── settings.tsx          # Editar config depois de ativo
│   │   ├── gtm-instructions.tsx  # Passo a passo GTM
│   │   └── api/
│   │       ├── auth.tsx          # OAuth (Shopify CLI gera)
│   │       └── webhooks.tsx      # app/uninstalled
│   ├── models/
│   │   └── shop.server.ts        # DB + lógica de negócio
│   └── shopify.server.ts         # Cliente Admin API
├── extensions/
│   ├── tracklay-embed/           # App Embed Block (inject no <head>)
│   │   ├── shopify.extension.toml
│   │   └── blocks/
│   │       └── tracklay.liquid   # Snippet que carrega module.*.js
│   └── tracklay-pixel/           # Web Pixel Extension (checkout)
│       ├── shopify.extension.toml
│       └── src/
│           └── index.js          # Código do Custom Pixel
├── prisma/
│   └── schema.prisma             # Model Shop + Config
├── shopify.app.toml              # Config do app (scopes, webhooks, etc.)
├── package.json
├── Dockerfile
└── README.md
```

---

## 5. Requisitos Funcionais Detalhados

### RF-001: Onboarding de Configuração

**Descrição:** Tela inicial onde o merchant preenche os dados necessários.

**Campos:**
| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| GTM Container ID | Texto | Sim | Regex `^GTM-[A-Z0-9]+$` |
| GA4 Measurement ID | Texto | Sim | Regex `^G-[A-Z0-9]+$` |
| Tracklay Worker URL | URL | Sim | Deve começar com `https://` |
| GTM Server-Side URL | URL | Não | Deve começar com `https://` |

**Ação ao clicar "Ativar":**
1. Validar campos
2. Fazer `fetch GET {workerUrl}/endpoints` para descobrir UUIDs automaticamente
3. Salvar no banco: `Shop { domain, gtmId, measurementId, workerUrl, gtmServerUrl, googleUuid, facebookUuid, active }`
4. Redirecionar para dashboard com status

---

### RF-002: App Embed Block

**Descrição:** Extension que injeta o script de tracking no `<head>` do tema.

**Comportamento:**
- Carrega automaticamente quando o merchant ativa no Editor de Temas
- Injeta um `<script>` que:
  - Busca config do backend do app via `fetch` (endpoint público)
  - Ou lê de `window.shopifyTracklayConfig` (server-side rendered)
  - Carrega os módulos ES6 do Worker (proxy)

**Configuração no `shopify.extension.toml`:**
```toml
[[extensions]]
type = "app_embed"
name = "Tracklay First-Party Tracking"
handle = "tracklay-embed"
target = "head"
```

---

### RF-003: Web Pixel Extension

**Descrição:** Extension que substitui o Custom Pixel manual.

**Comportamento:**
- Subscribe em `all_events`
- Envia eventos server-side via `fetch POST {workerUrl}/cdn/events`
- Escreve `_tracklay_cid` no `browser.sessionStorage`
- Lê `_tracklay_cid` do `browser.sessionStorage` antes de gerar novo

**Configuração no `shopify.extension.toml`:**
```toml
[[extensions]]
type = "web_pixel_extension"
name = "Tracklay Server-Side Pixel"
handle = "tracklay-pixel"
runtime_context = "strict"
```

**Settings:**
- `workerUrl` — URL do Worker Tracklay
- `measurementId` — GA4 Measurement ID
- `debug` — true/false

---

### RF-004: Dashboard de Status

**Descrição:** Tela principal que mostra o estado atual do tracking.

**Widgets:**
| Widget | Status | Ação |
|---|---|---|
| App Embed | ✅ Ativo / ❌ Inativo | Link para Editor de Temas |
| Web Pixel | ✅ Conectado / ❌ Desconectado | Link para Eventos do cliente |
| Worker | ✅ Online / ❌ Offline | Fetch HEAD para workerUrl |
| GTM | ⚠️ Não verificável | Botão "Abrir instruções" |
| Último evento | `purchase` há 2 min | Timestamp do último evento recebido |

---

### RF-005: Instruções GTM

**Descrição:** Tela com passo a passo para configurar triggers no GTM.

**Conteúdo:**
1. Print da tela "Tag do Google" com os campos preenchidos
2. Lista de triggers `Custom Event` para criar
3. Tabela de mapeamento Shopify → GA4
4. Link para `docs/shopify/EVENT_MAPPING.md`

**Dinâmico:** Preenche os valores do merchant (GTM ID, etc.) nos exemplos.

---

### RF-006: Webhook de Desinstalação

**Descrição:** Quando o merchant desinstala o app, limpar dados.

**Ações:**
1. Webhook `app/uninstalled` recebido
2. Deletar registro `Shop` do banco de dados
3. (Opcional) Desativar App Embed e Web Pixel via Admin API

---

## 6. Modelo de Dados (Prisma)

```prisma
model Session {
  id          String    @id
  shop        String
  state       String
  isOnline    Boolean   @default(false)
  scope       String?
  expires     DateTime?
  accessToken String
  userId      BigInt?
}

model Shop {
  id              String   @id @default(uuid())
  domain          String   @unique
  gtmId           String
  measurementId   String
  workerUrl       String
  gtmServerUrl    String?
  googleUuid      String?
  facebookUuid    String?
  currency        String   @default("BRL")
  debug           Boolean  @default(false)
  active          Boolean  @default(false)
  embedActive     Boolean  @default(false)
  pixelActive     Boolean  @default(false)
  installedAt     DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 7. Requisitos Não-Funcionais

| # | Requisito | Métrica |
|---|---|---|
| 1 | **Tempo de carregamento do dashboard** | < 1.5s |
| 2 | **Disponibilidade do backend** | 99.9% |
| 3 | **Worker continua funcionando** | Sem dependência do app (app é só config) |
| 4 | **Segurança do token** | Nunca exposto no frontend, só server-side |
| 5 | **CSP headers** | Conforme Shopify App Bridge requirements |
| 6 | **Logs** | Winston ou similar, sem PII exposto |

---

## 8. API do Backend (interna)

### Endpoints que o próprio app expõe:

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/config` | Retorna config da loja (para o Embed Block ler) |
| `POST` | `/api/config` | Salva/atualiza config |
| `GET` | `/api/health` | Verifica se Worker responde |
| `POST` | `/api/webhooks` | Recebe webhooks da Shopify |

### Endpoints da Shopify que o app consome:

| API | Operação |
|---|---|
| GraphQL Admin API | `shop { id name myshopifyDomain }` |
| GraphQL Admin API | `metafieldsSet` (salvar config como metafield fallback) |
| GraphQL Admin API | `webPixelCreate` / `webPixelUpdate` |

---

## 9. Cronograma (2 semanas)

### Semana 1 — Fundação
| Dia | Tarefa |
|---|---|
| 1 | Bootstrap `shopify app init` (React Router), configurar Prisma + SQLite |
| 2 | Criar extension `tracklay-embed` (App Embed Block) com snippet básico |
| 3 | Criar extension `tracklay-pixel` (Web Pixel) com código do Custom Pixel |
| 4 | Tela de onboarding (form + validação + save) |
| 5 | Dashboard de status (widgets + health check) |

### Semana 2 — Integração e Polish
| Dia | Tarefa |
|---|---|
| 6 | Integração Embed Block com backend (ler config dinamicamente) |
| 7 | Integração Web Pixel com backend (settings dinâmicos) |
| 8 | Webhook `app/uninstalled` + cleanup |
| 9 | Tela de instruções GTM + testes manuais |
| 10 | Deploy Fly.io + teste E2E na loja de dev |

---

## 10. Critérios de Aceitação (Definition of Done)

- [ ] Merchant instala o app em uma development store em < 2 minutos
- [ ] Onboarding preenche e salva config sem erros
- [ ] App Embed Block aparece no Editor de Temas e injeta script no `<head>`
- [ ] Web Pixel aparece em Configurações > Eventos do cliente como "Conectado"
- [ ] Evento `page_view` chega no GA4 em tempo real após ativação
- [ ] Evento `purchase` chega no GA4 após checkout de teste
- [ ] Dashboard mostra status verde para Embed, Pixel e Worker
- [ ] Desinstalar o app remove todos os dados do banco
- [ ] App funciona em tema Dawn e Refresh

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Shopify muda API novamente | Alto | Usar sempre última versão do CLI, manter extensions isoladas |
| Merchant não ativa Embed Block no editor | Alto | Onboarding mostra GIF passo a passo, link direto para editor |
| Merchant não ativa Pixel | Alto | Onboarding redireciona para `admin/settings/customer_events` |
| Tema não é Online Store 2.0 | Médio | Detectar na instalação e mostrar fallback manual |
| Worker offline durante setup | Baixo | Health check mostra erro antes de ativar, não bloqueia |

---

## 12. Anexos

### A. Scopes necessários no `shopify.app.toml`

```toml
[access_scopes]
# Learn more at https://shopify.dev/docs/apps/tools/cli/configuration#access_scopes
scopes = "write_pixels,read_customer_events,read_themes,write_themes,read_shop_metafields,write_shop_metafields"
```

### B. Variáveis de ambiente

```env
SHOPIFY_API_KEY=xxxxxxxx
SHOPIFY_API_SECRET=xxxxxxxx
SCOPES=write_pixels,read_customer_events,read_themes,write_themes,read_shop_metafields,write_shop_metafields
DATABASE_URL=file:./dev.sqlite
```

### C. Links úteis

- [Shopify App Template — React Router](https://github.com/Shopify/shopify-app-template-remix) *(será atualizado para React Router)*
- [Build Web Pixels](https://shopify.dev/docs/apps/build/marketing-analytics/build-web-pixels)
- [App Embed Blocks](https://shopify.dev/docs/apps/online-store/app-embeds)
- [Polaris Design System](https://polaris.shopify.com/)

---

*Documento versionado. Última atualização: 2026-04-20*
