# 🚀 Quick Start - Cloudflare Worker Corrigido

## 📋 Checklist Pré-Deploy

- [ ] Criar conta Cloudflare (free tier suficiente)
- [ ] Ter domínio apontando para Cloudflare DNS
- [ ] Ter GTM Server configurado (ou Stape.io)
- [ ] Ter Custom Pixel Shopify pronto

---

## ⚙️ PASSO 1: Configuração

Abra [`2-cloudflare-worker-proxy-FIXED.js`](2-cloudflare-worker-proxy-FIXED.js) e ajuste:

### 🔴 OBRIGATÓRIO

```javascript
// Linha 8-10: SEU domínio
const CONFIG = {
  GTM_SERVER_URL: 'https://gtm.yourstore.com', // ← MUDAR AQUI
  ALLOWED_ORIGINS: [
    'https://yourstore.com',           // ← MUDAR AQUI
    'https://www.yourstore.com'        // ← MUDAR AQUI
  ],

  // Linha 21: ⚠️ CRÍTICO - Secret único
  UUID_SECRET: 'CHANGE_THIS_SECRET_IN_PRODUCTION', // ← GERAR SENHA ALEATÓRIA
```

### 🔐 Gerar UUID_SECRET

```bash
# Opção 1: OpenSSL
openssl rand -base64 32

# Opção 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opção 3: Online
# https://www.random.org/strings/?num=1&len=32&digits=on&upperalpha=on&loweralpha=on

# Copiar resultado e colar na linha 21:
UUID_SECRET: 'Kj9mL3pQ7wX2vB8nF5hG1cD4sA6tY0zR',
```

### 🟡 OPCIONAL (Ajustar conforme necessidade)

```javascript
// Linha 14-15: Rate limiting
RATE_LIMIT_REQUESTS: 100, // aumentar se tráfego alto
RATE_LIMIT_WINDOW: 60000,  // manter 1 minuto

// Linha 18: Timeout
FETCH_TIMEOUT: 10000, // manter 10 segundos

// Linha 21: Tamanho máximo
MAX_REQUEST_SIZE: 1048576, // manter 1MB

// Linha 30: Logging
LOG_LEVEL: 'info' // 'debug' para desenvolvimento, 'error' para produção
```

---

## 📦 PASSO 2: Deploy no Cloudflare

### Opção A: Cloudflare Dashboard (Recomendado para iniciantes)

1. **Login no Cloudflare:**
   ```
   https://dash.cloudflare.com/
   ```

2. **Criar Worker:**
   - Workers & Pages → Create
   - Create Worker
   - Nome: `anti-tracking-proxy`
   - Deploy

3. **Substituir código:**
   - Quick Edit
   - Deletar código padrão
   - Colar conteúdo de `2-cloudflare-worker-proxy-FIXED.js`
   - Save and Deploy

4. **Testar:**
   ```bash
   curl https://anti-tracking-proxy.YOUR_SUBDOMAIN.workers.dev/health
   ```

### Opção B: Wrangler CLI (Recomendado para desenvolvedores)

1. **Instalar Wrangler:**
   ```bash
   npm install -g wrangler
   ```

2. **Login:**
   ```bash
   wrangler login
   ```

3. **Criar projeto:**
   ```bash
   mkdir cloudflare-proxy
   cd cloudflare-proxy
   ```

4. **Criar wrangler.toml:**
   ```toml
   name = "anti-tracking-proxy"
   main = "worker.js"
   compatibility_date = "2024-01-01"

   [env.production]
   route = "yourstore.com/cdn/*"
   ```

5. **Copiar worker:**
   ```bash
   cp /caminho/para/2-cloudflare-worker-proxy-FIXED.js worker.js
   ```

6. **Deploy:**
   ```bash
   wrangler deploy
   ```

---

## 🔀 PASSO 3: Configurar Routes

### 3.1 Adicionar Custom Route

**Cloudflare Dashboard:**
```
Websites → yourstore.com → Workers Routes → Add Route
```

**Configuração:**
```
Route Pattern: yourstore.com/cdn/*
Worker:        anti-tracking-proxy
```

**Adicionar rotas adicionais (opcional):**
```
yourstore.com/assets/*  → anti-tracking-proxy
yourstore.com/static/*  → anti-tracking-proxy
yourstore.com/g/*       → anti-tracking-proxy
yourstore.com/tr        → anti-tracking-proxy
```

### 3.2 Adicionar Health Check Route

```
yourstore.com/health → anti-tracking-proxy
```

---

## ✅ PASSO 4: Testes

### 4.1 Health Check

```bash
curl https://yourstore.com/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": 1706140800000,
  "date": "2026-01-24T12:00:00.000Z",
  "uuid": "a3f9c2e1b8d4",
  "version": "1.0.0",
  "metrics": {
    "rateLimit": {
      "remaining": 100,
      "limit": 100,
      "resetAt": "2026-01-24T12:01:00.000Z"
    },
    "config": {
      "cacheTTL": 3600,
      "timeout": 10000,
      "maxSize": 1048576
    }
  },
  "cloudflare": {
    "colo": "GRU",
    "country": "BR",
    "ray": "abc123def456"
  }
}
```

### 4.2 Script Proxy - GTM

```bash
curl -I https://yourstore.com/cdn/gtm.js?id=GTM-MJ7DW8H
```

**Headers esperados:**
```
HTTP/2 200
content-type: application/javascript
cache-control: public, max-age=3600
access-control-allow-origin: https://yourstore.com
x-cache-status: MISS
x-robots-tag: noindex, nofollow, noarchive
x-request-id: 123e4567-e89b-12d3-a456-426614174000
x-ratelimit-limit: 100
x-ratelimit-remaining: 99
```

**Segunda request (deve cachear):**
```bash
curl -I https://yourstore.com/cdn/gtm.js?id=GTM-MJ7DW8H
```

```
x-cache-status: HIT  ← CACHE FUNCIONANDO
```

### 4.3 Script Proxy - Meta Pixel com UUID

```bash
# Obter UUID atual do health check
UUID=$(curl -s https://yourstore.com/health | jq -r '.uuid')

# Testar proxy com UUID
curl -I https://yourstore.com/cdn/${UUID}.js
```

**Headers esperados:**
```
HTTP/2 200
content-type: application/javascript
cache-control: public, max-age=3600
x-cache-status: MISS
```

### 4.4 Endpoint Proxy - GTM Server

```bash
curl -X POST https://yourstore.com/g/collect \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourstore.com" \
  -d '{
    "client_id": "test123",
    "events": [{
      "name": "page_view",
      "params": {}
    }]
  }'
```

**Headers esperados:**
```
cache-control: no-store, no-cache, must-revalidate  ← NÃO CACHEADO
x-cache-status: MISS
```

### 4.5 CORS Preflight

```bash
curl -X OPTIONS https://yourstore.com/cdn/gtm.js \
  -H "Origin: https://yourstore.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Headers esperados:**
```
access-control-allow-origin: https://yourstore.com
access-control-allow-methods: GET, POST, OPTIONS, HEAD
access-control-allow-headers: Content-Type, Accept, X-Client-Data, X-Requested-With, ...
access-control-max-age: 86400
```

### 4.6 Rate Limiting

```bash
# Script para testar rate limit (100 requests/min)
for i in {1..105}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://yourstore.com/health)
  echo "Request $i: HTTP $STATUS"
  if [ $i -eq 105 ]; then
    # Último deve retornar 429
    [ "$STATUS" = "429" ] && echo "✅ Rate limit funcionando!" || echo "❌ Rate limit não funcionou"
  fi
done
```

### 4.7 Timeout Test

```bash
# Testar timeout de 10s (usando endpoint lento)
time curl https://yourstore.com/cdn/gtm.js?delay=20000

# Deve retornar erro após ~10 segundos:
# 502 Bad Gateway
# real 0m10.XXXs
```

---

## 🔍 PASSO 5: Validação de Tracking

### 5.1 Browser DevTools

1. **Abrir yourstore.com**
2. **DevTools → Network → Filter: "cdn"**
3. **Verificar:**
   ```
   ✅ yourstore.com/cdn/gtm.js          (200, cache HIT após 2ª)
   ✅ yourstore.com/cdn/a3f9c2e1b8d4.js (200, Meta Pixel)
   ✅ yourstore.com/g/collect           (200, não cacheado)
   ```

### 5.2 GTM Preview Mode

1. **GTM Web → Preview**
2. **Carregar yourstore.com**
3. **Verificar no GTM Preview:**
   ```
   ✅ Container carregado via proxy
   ✅ Events recebidos (page_view, etc)
   ✅ Zero erros CORS no console
   ```

### 5.3 Meta Events Manager

1. **Meta Business → Events Manager → Test Events**
2. **Adicionar Test Event Code no site**
3. **Navegar em yourstore.com**
4. **Verificar:**
   ```
   ✅ Events recebidos
   ✅ Event Match Quality: 9+ (headers preservados)
   ✅ Browser ID (_fbp) presente
   ```

### 5.4 GTM Server (Stape.io)

1. **Stape.io Dashboard → Logs**
2. **Filtrar por yourstore.com**
3. **Verificar:**
   ```
   ✅ Requests chegando do proxy
   ✅ IP preservado (CF-Connecting-IP)
   ✅ User-Agent correto
   ✅ Referer presente
   ```

---

## 📊 PASSO 6: Monitoramento

### 6.1 Cloudflare Analytics

**Dashboard → Workers → anti-tracking-proxy → Metrics**

**Métricas esperadas (24h após deploy):**
```
✅ Requests:        10.000 - 100.000/dia
✅ Success rate:    >99%
✅ Error rate:      <1%
✅ Avg duration:    <50ms
✅ p95 duration:    <100ms
✅ Cache hit rate:  >80% (verificar em Analytics → Cache)
```

### 6.2 Logs em Tempo Real

**Dashboard → Workers → anti-tracking-proxy → Logs**

**Filtrar por nível:**
```bash
# Erros apenas
level:error

# Requests específicos
path:/cdn/gtm.js

# Rate limits
message:"Rate limit exceeded"
```

**Log exemplo (success):**
```json
{
  "level": "info",
  "message": "Request completed",
  "timestamp": "2026-01-24T12:00:00.000Z",
  "path": "/cdn/gtm.js",
  "status": 200,
  "duration": "35ms",
  "cached": true
}
```

**Log exemplo (error):**
```json
{
  "level": "error",
  "message": "Fetch failed",
  "timestamp": "2026-01-24T12:00:01.000Z",
  "error": "Request timeout",
  "url": "https://www.googletagmanager.com/gtm.js"
}
```

### 6.3 Alertas (Opcional)

**Cloudflare → Notifications → Add**

**Configurar alertas para:**
- Error rate >5% (15 min)
- Requests >90% do limite Free Tier
- p95 latency >200ms

---

## 🐛 TROUBLESHOOTING

### ❌ Worker não responde (404)

**Causa:** Route não configurado

**Solução:**
```
Cloudflare → Websites → yourstore.com → Workers Routes
Verificar se existe:
  yourstore.com/cdn/* → anti-tracking-proxy
```

### ❌ CORS error no console

**Causa:** Origem não permitida em `ALLOWED_ORIGINS`

**Solução:**
```javascript
// Adicionar origem em CONFIG (linha 9)
ALLOWED_ORIGINS: [
  'https://yourstore.com',
  'https://www.yourstore.com',
  'https://staging.yourstore.com' // ← adicionar se necessário
],
```

### ❌ 429 Too Many Requests

**Causa:** Rate limit atingido (100 req/min)

**Solução:**
```javascript
// Aumentar limite em CONFIG (linha 14)
RATE_LIMIT_REQUESTS: 200, // aumentar de 100 para 200

// OU aguardar 1 minuto para reset
```

### ❌ Scripts não carregam (502)

**Causa:** Timeout ou erro no fetch upstream

**Solução:**
```
1. Verificar logs do worker
2. Verificar se GTM/Meta estão acessíveis:
   curl https://www.googletagmanager.com/gtm.js
3. Aumentar timeout se necessário (linha 18)
```

### ❌ Cache não funciona

**Causa:** Cache desabilitado ou routes incorretos

**Solução:**
```
1. Verificar X-Cache-Status header:
   curl -I https://yourstore.com/cdn/gtm.js | grep X-Cache-Status

2. Segunda request deve retornar HIT

3. Se sempre MISS, verificar cache key no código (linha 349)
```

### ❌ Event Match Quality baixo (<9)

**Causa:** Headers não preservados

**Solução:**
```
1. Verificar no browser DevTools → Network:
   - Referer header está presente?
   - Accept-Language presente?

2. Verificar logs do worker:
   Logger.debug('Proxying headers', {
     referer: request.headers.get('Referer')
   });

3. Garantir preserveHeaders=true em endpoints (linha 323)
```

### ❌ Conversões não chegam

**Causa:** Endpoints sendo cacheados incorretamente

**Solução:**
```bash
# Verificar se endpoints NÃO estão em cache
curl -I https://yourstore.com/g/collect | grep Cache-Control

# Deve retornar:
Cache-Control: no-store, no-cache, must-revalidate

# Se retornar max-age, verificar linha 323:
return await proxyRequest(..., true, false);
#                                     ↑ false = no cache
```

### ❌ UUID muda muito rápido

**Causa:** Rotação muito frequente

**Solução:**
```javascript
// Aumentar rotação de 7 dias para 30 dias (linha 20)
UUID_SALT_ROTATION: 2592000000, // 30 dias (30 * 24 * 60 * 60 * 1000)
```

---

## 📈 OTIMIZAÇÕES AVANÇADAS

### 1. Compressão Brotli (Automático)

Cloudflare aplica Brotli automaticamente se cliente suporta. Verificar:

```bash
curl -I https://yourstore.com/cdn/gtm.js -H "Accept-Encoding: br, gzip"
```

**Headers esperados:**
```
content-encoding: br
```

### 2. Early Hints (HTTP 103)

Adicionar antes de script proxy (linha 286):

```javascript
// Enviar early hint para preload
if (request.headers.get('Sec-Fetch-Dest') === 'script') {
  const earlyHints = new Response(null, {
    status: 103,
    headers: {
      'Link': `<${targetUrl}>; rel=preload; as=script`
    }
  });
  // Cloudflare envia automaticamente
}
```

### 3. Cache Tags para Purge Seletivo

```javascript
// Adicionar tag ao cache (linha 430)
modifiedResponse.headers.set('Cache-Tag', 'gtm-scripts');

// Purge via API:
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"tags":["gtm-scripts"]}'
```

### 4. Durable Objects para Rate Limit (Paid Plan)

Se precisar de rate limiting mais robusto:

```javascript
// wrangler.toml
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
script_name = "rate-limiter"

// worker.js
const rateLimiter = env.RATE_LIMITER.get(
  env.RATE_LIMITER.idFromName(clientIP)
);
```

---

## ✅ CHECKLIST PÓS-DEPLOY

- [ ] Health check responde 200
- [ ] Scripts carregam via proxy (GTM, Meta)
- [ ] UUID rotativo funciona
- [ ] Cache hit rate >80% após 24h
- [ ] Rate limit bloqueia após 100 req/min
- [ ] CORS sem erros no console
- [ ] Event Match Quality 9+ no Meta
- [ ] Conversões chegando no GTM Server
- [ ] Logs visíveis no Cloudflare
- [ ] Alertas configurados (opcional)

---

## 📚 RECURSOS

### Documentação
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)

### Suporte
- [Cloudflare Community](https://community.cloudflare.com/)
- [Workers Discord](https://discord.gg/cloudflaredev)

### Referências do Projeto
- [`2-cloudflare-worker-proxy-FIXED.js`](2-cloudflare-worker-proxy-FIXED.js) - Worker corrigido
- [`CHANGELOG-WORKER-FIXES.md`](CHANGELOG-WORKER-FIXES.md) - Detalhes das correções
- [`GUIA-COMPLETO-IMPLEMENTACAO.md`](GUIA-COMPLETO-IMPLEMENTACAO.md) - Guia completo do sistema

---

**🎯 Tempo estimado:** 15-30 minutos
**💰 Custo:** $0 (Free Tier suficiente para até 100k req/dia)
**🔧 Dificuldade:** Fácil (copy-paste configuração)

**Boa sorte! 🚀**
