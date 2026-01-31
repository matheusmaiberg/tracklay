# Problemas: Debug Mode e Scroll no GTM Proxyado

## 🚨 Problema 1: GTM Não Detecta Modo Debug

### Análise do Código

No script GTM, o modo debug é controlado por estas variáveis:

```javascript
// Configuração inicial no script
var Lg = !1;  // ← debugMode = false (padrão!)
var Mg = {};
Mg.bo = ig(29);   // ← previewMode (lê do blob)
Mg.Oq = ig(28);   // ← environmentMode (lê do blob)

// Função ig() verifica o blob de configuração
function ig(a) {
  var b = !1;  // default false
  var c, d;
  return ((c = data) == null ? 0 : 
          (d = c.blob) == null ? 0 : 
          d.hasOwnProperty(a)) ? !!data.blob[a] : b;
}
```

### O Que Acontece

1. **`Lg = !1`** (false) - Por padrão, debugMode é **sempre false**
2. **`Mg.bo = ig(29)`** - previewMode depende do `data.blob[29]`
3. **Se o blob não tiver índice 29** → previewMode = false

### Por Que Não Funciona no Proxy

```javascript
// No GTM normal (googletagmanager.com)
// O servidor injeta o blob correto com flags de debug

// No proxy Tracklay
// O blob pode não conter as flags de debug/preview
// Ou o contexto de execução é diferente
```

### Verificação do Blob

No script analisado, o blob é:

```json
{
  "blob": {
    "1": "27",
    "10": "GTM-MJ7DW8H",
    "12": "",
    "14": "61r1",
    "15": "0",
    "16": "...",
    "19": "dataLayer",
    "20": "",
    "21": "www.googletagmanager.com",
    "22": "{\"0\":\"BR\",...}",
    "23": "google.tagmanager.debugui2.queue",
    "24": "tagassistant.google.com",
    "27": 0.005,
    "3": "www.googletagmanager.com",
    "30": "BR",
    "31": "BR-PR",
    "32": false,
    "36": "https://cdn.suevich.com/x/...",
    "37": "__TAGGY_INSTALLED",
    "38": "cct.google",
    "39": "googTaggyReferrer",
    "40": "https://cdn.suevich.com/x/...",
    "41": "google.tagmanager.ta.prodqueue",
    "42": 0.01,
    "43": "..."
  }
}
```

**Observação:** Não há índice `28` ou `29` visível no blob! Isso explica por que:
- `ig(28)` → false (environmentMode)
- `ig(29)` → false (previewMode)
- `Lg` → false (hardcoded)

### Solução para Debug Mode

#### Opção 1: Forçar Debug via JavaScript
```javascript
// Antes de carregar o GTM, forçar o modo debug
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  'gtm.start': new Date().getTime(),
  'event': 'gtm.js',
  'gtm.debug': true  // Sinalizador customizado
});

// Ou interceptar a configuração
Object.defineProperty(window, 'google_tag_data', {
  get: function() {
    return {
      blob: {
        28: true,  // environmentMode
        29: true   // previewMode
      }
    };
  }
});
```

#### Opção 2: Modificar o Script no Proxy
```javascript
// No proxy Tracklay, injetar flags de debug
function injectDebugFlags(scriptContent) {
  // Substituir a inicialização de Lg
  return scriptContent.replace(
    'var Ig=D(5),Jg=D(20),Kg=D(1),Lg=!1;',
    'var Ig=D(5),Jg=D(20),Kg=D(1),Lg=!0;'  // ← forçar true
  );
}
```

#### Opção 3: Usar Preview do Tag Assistant
```javascript
// O Tag Assistant injeta automaticamente quando aberto
// Verificar se a URL contém o parâmetro do Tag Assistant
if (window.location.search.includes('gtm_debug')) {
  console.log('[GTM] Modo debug detectado via URL');
}
```

---

## 🚨 Problema 2: Scroll "Sempre Começa Scrollando"

### Causa Provável: Cálculo de Scroll com Iframes

Quando o `sw_iframe.html` está presente, ele pode afetar o cálculo de:

```javascript
// Altura do documento
var docHeight = Math.max(
  document.body.scrollHeight,
  document.body.offsetHeight,
  document.documentElement.clientHeight,
  document.documentElement.scrollHeight,
  document.documentElement.offsetHeight
);

// Posição de scroll
var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

// Cálculo de percentual
var scrollPercent = (scrollTop / (docHeight - window.innerHeight)) * 100;
```

### Problema: O iframe sw_iframe é invisível mas existe

```html
<!-- O iframe existe no DOM -->
<iframe src="about:blank" style="display:none; visibility:hidden;">
  <iframe src="sw_iframe.html">
    <!-- Conteúdo do Service Worker -->
  </iframe>
</iframe>
```

Isso pode causar:
1. **`document.body.scrollHeight`** incluir altura dos iframes
2. **Cálculo errado** da posição de scroll
3. **Trigger disparando** em momentos errados

### Diagnóstico

```javascript
// Verificar se há problema de cálculo
console.log({
  'window.innerHeight': window.innerHeight,
  'document.body.scrollHeight': document.body.scrollHeight,
  'document.documentElement.scrollHeight': document.documentElement.scrollHeight,
  'window.scrollY': window.scrollY,
  'iframes count': document.querySelectorAll('iframe').length,
  'sw_iframe present': !!document.querySelector('iframe[src*="sw_iframe"]')
});
```

### Soluções

#### Solução 1: CSS para Prevenir Problema de Altura
```css
/* Garantir que iframes invisíveis não afetem layout */
iframe[src*="sw_iframe"],
iframe[src="about:blank"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 0 !important;
  height: 0 !important;
  border: none !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  visibility: hidden !important;
  display: block !important; /* não none! */
  pointer-events: none !important;
}
```

#### Solução 2: Forçar Recálculo do Scroll
```javascript
// Aguardar o GTM carregar e remover iframes problemáticos
window.addEventListener('load', function() {
  setTimeout(function() {
    // Remover sw_iframe se estiver causando problemas
    document.querySelectorAll('iframe[src*="sw_iframe"]').forEach(function(el) {
      el.style.position = 'absolute';
      el.style.height = '0px';
      el.style.width = '0px';
    });
    
    // Forçar recálculo de scroll no GTM
    window.dataLayer.push({
      'event': 'gtm.scrollDepth',
      'scrollDepthThreshold': 0,
      'scrollDepthUnits': 'percent',
      'scrollDepthDirection': 'vertical'
    });
  }, 2000);
});
```

#### Solução 3: Trigger de Scroll Ajustado
```javascript
// No GTM, usar Custom Event em vez do trigger nativo
// Criar listener customizado que ignora iframes

// Custom HTML Tag no GTM:
<script>
(function() {
  var lastScroll = 0;
  var thresholds = [25, 50, 75, 90, 100];
  var triggered = {};
  
  window.addEventListener('scroll', function() {
    // Calcular scroll excluindo iframes
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var winHeight = window.innerHeight;
    
    // Usar documentElement em vez de body (mais confiável)
    var docHeight = document.documentElement.scrollHeight;
    
    var scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);
    
    if (scrollPercent !== lastScroll) {
      lastScroll = scrollPercent;
      
      thresholds.forEach(function(threshold) {
        if (scrollPercent >= threshold && !triggered[threshold]) {
          triggered[threshold] = true;
          window.dataLayer.push({
            'event': 'custom.scrollDepth',
            'scrollPercent': threshold,
            'scrollActual': scrollPercent
          });
        }
      });
    }
  });
})();
</script>
```

---

## 🔧 Implementação Recomendada para Tracklay

### 1. Arquivo: `gtm-debug-helper.js`

```javascript
/**
 * Helpers para corrigir problemas de debug e scroll no GTM proxyado
 */

(function() {
  'use strict';
  
  // ============================================
  // FIX 1: Forçar Modo Debug quando necessário
  // ============================================
  
  function forceDebugMode() {
    // Verificar se está em modo preview/debug
    var isPreview = window.location.search.includes('gtm_preview') || 
                    window.location.search.includes('gtm_debug');
    
    if (isPreview) {
      console.log('[GTM Helper] Modo preview detectado, forçando flags...');
      
      // Injeta configuração de debug antes do GTM carregar
      window.google_tag_data = window.google_tag_data || {};
      window.google_tag_data.blob = window.google_tag_data.blob || {};
      window.google_tag_data.blob[28] = true;  // environmentMode
      window.google_tag_data.blob[29] = true;  // previewMode
    }
  }
  
  // ============================================
  // FIX 2: Corrigir Problema de Scroll
  // ============================================
  
  function fixScrollCalculation() {
    // CSS para garantir que iframes não afetem layout
    var style = document.createElement('style');
    style.textContent = `
      iframe[src*="sw_iframe"],
      iframe[src="about:blank"] {
        position: absolute !important;
        top: -9999px !important;
        left: -9999px !important;
        width: 0 !important;
        height: 0 !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log('[GTM Helper] CSS de correção de scroll aplicado');
  }
  
  // ============================================
  // FIX 3: Limpar sw_iframe se necessário
  // ============================================
  
  function cleanupSwIframe() {
    // Aguarda o GTM criar o iframe
    setTimeout(function() {
      var swIframes = document.querySelectorAll('iframe[src*="sw_iframe"]');
      
      swIframes.forEach(function(iframe) {
        // Move para fora do fluxo do documento
        iframe.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:0;height:0;border:none;';
        
        // Se estiver causando problemas graves, remove
        if (window.location.search.includes('remove_sw=true')) {
          iframe.remove();
          console.log('[GTM Helper] sw_iframe removido');
        }
      });
    }, 1000);
  }
  
  // ============================================
  // Inicialização
  // ============================================
  
  function init() {
    forceDebugMode();
    fixScrollCalculation();
    cleanupSwIframe();
  }
  
  // Executar imediatamente
  init();
  
  // Também após DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  }
  
})();
```

### 2. Como Usar

```html
<!-- Coloque ANTES do script do GTM -->
<script src="gtm-debug-helper.js"></script>

<!-- Script do GTM -->
<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://cdn.suevich.com/gtm.js?id='+i+dl;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXX');
</script>
```

### 3. Parâmetros de Query Úteis

```
https://www.sualoja.com/?gtm_debug=1&remove_sw=true
# Força debug e remove sw_iframe

https://www.sualoja.com/?gtm_preview=1
# Modo preview
```

---

## ✅ Checklist de Verificação

### Para Debug Mode:
- [ ] Verificar se `data.blob[29]` existe no script
- [ ] Verificar se `google_tag_data` está configurado
- [ ] Verificar console por mensagens de debug
- [ ] Verificar se Tag Assistant reconhece o container

### Para Scroll:
- [ ] Verificar altura do documento no console
- [ ] Verificar se iframes estão afetando layout
- [ ] Testar scroll com e sem sw_iframe
- [ ] Verificar se triggers disparam nos thresholds corretos

---

## 📋 Resumo

| Problema | Causa | Solução |
|----------|-------|---------|
| Debug não funciona | `Lg = false` hardcoded e blob sem índice 29 | Forçar via JavaScript ou modificar proxy |
| Scroll calculado errado | Iframe sw_iframe afeta `scrollHeight` | CSS para isolar iframe ou calcular scroll customizado |

---

*Documentação criada em: Janeiro 2026*
*Baseada na análise do código GTM proxyado*
