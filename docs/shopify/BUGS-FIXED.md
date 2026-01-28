# Bugs Corrigidos ✅

> Data: 2026-01-28

Todos os bugs identificados na revisão de código foram corrigidos.

---

## Resumo das Correções

### 1. service-worker-interceptor.js (theme/interceptor.js)

#### Bug: URL Rewrite Incorreto
- **Problema:** Função `rewriteToProxy()` sempre usava `UUIDS.google` mesmo para requisições Facebook
- **Correção:** Adicionada função `getUuidForDomain()` que detecta o domínio e usa o UUID apropriado

#### Bug: Mensagem sem verificação de origem
- **Problema:** Mensagens do Service Worker não verificavam origem
- **Correção:** Adicionada verificação de `event.source` e logging de segurança

#### Melhorias adicionais:
- Adicionado fallback de resposta (1x1 transparent pixel) quando o proxy falha
- Adicionado `credentials: 'omit'` para privacidade
- Resposta transparente (status 200) para não quebrar scripts de tracking

---

### 2. theme-tracker.js

#### Bug: JSON.parse sem try-catch (WebRTC)
- **Problema:** `JSON.parse(event.data)` podia lançar exceção e quebrar o WebSocket
- **Correção:** Adicionado try-catch em `_connectSignaling().ws.onmessage`

#### Bug: WebSocket sem reconexão
- **Problema:** Se a conexão WebSocket caísse, não havia mecanismo automático de reconexão
- **Correção:** Adicionado sistema de reconexão com exponential backoff (até 5 tentativas)

#### Bug: Memory Leaks - setInterval sem clearInterval
- **Problema:** `CookiePoller` criava intervalo mas nunca limpava
- **Correção:** Adicionada propriedade `_intervalId` e método `stop()`

#### Bug: Memory Leaks - Event listeners não removidos
- **Problema:** Vários listeners anônimos adicionados mas nunca removidos
- **Correção:** 
  - `SmartBatcher`: Adicionados `_networkHandler` e `_visibilityHandler` + método `destroy()`
  - `ServiceWorkerManager`: Adicionado `_messageHandler` + método `destroy()`
  - `ThemeTracker`: Adicionado `_storageHandler` + método `destroy()`

#### Bug: Peers WebRTC nunca removidos
- **Problema:** Peers adicionados ao Map mas nunca removidos quando a conexão fechava
- **Correção:** Adicionado handler `onconnectionstatechange` + método `_removePeer()`

#### Bug: StorageManager.get() chamado de forma síncrona
- **Problema:** Na linha 816, `StorageManager.get()` é async mas usado como sync
- **Correção:** `Deduplicator.isDuplicate()` agora é async e usa await

#### Bug: Estatísticas podem acessar propriedades inexistentes
- **Problema:** `getStats()` acessava propriedades sem optional chaining
- **Correção:** Adicionado optional chaining (`?.`) e valores padrão (`|| 0`)

---

### 3. pixel-tracker.js

#### Bug: JSON.parse sem try-catch (WebRTC)
- **Problema:** Igual ao theme-tracker.js
- **Correção:** Adicionado try-catch em `_connectSignaling().ws.onmessage`

#### Bug: WebSocket sem reconexão
- **Problema:** Igual ao theme-tracker.js
- **Correção:** Adicionado sistema de reconexão com exponential backoff

#### Bug: Memory Leaks - Event listeners
- **Problema:** Igual ao theme-tracker.js
- **Correção:** Adicionados handlers armazenados + método `destroy()` em:
  - `SmartBatcher`
  - `WebRTCBridge`
  - `BackgroundSyncQueue`

#### Bug: Peers WebRTC nunca removidos
- **Problema:** Igual ao theme-tracker.js
- **Correção:** Adicionado handler `onconnectionstatechange` + método `_removePeer()`

---

### 4. batcher.js (theme/batcher.js)

#### Bug: sendBeacon com URL hardcoded
- **Problema:** URL '/batch' era hardcoded, não usava proxy configurado
- **Correção:** Adicionada opção `beaconUrl` no constructor (default: '/batch')

#### Bug: Memory Leaks - Event listeners
- **Problema:** Listeners anônimos não removidos
- **Correção:** Adicionados `_networkHandler` e `_visibilityHandler` + método `destroy()`

---

### 5. background-sync-queue.js (pixel/background-sync-queue.js)

#### Bug: Memory Leaks - Network listeners
- **Problema:** Event listeners para online/offline não removidos
- **Correção:** Adicionados `_onlineHandler` e `_offlineHandler` + método `destroy()`

---

## Novos Métodos Adicionados

### ThemeTracker
```javascript
destroy() // Limpa todos os recursos (listeners, timers, conexões)
```

### WebRTCBridge (theme e pixel)
```javascript
destroy() // Fecha WebSocket, peers e data channels
_scheduleReconnect() // Reconexão automática com backoff
_removePeer(peerId) // Remove peer fechado do Map
```

### SmartBatcher (theme e pixel)
```javascript
destroy() // Limpa timer e remove listeners
```

### ServiceWorkerManager
```javascript
destroy() // Remove message listener
```

### CookiePoller
```javascript
stop() // Para o polling e remove listeners
```

### BackgroundSyncQueue (pixel)
```javascript
destroy() // Remove network listeners
```

---

## Verificação de Sintaxe

Todos os arquivos corrigidos passaram na verificação de sintaxe do Node.js:

- ✅ `theme-tracker.js`
- ✅ `pixel-tracker.js`
- ✅ `batcher.js`
- ✅ `background-sync-queue.js`
- ✅ `interceptor.js`

---

## 6. Correção de Arquitetura (Pasta "Shared" Não Existe)

### Problema
A pasta `shared/` sugere que theme e pixel compartilham código via imports relativos (`../shared/`).

**Isso NÃO funciona porque:**
- Theme roda em: `loja.myshopify.com`
- Custom Pixel roda em: sandbox isolado (iframe, origem diferente)
- Imports relativos entre contexts são bloqueados pelo CORS/sandbox

### Correções

#### Pasta Shared Removida
```
ANTES:
shared/                          ❌ Sugere compartilhamento
  ├── storage-manager.js
  ├── deduplicator.js
  └── cookie-tracker.js

DEPOIS:
cdn/                             ✅ Módulos para CDN (URL absoluta)
  ├── storage-manager.js
  ├── deduplicator.js
  └── cookie-tracker.js
```

#### Uso Correto (CDN)
```javascript
// NO TEMA (funciona)
import { StorageManager } from 'https://cdn.seustore.com/tracklay/cdn/storage-manager.js';

// NO PIXEL (funciona)
import { EventBridge } from 'https://cdn.seustore.com/tracklay/cdn/cookie-tracker.js';
```

### Arquivos Movidos

#### Background Sync Queue
```
ANTES: pixel/background-sync-queue.js   ❌ Não funciona no sandbox
DEPOIS: theme/background-sync-queue.js  ✅ Theme tem acesso a SW
```

#### Cookie Tracker  
```
ANTES: pixel/cookie-tracker.js          ❌ Local incorreto
DEPOIS: cdn/cookie-tracker.js           ✅ Módulo para CDN
```

### Novo RetryQueue (Pixel)
Substituído `BackgroundSyncQueue` por `RetryQueue` simples em **memória**:

```javascript
// NOVO: RetryQueue (sandbox-safe)
RetryQueue.add(event);  // Retry com exponential backoff
// NOTA: Não persiste offline (limitação do sandbox)
```

---

## Uso Recomendado

Para evitar memory leaks em aplicações que iniciam/destroem o tracker dinamicamente:

```javascript
import { ThemeTracker } from './theme-tracker-ultimate.js';

// Inicializar
await ThemeTracker.init({
  gtmId: 'GTM-XXXXX',
  workerDomain: 'https://cdn.yourstore.com',
  googleUuid: 'your-google-uuid'
});

// ... usar o tracker ...

// Quando precisar limpar (ex: navegação SPA)
ThemeTracker.destroy();
```
