# Validação: Tracklay como App Shopify

> Documento de validação baseado em pesquisas na documentação oficial da Shopify, fóruns de desenvolvedores e práticas atuais (abril/2026).

---

## ⚠️ Correções Importantes ao Plano Original

### 1. Framework: React Router (não Remix)

**Status:** ❌ **Plano original incorreto**

A Shopify **descontinuou oficialmente** o suporte a Remix para novos apps. O pacote `@shopify/shopify-app-remix` no npm declara:

> *"You should only use this Remix package if you have an existing Remix app and have not yet upgraded. If you are building a new Shopify app you should use React Router and not Remix."*

**O que usar hoje:**
- `@shopify/shopify-app-react-router` (caminho recomendado pela Shopify)
- Shopify CLI com template React Router: `shopify app init`
- Ainda é React + Node.js full-stack, mas com React Router v7 em vez de Remix

**Impacto:** Nenhum no prazo. React Router e Remix são conceitualmente idênticos (ambos são full-stack React frameworks). A curva de aprendizado é nula se você sabe Remix.

---

### 2. Instalação no Tema: App Embed Blocks (não Theme API direto)

**Status:** ⚠️ **Plano original precisa de ajuste**

A Shopify **desencoraja fortemente** apps que modificam diretamente arquivos de tema via REST/GraphQL Theme API. Isso é considerado:
- Frágil (quebra quando o tema é atualizado)
- Difícil de aprovar no App Store
- Ruim UX (merchant não sabe o que foi alterado)

**A abordagem correta em 2026 é:**

#### Opção A: App Embed Block (recomendado para scripts no `<head>`)
- Criar um **App Embed** na configuração do app (`shopify.extension.toml`)
- O merchant ativa via **Editor de Temas** → Configurações do App
- Injeta o script automaticamente no `<head>` sem tocar em `theme.liquid`
- Funciona com Dawn, Ride, Refresh e todos os temas Online Store 2.0

```toml
# extensions/tracklay-embed/shopify.extension.toml
[[extensions]]
type = "app_embed"
name = "Tracklay Tracking"
handle = "tracklay-embed"
target = "head"
```

#### Opção B: Theme App Extension (para snippets/blocks visuais)
- Se precisar de um bloco que o merchant arrasta para uma seção específica
- Menos indicado para tracking global

**NÃO usar:**
- `themeFilesUpsert` GraphQL mutation para injetar `tracklay-init.liquid`
- REST Asset API para modificar `theme.liquid`
- Modificar `layout/theme.liquid` programaticamente

**Exceção:** Se o app for **Custom App** (apenas sua loja), a Shopify não vai rejeitar o uso da Theme API, mas ainda assim é recomendado usar App Embed por robustez.

---

### 3. Custom Pixel: Web Pixel Extension (confirmado)

**Status:** ✅ **Plano original correto**

A Shopify permite e documenta a criação de Web Pixels via:
- **GraphQL Admin API** (`webPixelCreate` mutation)
- **Web Pixel Extension** (arquivos dentro do app, declarados em `shopify.extension.toml`)

**Scopes necessários:**
- `write_pixels`
- `read_customer_events`

**A abordagem via Extension é superior à mutation direta porque:**
- O pixel é versionado junto com o app
- O merchant vê o pixel listado em "App pixels" no admin
- A Shopify gerencia o sandbox e consentimento automaticamente
- Passa no App Review sem problemas

```toml
# extensions/tracklay-pixel/shopify.extension.toml
[[extensions]]
type = "web_pixel_extension"
name = "Tracklay Server-Side Pixel"
handle = "tracklay-pixel"
runtime_context = "strict"
```

---

### 4. Custom App vs Public App: Decisão Estratégica

| Aspecto | Custom App | Public App (App Store) |
|---|---|---|
| **Tempo para lançar** | 1-2 semanas | 2-3 meses |
| **Revisão Shopify** | ❌ Nenhuma | ✅ Obrigatória (7-14 dias) |
| **Multi-tenant** | ❌ Não precisa | ✅ Obrigatório |
| **Billing API** | ❌ Não precisa | ✅ Obrigatório (se cobrar) |
| **Política de privacidade** | Simples | Detalhada + ToS |
| **REST API** | Pode usar | ❌ Proibido (REST é legacy desde abril/2025) |
| **Custo de manutenção/ano** | Baixo | 15-25% do custo de build |
| **Criação** | Shopify Dev Dashboard | Shopify Partner Dashboard |

**Regra de ouro da Shopify (atualizada jan/2026):**
> Novos Custom Apps **só podem ser criados via Shopify Dev Dashboard**. O fluxo antigo pelo admin da loja foi fechado em 1º de janeiro de 2026.

**Recomendação para Tracklay:**
- **Fase 1:** Custom App para `suevich.com` (deploy rápido, sem revisão)
- **Fase 2:** Converter para Public App se quiser vender/comercializar

---

### 5. GraphQL Admin API: REST está morto

**Status:** ⚠️ **Aviso crítico para Public Apps**

A partir de **1º de abril de 2025**, a Shopify considera a REST Admin API como **legacy**. Para novos apps públicos:

> *"As of April 1, 2025 all new public apps must be built exclusively with the GraphQL Admin API."*

**Tracklay já usa GraphQL** para metafields, então está alinhado. Mas se houver código REST legado em algum lugar, deve ser migrado.

---

### 6. Custos Reais (validados com benchmarks de mercado)

| Item | Custom App | Public App |
|---|---|---|
| **MVP (desenvolvimento)** | $3.000 - $8.000 | $15.000 - $50.000 |
| **Hospedagem (Fly.io/Railway)** | $5 - $15/mês | $50 - $200/mês |
| **Banco de dados** | $0 (SQLite/Neon free tier) | $20 - $100/mês |
| **Revisão Shopify** | $0 | $0 (mas pode levar múltiplas rodadas) |
| **Manutenção anual** | 10-15% do MVP | 15-25% do MVP |

**Fonte:** Benchmarks de agências Shopify (Dekstech, WebContrive, RootSyntax) — abril/2026.

---

## ✅ Arquitetura Validada e Corrigida

```
App Tracklay (React Router + Shopify CLI)
├── app/
│   ├── routes/
│   │   ├── _index.tsx              # Dashboard/status
│   │   ├── config.tsx              # Form GTM ID, Worker URL, UUIDs
│   │   └── api/
│   │       ├── auth.tsx            # OAuth (gerado pelo CLI)
│   │       └── webhooks.tsx        # app/uninstalled, themes/publish
│   └── shopify.server.ts           # Cliente Admin API
├── extensions/
│   ├── tracklay-embed/             # App Embed Block (injetar no <head>)
│   │   ├── shopify.extension.toml
│   │   └── blocks/tracklay.liquid
│   └── tracklay-pixel/             # Web Pixel Extension (checkout)
│       ├── shopify.extension.toml
│       └── src/index.js            # Código do Custom Pixel
├── prisma/
│   └── schema.prisma               # Shop { id, domain, config... }
└── shopify.app.toml
```

### Fluxo de instalação (Custom App)

1. Merchant recebe link de instalação do Dev Dashboard
2. Autoriza OAuth + scopes (`write_pixels`, `read_customer_events`, etc.)
3. App Embed aparece no Editor de Temas → merchant ativa com 1 clique
4. Web Pixel aparece em Configurações > Eventos do cliente → merchant ativa
5. Merchant preenche GTM ID e Worker URL no dashboard do app
6. App salva config no banco de dados (ou metafields via GraphQL)

---

## 🚫 Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| App Embed não é ativado pelo merchant | Média | Mostrar modal de onboarding após instalação com GIF/tutorial |
| Web Pixel não é ativado | Média | Mesmo modal + link direto para `admin/settings/customer_events` |
| Theme não é Online Store 2.0 (não suporta App Embed) | Baixa | Detectar via API e mostrar fallback manual (copiar snippet) |
| Shopify muda API novamente | Média | Usar sempre a versão mais recente do Shopify CLI e SDK |
| Merchant desinstala app | Baixa | Webhook `app/uninstalled` limpa dados do banco |

---

## 📋 Checklist de Implementação (Corrigido)

### Fase 1 — Custom App MVP (2 semanas)
- [ ] Bootstrap com `shopify app init` (React Router template)
- [ ] Criar extension `tracklay-embed` (App Embed Block)
- [ ] Criar extension `tracklay-pixel` (Web Pixel Extension)
- [ ] Tela de config (GTM ID, Worker URL, UUIDs)
- [ ] Salvar config no banco (Prisma + SQLite/Postgres)
- [ ] Webhook `app/uninstalled` para cleanup
- [ ] Deploy em Fly.io ou Railway

### Fase 2 — Testes e Polimento (1 semana)
- [ ] Testar instalação em development store
- [ ] Testar App Embed ativando/inativando no editor de tema
- [ ] Testar Web Pixel disparando eventos no checkout
- [ ] Testar persistência de config entre recarregamentos

### Fase 3 — Public App (opcional, 2-3 meses)
- [ ] Multi-tenant (isolar dados por shop)
- [ ] Billing API (se for cobrar)
- [ ] Política de privacidade + ToS
- [ ] Submeter para App Review
- [ ] Resolver feedback da Shopify (geralmente 1-3 rodadas)

---

## 📚 Fontes da Pesquisa

1. [Shopify App Remix Package (npm)](https://www.npmjs.com/package/@shopify/shopify-app-remix) — confirma migração para React Router
2. [Shopify App Template — Remix](https://github.com/Shopify/shopify-app-template-remix) — template oficial
3. [Shopify Web Pixel API Docs](https://shopify.dev/docs/api/web-pixels-api) — criação via extension + GraphQL
4. [Shopify App Store Requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements) — REST proibido para novos apps
5. [Custom vs Public Apps](https://webcontrive.com/blogs/newsroom/shopify-app-development-custom-vs-app-store) — custos e timelines reais
6. [Shopify Community — Inject script into theme](https://community.shopify.dev/t/how-to-inject-a-custom-js-script-tag-into-the-shopify-theme-l-liquid-head-using-a-custom-app/23958) — confirma que Theme API direta é desencorajada
7. [Shopify Help — About Apps](https://help.shopify.com/en/manual/apps/about-apps) — custom apps via Dev Dashboard apenas

---

## ✅ Conclusão

O plano original estava **80% correto**, mas precisa de **3 correções críticas**:

1. **React Router** em vez de Remix (migração oficial da Shopify)
2. **App Embed Block + Web Pixel Extension** em vez de Theme API direta (padrão Shopify 2026)
3. **GraphQL exclusivo** — REST API não pode ser usado em novos apps públicos

Com esses ajustes, o app pode ser desenvolvido como **Custom App em ~2 semanas** e, se desejado, convertido para **Public App** posteriormente.
