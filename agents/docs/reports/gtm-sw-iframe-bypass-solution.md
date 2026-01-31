# Solução: Contornar sw_iframe.html no Teste do GTM

## Objetivo

Eliminar a "página fantasma" do `sw_iframe.html` no Tag Assistant enquanto mantém o GTM funcionando normalmente no modo de teste/preview.

---

## 🎯 Abordagens Recomendadas

### Opção 1: JavaScript de Limpeza (Mais Efetiva) ⭐

Este script remove o iframe e previne sua recriação:

```javascript
// gtm-sw-cleaner.js - Injeta no <head> antes do GTM
(function() {
  'use strict';
  
  // Configuração
  const CONFIG = {
    enabled: true,
    debug: false,
    removeInterval: 100, // ms
    maxAttempts: 50
  };
  
  let attempts = 0;
  let observer = null;
  
  // Logger
  const log = function(...args) {
    if (CONFIG.debug) {
      console.log('[GTM-SW-Cleaner]', ...args);
    }
  };
  
  // Função para remover iframes do Service Worker
  const removeSwIframes = function() {
    if (!CONFIG.enabled || attempts >= CONFIG.maxAttempts) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }
    
    attempts++;
    
    // Busca todos os iframes
    const iframes = document.querySelectorAll('iframe');
    let removed = 0;
    
    iframes.forEach(function(iframe) {
      const src = iframe.getAttribute('src') || '';
      const id = iframe.getAttribute('id') || '';
      const name = iframe.getAttribute('name') || '';
      
      // Verifica se é um iframe do Service Worker
      if (src.includes('sw_iframe.html') || 
          src.includes('service_worker') ||
          id.includes('sw_iframe') ||
          name.includes('sw_iframe')) {
        
        log('Removendo iframe:', src || id || name);
        
        // Remove o iframe
        iframe.remove();
        removed++;
        
        // Também remove o pai (about:blank) se existir
        const parent = iframe.parentElement;
        if (parent && parent.tagName === 'BODY') {
          const parentContainer = parent.parentElement;
          if (parentContainer && parentContainer.tagName === 'IFRAME') {
            const parentSrc = parentContainer.getAttribute('src') || '';
            if (parentSrc === 'about:blank' || parentSrc === '') {
              log('Removendo container pai about:blank');
              parentContainer.remove();
            }
          }
        }
      }
    });
    
    if (removed > 0) {
      log('Total de iframes removidos:', removed);
    }
  };
  
  // MutationObserver para capturar iframes criados dinamicamente
  const startObserver = function() {
    if (!window.MutationObserver) {
      log('MutationObserver não suportado, usando intervalo');
      setInterval(removeSwIframes, CONFIG.removeInterval);
      return;
    }
    
    observer = new MutationObserver(function(mutations) {
      let shouldCheck = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.tagName === 'IFRAME') {
              shouldCheck = true;
            }
          });
        }
      });
      
      if (shouldCheck) {
        removeSwIframes();
      }
    });
    
    // Observa o body e todo o documento
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      // Aguarda o body estar pronto
      document.addEventListener('DOMContentLoaded', function() {
        if (document.body && observer) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      });
    }
    
    log('MutationObserver iniciado');
  };
  
  // Intercepta a função que cria o Service Worker (avançado)
  const interceptServiceWorker = function() {
    // Intercepta navigator.serviceWorker.register
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
      const originalRegister = navigator.serviceWorker.register;
      
      navigator.serviceWorker.register = function(scriptURL, options) {
        if (scriptURL.includes('sw.js') || 
            scriptURL.includes('gtm') ||
            scriptURL.includes('google')) {
          log('Interceptando registro de Service Worker:', scriptURL);
          
          // Retorna uma Promise que nunca resolve (previne o registro)
          return new Promise(function() {});
        }
        
        return originalRegister.apply(this, arguments);
      };
      
      log('navigator.serviceWorker.register interceptado');
    }
  };
  
  // Inicialização
  const init = function() {
    log('Inicializando GTM-SW-Cleaner...');
    
    // Remove iframes existentes
    removeSwIframes();
    
    // Inicia observer
    startObserver();
    
    // Intercepta Service Worker
    if (CONFIG.enabled) {
      interceptServiceWorker();
    }
    
    // Remove periódicamente (backup)
    setInterval(removeSwIframes, 500);
    
    log('Inicialização completa');
  };
  
  // Executa quando possível
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Também executa após o GTM carregar
  window.addEventListener('load', function() {
    setTimeout(removeSwIframes, 1000);
    setTimeout(removeSwIframes, 2000);
    setTimeout(removeSwIframes, 3000);
  });
  
  // Expõe API global para controle manual
  window.gtmSwCleaner = {
    enable: function() { CONFIG.enabled = true; },
    disable: function() { CONFIG.enabled = false; },
    clean: removeSwIframes,
    config: CONFIG
  };
  
})();
```

**Como usar:**
```html
<!-- Coloque ANTES do script do GTM -->
<script src="gtm-sw-cleaner.js"></script>

<!-- Depois o GTM normal -->
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

---

### Opção 2: Bookmarklet para Tag Assistant

Para usar durante o debug no Tag Assistant:

```javascript
javascript:(function(){
  const removeSw = function() {
    document.querySelectorAll('iframe').forEach(function(el) {
      const src = el.src || '';
      if (src.includes('sw_iframe')) {
        console.log('[GTM-Cleaner] Removendo:', src);
        el.remove();
      }
    });
  };
  
  removeSw();
  setInterval(removeSw, 500);
  
  new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.addedNodes.length) removeSw();
    });
  }).observe(document.body, { childList: true, subtree: true });
  
  alert('GTM SW Cleaner ativo!');
})();
```

**Como usar:**
1. Crie um bookmark com o código acima
2. Ao abrir o Tag Assistant, clique no bookmark
3. O iframe será removido automaticamente

---

### Opção 3: Extensão do Chrome para Debug

```javascript
// content-script.js para extensão Chrome
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'removeSwIframe') {
    let count = 0;
    document.querySelectorAll('iframe').forEach(function(el) {
      if ((el.src || '').includes('sw_iframe')) {
        el.remove();
        count++;
      }
    });
    sendResponse({ removed: count });
  }
});

// Auto-execute
setInterval(function() {
  document.querySelectorAll('iframe').forEach(function(el) {
    if ((el.src || '').includes('sw_iframe')) {
      el.remove();
    }
  });
}, 1000);
```

---

### Opção 4: Modificar o Proxy Tracklay (Server-Side)

Se você quer remover do lado do servidor (mais eficiente):

```javascript
// src/services/full-script-proxy.js ou similar
// Adicionar interceptação do código do GTM

function patchGtmScript(scriptContent) {
  // Padrões para encontrar e neutralizar o código do Service Worker
  const patterns = [
    // Neutraliza a função cJ() que chama my()
    {
      regex: /function cJ\(a\)\{if\(N\(10\)\)return;.*?my\(\);/,
      replacement: 'function cJ(a){if(N(10))return;/*SW disabled*/}'
    },
    // Neutraliza a função my()
    {
      regex: /function my\(a\)\{.*?var d=new ky\(c\);.*?\}/,
      replacement: 'function my(a){/*SW disabled*/}'
    },
    // Remove a string sw_iframe.html
    {
      regex: /sw_iframe\.html/g,
      replacement: 'disabled_sw_iframe.html'
    }
  ];
  
  let patched = scriptContent;
  patterns.forEach(function(pattern) {
    patched = patched.replace(pattern.regex, pattern.replacement);
  });
  
  return patched;
}

// No handler de proxy:
if (url.includes('gtm.js') || url.includes('googletagmanager')) {
  let body = await response.text();
  body = patchGtmScript(body);
  return new Response(body, { headers: response.headers });
}
```

**⚠️ Aviso:** Modificar o código do GTM pode violar os Termos de Serviço do Google. Use por sua conta e risco.

---

### Opção 5: Parâmetro de Query String (Experimental)

Tente adicionar parâmetros na URL do GTM:

```html
<script>
  // Desabilita features experimentais
  window.gtm_debug = true;
  window.gtm_preview = true;
  
  // GTM original
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;
    // Adiciona parâmetros para desabilitar SW
    j.src='https://cdn.suevich.com/gtm.js?id='+i+dl+'&gtm_debug=x&sw=0';
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXX');
</script>
```

---

## 🛠️ Implementação Recomendada para Tracklay

### Passo 1: Criar Middleware de Injeção

```javascript
// src/middleware/gtm-debug-helper.js

/**
 * Injeta script de limpeza do Service Worker em páginas com GTM
 * @param {Response} response - Resposta original
 * @returns {Response} - Resposta modificada
 */
export async function injectSwCleaner(response) {
  const contentType = response.headers.get('content-type') || '';
  
  // Só processa HTML
  if (!contentType.includes('text/html')) {
    return response;
  }
  
  const html = await response.text();
  
  // Script de limpeza inline (minificado)
  const cleanerScript = `<script>(function(){var e=!0,t=function(){document.querySelectorAll("iframe").forEach(function(e){var t=e.getAttribute("src")||"";t.includes("sw_iframe")&&(e.remove(),console.log("[GTM-Cleaner] Removed sw_iframe"))})};t();var n=setInterval(t,500);setTimeout(function(){clearInterval(n)},3e4),window.addEventListener("load",t)})();</script>`;
  
  // Injeta antes do </head> ou no início do <body>
  let modifiedHtml;
  if (html.includes('</head>')) {
    modifiedHtml = html.replace('</head>', cleanerScript + '</head>');
  } else if (html.includes('<body>')) {
    modifiedHtml = html.replace('<body>', '<body>' + cleanerScript);
  } else {
    modifiedHtml = cleanerScript + html;
  }
  
  return new Response(modifiedHtml, {
    headers: response.headers
  });
}
```

### Passo 2: Usar no Worker

```javascript
// worker.js
import { injectSwCleaner } from './src/middleware/gtm-debug-helper.js';

// No handler principal:
if (request.headers.get('user-agent')?.includes('TagAssistant')) {
  // Modo debug do Tag Assistant
  response = await injectSwCleaner(response);
}
```

---

## 📊 Comparação das Abordagens

| Abordagem | Complexidade | Efetividade | Impacto no Tracking | Recomendado |
|-----------|-------------|-------------|---------------------|-------------|
| **JavaScript Cliente** | Baixa | Alta | Nenhum | ⭐⭐⭐⭐⭐ |
| **Bookmarklet** | Muito Baixa | Média | Nenhum | ⭐⭐⭐ |
| **Extensão Chrome** | Média | Alta | Nenhum | ⭐⭐⭐⭐ |
| **Modificar Proxy** | Alta | Muito Alta | Possível | ⭐⭐ |
| **Query Params** | Baixa | Baixa | Nenhum | ⭐⭐ |

---

## ✅ Solução Final Recomendada

Para uso no **Tag Assistant** durante testes:

### 1. Use o Bookmarklet (rápido e fácil)

Crie um bookmark com:
```javascript
javascript:(function(){var r=function(){document.querySelectorAll('iframe').forEach(function(i){if((i.src||'').includes('sw_iframe')){i.remove();}});};r();setInterval(r,500);alert('GTM SW Cleaner ativo!');})();
```

**Instruções:**
1. Abra o Tag Assistant
2. Navegue até sua página
3. Clique no bookmarklet
4. O iframe desaparece em segundos

### 2. Para Testes Regulares (código na página)

Adicione antes do GTM:
```javascript
<script>
// GTM SW Cleaner - Minified
(function(){var d=!1,e=function(){document.querySelectorAll("iframe").forEach(function(a){var b=a.getAttribute("src")||"";b.includes("sw_iframe")&&(a.remove(),console.log("[GTM-Cleaner] Removed",b))})};e();var c=new MutationObserver(function(a){a.forEach(function(b){"childList"===b.type&&b.addedNodes.forEach(function(a){"IFRAME"===a.tagName&&e()})})});document.body?c.observe(document.body,{childList:!0,subtree:!0}):document.addEventListener("DOMContentLoaded",function(){document.body&&c.observe(document.body,{childList:!0,subtree:!0})});setInterval(e,500);setTimeout(function(){c.disconnect()},3E4)})();
</script>
```

---

## 🧪 Testando a Solução

1. **Abra o Tag Assistant** em sua página
2. **Observe** a "página fantasma" do sw_iframe
3. **Aplique** a solução escolhida
4. **Verifique** se o iframe desaparece
5. **Confirme** que o GTM continua funcionando (tags disparam, eventos aparecem)

---

## ⚠️ Importante

- **Não afeta o tracking**: O GTM continua funcionando normalmente
- **Só remove o iframe visual**: O Service Worker pode tentar se registrar, mas o iframe é removido
- **Use apenas em desenvolvimento**: Em produção, considere deixar o Service Worker ativo para melhor confiabilidade
- **Tag Assistant fica limpo**: Apenas uma instância do container aparece

---

*Solução criada para Tracklay - Janeiro 2026*
