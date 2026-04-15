# AGENTS.md — Tracklay

> Contexto rápido para agents de código trabalhando neste projeto.

## Visão Geral

Tracklay é um proxy de tracking first-party para Cloudflare Workers. Ele serve scripts de tracking (GTM, Meta, etc.) sob seu próprio domínio e proxya eventos server-side para GTM Server-Side e outras plataformas.

## Stack

- **Runtime:** Cloudflare Workers (V8 isolates)
- **Lang:** ES modules (JavaScript)
- **Deploy:** Wrangler CLI (`wrangler deploy`)
- **Version:** 1.0.0

## Arquitetura de Diretórios

```
src/
  config/           # Configuração global e inicialização
  core/             # Logger, RateLimiter
  handlers/         # Route handlers (scripts, endpoints, events, health)
  headers/          # CORS, security, rate-limit headers
  factories/        # Builders reutilizáveis (headers, responses)
  middleware/       # Error handler, metrics
  proxy/            # Response builder
  routing/          # Router + path mapping (ofuscação UUID)
  scheduled/        # Cron jobs (ex: cache warmup)
  utils/            # Helpers e constantes
  workers/          # Entrypoints específicos

docs/
  shopify/          # Integração Shopify (snippets, scripts, módulos Dawn)
```

## Convenções Importantes

1. **Sem `require()`** — sempre ES modules (`import`/`export`)
2. **Worker env** — variáveis de ambiente vêm de `wrangler.toml` + secrets do Cloudflare
3. **CORS** — `buildResponse()` deve ser usado para garantir headers CORS em todas as respostas
4. **Rate limiting** — `RateLimiter.check()` é chamado no `worker.js` e passado adiante

## Pontos de Atenção Críticos

### 1. GTM Proxy URL
A tag `googtag` no tema Dawn monta a URL do script GTM via `module.loader.js`. A URL **deve** incluir o UUID de obfuscação:

```
https://cdn.seudominio.com/cdn/g/{googleUuid}?id=GTM-XXXXXX
```

Se `googleUuid` não for passado na config, a tag carrega o domínio base sem path e quebra.

### 2. SessionStorage Bridge
Checkout Shopify Plus roda em sandbox iframe. O Custom Pixel escreve eventos em `browser.sessionStorage` sob a chave `tracklay_event_queue` (array JSON). O tema lê essa fila única e limpa. **Nunca use chaves indexadas soltas** — eventos se perdem no refresh.

### 3. Client ID Cross-Origin
O cookie `_tracklay_cid` (`SameSite=Lax`) não atravessa para o checkout iframe. Solução:
- Tema escreve `_tracklay_cid` no `sessionStorage`
- Custom Pixel lê do `browser.sessionStorage` primeiro, depois do cookie

### 4. Duplicação Server-Side
Custom Pixel já faz `fetch POST /cdn/events`. O tema, ao ler o bridge, faria outro `fetch` idêntico. O bridge agora inclui `_tracklay_server_sent: true`; o tema verifica antes de reenviar.

### 5. Event Name Mapping
O tema Dawn recebe eventos com nomes Shopify (`checkout_completed`, `product_added_to_cart`, etc.). A `googtag` não traduz nomes automaticamente — ela envia o nome literal como evento personalizado para o GA4. Para que eventos de e-commerce sejam reconhecidos pelo GA4 (receita, funil), o `module.init.js` faz o mapeamento para nomes GA4 oficiais.

## Comandos Úteis

```bash
# Deploy
npx wrangler deploy

# Logs de produção
npx wrangler tail

# Health check
curl https://cdn.seudominio.com/health
```

## Documentação Relacionada

- `docs/shopify/INSTALLATION.md` — Instalação na Shopify
- `docs/shopify/SERVER_SIDE_IMPLEMENTATION.md` — Implementação server-side
- `docs/shopify/EVENT_MAPPING.md` — Mapeamento de eventos Shopify → GA4
