# GTM SW Iframe Cleaner - Guia Rápido

## 🚀 Uso Rápido (30 segundos)

### Método 1: Bookmarklet (Recomendado para testes pontuais)

1. **Crie um bookmark** no seu navegador
2. **Nome:** "GTM SW Cleaner"
3. **URL:** Cole o código abaixo:

```javascript
javascript:(function(){var r=function(){document.querySelectorAll('iframe').forEach(function(i){if((i.src||'').includes('sw_iframe')){i.remove();}});};r();setInterval(r,500);alert('GTM SW Cleaner ativo!');})();
```

4. **Ao usar o Tag Assistant:**
   - Abra o Tag Assistant
   - Veja a página fantasma aparecer
   - Clique no bookmarklet
   - Pronto! O iframe some em segundos

---

### Método 2: Script na Página (Recomendado para desenvolvimento)

**Opção A - Script Externo:**
```html
<!-- Coloque ANTES do GTM -->
<script src="gtm-sw-cleaner.min.js"></script>

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

**Opção B - Inline (Copie e cole):**
```html
<script>
// GTM SW Cleaner v1.0.0
(function(){var d=!1,e=function(){document.querySelectorAll("iframe").forEach(function(a){var b=a.getAttribute("src")||"";b.includes("sw_iframe")&&(a.remove(),console.log("[GTM-Cleaner] Removed",b))})};e();var c=new MutationObserver(function(a){a.forEach(function(b){"childList"===b.type&&b.addedNodes.forEach(function(a){"IFRAME"===a.tagName&&e()})})});document.body?c.observe(document.body,{childList:!0,subtree:!0}):document.addEventListener("DOMContentLoaded",function(){document.body&&c.observe(document.body,{childList:!0,subtree:!0})});setInterval(e,500);setTimeout(function(){c.disconnect()},3E4);window.addEventListener("load",function(){setTimeout(e,1E3);setTimeout(e,2E3)});window.gtmSwCleaner={clean:e,enable:function(){d=!0},disable:function(){d=!1}}})();
</script>
```

---

### Método 3: Console do DevTools (Para teste imediato)

Abra o console (F12) e cole:
```javascript
var removeSw=function(){document.querySelectorAll('iframe').forEach(function(el){var src=el.getAttribute('src')||'';if(src.includes('sw_iframe')){el.remove();console.log('[GTM-Cleaner] Removed:',src);}});};removeSw();setInterval(removeSw,500);
```

---

## 📋 Checklist de Verificação

Após aplicar a solução:

- [ ] Abra o Tag Assistant
- [ ] Verifique se aparece apenas **uma** página do container GTM
- [ ] A página "sw_iframe.html" **não deve aparecer**
- [ ] As tags continuam disparando normalmente
- [ ] Os eventos aparecem no Tag Assistant

---

## 🐛 Solução de Problemas

**O iframe ainda aparece?**
1. Certifique-se de que o script está sendo carregado ANTES do GTM
2. Verifique no console se há erros
3. Tente o bookmarklet para teste imediato

**O GTM parou de funcionar?**
- O script NÃO interfere no funcionamento do GTM
- Se parou, provavelmente é outro problema
- Tente desabilitar: `gtmSwCleaner.disable()` no console

**Funciona no Tag Assistant mas não na página normal?**
- O script funciona em ambos
- No Tag Assistant é mais visível porque ele mostra cada iframe como uma "página"

---

## 💡 Dicas

1. **Use o bookmarklet** para testes rápidos no Tag Assistant
2. **Use o script inline** durante o desenvolvimento
3. **Remova em produção** se não for necessário (o Service Worker tem benefícios de performance)

---

## 📁 Arquivos

- `gtm-sw-cleaner.js` - Versão completa comentada
- `gtm-sw-cleaner.min.js` - Versão minificada
- `GTM-SW-CLEANER-README.md` - Este guia

---

**Versão:** 1.0.0  
**Criado para:** Tracklay Project  
**Data:** Janeiro 2026
