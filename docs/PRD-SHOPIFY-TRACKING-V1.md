# PRD: Shopify Tracking Integration — Tracklay v1.0

**Status:** Approved  
**Last Updated:** 2026-04-15  
**Owner:** @matheusmaiberg  
**Goal:** Entregar scripts Shopify (frontend + server-side) para produção completa do Tracklay.

---

## 1. Contexto

Tracklay é um proxy first-party rodando em Cloudflare Workers. A infraestrutura de proxy (`/cdn/f/{uuid}`, `/cdn/g/{uuid}`, `/cdn/events`, `/x/{uuid}`) está **pronta e deployada**. O que falta são os **clientes Shopify** que irão consumir esses endpoints de forma confiável.

Existem 2 frentes de tracking:
1. **Frontend/Tema:** Tracking via GTM carregado pelo proxy Tracklay no tema Dawn (ES6 modules).
2. **Server-Side/Checkout:** Tracking via `fetch POST /cdn/events` direto do Custom Pixel Shopify (checkout sandboxed) + **sessionStorage bridge** para dual tracking no tema.

---

## 2. Problemas Identificados

| # | Problema | Impacto | Evidência |
|---|----------|---------|-----------|
| 2.1 | **Custom Pixel atual (`pixel.js`) não faz `fetch` para `/cdn/events`.** | Perde eventos de checkout quando o tema não está acessível. | `pixel.js` linhas 267-279 usam apenas `BroadcastChannel` + `Cookie`. |
| 2.2 | **Faltam os arquivos de server-side tracking citados na doc.** | Impossível deployar server-side hoje. | `SERVER_SIDE_IMPLEMENTATION.md` cita arquivos inexistentes. |
| 2.3 | **Módulos Dawn têm hardcodes (`suevich.com`, `MJ7DW8H`).** | Não é reusável para outras lojas/clientes. | `module.config.js` linha 8-11. |
| 2.4 | **Nenhum script chama o endpoint `/cdn/events` hoje.** | Endpoint do Worker ocioso — zero server-side events chegam. | `src/handlers/events.js` existe mas não é chamado por nenhum cliente. |
| 2.5 | **Ausência de snippet Liquid parametrizável.** | Dificulta instalação em temas Shopify. | Não existe snippet no repo. |
| 2.6 | **EventBridge não suporta `browser.sessionStorage` da Web Pixel API.** | Impossível fazer bridge moderna entre checkout e tema no sandbox Shopify. | `module.cookie-tracker.js` só usa BroadcastChannel + cookie + IndexedDB. |

---

## 3. Decisões de Produto (Aprovadas)

| # | Decisão | Escolha |
|---|---------|---------|
| 3.1 | **Meta CAPI** | Via **GTM Server-Side** apenas. Nenhum handler dedicado `/cdn/events/meta` no Worker. |
| 3.2 | **Padrão de entrega** | **ES6 modules** como primário. Bundle IIFE é opcional/legacy. |
| 3.3 | **Dual tracking** | **Obrigatório**. Custom Pixel envia para o tema via sessionStorage bridge E faz `fetch` para `/cdn/events`. |
| 3.4 | **SessionStorage bridge** | **Sim**. Web Pixel API `browser.sessionStorage` ↔ tema polling `sessionStorage`. |
| 3.5 | **Client ID** | Ver seção 4 abaixo. |

---

## 4. Client ID — Análise e Decisão

### Por que precisamos gerenciar o `client_id`?

O GA4 Measurement Protocol (usado pelo endpoint `/cdn/events`) **exige** um `client_id` para atribuir eventos a uma sessão de usuário. Se enviarmos `client_id` aleatório a cada request, cada evento vira um usuário novo — **destrói a atribuição e os relatórios de conversão**.

### Opções disponíveis

| Opção | Prós | Contras |
|-------|------|---------|
| **A) `_ga` cookie** | Já existe se GA4 estiver no tema. | Não disponível no checkout sandbox. Se o usuário bloquear cookies GA4, some. |
| **B) `_tracklay_cid` próprio** | First-party, persistente, funciona no checkout e no tema, resistente a bloqueios de third-party. | Requer 1 linha de código a mais. |
| **C) Shopify Customer ID** | Identificador estável para usuários logados. | Usuários não logados (visitantes) não têm. Checkout guest é a maioria. |
| **D) Fingerprint + timestamp** | Sem necessidade de storage. | Não é estável entre pageviews (muda com qualquer alteração de browser). |

### Decisão: Opção B + Fallback A

**Gerar um `_tracklay_cid` first-party e persistir em:**
1. `localStorage` (primário — cross-page estável)
2. `cookie` `_tracklay_cid` (fallback — cross-subdomain, acessível no sandbox se SameSite=None)
3. Se absolutamente nada disponível: usar `_ga` cookie como fallback final
4. Se tudo falhar: gerar UUID v4 e enviar sem persistência (atribuição degradada, mas evento não é perdido)

Esse `client_id` será:
- Gerado no **tema** na primeira visita
- Lido pelo **Custom Pixel** via `browser.cookie` ou enviado no payload do `fetch`
- Reutilizado em todo `fetch POST /cdn/events`

---

## 5. Requisitos Funcionais

### 5.1 Server-Side Checkout Tracking (Custom Pixel)
**RF-SS-01:** Capturar eventos de checkout: `page_viewed`, `product_viewed`, `product_added_to_cart`, `checkout_started`, `checkout_completed`, `payment_info_submitted`.

**RF-SS-02:** Fazer `fetch POST` direto para `https://{WORKER_DOMAIN}/cdn/events` com payload GA4-compatible.

**RF-SS-03:** Usar `browser.sessionStorage` da Web Pixel API para enviar eventos também para o tema (dual tracking via bridge).

**RF-SS-04:** Payload obrigatório: `event_name`, `client_id`, `measurement_id`, `timestamp_micros`, `page_location`, `page_title`, `value`, `currency`, `items` (quando aplicável), `transaction_id` (checkout_completed).

**RF-SS-05:** Retry com exponential backoff para falhas de `fetch` (3 tentativas).

**RF-SS-06:** Self-contained, sem imports externos, compatível com editor de Customer Events.

**RF-SS-07:** Ler `_tracklay_cid` do cookie ou, se não existir, gerar um novo no próprio pixel.

### 5.2 Frontend Theme Tracking (Dawn / ES6)
**RF-FE-01:** Carregar GTM via proxy Tracklay (`/cdn/g/{uuid}?id=GTM-XXX`).

**RF-FE-02:** Injetar `transport_url` no `dataLayer` quando `GTM_SERVER_URL` estiver configurado.

**RF-FE-03:** Todos os IDs/domínios configuráveis via `window.TracklayConfig` (zero hardcodes).

**RF-FE-04:** EventBridge deve escutar `sessionStorage` da Web Pixel API (polling) ALÉM de BroadcastChannel e cookie.

**RF-FE-05:** Tema também pode fazer `fetch POST /cdn/events` para eventos críticos detectados no DOM (redundância).

### 5.3 Instalação Shopify
**RF-INST-01:** Snippet Liquid `tracklay-init.liquid` injeta config e carrega script.

**RF-INST-02:** Inserção em `theme.liquid` com `{% render 'tracklay-init' %}` antes de `</head>`.

---

## 6. Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SHOPIFY CHECKOUT (Custom Pixel — sandboxed iframe)                         │
│ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ custom-pixel-serverside.js                                             │  │
│ │  - analytics.subscribe('all_events')                                   │  │
│ │  - buildGA4Payload(event)                                              │  │
│ │  - browser.sessionStorage.setItem('tracklay_event_N', JSON.stringify)  │  │
│ │  - fetch('https://cdn.xxx.com/cdn/events', {method:'POST', body})      │  │
│ │  - retry com backoff                                                   │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ├──► sessionStorage (bridge)
                                    │
                                    └──► fetch POST
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CLOUDFLARE WORKER                                                           │
│  - POST /cdn/events  → handleEventProxy() → GTM Server-Side → GA4          │
│  - GET /cdn/g/{uuid}  → serve gtm.js via proxy                              │
│  - GET /cdn/f/{uuid}  → serve fbevents.js via proxy                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                          ▲
                                          │ script src
┌─────────────────────────────────────────────────────────────────────────────┐
│ SHOPIFY THEME (Dawn — ES6 modules)                                          │
│ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ theme.liquid                                                           │  │
│ │  {% render 'tracklay-init' %}                                          │  │
│ │   → injeta window.TracklayConfig + _tracklay_cid                       │  │
│ │   → importa módulos ES6                                                │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ Módulos Dawn (ES6)                                                     │  │
│ │  - module.config.js → lê window.TracklayConfig                         │  │
│ │  - module.loader.js → carrega GTM via proxy                            │  │
│ │  - module.cookie-tracker.js → EventBridge com:                         │  │
│ │      • BroadcastChannel                                                │  │
│ │      • Cookie polling                                                  │  │
│ │      • IndexedDB fallback                                              │  │
│ │      • sessionStorage polling (NOVO)                                   │  │
│ │  - module.init.js → orquestra tudo                                     │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Entregáveis

### 7.1 Novos Arquivos

| Arquivo | Path | Descrição |
|---------|------|-----------|
| `custom-pixel-serverside.js` | `docs/shopify/examples/` | Custom Pixel com fetch + sessionStorage bridge. |
| `server-side-tracking.js` | `docs/shopify/examples/` | Script tema para enviar eventos DOM para `/cdn/events`. |
| `tracklay-init.liquid` | `docs/shopify/snippets/` | Snippet Liquid parametrizável. |

### 7.2 Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `module.config.js` | Remover hardcodes; ler `window.TracklayConfig`; fallback sensato. |
| `module.cookie-tracker.js` | Adicionar listener de `sessionStorage` da Web Pixel API. |
| `pixel.js` | Marcar como `LEGACY` na documentação. |
| `SERVER_SIDE_IMPLEMENTATION.md` | Atualizar com arquivos reais. |

---

## 8. Plano de Execução Revisado

### Fase 1: Fundação (agora)
- [ ] Atualizar `module.config.js` para `window.TracklayConfig`
- [ ] Criar `tracklay-init.liquid`
- [ ] Adicionar sessionStorage polling no `module.cookie-tracker.js`

### Fase 2: Server-Side Checkout (após Fase 1)
- [ ] Criar `custom-pixel-serverside.js`
- [ ] Implementar `_tracklay_cid` (geração + leitura cookie)
- [ ] Testar `fetch` para `/cdn/events`

### Fase 3: Frontend Theme (após Fase 2)
- [ ] Criar `server-side-tracking.js`
- [ ] Testar ES6 modules no tema + sessionStorage bridge
- [ ] Testar dual tracking (dataLayer + fetch)

### Fase 4: Docs & Release (após Fase 3)
- [ ] Atualizar `SERVER_SIDE_IMPLEMENTATION.md`
- [ ] Criar `docs/shopify/INSTALLATION.md`
- [ ] Commit + push + deploy + tag

---

## 9. Critérios de Aceite

- [ ] Custom Pixel envia `checkout_completed` via `fetch` e Worker loga sucesso.
- [ ] Custom Pixel grava evento em `browser.sessionStorage` e tema lê via polling.
- [ ] Tema carrega GTM via proxy sem erros 404.
- [ ] Zero hardcodes de loja específica nos scripts.
- [ ] `_tracklay_cid` persiste entre pageviews e é reutilizado no checkout.
