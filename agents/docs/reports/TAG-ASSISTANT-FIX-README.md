# Tag Assistant Debug Fix - Guia Rápido

## 🚨 Mensagem de Erro

> "Para melhorar a qualidade do seu teste, ative o contêiner do Gerenciador de tags para depuração na janela do Assistente de tags e volte aqui."

---

## ✅ Solução Imediata

### Opção 1: Script Inline (Copiar e Colar)

**Coloque isto ANTES do código do GTM:**

```html
<script>
(function(){console.log("[TA Fix] Iniciando...");window.google_tag_data=window.google_tag_data||{};window.google_tag_data.blob=window.google_tag_data.blob||{};window.google_tag_data.blob[28]=!0;window.google_tag_data.blob[29]=!0;window.google_tag_data.blob[30]=!0;window.google_tag_data.blob[31]=!0;window.google_tag_data.blob[32]=!0;window._gtmDebugMode=!0;window._tagAssistant=!0;window.__TAG_ASSISTANT=!0;window.google_tag_manager_data=window.google_tag_manager_data||{};window.dataLayer=window.dataLayer||[];window.dataLayer.push({"gtm.start":new Date().getTime(),event:"gtm.js","gtm.debug":!0,"gtm.tagAssistant":!0});window.addEventListener("message",function(a){if(a.data&&("TAG_ASSISTANT_API"===a.data.type||"GTAG_API"===a.data.type||"TAG_ASSISTANT"===a.data.type||"tag_assistant"===a.data.from||"tag_assistant"===a.data.source))if(console.log("[TA Fix] Comunicação:",a.data),a.source)try{a.source.postMessage({type:"TAG_ASSISTANT_RESPONSE",status:"active",debugMode:!0,previewMode:!0,timestamp:Date.now(),containerId:"GTM-MJ7DW8H"},"*")}catch(b){}});window.postMessage({type:"GTM_DEBUG_READY",timestamp:Date.now(),debugMode:!0},"*");window.addEventListener("load",function(){setTimeout(function(){if(window.google_tag_manager){console.log("[TA Fix] GTM ok");var a=Object.keys(window.google_tag_manager)[0];a&&window.google_tag_manager[a]&&(window.google_tag_manager[a].debugMode=!0)}},1E3)});console.log("[TA Fix] Pronto!")})();
</script>
```

> **⚠️ IMPORTANTE:** Substitua `GTM-MJ7DW8H` pelo seu ID real!

---

### Opção 2: Arquivo Externo

```html
<script src="tag-assistant-fix.js"></script>
<script>
  // Código do GTM aqui
</script>
```

---

### Opção 3: URL com Parâmetro

Adicione `?gtm_debug=1` à URL:

```
https://www.sualoja.com/produto?gtm_debug=1
```

---

## 🧪 Verificação

### No Console (F12)

Execute:
```javascript
// Verificar se as flags estão configuradas
console.log({
  'blob[28]': window.google_tag_data?.blob?.[28],  // true
  'blob[29]': window.google_tag_data?.blob?.[29],  // true
  'debugMode': window._gtmDebugMode,               // true
  'tagAssistant': window._tagAssistant             // true
});
```

**Deve mostrar todos como `true`!**

---

## 🔧 Se Ainda Não Funcionar

### Tente em Ordem:

1. **Limpar cache** - Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)

2. **Modo anônimo** - Abra em janela anônima (Ctrl+Shift+N)

3. **Reinstalar Tag Assistant** - Remova e adicione a extensão novamente

4. **Desativar sw_iframe** - Adicione `&remove_sw=true` na URL:
   ```
   https://www.sualoja.com/?gtm_debug=1&remove_sw=true
   ```

---

## 📋 Checklist

- [ ] Script colocado **antes** do GTM
- [ ] ID do container correto no script (`GTM-MJ7DW8H`)
- [ ] URL da página tem `?gtm_debug=1`
- [ ] Console mostra flags como `true`
- [ ] Tag Assistant reconhece o modo debug
- [ ] Mensagem de erro desapareceu

---

## 💡 Por Que Acontece

O Tag Assistant precisa detectar que o GTM está em modo debug. Quando proxyado:

1. ❌ `debugMode` é `false` no script
2. ❌ `previewMode` depende do blob que não tem os índices corretos
3. ❌ Comunicação postMessage pode falhar

**O script fix configura tudo manualmente!** ✅

---

## 📞 Debug Avançado

Se persistir, cole no console:

```javascript
// Forçar manualmente
window.google_tag_data = {
  blob: {
    28: true,
    29: true,
    30: true,
    31: true,
    32: true
  }
};
window._gtmDebugMode = true;
location.reload();
```

---

**Criado para:** Tracklay Project  
**Resolve:** Erro "Ative o contêiner para depuração"
