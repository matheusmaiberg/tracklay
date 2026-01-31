# Plano de Refatoração - Tracklay

> **Objetivo**: Melhorar a organização do código sem perder funcionalidades, corrigindo confusões de responsabilidade e acoplamento excessivo.

---

## Resumo Executivo

Baseado nas análises detalhadas, identificamos os seguintes problemas principais:

### 🔴 Problemas Críticos
1. **Configuração inchada** (`src/config/index.js`) com utilitários misturados
2. **Cache/Proxy acoplados** - imports cruzados entre camadas
3. **Inconsistência de headers** - segurança e CORS aplicados de forma desigual
4. **Router com lógica de negócio** - detecta protocolos ao invés de apenas rotear

### 🟡 Problemas Médios
5. **URL extractor viola SRP** - faz extração E reescrita
6. **Métricas mal classificadas** - em `middleware/` mas não é middleware
7. **Tratamento de erros inconsistente** - alguns retornam null, outros lançam, outros usam errorResponse
8. **Dynamic proxy muito grande** - 173 linhas com múltiplas responsabilidades

---

## Fase 1: Preparação - Utilitários Compartilhados

### 1.1 Criar `src/utils/url.js`
**Motivo**: Duplicação de normalização de URL entre `url-extractor.js` e `dynamic-endpoints.js`

```javascript
// src/utils/url.js
export function normalizeUrl(url) {
  if (!url) return '';
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return `${protocol}//${hostname}${pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

export function extractUuidFromPath(pathname) {
  if (!pathname?.startsWith('/x/')) return null;
  const afterPrefix = pathname.substring(3);
  const slashIndex = afterPrefix.indexOf('/');
  const uuid = slashIndex === -1 ? afterPrefix : afterPrefix.substring(0, slashIndex);
  const remainingPath = slashIndex === -1 ? '' : afterPrefix.substring(slashIndex);
  
  if (!uuid || uuid.length < 12 || uuid.length > 64) return null;
  if (!/^[a-f0-9]+$/.test(uuid.toLowerCase())) return null;
  
  return { uuid: uuid.toLowerCase(), remainingPath };
}
```

### 1.2 Criar `src/utils/parsing.js`
**Motivo**: `parseArrayConfig` está em `config/index.js` mas é utilitário genérico

```javascript
// src/utils/parsing.js
export const parseArrayConfig = (csvString) => {
  if (!csvString) return [];
  if (Array.isArray(csvString)) return csvString;
  return csvString.split(',').map(s => s.trim()).filter(Boolean);
};
```

### 1.3 Criar `src/utils/cache-control.js`
**Motivo**: Cache-Control definido em 5 lugares diferentes

```javascript
// src/utils/cache-control.js
export const CacheControl = {
  public: (ttl) => `public, max-age=${ttl}`,
  noStore: () => 'no-store, no-cache, must-revalidate',
  staleWhileRevalidate: (ttl) => `public, max-age=${ttl}, stale-while-revalidate=60`,
  rateLimit: (windowMs) => `max-age=${Math.ceil(windowMs / 1000)}`
};
```

---

## Fase 2: Core e Config - Separar Responsabilidades

### 2.1 Refatorar `src/config/index.js`

**Problema atual**: 158 linhas com múltiplas responsabilidades

**Estrutura proposta**:
```
src/config/
├── defaults.js      # Valores padrão puros
├── loader.js        # Carregamento de env vars  
├── index.js         # Re-exporta (interface pública)
└── utils.js         # (remover - migrar para src/utils/)
```

**Ações**:
1. Mover `parseArrayConfig` → `src/utils/parsing.js`
2. Mover `getOriginFromRequest` → `src/utils/request.js`
3. Mover `generateDefaultSecret` → `src/utils/crypto.js`
4. Manter apenas inicialização e exportação do CONFIG

### 2.2 Refatorar `src/core/rate-limiter.js`

**Problema**: Usa `caches.default` diretamente ao invés de `CacheManager`

**Alteração**:
```javascript
// Antes
const cache = caches.default;
await cache.put(cacheKey, response);

// Depois
import { CacheManager } from './cache.js';
await CacheManager.put(cacheKey, response, ttl);
```

### 2.3 Mover `src/middleware/metrics.js`

**Problema**: Não é middleware (não intercepta cadeia de requisições)

**Alteração**: Mover para `src/core/metrics.js`

---

## Fase 3: Proxy e Cache - Desacoplar Camadas

### 3.1 Criar `src/proxy/url-rewriter.js`

**Problema**: `url-extractor.js` viola SRP (faz extração E reescrita)

**Mover de `url-extractor.js`**:
```javascript
// src/proxy/url-rewriter.js
export function rewriteScriptUrls(scriptContent, urlMappings) {
  // ... código existente linhas 315-349
}
```

### 3.2 Criar `src/services/full-script-proxy.js`

**Problema**: `processScriptForFullProxy` está em `script-cache.js` mas coordena proxy + cache

**Extrair para novo serviço**:
```javascript
// src/services/full-script-proxy.js
import { extractUrls, filterTrackableUrls } from '../proxy/url-extractor.js';
import { rewriteScriptUrls } from '../proxy/url-rewriter.js';
import { batchCreateEndpoints } from '../cache/dynamic-endpoints.js';

export async function processScript(scriptContent, scriptKey, workerOrigin) {
  // ... lógica atual de processScriptForFullProxy
}
```

### 3.3 Simplificar `src/cache/dynamic-endpoints.js`

**Problema**: Sistema de callbacks adiciona complexidade desnecessária

**Alteração**: Remover `onNewEndpointCallbacks` e usar chamada direta:
```javascript
// Em vez de:
onNewEndpointCallbacks.push(callback);
// Notificar callbacks...

// Usar:
import { invalidateDependentScripts } from './script-cache.js';
// ... chamar diretamente após criar endpoint
```

### 3.4 Atualizar imports em `script-cache.js`

**Imports atuais problemáticos**:
```javascript
// Linhas 11-12 - imports cruzados
import { extractUrls, filterTrackableUrls, rewriteScriptUrls } from '../proxy/url-extractor.js';
import { batchCreateEndpoints, onNewEndpointCreated } from './dynamic-endpoints.js';
```

**Imports corrigidos**:
```javascript
import { processScript } from '../services/full-script-proxy.js';
import { batchCreateEndpoints } from './dynamic-endpoints.js';
```

---

## Fase 4: Handlers - Consolidar e Simplificar

### 4.1 Extrair serviços de `src/handlers/dynamic-proxy.js`

**Arquivo atual**: 173 linhas, muitas responsabilidades

**Divisão proposta**:
```
src/
  handlers/
    dynamic-proxy.js          # ~60 linhas (handler apenas)
  services/
    endpoint-recovery.js      # ~77 linhas
    cache-invalidator.js      # ~20 linhas
  utils/
    path-extractor.js         # ~23 linhas (mover de dynamic-proxy.js)
```

### 4.2 Criar `src/handlers/base-proxy.js`

**Motivo**: `scripts.js` e `endpoints.js` são quase idênticos

```javascript
// src/handlers/base-proxy.js
export async function handleGenericProxy(request, options) {
  const { resolver, proxyOptions = {}, rateLimit } = options;
  
  try {
    const targetUrl = await resolver(request);
    if (!targetUrl) {
      return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
    }
    
    return await proxyRequest(targetUrl, request, {
      ...proxyOptions,
      rateLimit
    });
  } catch (error) {
    Logger.error('Proxy handler failed', { error: error.message });
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
```

### 4.3 Refatorar `src/handlers/scripts.js` e `src/handlers/endpoints.js`

**Usar base-proxy.js**:
```javascript
// src/handlers/scripts.js
import { handleGenericProxy } from './base-proxy.js';
import { getScriptTarget } from '../routing/mapping.js';

export function handleScriptProxy(request, rateLimit) {
  const url = request._parsedUrl ?? new URL(request.url);
  const forceRefresh = url.searchParams.get('_refresh') === '1';
  
  return handleGenericProxy(request, {
    resolver: () => getScriptTarget(url.pathname, url.search),
    proxyOptions: { preserveHeaders: false, allowCache: true, forceRefresh },
    rateLimit
  });
}
```

### 4.4 Adicionar try-catch em `src/handlers/endpoints.js`

**Problema**: Único handler sem tratamento de erro

### 4.5 Extrair validação de `src/handlers/events.js`

**Divisão**:
```
src/
  services/
    event-validator.js        # validateEventData
    payload-builder.js        # buildGA4Payload, extractCustomParams
  handlers/
    events.js                 # Usar os serviços acima
```

### 4.6 Extrair `src/services/protocol-detector.js`

**Problema**: Router contém lógica de detecção de protocolo

```javascript
// src/services/protocol-detector.js
export function detectProtocol(pathname, search) {
  if (pathname.startsWith(PATH_PREFIXES.FACEBOOK)) {
    return { type: 'facebook', isTracking: method === 'POST' };
  }
  if (pathname.startsWith(PATH_PREFIXES.GOOGLE)) {
    const isTracking = GOOGLE_TRACKING_PARAMS.some(p => search.includes(p));
    return { type: 'google', isTracking };
  }
  return null;
}
```

---

## Fase 5: Headers - Consistência e Segurança

### 5.1 Corrigir `src/handlers/lib-proxy.js`

**Problema crítico**: Não aplica CORS nem todos os security headers

**Alteração**:
```javascript
import { buildFullHeaders } from '../factories/headers-factory.js';

// ... no handler:
const headers = buildFullHeaders(request, { 
  includeRateLimit: false,
  includeCSP: false  // Scripts podem precisar de inline
});
headers.set('Cache-Control', CacheControl.public(604800));
```

### 5.2 Corrigir `src/handlers/dynamic-proxy.js`

**Problema**: Respostas de erro não têm security headers

**Alteração**: Usar `buildFullHeaders` em todas as respostas

### 5.3 Adicionar `X-Frame-Options` em `src/headers/security.js`

**Alteração**:
```javascript
export const addSecurityHeaders = (headers, options = {}) => {
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('Permissions-Policy', 'interest-cohort=()');
  headers.set('X-Frame-Options', 'DENY');  // NOVO
  // ... resto
};
```

### 5.4 Remover duplicação de `X-Content-Type-Options`

**Localização**: `lib-proxy.js` linha 65 duplica `security.js`

### 5.5 Padronizar API dos módulos de header

**Opção recomendada**: Padrão imutável
```javascript
// Todos os módulos retornam novo Headers
export function addSecurityHeaders(baseHeaders, options) {
  const headers = new Headers(baseHeaders);
  headers.set('X-Robots-Tag', ...);
  return headers;
}
```

---

## Fase 6: Finalização

### 6.1 Verificar imports cíclicos
```bash
# Usar ferramenta ou verificação manual
# Não deve haver: A → B → A
```

### 6.2 Atualizar testes
- Ajustar paths de imports movidos
- Adicionar testes para novos utilitários

### 6.3 Atualizar documentação
- `CLAUDE.md`: Atualizar estrutura de diretórios
- `ARCHITECTURE.md`: (opcional) Criar documento de arquitetura

---

## Resumo das Mudanças por Arquivo

### Arquivos Novos
| Arquivo | Responsabilidade |
|---------|------------------|
| `src/utils/url.js` | Normalização de URL e extração de UUID |
| `src/utils/parsing.js` | Parsing de CSV/array |
| `src/utils/cache-control.js` | Constantes de Cache-Control |
| `src/proxy/url-rewriter.js` | Reescrita de URLs em scripts |
| `src/services/full-script-proxy.js` | Coordenação do Full Script Proxy |
| `src/services/endpoint-recovery.js` | Recuperação de endpoints expirados |
| `src/services/event-validator.js` | Validação de eventos |
| `src/services/payload-builder.js` | Construção de payloads GA4 |
| `src/services/protocol-detector.js` | Detecção de protocolo (FB/Google) |
| `src/handlers/base-proxy.js` | Handler proxy genérico |

### Arquivos Modificados
| Arquivo | Mudança |
|---------|---------|
| `src/config/index.js` | Remover utilitários, manter apenas config |
| `src/core/rate-limiter.js` | Usar CacheManager |
| `src/core/metrics.js` | Mover de `middleware/` |
| `src/cache/script-cache.js` | Usar serviço full-script-proxy |
| `src/cache/dynamic-endpoints.js` | Remover sistema de callbacks |
| `src/proxy/url-extractor.js` | Remover rewriteScriptUrls |
| `src/proxy/index.js` | Simplificar on-demand fetch |
| `src/routing/router.js` | Usar protocol-detector |
| `src/handlers/scripts.js` | Usar base-proxy |
| `src/handlers/endpoints.js` | Usar base-proxy, adicionar try-catch |
| `src/handlers/dynamic-proxy.js` | Extrair serviços |
| `src/handlers/events.js` | Usar serviços de validação |
| `src/handlers/lib-proxy.js` | Usar headers-factory |
| `src/headers/security.js` | Adicionar X-Frame-Options |

### Arquivos Movidos
| De | Para |
|----|------|
| `src/middleware/metrics.js` | `src/core/metrics.js` |

---

## Ordem de Execução Recomendada

```
Fase 1 (Preparação)
  ├── Criar src/utils/url.js
  ├── Criar src/utils/parsing.js
  └── Criar src/utils/cache-control.js

Fase 2 (Core)
  ├── Refatorar src/config/index.js
  ├── Corrigir src/core/rate-limiter.js
  └── Mover metrics.js

Fase 3 (Proxy/Cache)
  ├── Criar src/proxy/url-rewriter.js
  ├── Criar src/services/full-script-proxy.js
  ├── Atualizar src/cache/script-cache.js
  └── Simplificar src/cache/dynamic-endpoints.js

Fase 4 (Handlers)
  ├── Criar src/services/endpoint-recovery.js
  ├── Criar src/services/protocol-detector.js
  ├── Criar src/handlers/base-proxy.js
  ├── Refatorar scripts.js e endpoints.js
  └── Extrair validação de events.js

Fase 5 (Headers)
  ├── Corrigir lib-proxy.js
  ├── Corrigir dynamic-proxy.js
  └── Atualizar security.js

Fase 6 (Finalização)
  └── Verificar e testar
```

---

## Critérios de Sucesso

- [ ] Todos os testes existentes passam
- [ ] Nenhuma funcionalidade perdida
- [ ] Nenhum import circular
- [ ] Headers de segurança aplicados consistentemente
- [ ] CORS funcionando em todas as rotas
- [ ] Código reduzido em complexidade (menos linhas por arquivo)
- [ ] Responsabilidades claras (1 responsabilidade por módulo)
