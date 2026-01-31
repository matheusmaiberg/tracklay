# 🏗️ Estrutura Factory - Cloudflare Worker (Proposta)

## 📁 Árvore de Diretórios

```
shopify-anti-tracking/
├── worker.js                          # Entry point do Cloudflare Worker
├── wrangler.toml                      # Configuração Cloudflare
├── package.json                       # Dependencies (se necessário)
│
├── src/                               # Source code
│   ├── config/                        # Configurações
│   │   └── index.js                   # CONFIG centralizado (timeouts, limits, secrets)
│   │
│   ├── core/                          # Funcionalidades core
│   │   ├── logger.js                  # Sistema de logging estruturado
│   │   ├── rate-limiter.js            # Rate limiting (100 req/min)
│   │   ├── uuid.js                    # Geração de UUID seguro (SHA-256)
│   │   ├── cache.js                   # Cache management (get, put, invalidate)
│   │   └── fetch.js                   # Fetch com timeout e retry
│   │
│   ├── headers/                       # Header builders
│   │   ├── proxy.js                   # buildProxyHeaders (EMQ, Client Hints)
│   │   ├── cors.js                    # buildCORSHeaders (GTM, Meta)
│   │   └── security.js                # addSecurityHeaders (X-Robots-Tag, CSP)
│   │
│   ├── handlers/                      # Request handlers
│   │   ├── scripts.js                 # handleScriptProxy (GTM, Meta Pixel)
│   │   ├── endpoints.js               # handleEndpointProxy (/g/collect, /tr)
│   │   ├── health.js                  # handleHealthCheck (métricas)
│   │   └── options.js                 # handleOptions (CORS preflight)
│   │
│   ├── proxy/                         # Proxy engine
│   │   ├── index.js                   # proxyRequest (função principal)
│   │   ├── cache-strategy.js          # Cache decision logic (scripts vs endpoints)
│   │   └── response-builder.js        # Response modification (headers, cache)
│   │
│   ├── routing/                       # Routing
│   │   ├── router.js                  # Route matching (/cdn/*, /g/collect, /health)
│   │   └── mapping.js                 # URL mappings (scripts, endpoints)
│   │
│   ├── middleware/                    # Middlewares
│   │   ├── validator.js               # Request validation (size, DNT)
│   │   ├── error-handler.js           # Global error handling
│   │   └── metrics.js                 # Metrics collection (duration, status)
│   │
│   └── utils/                         # Utilities
│       ├── response.js                # Response helpers (json, error, success)
│       └── constants.js               # Constantes (status codes, headers)
│
└── tests/                             # Testes
    ├── unit/                          # Testes unitários
    │   ├── core/
    │   │   ├── logger.test.js
    │   │   ├── rate-limiter.test.js
    │   │   ├── uuid.test.js
    │   │   ├── cache.test.js
    │   │   └── fetch.test.js
    │   │
    │   ├── headers/
    │   │   ├── proxy.test.js
    │   │   ├── cors.test.js
    │   │   └── security.test.js
    │   │
    │   ├── handlers/
    │   │   ├── scripts.test.js
    │   │   ├── endpoints.test.js
    │   │   ├── health.test.js
    │   │   └── options.test.js
    │   │
    │   ├── proxy/
    │   │   ├── index.test.js
    │   │   ├── cache-strategy.test.js
    │   │   └── response-builder.test.js
    │   │
    │   ├── routing/
    │   │   ├── router.test.js
    │   │   └── mapping.test.js
    │   │
    │   └── middleware/
    │       ├── validator.test.js
    │       ├── error-handler.test.js
    │       └── metrics.test.js
    │
    ├── integration/                   # Testes de integração
    │   ├── proxy-flow.test.js         # Teste completo do fluxo de proxy
    │   ├── cache-behavior.test.js     # Comportamento de cache
    │   ├── rate-limiting.test.js      # Rate limiting em ação
    │   └── cors-flow.test.js          # CORS completo
    │
    ├── e2e/                           # Testes end-to-end
    │   ├── gtm-script.test.js         # GTM script proxy
    │   ├── meta-pixel.test.js         # Meta Pixel com UUID
    │   ├── gtm-server.test.js         # GTM Server endpoints
    │   └── health-check.test.js       # Health check
    │
    ├── fixtures/                      # Dados de teste
    │   ├── requests.js                # Request mocks
    │   ├── responses.js               # Response mocks
    │   └── headers.js                 # Headers mocks
    │
    └── helpers/                       # Test helpers
        ├── mock-cache.js              # Mock Cloudflare Cache API
        ├── mock-fetch.js              # Mock global fetch
        └── assertions.js              # Custom assertions
```

---

## 📄 Descrição Detalhada dos Arquivos

### 🔧 **Root Files**

#### `worker.js`
```javascript
// Entry point do Cloudflare Worker
// - Import do router principal
// - addEventListener('fetch', ...)
// - Error handling global
// - Inicialização de serviços
```

#### `wrangler.toml`
```toml
# Configuração do Cloudflare Worker
# - Nome do worker
# - Routes
# - Compatibility date
# - Environment variables
# - KV namespaces (se necessário)
```

#### `package.json`
```json
// Dependencies (se necessário)
// - vitest (testes)
// - prettier (formatação)
// - eslint (linting)
```

---

### 📂 **src/config/**

#### `index.js`
```javascript
// Configuração centralizada
export const CONFIG = {
  // Server URLs
  GTM_SERVER_URL: 'https://gtm.yourstore.com',
  ALLOWED_ORIGINS: ['https://yourstore.com'],

  // Rate limiting
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000,

  // Timeouts
  FETCH_TIMEOUT: 10000,

  // UUID
  UUID_SALT_ROTATION: 604800000,
  UUID_SECRET: env.UUID_SECRET || 'default',

  // Cache
  CACHE_TTL: 3600,

  // Security
  MAX_REQUEST_SIZE: 1048576,

  // Paths
  CDN_PATHS: ['/cdn/', '/assets/', '/static/'],

  // Logging
  LOG_LEVEL: 'info'
};
```

---

### 📂 **src/core/**

#### `logger.js`
```javascript
// Sistema de logging estruturado
export class Logger {
  debug(message, data) { }
  info(message, data) { }
  warn(message, data) { }
  error(message, data) { }
}
```

#### `rate-limiter.js`
```javascript
// Rate limiting por IP
export class RateLimiter {
  async check(ip) { }
  async reset(ip) { }
  async getStats(ip) { }
}
```

#### `uuid.js`
```javascript
// Geração de UUID seguro com SHA-256
export async function generateSecureUUID() { }
export function getWeekNumber() { }
```

#### `cache.js`
```javascript
// Cache management
export class CacheManager {
  async get(key) { }
  async put(key, value, ttl) { }
  async delete(key) { }
  async purge(pattern) { }
}
```

#### `fetch.js`
```javascript
// Fetch com timeout e retry
export async function fetchWithTimeout(url, options) { }
export async function fetchWithRetry(url, options, maxRetries) { }
```

---

### 📂 **src/headers/**

#### `proxy.js`
```javascript
// Build proxy headers (IP, User-Agent, Referer, Client Hints)
export function buildProxyHeaders(request, preserveHeaders) { }
export function getCriticalHeaders() { }
```

#### `cors.js`
```javascript
// Build CORS headers
export function buildCORSHeaders(request) { }
export function isOriginAllowed(origin) { }
```

#### `security.js`
```javascript
// Add security headers
export function addSecurityHeaders(headers) { }
export function getCSPDirectives() { }
```

---

### 📂 **src/handlers/**

#### `scripts.js`
```javascript
// Handle script proxy (GTM, Meta Pixel)
export async function handleScriptProxy(request) { }
export function getScriptMapping() { }
export function isUUIDPath(path) { }
```

#### `endpoints.js`
```javascript
// Handle endpoint proxy (/g/collect, /tr)
export async function handleEndpointProxy(request) { }
export function getEndpointMapping() { }
```

#### `health.js`
```javascript
// Health check endpoint
export async function handleHealthCheck(request) { }
export function getMetrics() { }
```

#### `options.js`
```javascript
// CORS preflight handler
export function handleOptions(request) { }
```

---

### 📂 **src/proxy/**

#### `index.js`
```javascript
// Função principal de proxy
export async function proxyRequest(targetUrl, request, options) { }
```

#### `cache-strategy.js`
```javascript
// Cache decision logic
export function shouldCache(url, request) { }
export function getCacheKey(url) { }
export function getCacheTTL(url) { }
```

#### `response-builder.js`
```javascript
// Build response com headers
export function buildResponse(upstreamResponse, request, options) { }
export function addCacheHeaders(response, cached) { }
```

---

### 📂 **src/routing/**

#### `router.js`
```javascript
// Route matching
export class Router {
  match(request) { }
  route(request) { }
}
```

#### `mapping.js`
```javascript
// URL mappings
export const SCRIPT_MAP = {
  '/cdn/fbevents.js': 'https://connect.facebook.net/en_US/fbevents.js',
  '/cdn/gtm.js': 'https://www.googletagmanager.com/gtm.js'
};

export const ENDPOINT_MAP = {
  '/g/collect': 'https://gtm.yourstore.com/g/collect',
  '/tr': 'https://www.facebook.com/tr'
};
```

---

### 📂 **src/middleware/**

#### `validator.js`
```javascript
// Request validation
export function validateRequest(request) { }
export function checkRequestSize(request) { }
export function checkDNT(request) { }
```

#### `error-handler.js`
```javascript
// Global error handling
export function handleError(error, request) { }
export function createErrorResponse(error) { }
```

#### `metrics.js`
```javascript
// Metrics collection
export class Metrics {
  record(request, response, duration) { }
  getStats() { }
}
```

---

### 📂 **src/utils/**

#### `response.js`
```javascript
// Response helpers
export function jsonResponse(data, status) { }
export function errorResponse(message, status) { }
export function successResponse(data) { }
```

#### `constants.js`
```javascript
// Constantes
export const HTTP_STATUS = {
  OK: 200,
  BAD_GATEWAY: 502,
  TOO_MANY_REQUESTS: 429,
  // ...
};

export const HEADERS = {
  CORS_ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
  // ...
};
```

---

## 🔄 Fluxo de Execução

```
1. Request chega → worker.js
   ↓
2. Router (src/routing/router.js)
   ├─ /cdn/*        → handlers/scripts.js
   ├─ /g/collect    → handlers/endpoints.js
   ├─ /health       → handlers/health.js
   └─ OPTIONS       → handlers/options.js
   ↓
3. Middleware (src/middleware/)
   ├─ validator.js       (validar request)
   ├─ rate-limiter.js    (check limite)
   └─ metrics.js         (iniciar timer)
   ↓
4. Handler específico
   ├─ scripts.js         (buscar em SCRIPT_MAP)
   ├─ endpoints.js       (buscar em ENDPOINT_MAP)
   └─ health.js          (retornar métricas)
   ↓
5. Proxy (src/proxy/)
   ├─ cache-strategy.js  (decidir se cachear)
   ├─ index.js           (fazer fetch upstream)
   └─ response-builder.js (adicionar headers)
   ↓
6. Headers (src/headers/)
   ├─ proxy.js           (headers críticos)
   ├─ cors.js            (CORS)
   └─ security.js        (segurança)
   ↓
7. Response → usuario
   ↓
8. Middleware pós-resposta
   ├─ metrics.js         (gravar duração)
   └─ logger.js          (log structured)
```

---

## 🧪 Estratégia de Testes

### **Unit Tests** (Isolados, rápidos)
- ✅ Testar cada função individualmente
- ✅ Mock de dependências externas
- ✅ Cobertura: >90%

### **Integration Tests** (Componentes juntos)
- ✅ Testar fluxo completo de proxy
- ✅ Cache behavior real
- ✅ Rate limiting em ação
- ✅ CORS flow completo

### **E2E Tests** (Simular produção)
- ✅ GTM script proxy completo
- ✅ Meta Pixel com UUID
- ✅ GTM Server endpoints
- ✅ Health check

---

## 📊 Benefícios da Estrutura Factory

### ✅ **Separação de Responsabilidades**
- Cada arquivo tem UMA responsabilidade clara
- Fácil de encontrar onde algo está
- Baixo acoplamento, alta coesão

### ✅ **Testabilidade**
- Funções pequenas = fáceis de testar
- Mocks simples (cada módulo é isolável)
- Testes unitários rápidos (<1s)

### ✅ **Manutenibilidade**
- Mudanças localizadas
- Refatorar um módulo não quebra outros
- Fácil adicionar features

### ✅ **Colaboração**
- Múltiplos devs podem trabalhar simultaneamente
- Merge conflicts reduzidos
- Code review mais focado

### ✅ **Reutilização**
- Módulos podem ser reusados em outros projetos
- Headers, cache, logger são genéricos
- DRY (Don't Repeat Yourself)

### ✅ **Performance**
- Cloudflare Workers suporta ES modules
- Tree shaking automático (só importa o usado)
- Bundle otimizado

---

## 📝 Exemplo de Importação no `worker.js`

```javascript
// worker.js
import { CONFIG } from './src/config/index.js';
import { Logger } from './src/core/logger.js';
import { RateLimiter } from './src/core/rate-limiter.js';
import { Router } from './src/routing/router.js';
import { handleError } from './src/middleware/error-handler.js';
import { Metrics } from './src/middleware/metrics.js';

const logger = new Logger(CONFIG.LOG_LEVEL);
const rateLimiter = new RateLimiter();
const router = new Router();
const metrics = new Metrics();

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP');
    const rateLimit = await rateLimiter.check(ip);
    if (!rateLimit.allowed) {
      return new Response('Too Many Requests', { status: 429 });
    }

    // Routing
    const response = await router.route(request);

    // Metrics
    const duration = Date.now() - startTime;
    metrics.record(request, response, duration);

    return response;

  } catch (error) {
    logger.error('Request failed', { error: error.message });
    return handleError(error, request);
  }
}
```

---

## 🚀 Próximos Passos

### 1. **Aprovar estrutura** ✅
   - Revisar organização de pastas
   - Validar separação de responsabilidades
   - Confirmar naming conventions

### 2. **Implementar módulos** (após aprovação)
   - Começar por `src/config/`
   - Depois `src/core/`
   - Em seguida `src/headers/`
   - E assim por diante

### 3. **Escrever testes** (paralelo à implementação)
   - Testes unitários para cada módulo
   - Integration tests para fluxos
   - E2E tests no final

### 4. **Integração**
   - Montar `worker.js` final
   - Configurar `wrangler.toml`
   - Deploy em staging

### 5. **Validação**
   - Rodar todos os testes
   - Verificar performance
   - Validar em produção

---

## ❓ Questões para Aprovação

1. **Estrutura de pastas:** Aprovada? Alguma mudança?
2. **Naming:** Manter nomes sem "Factory"? (ex: `mapping.js` vs `script-mapping.js`)
3. **Testes:** Adicionar mais categorias? (ex: `tests/performance/`)
4. **Utils:** Separar mais? (ex: `utils/http/`, `utils/crypto/`)
5. **Config:** Usar variáveis de ambiente? (ex: `env.UUID_SECRET`)

---

**Aguardando aprovação para começar implementação! 🎯**
