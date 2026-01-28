# Erros de Lógica na Comunicação Theme ↔ Pixel

## ⚠️ Problemas Críticos Encontrados

### 1. BroadcastChannel - Pixel Não Recebe Mensagens do Theme

**Problema:** O `BroadcastManager` no pixel **só envia**, não tem listener para receber.

```javascript
// PIXEL (pixel-tracker.js:645-678)
const BroadcastManager = {
  channel: null,
  
  init() {
    this.channel = new BroadcastChannel(`${CONFIG.STORAGE_PREFIX}events`);
    // ❌ NÃO TEM onmessage handler!
    return true;
  },
  
  send(data) {
    this.channel.postMessage(data);  // ✅ Só envia
  }
  // ❌ Não recebe mensagens do theme
};
```

**Impacto:** Se o theme precisar enviar algo para o pixel (ex: confirmação de recebimento), não consegue.

**Correção:** Adicionar handler onmessage no pixel também.

---

### 2. WebRTC - Dependência de Servidor de Sinalização Externo

**Problema:** WebRTC requer WebSocket para signaling:

```javascript
// Theme e Pixel
WEBRTC_SIGNALING_URL: 'wss://signaling.tracklay.com'
```

**Impactos:**
- Se o servidor cair, WebRTC não funciona
- Latência extra na conexão inicial
- Custo de infraestrutura

**Alternativa:** Usar BroadcastChannel como signaling para WebRTC (mesma origem).

---

### 3. localStorage - Chaves Diferentes (Eventos Perdidos)

**Problema:** O pixel usa chaves temporárias que o theme não observa:

```javascript
// PIXEL (pixel-tracker.js:1146)
const key = `${CONFIG.STORAGE_PREFIX}evt_${Date.now()}`;  // Chave única por evento
StorageHelper.set(key, data);
setTimeout(() => localStorage.removeItem(key), 5000);  // Remove após 5s

// THEME (theme-tracker.js:1218-1227)
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith(CONFIG.STORAGE_PREFIX)) {  // ✅ Observa TODAS as chaves
    // ...
  }
});
```

**Risco de Race Condition:** Se o theme não estiver rodando quando o pixel salvar, o evento é perdido (é removido após 5s).

**Correção:** Usar uma chave fixa (ex: `_tracklay_ult_pending`) que o theme polla, ou aumentar o timeout.

---

### 4. IndexedDB - Sandbox Isolado (Não Compartilha)

**Problema:** O pixel tenta usar IndexedDB:

```javascript
// PIXEL (pixel-tracker.js:1163-1169)
_sendIndexedDB(event) {
  await IndexedDBHelper.setEvent(event.id, event);
}
```

**Realidade:** O IndexedDB do Custom Pixel é **isolado** (sandbox do iframe).

```
┌─────────────────────────────────────────────────────────┐
│  THEME (loja.myshopify.com)                             │
│  IndexedDB: [event1, event2, event3]  ← Inacessível     │
└─────────────────────────────────────────────────────────┘
                           X  BLOQUEADO (CORS/Sandbox)
┌─────────────────────────────────────────────────────────┐
│  PIXEL (Sandbox)                                        │
│  IndexedDB: [eventA]  ← Isolado, theme não vê           │
└─────────────────────────────────────────────────────────┘
```

**Impacto:** O theme nunca recebe eventos via IndexedDB.

**Solução:** Remover IndexedDB do pixel (não funciona para comunicação).

---

### 5. Cookie - SameSite=Lax (Não Compartilha em Alguns Casos)

**Problema:** Cookies são definidos com `SameSite=Lax`:

```javascript
// PIXEL (pixel-tracker.js:774)
document.cookie = `${CONFIG.STORAGE_PREFIX}...; SameSite=Lax`;
```

**Realidade:** 
- `SameSite=Lax` só envia cookies em navegação top-level
- O Custom Pixel roda em iframe, então cookies podem ser bloqueados
- Para compartilhar entre iframe e parent, precisa ser `SameSite=None; Secure`

**Correção:**
```javascript
// Para compartilhar entre contexts:
document.cookie = `${CONFIG.STORAGE_PREFIX}...; SameSite=None; Secure; path=/`;
```

---

### 6. WebRTC - Conexão Unidirecional

**Problema:** O código assume que WebRTC é sempre pixel → theme:

```javascript
// THEME (theme-tracker.js:539-542)
case 'peer-joined':
  if (msg.role === 'pixel') {
    await this._createOffer(msg.peerId);  // Theme cria offer
  }
```

**Problema:** Se o theme iniciar primeiro, pode haver race condition.

**Correção:** Implementar handshake bidirecional ou usar role-based (quem entra cria offer).

---

### 7. Deduplicação - IDs Diferentes

**Problema:** O pixel gera IDs diferentes para o mesmo evento:

```javascript
// PIXEL (pixel-tracker.js:1114)
_generateId() {
  return `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// MultiChannelSender.send() gera NOVO ID
const data = {
  event: {
    id: this._generateId(),  // ← ID diferente a cada envio!
  }
};
```

**Impacto:** O mesmo evento do Shopify pode ser processado múltiplas vezes se chegar por canais diferentes (WebRTC + Cookie + BroadcastChannel).

**Correção:** Usar o ID original do evento Shopify:
```javascript
const data = {
  event: {
    id: event.id || event.clientId || `${event.name}_${event.timestamp}`,
  }
};
```

---

### 8. Cookie Poller - Limpa Cookies Sem Processar

**Problema:** O theme limpa a fila de cookies imediatamente:

```javascript
// THEME (theme-tracker.js:964)
if (match) {
  events.push(...parsed);
  // Limpa cookie imediatamente
  document.cookie = `${CONFIG.STORAGE_PREFIX}queue=; expires=Thu, 01 Jan 1970...`;
}
```

**Risco:** Se `EventRouter.route()` falhar, o evento é perdido.

**Correção:** Só limpar após confirmação de processamento:
```javascript
// Lógica correta:
1. Ler cookie
2. Tentar processar eventos
3. SÓ limpar os que foram processados com sucesso
4. Re-escolher os que falharam
```

---

### 9. RetryQueue - Sem Persistência (Eventos Perdidos no Reload)

**Problema:** O pixel usa RetryQueue em memória:

```javascript
// PIXEL (pixel-tracker.js:865+)
const RetryQueue = {
  queue: [],  // Memória apenas!
  // ...
};
```

**Impacto:** Se o usuário sair da página de checkout antes do envio, eventos são perdidos.

**Mitigação:** Isso é limitação do sandbox. A única solução é usar `sendBeacon` ou `fetch keepalive` no `beforeunload`.

---

### 10. SmartBatcher - Não Limpa Eventos Enviados

**Problema:** No pixel, se o batch falha, ele recoloca eventos na fila:

```javascript
// PIXEL (pixel-tracker.js:284-286)
} catch (e) {
  if (!specificEvents) {
    this.batch.unshift(...toFlush);  // Recoloca TODOS na fila
  }
}
```

**Risco:** Eventos já enviados com sucesso podem ser re-enviados se houver erro parcial.

---

## 📋 Resumo de Correções Necessárias

| Problema | Severidade | Correção |
|----------|------------|----------|
| BroadcastChannel unidirecional | Média | Adicionar listener no pixel |
| WebRTC depende de servidor externo | Média | Usar BroadcastChannel como signaling fallback |
| localStorage chaves temporárias | Alta | Usar chave fixa ou aumentar timeout |
| IndexedDB não compartilha | Alta | Remover do pixel |
| Cookie SameSite=Lax | Alta | Mudar para `SameSite=None; Secure` |
| IDs de deduplicação diferentes | Alta | Usar ID original do evento |
| Cookie limpo antes de processar | Média | Só limpar após sucesso |
| RetryQueue sem persistência | Baixa | Limitação do sandbox (aceitável) |
| SmartBatcher recoloca eventos | Média | Track eventos individuais |

---

## 🔧 Recomendação Arquitetural

### Simplificar para Canais Que Funcionam

```
PRIORIDADE DE COMUNICAÇÃO:

1. BroadcastChannel (funciona se mesma origem)
   └── Mais rápido (< 1ms)
   └── Requer: theme e pixel no mesmo domínio

2. Cookies (funciona sempre, mas limitado)
   └── 4KB limite
   └── SameSite=None; Secure necessário
   └── Polling necessário (ineficiente)

3. WebRTC (overkill para este caso)
   └── Requer servidor de sinalização
   └── Complexidade alta
   └── Necessário apenas se latência < 10ms crítica

❌ NÃO FUNCIONAM:
   - localStorage (isolado entre contexts)
   - IndexedDB (isolado entre contexts)
   - Service Worker (pixel não tem acesso)
```

### Estrutura Recomendada

```javascript
// PIXEL - Simplificado
const Channels = {
  // 1. Tentar BroadcastChannel
  async send(event) {
    if (BroadcastChannel) {
      channel.postMessage(event);
      return true;
    }
  },
  
  // 2. Fallback: Cookies
  async send(event) {
    CookieManager.setQueue([event]);
    return true;
  }
};

// THEME - Simplificado  
const Receivers = {
  // 1. BroadcastChannel
  init() {
    channel.onmessage = (e) => processEvent(e.data);
  },
  
  // 2. Cookie Poller
  poll() {
    setInterval(() => {
      const events = CookieManager.getQueue();
      events.forEach(processEvent);
    }, 200);
  }
};
```
