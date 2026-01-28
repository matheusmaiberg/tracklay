# Bugs Encontrados na Revisão de Código

> Data: 2026-01-28
> Arquivos analisados: theme-tracker.js, pixel-tracker.js, service-worker-interceptor.js, smart-batcher.js, background-sync-queue.js

## CRÍTICOS (Podem causar falhas)

### 1. service-worker-interceptor.js:143-146 - URL Rewrite Incorreto
**Problema:** A função `rewriteToProxy()` sempre usa `UUIDS.google` mesmo para requisições Facebook.
```javascript
function rewriteToProxy(url) {
  const proxyUrl = new URL(SW_CONFIG.PROXY_DOMAIN);
  proxyUrl.pathname = `/x/${SW_CONFIG.UUIDS.google}`; // ❌ Sempre usa google!
  proxyUrl.search = url.search;
  return proxyUrl.toString();
}
```
**Impacto:** Todas as requisições de tracking (Google e Facebook) serão enviadas para o endpoint do Google.
**Correção:** Detectar o domínio e usar o UUID apropriado:
```javascript
function rewriteToProxy(url) {
  const proxyUrl = new URL(SW_CONFIG.PROXY_DOMAIN);
  const isFacebook = url.hostname.includes('facebook');
  const uuid = isFacebook ? SW_CONFIG.UUIDS.facebook : SW_CONFIG.UUIDS.google;
  proxyUrl.pathname = `/x/${uuid}`;
  proxyUrl.search = url.search;
  return proxyUrl.toString();
}
```

### 2. theme-tracker.js:514 - JSON.parse sem try-catch
**Problema:** No WebRTC Bridge, `JSON.parse` é chamado sem tratamento de erro:
```javascript
this.ws.onmessage = (event) => {
  const msg = JSON.parse(event.data); // ❌ Pode lançar exceção
  this._handleSignaling(msg);
};
```
**Impacto:** Se o servidor de sinalização enviar dados inválidos, o WebSocket quebra completamente.

### 3. pixel-tracker.js:356 - Mesmo problema de JSON.parse
**Problema:** Igual ao acima, no pixel tracker.

---

## MEMORY LEAKS (Acumulam ao longo do tempo)

### 4. theme-tracker.js:960 - setInterval sem clearInterval
**Problema:** CookiePoller cria intervalo mas nunca limpa:
```javascript
start() {
  this.check();
  setInterval(() => this.check(), 200); // ❌ Sem referência
}
```
**Impacto:** Se o tracker for reinicializado múltiplas vezes, múltiplos intervals rodarão simultaneamente.

### 5. theme-tracker.js:282,292,298 - Event Listeners não removidos
**Problema:** Vários listeners anônimos são adicionados mas nunca removidos:
- Linha 282: `connection.addEventListener('change', update)`
- Linha 292: `document.addEventListener('visibilitychange', ...)`
- Linha 298: `window.addEventListener('beforeunload', ...)`
- Linha 1011: `window.addEventListener('storage', ...)`

### 6. smart-batcher.js:256,266 - Event listeners anônimos
**Problema:** Mesmo padrão de memory leak:
```javascript
connection.addEventListener('change', updateNetwork); // ❌ Nunca removido
document.addEventListener('visibilitychange', () => {  // ❌ Nunca removido
  // ...
});
```

### 7. background-sync-queue.js:134-143 - Network listeners
**Problema:** Event listeners para online/offline não são removidos.

### 8. theme-tracker.js:565 - Peers WebRTC nunca removidos
**Problema:** Peers são adicionados ao Map mas nunca removidos quando a conexão fecha:
```javascript
this.peers.set(peerId, pc); // ❌ Sem handler para remover
```

---

## WEBSOCKET RECONEXÃO (Perda de conectividade)

### 9. theme-tracker.js:503 - WebSocket sem reconexão
**Problema:** Se a conexão WebSocket cair, não há mecanismo automático de reconexão.

### 10. pixel-tracker.js:345 - Mesmo problema
**Problema:** Igual ao acima.

---

## PROBLEMAS DE LÓGICA

### 11. smart-batcher.js:269 - sendBeacon com URL hardcoded
**Problema:** URL '/batch' é hardcoded, não usa o proxy configurado:
```javascript
navigator.sendBeacon('/batch', new Blob([JSON.stringify(this.batch)]));
```
**Impacto:** Eventos podem ser enviados para endpoint errado.

### 12. theme-tracker.js:816 - StorageManager.get() chamado de forma síncrona
**Problema:** Na linha 816 (deduplicator), `StorageManager.get()` é async mas usado como sync:
```javascript
const stored = StorageManager.get(`proc_${event.id}`); // ❌ Async sem await
if (stored) {
```

### 13. background-sync-queue.js:187 - Sort muta array durante iteração
**Problema:** `_attemptSync()` ordena a fila (`this.queue.sort()`) que pode causar problemas de concorrência.

---

## SEGURANÇA

### 14. service-worker-interceptor.js:82-88 - Mensagem sem verificação de origem
**Problema:** Mensagens do Service Worker não verificam origem:
```javascript
self.addEventListener('message', (event) => {
  const { type, data } = event.data; // ❌ Sem event.source ou origin check
```
**Impacto:** Potencial vulnerabilidade se outras páginas enviarem mensagens.

---

## RECOMENDAÇÕES GERAIS

1. **Adicionar método destroy()** em todas as classes para limpar listeners
2. **Implementar reconnect exponencial** para WebSockets
3. **Usar AbortController** para cancelar fetch requests pendentes
4. **Adicionar rate limiting** nos event listeners de alta frequência
5. **Verificar window.self !== window.top** antes de inicializar (evitar iframes)

---

## RESUMO POR ARQUIVO

| Arquivo | Críticos | Memory Leaks | Lógica | Segurança |
|---------|----------|--------------|--------|-----------|
| theme-tracker.js | 2 | 6 | 1 | 0 |
| pixel-tracker.js | 1 | 2 | 0 | 0 |
| service-worker-interceptor.js | 1 | 0 | 0 | 1 |
| smart-batcher.js | 0 | 2 | 1 | 0 |
| background-sync-queue.js | 0 | 1 | 1 | 0 |
| **Total** | **4** | **11** | **3** | **1** |
