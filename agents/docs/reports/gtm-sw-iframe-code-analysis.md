# Análise Técnica: Código do GTM - Ativação do sw_iframe.html

## Resumo

**Sim, é possível identificar quando o GTM ativa o `sw_iframe.html` dentro do script!**

Analisando o código do GTM proxyado pelo Tracklay, encontrei as funções específicas responsáveis pela criação do iframe do Service Worker.

---

## 🔍 Código Encontrado no Script

### URL Analisado
```
https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?id=GTM-MJ7DW8H
```

### 1. Função Principal: `my()` - Inicializador do Service Worker

```javascript
function my(a) {
  var b;
  b = (a === void 0 ? {} : a).Yr;
  var c = iy(b);  // ← Verifica se deve usar Service Worker
  
  if (c == null || !ly() || jy(c.origin)) return;  // ← Checagens de permissão
  
  if (!Gc()) {  // ← Verifica se navegador suporta Service Worker
    fy().J(void 0, void 0, 6);
    return;
  }
  
  var d = new ky(c);  // ← CRIA O SERVICE WORKER!
  tm(om.X.Mm, {})[c.origin] = d;
}
```

**Onde está no código:**
- A função `my()` é chamada em dois lugares:
  1. `my(a)` - chamada com parâmetros
  2. `my()` - chamada vazia dentro da função `cJ()`

---

### 2. Função `cJ()` - Gatilho Principal

```javascript
function cJ(a) {
  if (N(10)) return;  // ← Se flag N(10) estiver ativa, não executa
  
  var b = Mj() || !!Oj(a.F);  // ← Verifica first-party serving
  N(431) && (b = ig(50) || !!Oj(a.F));  // ← Nova verificação com flag 431
  
  if (b) return;  // ← Se for first-party, retorna sem criar SW
  
  my();  // ← CHAMA A FUNÇÃO QUE CRIA O SERVICE WORKER!
}
```

**O que faz:**
- Verifica flags de controle `N(10)` e `N(431)`
- Verifica se está em modo first-party (`Mj()`, `Oj(a.F)`)
- Se NÃO for first-party, chama `my()` que cria o Service Worker

---

### 3. Função `iy()` - Verificação de Domínio

```javascript
iy = function(a) {
  var b = w.location.origin;
  if (!b) return null;
  
  // Flag N(432) controla comportamento
  (N(432) ? Ij() : Ij() && !a) && 
    (a = "" + b + Jj() + "/_/service_worker");
  
  return hy(a);  // ← Constrói URL do Service Worker
}
```

**Retorna:**
- URL do endpoint do Service Worker (ex: `https://cdn.suevich.com/x/.../sw_iframe.html`)
- `null` se não deve criar Service Worker

---

### 4. Função `ky()` - Construtor do Service Worker

```javascript
ky = function(a) {
  var b = this;
  this.J = fy();
  this.W = this.U = !1;
  this.la = null;
  this.initTime = Math.round(Hb());
  this.D = 15;
  this.R = this.Hq(a);
  
  // Agenda inicialização em 1 segundo
  w.setTimeout(function() {
    b.initialize();
  }, 1E3);
  
  // Cria o iframe quando pronto
  Yc(function() {
    b.xr(a);  // ← MÉTODO QUE CRIA O IFRAME!
  });
};
```

---

### 5. Método `xr()` - CRIADOR DO IFRAME

**Este é o código mais importante - onde o iframe sw_iframe.html é realmente criado:**

```javascript
k.xr = function(a) {
  var b = w.location.origin,
      c = this,
      d = Tc();  // ← Cria iframe "about:blank" pai
  
  try {
    // CRIA O IFRAME sw_iframe.html
    var e = d.contentDocument.createElement("iframe"),
        f = a.pathname,
        g = f[f.length - 1] === "/" ? a.toString() : a.toString() + "/",
        h = a.origin !== "https://cdn.suevich.com/x/0e597c46b6813c26980644146ea0793f" ? gy(f) : "",
        l;
    
    // Flag N(133) adiciona sandbox
    N(133) && (l = {sandbox: "allow-same-origin allow-scripts"});
    
    // DEFINE O SRC DO IFRAME!
    Tc(g + "sw_iframe.html?origin=" + encodeURIComponent(b) + h, void 0, l, void 0, e);
    
    // Adiciona listener de mensagens
    var n = function() {
      d.contentDocument.body.appendChild(e);
      e.addEventListener("load", function() {
        c.la = e.contentWindow;
        d.contentWindow.addEventListener("message", function(p) {
          p.origin === a.origin && c.R.jr(p.data);
        });
        c.initialize();
      });
    };
    
    // Executa quando documento estiver pronto
    d.contentDocument.readyState === "complete" ? 
      n() : 
      d.contentWindow.addEventListener("load", function() { n() });
      
  } catch (p) {
    // Tratamento de erro
    d.parentElement.removeChild(d);
    this.D = 11;
    this.J.J(void 0, void 0, this.D, p.toString());
  }
};
```

**O que este código faz:**
1. Cria um iframe "about:blank" intermediário (`d`)
2. Cria o iframe `sw_iframe.html` dentro deste (`e`)
3. Define o `src` como: `https://cdn.suevich.com/x/.../sw_iframe.html?origin=<origin>`
4. Adiciona listener de mensagens para comunicação postMessage
5. Inicializa o Service Worker quando o iframe carregar

---

### 6. Função `hy()` - Construtor da URL

```javascript
hy = function(a) {
  var b = a,
      c, 
      d = lg(11),
      e = lg(10);
  
  c = e;  // ← Obtém versão/nome do arquivo
  
  // Constrói a URL completa
  b ? 
    (b.charAt(b.length - 1) !== "/" && (b += "/"), 
     a = b + c) : 
    a = "https://cdn.suevich.com/x/f42dea63dcf215db0971abfdd0d04340" + c + "/";
  
  var f;
  try {
    f = new URL(a);
  } catch (g) {
    return null;
  }
  
  // Só permite HTTPS
  return f.protocol !== "https:" ? null : f;
}
```

---

## 🎯 Fluxo de Ativação

```
1. GTM Inicializa
        ↓
2. Chama cJ(a) durante bootstrap
        ↓
3. Verifica flags N(10), N(431), Mj(), Oj(a.F)
        ↓
4. Se passar nas verificações → chama my()
        ↓
5. my() chama iy() para verificar domínio
        ↓
6. iy() retorna URL do service worker
        ↓
7. my() cria nova instância ky(c)
        ↓
8. ky() agenda xr() para criar iframe
        ↓
9. xr() cria iframe about:blank pai
        ↓
10. xr() cria iframe sw_iframe.html filho
        ↓
11. sw_iframe.html carrega sw.js (Service Worker)
```

---

## 🚫 Como Prevenir (Baseado no Código)

### Opção 1: Fazer com que as checagens falhem

O código verifica várias condições antes de criar o Service Worker:

```javascript
// Na função cJ():
if (N(10)) return;        // ← Se flag 10 estiver ativa, não executa
var b = Mj() || !!Oj(a.F); // ← Se first-party serving, retorna
if (b) return;            // ← NÃO cria Service Worker
```

**Solução:** Se `Mj()` ou `Oj(a.F)` retornarem `true`, o Service Worker NÃO é criado.

### Opção 2: Fazer iy() retornar null

```javascript
iy = function(a) {
  var b = w.location.origin;
  if (!b) return null;    // ← Se não houver origin, retorna null
  // ...
  return hy(a);           // ← Se hy retornar null, SW não é criado
}
```

**Solução:** Se `w.location.origin` for vazio ou `hy(a)` retornar `null`, o SW não é criado.

### Opção 3: Fazer ly() retornar false

```javascript
function ly() {
  var a = zg(Gg.D, "", function() { return {}; });
  try {
    return a("internal_sw_allowed"), !0;  // ← Se throwar, retorna false
  } catch (b) {
    return !1;  // ← SW não é permitido
  }
}
```

**Solução:** Se a função `a("internal_sw_allowed")` throwar, `ly()` retorna `false` e o SW não é criado.

---

## 🔑 Flags Importantes Encontradas

| Flag | Função | Descrição |
|------|--------|-----------|
| `N(10)` | cJ() | Se true, não executa cJ() |
| `N(431)` | cJ() | Controla verificação de first-party |
| `N(432)` | iy() | Controla comportamento do service worker |
| `N(133)` | xr() | Adiciona sandbox ao iframe |
| `ig(50)` | cJ() | Feature flag para first-party |

---

## 📍 Localização no Código do Script

O código do Service Worker está localizado aproximadamente nos **últimos 30%** do script do GTM.

**Marcadores para buscar:**
1. `"sw_iframe.html"` - URL do iframe
2. `"service_worker"` - string do endpoint
3. `function my(` - inicializador principal
4. `function cJ(` - gatilho de ativação
5. `"about:blank"` - iframe pai intermediário

---

## 🧪 Como Verificar se o Código Está Presente

```bash
# Buscar referências ao sw_iframe
curl -s "https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?id=GTM-MJ7DW8H" | grep -o "sw_iframe"

# Buscar função my
curl -s "https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?id=GTM-MJ7DW8H" | grep -o "function my("

# Buscar service_worker
curl -s "https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?id=GTM-MJ7DW8H" | grep -o "service_worker"
```

---

## ✅ Conclusão

**Sim, é possível encontrar e analisar o código que ativa o `sw_iframe.html` no script do GTM.**

O código é ofuscado/minificado, mas as strings importantes como `"sw_iframe.html"`, `"service_worker"` e `"about:blank"` permanecem legíveis. 

A ativação segue um fluxo claro:
1. `cJ()` é chamado durante o bootstrap do GTM
2. Se as condições forem atendidas, chama `my()`
3. `my()` cria uma instância de `ky()`
4. `ky()` chama `xr()` que finalmente cria o iframe `sw_iframe.html`

---

*Análise realizada em: Janeiro 2026*
*Script analisado: GTM-MJ7DW8H via proxy Tracklay*
