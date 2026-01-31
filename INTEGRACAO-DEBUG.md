# Integração de Debug no Tracklay

## 🎯 O Que Faz

Detecta quando o Tag Assistant está aberto e serve um **container modificado** em modo debug.

## 📁 Arquivos Criados

```
src/
├── utils/
│   └── gtm-debug-detector.js    # Detecção e modificação
├── handlers/
│   └── gtm-script-handler.js    # Handler para scripts GTM

worker-debug-example.js          # Exemplo de integração
scripts/
└── test-debug-detection.js      # Testes
```

## 🚀 Integração Minimal

### Passo 1: Importar Detector

No seu `worker.js`:

```javascript
import { isDebugMode, activateDebugMode, injectTagAssistantBridge } from './src/utils/gtm-debug-detector.js';
```

### Passo 2: Detectar Debug nas Requisições

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Detectar modo debug
    const debugMode = isDebugMode(request);
    
    if (url.pathname.includes('gtm.js')) {
      return await serveGtmScript(request, debugMode);
    }
    
    // ... resto do seu código
  }
};
```

### Passo 3: Servir Script Modificado em Debug

```javascript
async function serveGtmScript(request, debugMode) {
  // Buscar script original
  const response = await fetch('https://www.googletagmanager.com/gtm.js?id=...');
  let script = await response.text();
  
  // Se estiver em debug, MODIFICAR
  if (debugMode) {
    script = activateDebugMode(script);
    script = injectTagAssistantBridge(script);
  }
  
  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'X-GTM-Mode': debugMode ? 'debug' : 'production'
    }
  });
}
```

## ✅ Como Testar

### 1. Modo Normal (Produção)
```
https://cdn.suevich.com/gtm.js?id=GTM-XXXX
```
**Esperado:** Script normal, header `X-GTM-Mode: production`

### 2. Modo Debug
```
https://cdn.suevich.com/gtm.js?id=GTM-XXXX&gtm_debug=1
```
**Esperado:** 
- Script modificado com `Lg=!0`
- Header `X-GTM-Mode: debug`
- `console.log('[Tracklay] GTM Debug Mode ativo')` no início

### 3. Via Tag Assistant
1. Abra Tag Assistant
2. Navegue para sua página
3. Verifique no console se modo debug foi detectado

## 🔍 Verificação

No console do navegador:

```javascript
// Verificar se debug está ativo
console.log('Debug:', window._gtmDebugMode);        // true
console.log('Tracklay:', window._tracklayDebug);    // true

// Verificar blob
console.log('Blob 28:', window.google_tag_data?.blob?.[28]);  // true
console.log('Blob 29:', window.google_tag_data?.blob?.[29]);  // true
```

## 🐛 Debug

### Problema: Tag Assistant não conecta

**Verifique:**
1. URL tem `?gtm_debug=1`?
2. Headers da resposta mostram `X-GTM-Mode: debug`?
3. Script contém `Lg=!0` em vez de `Lg=!1`?

**Teste manual:**
```javascript
// No console, forçar debug
window.google_tag_data = { blob: { 28: true, 29: true } };
location.reload();
```

## 📊 Modificações Aplicadas

Quando em modo debug, o script é modificado:

| Original | Modificado | Efeito |
|----------|-----------|--------|
| `Lg=!1` | `Lg=!0` | debugMode = true |
| `Mg.bo=ig(29)` | `Mg.bo=!0` | previewMode = true |
| Blob sem flags | Blob com `"28":true,"29":true` | Flags de debug |
| Sem bridge | Com Tag Assistant Bridge | Comunicação ativa |

## ⚡ Performance

- **Cache:** Script de produção é cacheado
- **Debug:** Script de debug NÃO é cacheado (sempre fresco)
- **Overhead:** ~1-2ms para modificação

## 🎉 Resultado Esperado

**Antes:**
```
❌ Tag Assistant: "Ative o contêiner para depuração"
❌ debugMode: false
❌ previewMode: false
```

**Depois:**
```
✅ Tag Assistant: Container reconhecido
✅ debugMode: true
✅ previewMode: true
✅ Eventos capturados normalmente
```

---

**Pronto para usar!** Teste com `?gtm_debug=1` na URL.
