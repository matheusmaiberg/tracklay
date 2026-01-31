# GTM Debug Helper - Guia Rápido

## 🎯 O que Resolve

Este script corrige dois problemas quando o GTM é executado via proxy (Tracklay):

1. **❌ Modo Debug não funciona** - O GTM não detecta que está em modo preview/debug
2. **❌ Scroll calculado errado** - O sw_iframe.html afeta o cálculo de scroll

---

## 🚀 Instalação

### Opção 1: Script Inline (Recomendado)

Coloque **ANTES** do código do GTM:

```html
<script>
(function(){var d=!1,e=function(){document.querySelectorAll("iframe").forEach(function(a){var b=a.getAttribute("src")||"";b.includes("sw_iframe")&&(a.style.cssText="position:absolute!important;top:-9999px!important;left:-9999px!important;width:0!important;height:0!important;border:none!important;margin:0!important;padding:0!important;visibility:hidden!important;pointer-events:none!important;overflow:hidden!important;display:block!important;",d&&a.remove())})};e();var c=new MutationObserver(function(a){a.forEach(function(b){"childList"===b.type&&b.addedNodes.forEach(function(a){"IFRAME"===a.tagName&&e()})})});document.body?c.observe(document.body,{childList:!0,subtree:!0}):document.addEventListener("DOMContentLoaded",function(){document.body&&c.observe(document.body,{childList:!0,subtree:!0})});setTimeout(function(){c.disconnect()},3E4);window.location.search.includes("gtm_debug")&&(window.google_tag_data=window.google_tag_data||{},window.google_tag_data.blob=window.google_tag_data.blob||{},window.google_tag_data.blob[28]=!0,window.google_tag_data.blob[29]=!0,window._gtmDebugMode=!0)})();
</script>

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

### Opção 2: Arquivo Externo

```html
<script src="gtm-debug-helper.js"></script>
<script>
  // Configurar antes do GTM
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

## 🧪 Teste

### Para Verificar Debug Mode:

1. Abra o Tag Assistant
2. Execute na página com `?gtm_debug=1`
3. Verifique no console:
```javascript
window.google_tag_data.blob[29]  // Deve retornar true
window._gtmDebugMode             // Deve retornar true
```

### Para Verificar Scroll:

1. Role a página até diferentes posições
2. Verifique no Tag Assistant se os eventos aparecem corretamente
3. No console, verifique:
```javascript
// Não deve haver iframes afetando o layout
document.querySelectorAll('iframe[src*="sw_iframe"]').forEach(el => {
  console.log(el.style.cssText);
  // Deve mostrar position:absolute, top:-9999px, etc.
});
```

---

## ⚙️ Parâmetros de URL

Adicione à URL da página:

| Parâmetro | Efeito |
|-----------|--------|
| `?gtm_debug=1` | Força modo debug |
| `?gtm_preview=1` | Força modo preview |
| `?remove_sw=true` | Remove completamente o sw_iframe |

Exemplo:
```
https://www.sualoja.com/produto?gtm_debug=1&remove_sw=true
```

---

## 🔧 API JavaScript

Depois de carregado, você pode controlar via console:

```javascript
// Forçar modo debug manualmente
gtmDebugHelper.forceDebug();

// Reaplicar correção de scroll
gtmDebugHelper.fixScroll();

// Limpar sw_iframe
gtmDebugHelper.cleanupSw();

// Ver configuração
gtmDebugHelper.config;
```

---

## 📋 Checklist

- [ ] Script colocado **antes** do GTM
- [ ] Tag Assistant reconhece o container
- [ ] Eventos de scroll aparecem corretamente
- [ ] sw_iframe está isolado (position: absolute, top: -9999px)

---

## 🐛 Solução de Problemas

### Debug ainda não funciona?
```javascript
// Forçar manualmente no console
window.google_tag_data = { blob: { 28: true, 29: true } };
window._gtmDebugMode = true;
location.reload();
```

### Scroll ainda calculado errado?
```javascript
// Verificar altura do documento
console.log({
  bodyScrollHeight: document.body.scrollHeight,
  docElementScrollHeight: document.documentElement.scrollHeight,
  windowHeight: window.innerHeight,
  scrollY: window.scrollY
});
```

### sw_iframe ainda aparece?
```javascript
// Remover manualmente
document.querySelectorAll('iframe[src*="sw_iframe"]').forEach(el => el.remove());
```

---

**Versão:** 1.0.0  
**Criado para:** Tracklay Project
