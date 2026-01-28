# Correção de Arquitetura: Background Sync Queue

## Problema Identificado

O `background-sync-queue.js` estava na pasta `pixel/`, mas **o Custom Pixel do Shopify não tem acesso** a:

- ❌ Service Workers (necessário para Background Sync API)
- ❌ IndexedDB persistente (sandbox isolado)
- ❌ localStorage do domínio principal

## Solução

### 1. Arquivos Movidos

```
ANTES:
pixel/
  ├── background-sync-queue.js  ❌ (não funciona no sandbox)
  └── pixel-tracker.js

DEPOIS:
theme/
  ├── background-sync-queue.js  ✅ (funciona no contexto normal)
  └── theme-tracker.js

pixel/
  └── pixel-tracker.js          ✅ (usa RetryQueue em memória)
```

### 2. Novo Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│  CUSTOM PIXEL (Sandbox)                                     │
│  ───────────────────────                                    │
│  1. Captura eventos via analytics.subscribe()               │
│  2. Tenta enviar IMEDIATAMENTE via:                         │
│     - BroadcastChannel (WebRTC signaling)                   │
│     - localStorage (fallback)                               │
│     - Cookies (último recurso)                              │
│  3. Se falhar: RetryQueue em MEMÓRIA (com backoff)          │
│                                                             │
│  ❌ NÃO usa Service Worker                                  │
│  ❌ NÃO usa IndexedDB persistente                           │
│  ❌ NÃO faz "background sync" real                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  THEME (Contexto Normal)                                    │
│  ───────────────────────                                    │
│  1. Recebe eventos via múltiplos canais                     │
│  2. Service Worker intercepta e faz proxy                   │
│  3. IndexedDB para persistência real                        │
│  4. Background Sync quando offline                          │
│  5. Envia para GTM/dataLayer                                │
└─────────────────────────────────────────────────────────────┘
```

### 3. Mudanças no Código

#### Pixel Tracker (Sandbox)

**ANTES:**
```javascript
// Usava BackgroundSyncQueue com IndexedDB
await BackgroundSyncQueue.init();
await BackgroundSyncQueue.add(event);
```

**DEPOIS:**
```javascript
// Usa RetryQueue simples em memória
RetryQueue.add(event);  // Retry com exponential backoff
```

#### Theme Tracker (Contexto Normal)

Mantém funcionalidade completa:
```javascript
// Service Worker para background sync real
await ServiceWorkerManager.register();
await ServiceWorkerManager.sync();

// IndexedDB para persistência
await StorageManager.set(key, value);
```

### 4. Por Que Funciona Assim?

| Feature | Custom Pixel | Theme |
|---------|-------------|-------|
| **Contexto** | Sandbox (iframe isolado) | Página normal |
| **Service Worker** | ❌ Não tem acesso | ✅ Tem acesso |
| **IndexedDB** | ⚠️ Isolado (não compartilha com theme) | ✅ Normal |
| **localStorage** | ⚠️ Isolado | ✅ Normal |
| **Cookies** | ⚠️ Limitado | ✅ Normal |
| **fetch()** | ✅ Funciona | ✅ Funciona |
| **BroadcastChannel** | ✅ Funciona* | ✅ Funciona |

*BroadcastChannel funciona se o theme e pixel estiverem na mesma origem (mesmo domínio).

### 5. O Que Muda na Prática?

#### Cenário: Usuário faz checkout (offline temporário)

**ANTES (com bug):**
1. Pixel tenta salvar em IndexedDB → Falha ou fica isolado no sandbox
2. Evento é perdido quando pixel é descarregado

**DEPOIS (corrigido):**
1. Pixel tenta enviar imediatamente via BroadcastChannel/localStorage
2. Se falhar, coloca na RetryQueue (memória)
3. RetryQueue tenta novamente com exponential backoff
4. Se ainda falhar após max retries, evento é perdido (aceitável)

**Theme complementa:**
1. Recebe evento quando online
2. Se offline, usa Background Sync real (com Service Worker)
3. IndexedDB persistente para eventos importantes

### 6. Instalação Correta

#### Custom Pixel (Shopify Admin)

```javascript
// Em: Shopify Admin → Configurações → Eventos de cliente → Pixel Personalizado

import { PixelTracker } from 'https://cdn.yourstore.com/pixel-tracker.js';

PixelTracker.init({
  debug: false
  // NÃO precisa de workerDomain aqui (não tem acesso ao SW)
});
```

#### Theme (Arquivos da Loja)

```javascript
// Em: theme.liquid ou um arquivo JS carregado no tema

import { ThemeTracker } from '/tracklay/theme-tracker.js';

await ThemeTracker.init({
  gtmId: 'GTM-XXXXX',
  workerDomain: 'https://cdn.yourstore.com',
  googleUuid: 'your-google-uuid',
  facebookUuid: 'your-facebook-uuid'
  // AQUI sim precisa de workerDomain (tem acesso ao SW)
});
```

---

## 7. Pasta "Shared" Não Existe

### Problema
A pasta `shared/` sugere que theme e pixel podem compartilhar código via imports relativos (`../shared/`).

**Isso NÃO funciona:**
- Theme roda em: `loja.myshopify.com`
- Pixel roda em: sandbox isolado (iframe, origem diferente)
- Imports relativos são bloqueados por CORS/sandbox

### Solução

#### Estrutura Corrigida
```
ANTES:
shared/                    ❌ Sugere compartilhamento
  ├── storage-manager.js
  ├── deduplicator.js
  └── cookie-tracker.js

DEPOIS:
cdn/                       ✅ Módulos standalone para CDN
  ├── storage-manager.js
  ├── deduplicator.js
  └── cookie-tracker.js
```

#### Uso Correto (via CDN)
```javascript
// NO TEMA (funciona)
import { StorageManager } from 'https://cdn.seustore.com/tracklay/cdn/storage-manager.js';

// NO PIXEL (funciona)
import { EventBridge } from 'https://cdn.seustore.com/tracklay/cdn/cookie-tracker.js';
```

### Recomendação
Use os arquivos **tudo-em-um** (`theme-tracker.js` e `pixel-tracker.js`) que já incluem tudo internamente.

---

## Resumo

- **Pixel**: Apenas captura e envia (com retry simples em memória)
- **Theme**: Recebe, persiste e gerencia background sync real
- **BackgroundSyncQueue**: Agora está no theme (onde funciona)
- **RetryQueue**: Nova implementação simples para o pixel (sandbox)
- **Pasta shared**: Removida (não existe compartilhamento entre contexts)
