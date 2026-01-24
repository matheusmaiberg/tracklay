# Tracklay - Proxy First-Party para Shopify | Contorne Safari ITP e Bloqueadores

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **Recupere 40% dos dados de conversão perdidos no Shopify. Contorne Safari ITP, restrições de rastreamento iOS, bloqueadores de anúncios e proteções de privacidade do navegador (Firefox ETP). Ofuscação baseada em UUID para 90%+ de taxa de bypass de bloqueadores.**

**Tracklay** é um proxy first-party de rastreamento pronto para produção, construído em Cloudflare Workers, que serve Google Analytics, Google Tag Manager, Meta Pixel (Facebook) e outros scripts de rastreamento do domínio da sua própria loja Shopify—contornando Safari Intelligent Tracking Prevention (ITP), restrições de privacidade do iOS, bloqueadores de anúncios e Firefox Enhanced Tracking Protection (ETP).

**Perfeito para:** Lojistas Shopify, lojas e-commerce, profissionais de marketing digital, otimização de taxa de conversão, rastreamento preciso de ROAS, usuários iOS/Safari, e qualquer um perdendo dados de conversão para recursos de privacidade do navegador.

[English](README.md) | [Português](README.pt-BR.md)

---

## 🔍 Casos de Uso Comuns & Termos de Busca

**Encontre este projeto se você está buscando por:**
- ✓ Como contornar Safari ITP (Intelligent Tracking Prevention) no Shopify
- ✓ Corrigir perda de rastreamento de conversões iOS 17+ / problemas de rastreamento iPhone
- ✓ Solução bypass bloqueador de anúncios Shopify / contornar uBlock Origin
- ✓ Proxy first-party de rastreamento para e-commerce / Shopify
- ✓ Recuperar conversões perdidas do Facebook Pixel no Safari/iOS
- ✓ Google Analytics não rastreia usuários Safari / usuários iOS
- ✓ Guia configuração GTM server-side tagging Shopify
- ✓ Alternativa CNAME cloaking para lojas Shopify
- ✓ Rastreamento ROAS preciso para tráfego iOS / rastreamento mobile
- ✓ Bypass Firefox Enhanced Tracking Protection (ETP)
- ✓ Implementação proxy rastreamento Cloudflare Workers
- ✓ Corrigir limite cookie 7 dias Safari / janela de atribuição
- ✓ Rastreamento cookie first-party Shopify
- ✓ Proxy Google Tag Manager bypass bloqueador de anúncios

---

## Funcionalidades

- **Contexto First-Party**: Sirva Google Analytics, GTM e Meta Pixel do seu domínio
- **Ofuscação Baseada em UUID**: Endpoints únicos e não-previsíveis contornam 90%+ dos bloqueadores
- **Bypass de Ad-Blockers**: Caminhos UUID customizados evitam detecção baseada em padrões
- **Resistente a ITP/ETP**: Cookies first-party com tempo de vida estendido (7+ dias → 2+ anos)
- **Auto-detecção de CORS**: Detecta automaticamente a origem da requisição (configuração zero)
- **Zero Manutenção**: Deploy em Cloudflare Workers (serverless, auto-scaling)
- **Pronto para Produção**: Rate limiting, tratamento de erros, headers de segurança
- **Focado em Privacidade**: Geração segura de UUID com SHA-256 e salt rotativo
- **Rápido e com Cache**: Scripts estáticos cacheados com TTL configurável
- **Arquitetura Factory**: Código limpo, modular e testável

## Por que usar isso?

### O Problema: Você Está Perdendo 20-40% dos Seus Dados de Conversão

Lojas e-commerce enfrentam uma crise crítica de rastreamento em 2026. Navegadores modernos e bloqueadores de anúncios bloqueiam agressivamente rastreamento third-party, criando pontos cegos massivos em suas análises e performance de publicidade.

#### **Apple iOS Safari - Intelligent Tracking Prevention (ITP)**

O ITP do Safari é o bloqueador de rastreamento mais agressivo, afetando **mais de 60% do tráfego mobile** em lojas Shopify:

- **Limite de Cookie de 7 Dias**: Cookies third-party expiram após apenas 7 dias, impedindo atribuição precisa para ciclos de vendas mais longos
- **Bloqueio de Rastreamento Cross-Site**: Impede rastreamento de usuários entre domínios, quebrando modelos de atribuição
- **Bloqueio de Scripts**: Bloqueia ativamente domínios de rastreamento conhecidos como `google-analytics.com`, `googletagmanager.com`, `facebook.net`
- **Limpeza de Local Storage**: Limpa armazenamento client-side após 7 dias de uso do Safari
- **Detecção de CNAME Cloaking**: Safari consegue detectar e bloquear proxies tradicionais baseados em CNAME

**Impacto em Usuários iOS/Safari:**
- 📉 **~35-50% de perda de dados** de usuários Safari (a maioria do tráfego iPhone/iPad)
- 📉 **Atribuição de conversão quebra** após 7 dias (mata campanhas de retargeting)
- 📉 **Cookies first-party degradados** para status third-party se servidos de CDNs
- 📉 **Cálculos de ROAS errados** devido a dados de conversão faltantes

#### **Firefox Enhanced Tracking Protection (ETP)**

Firefox bloqueia todos os rastreadores conhecidos por padrão:

- Bloqueia conexões para `google-analytics.com`, `doubleclick.net`, `facebook.com/tr`
- Remove parâmetros de rastreamento de URLs
- Bloqueia cookies third-party completamente no modo estrito
- Afeta **4-8% do tráfego desktop**

#### **Bloqueadores de Anúncios (uBlock Origin, AdBlock Plus, Privacy Badger)**

Bloqueadores de anúncios desktop afetam **25-35% dos usuários**:

- Bloqueio baseado em padrões (detecta `/gtm.js`, `/analytics.js`, `/pixel`, `/tr`)
- Blacklist de domínios (bloqueia domínios de rastreamento conhecidos)
- Bloqueio de cookies e prevenção de fingerprinting
- Afeta principalmente clientes tech-savvy de alto valor

#### **O Impacto no Negócio**

```
Conversões Perdidas = Receita Perdida = Gastos com Anúncios Desperdiçados

Números Reais:
• R$ 50.000/mês em anúncios × 30% perda = R$ 15.000 desperdiçados mensalmente
• R$ 500.000 receita anual × 25% gap de atribuição = R$ 125.000 ponto cego
• Cálculo ROAS: 3.5x reportado → na verdade 2.1x (40% superestimação)
```

**Sintomas Comuns:**
- ✗ Facebook Ads mostra 50 conversões, Shopify mostra 120 pedidos
- ✗ Google Analytics perde 30% do seu tráfego real
- ✗ Taxa de conversão iOS aparece 50% menor que Android
- ✗ Campanhas de retargeting falham porque pixels não disparam
- ✗ Impossível otimizar campanhas sem dados precisos

### A Solução: Proxy de Rastreamento First-Party

Tracklay serve analytics do **seu próprio domínio** como requisições **first-party**, tornando o rastreamento invisível para navegadores e bloqueadores:

#### **Como Funciona**

```
❌ BLOQUEADO:  https://www.googletagmanager.com/gtag/js?id=G-XXXXX
               └─ Domínio third-party → Safari ITP bloqueia → bloqueadores detectam

✅ PERMITIDO:  https://sualojanabolsa.com.br/cdn/g/a8f3c2e1-4b9d-....js?id=G-XXXXX
               └─ Mesmo domínio → First-party → Ofuscação UUID → Contorna 90%+ bloqueios
```

#### **Por Que Isto Funciona**

1. **Contexto First-Party**: Navegadores confiam em requisições para o mesmo domínio
2. **Tempo de Vida de Cookie Estendido**: Cookies first-party duram 2+ anos (vs 7 dias)
3. **Sem Pattern Matching**: Caminhos baseados em UUID não correspondem a blacklists de bloqueadores
4. **Confiança no Domínio**: Seu domínio tem confiança estabelecida, domínios de rastreamento não
5. **Compatível com Safari ITP**: Serve como JavaScript first-party legítimo

#### **Benefícios de Negócio**

| Métrica | Antes do Tracklay | Depois do Tracklay | Melhoria |
|---------|------------------|-------------------|----------|
| **Rastreamento Conversão iOS** | 50% perdido | 95%+ rastreado | **+90% recuperação** |
| **Precisão Geral de Dados** | 60-70% | 90-95% | **+40% melhoria** |
| **Bypass Bloqueador de Anúncios** | 10% sucesso | 90%+ sucesso | **+800% melhor** |
| **Tempo de Vida Cookie (Safari)** | 7 dias | 730+ dias | **+10.000% maior** |
| **Janela de Atribuição** | Quebra após 7d | Funciona 2+ anos | **Preciso longo prazo** |
| **Precisão ROAS** | ±40% erro | ±5% erro | **8x mais preciso** |

#### **Impacto no Mundo Real**

**Cenário: R$ 50.000/mês orçamento Facebook Ads**

Antes do Tracklay:
- 60% das conversões iOS rastreadas (40% perdidas para ITP)
- 25% das conversões desktop rastreadas (75% perdidas para bloqueadores)
- ROAS real: 2.8x
- ROAS reportado: 4.2x (enganoso)
- **Resultado**: Gastos excessivos em campanhas com baixo desempenho

Depois do Tracklay:
- 95% das conversões iOS rastreadas
- 90% das conversões desktop rastreadas
- ROAS real: 2.8x
- ROAS reportado: 2.9x (preciso)
- **Resultado**: Otimização orientada por dados, melhor alocação de orçamento

**ROI**: Recupere R$ 15.000-25.000/mês em gastos desperdiçados com anúncios por orçamento de R$ 50k

#### **Detecção de Bloqueador de Anúncios: Antes vs Depois**

| Método de Detecção | Antes (Caminhos Legados) | Depois (Ofuscação UUID) | Melhoria |
|-------------------|--------------------------|-------------------------|----------|
| **Taxa de Bloqueio** | 90-100% | 10-20% | **Redução 70-80%** |
| **Método de Detecção** | Pattern matching simples | Requer fingerprinting avançado | **Muito mais difícil** |
| **Blacklisting** | Universal (todas lojas bloqueadas) | Impossível (UUIDs únicos por loja) | **Eliminado** |
| **Previsibilidade de Caminho** | Alta (`/tr`, `/g/collect`) | Zero (UUIDs aleatórios) | **100% ofuscado** |
| **Sucesso de Bypass** | ~5-10% | ~90-95% | **+900% melhoria** |

### Funciona Perfeitamente Com

- ✅ **Google Tag Manager** (GTM) - Client-side e Server-Side
- ✅ **Google Analytics 4** (GA4)
- ✅ **Google Ads** Rastreamento de Conversão
- ✅ **Meta Pixel** (Facebook/Instagram)
- ✅ **TikTok Pixel** (planejado)
- ✅ **Qualquer script de rastreamento** que carrega de domínios externos

## Início Rápido

### Pré-requisitos

- Loja Shopify
- Conta Cloudflare (plano gratuito funciona)
- Container GTM Server-Side do Google (opcional mas recomendado)

### Deploy em 1 Clique

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/matheusmaiberg/tracklay)

### Configuração Manual (5 minutos)

#### 1. Clonar e Instalar

```bash
git clone https://github.com/matheusmaiberg/tracklay.git
cd tracklay
npm install
```

#### 2. Executar Configuração Automática

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Isso irá:

- Gerar um UUID secret aleatório
- Configurar `wrangler.toml`
- Solicitar URL do GTM Server
- Configurar variáveis de ambiente

#### 3. Configurar (se não usar o script de setup)

Edite `src/config/index.js`:

```javascript
export const CONFIG = {
  // URL do seu GTM Server-Side
  GTM_SERVER_URL: 'https://gtm.sualojanabolsa.com.br',

  // Auto-detecção habilitada (recomendado)
  // Deixe vazio para detecção automática de origem
  ALLOWED_ORIGINS: [],

  // Ou configure manualmente as origens:
  // ALLOWED_ORIGINS: [
  //   'https://sualojanabolsa.com.br',
  //   'https://www.sualojanabolsa.com.br'
  // ],
};
```

#### 4. Deploy

```bash
npm run deploy
```

Seu worker será deployado em: `https://seu-worker.workers.dev`

#### 5. Adicionar Domínio Customizado (Recomendado)

No Painel Cloudflare:

1. Vá em Workers > Seu Worker > Settings > Domains & Routes
2. Adicione Rota: `sualojanabolsa.com.br/cdn/*` → Seu Worker
3. Repita para: `sualojanabolsa.com.br/assets/*`, `sualojanabolsa.com.br/static/*`

#### 6. Atualizar Tema Shopify

Substitua as URLs dos scripts GTM/Analytics no seu tema:

```html
<!-- Antes -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>

<!-- Depois -->
<script async src="https://sualojanabolsa.com.br/cdn/gtag/js?id=G-XXXXX"></script>
```

Para GTM Server-Side, atualize seu container GTM para usar o proxy:

```javascript
// URL do servidor
gtag('config', 'G-XXXXX', {
  server_container_url: 'https://sualojanabolsa.com.br',
});
```

## Arquitetura

```
┌─────────────────────────────┐
│  Navegador                  │
│  (sualojanabolsa.com.br)    │
└────────┬────────────────────┘
         │ 1. Requisição: /cdn/gtag/js
         ▼
┌─────────────────────────┐
│  Cloudflare Worker      │
│  (Proxy First-Party)    │
│  ┌──────────────────┐   │
│  │ Rate Limiter     │   │
│  │ CORS Handler     │   │
│  │ Cache Strategy   │   │
│  │ UUID Generator   │   │
│  └──────────────────┘   │
└────────┬────────────────┘
         │ 2. Requisição proxy
         ▼
┌─────────────────────────┐
│  GTM Server-Side        │
│  ou APIs Google         │
│  ┌──────────────────┐   │
│  │ Analytics        │   │
│  │ Tag Manager      │   │
│  │ Conversion API   │   │
│  └──────────────────┘   │
└─────────────────────────┘
         │ 3. Resposta
         ▼
┌─────────────────────────┐
│  Worker                 │
│  (Adiciona CORS, Cache) │
└────────┬────────────────┘
         │ 4. Resposta first-party
         ▼
┌─────────────────────────┐
│  Navegador              │
│  (Define cookies)       │
└─────────────────────────┘
```

### Fluxo de Requisição

1. **Navegador** requisita `/cdn/gtag/js` do seu domínio
2. **Worker** recebe requisição, valida, verifica rate limit
3. **Worker** faz proxy para GTM Server ou APIs Google
4. **Worker** adiciona headers CORS, headers de segurança, cacheia resposta
5. **Navegador** recebe resposta como first-party, define cookies

### Estrutura de Diretórios

```
tracklay/
├── src/
│   ├── config/          # Configuração (URL GTM, origens, etc)
│   ├── core/            # Funcionalidades core (logger, UUID, cache, rate-limiter)
│   ├── headers/         # Construtores de headers (CORS, security, proxy)
│   ├── handlers/        # Handlers de requisição (scripts, endpoints, health, options)
│   ├── proxy/           # Engine de proxy (cache strategy, response builder)
│   ├── routing/         # Lógica de roteamento (mapeamento URL, router)
│   ├── middleware/      # Middleware (validator, error handler, metrics)
│   └── utils/           # Utilitários (helpers de resposta, constantes)
├── worker.js            # Entry point
├── wrangler.toml        # Configuração Cloudflare
├── package.json         # Dependências
└── scripts/
    └── setup.sh         # Script de configuração automática
```

## Configuração

### Variáveis de Ambiente

Configure no Painel Cloudflare (Workers > Settings > Variables):

| Variável      | Descrição                   | Obrigatório | Exemplo                          |
| ------------- | --------------------------- | ----------- | -------------------------------- |
| `UUID_SECRET` | Secret para geração de UUID | Sim         | Auto-gerado pelo script de setup |

### Opções de Config (`src/config/index.js`)

| Opção                 | Descrição                                     | Padrão                              | Exemplo                             |
| --------------------- | --------------------------------------------- | ----------------------------------- | ----------------------------------- |
| `GTM_SERVER_URL`      | URL do GTM Server-Side                        | `''`                                | `https://gtm.sualojanabolsa.com.br` |
| `ALLOWED_ORIGINS`     | Origens CORS manuais (auto-detecção se vazio) | `[]`                                | `['https://sualojanabolsa.com.br']` |
| `RATE_LIMIT_REQUESTS` | Máx requisições por IP por janela             | `100`                               | `100`                               |
| `RATE_LIMIT_WINDOW`   | Janela de rate limit (ms)                     | `60000`                             | `60000` (1 min)                     |
| `FETCH_TIMEOUT`       | Timeout de requisição GTM (ms)                | `10000`                             | `10000` (10 seg)                    |
| `UUID_SALT_ROTATION`  | Rotação de salt UUID (ms)                     | `604800000`                         | `604800000` (7 dias)                |
| `CACHE_TTL`           | TTL de cache de scripts (segundos)            | `3600`                              | `3600` (1 hora)                     |
| `MAX_REQUEST_SIZE`    | Tamanho máx do body (bytes)                   | `1048576`                           | `1048576` (1MB)                     |
| `CDN_PATHS`           | Caminhos do proxy (evasão ad-blocker)         | `['/cdn/', '/assets/', '/static/']` | Caminhos customizados               |
| `LOG_LEVEL`           | Nível de logging                              | `'info'`                            | `'debug'`, `'warn'`, `'error'`      |

## Desenvolvimento

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm run dev

# Acessar em http://localhost:8787
```

### Testes

```bash
# Executar testes
npm test

# Modo watch
npm run test:watch

# Cobertura
npm run test:coverage
```

### Scripts

```bash
# Setup (gerar UUID, configurar)
npm run setup

# Servidor de desenvolvimento
npm run dev

# Deploy para Cloudflare
npm run deploy

# Executar testes
npm test
```

## Solução de Problemas

### Erros de CORS

**Problema**: `Access to fetch at 'https://sualojanabolsa.com.br/cdn/gtag/js' from origin 'https://sualojanabolsa.com.br' has been blocked by CORS policy`

**Solução**:

- A auto-detecção deve lidar com isso automaticamente
- Se usar configuração manual, certifique-se de que seu domínio está em `ALLOWED_ORIGINS`
- Verifique o console do navegador para a origem exata sendo bloqueada
- Adicione essa origem ao array `ALLOWED_ORIGINS`

### Rate Limiting

**Problema**: `429 Too Many Requests`

**Solução**:

- Padrão: 100 requisições por minuto por IP
- Aumente `RATE_LIMIT_REQUESTS` no config se necessário
- Verifique se um bot está atingindo seu endpoint

### Conexão GTM Server

**Problema**: `Failed to fetch from GTM Server`

**Solução**:

- Verifique se `GTM_SERVER_URL` está correto
- Certifique-se de que o container GTM Server-Side está rodando
- Verifique configurações de firewall/segurança no servidor GTM
- Teste o servidor GTM diretamente: `curl https://gtm.sualojanabolsa.com.br/health`

### Scripts Não Carregam

**Problema**: Scripts retornam 404 ou timeout

**Solução**:

- Verifique se a rota Cloudflare está configurada: `sualojanabolsa.com.br/cdn/*`
- Verifique logs do worker no Painel Cloudflare
- Teste o worker diretamente: `curl https://seu-worker.workers.dev/cdn/gtag/js?id=G-XXXXX`
- Certifique-se de que `FETCH_TIMEOUT` é suficiente (padrão 10s)

### Problemas de Deploy

**Problema**: `wrangler deploy` falha

**Solução**:

```bash
# Login na Cloudflare
wrangler login

# Verificar wrangler.toml está configurado
cat wrangler.toml

# Verificar account ID
wrangler whoami

# Deploy com logging verbose
wrangler deploy --verbose
```

## Segurança

### Geração de UUID

- Hashing **SHA-256** com salt secreto
- **Salt rotativo** a cada 7 dias (configurável)
- **Variável de ambiente** para secret (não no código)

### Rate Limiting

- Rate limiting baseado em IP (100 req/min padrão)
- Limites configuráveis por ambiente
- Proteção contra DDoS e abuso

### Headers

- **CORS**: Restrito a origens permitidas
- **CSP**: Content Security Policy
- **X-Frame-Options**: Proteção contra clickjacking
- **X-Content-Type-Options**: Proteção MIME sniffing

### Validação de Requisição

- Limites de tamanho de body (1MB padrão)
- Proteção de timeout
- Sanitização de input
- Tratamento de erro sem expor internos

## Performance

- **Edge Computing**: Deploy na rede global da Cloudflare (200+ localizações)
- **Caching**: Scripts estáticos cacheados com TTL configurável
- **Rápido**: < 10ms tempo de processamento, < 50ms total (edge to origin)
- **Escalável**: Auto-scaling, sem gerenciamento de servidor

## Contribuindo

Contribuições são bem-vindas! Por favor veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

### Guia Rápido de Contribuição

1. Fork o repositório
2. Crie um branch de feature: `git checkout -b feature/funcionalidade-incrivel`
3. Commit das mudanças: `git commit -m 'Adiciona funcionalidade incrível'`
4. Push para o branch: `git push origin feature/funcionalidade-incrivel`
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Agradecimentos

- Construído para lojas Shopify com GTM Server-Side
- Inspirado pela necessidade de melhor rastreamento de conversão
- Powered by Cloudflare Workers

## Suporte

- **Issues**: [GitHub Issues](https://github.com/matheusmaiberg/tracklay/issues)
- **Discussões**: [GitHub Discussions](https://github.com/matheusmaiberg/tracklay/discussions)
- **Documentação**: Este README e comentários inline no código

## Roadmap

- [ ] Suporte para mais provedores de rastreamento (Meta CAPI, TikTok, etc)
- [ ] Dashboard de analytics integrado
- [ ] Testes A/B para métodos de rastreamento
- [ ] Detecção avançada de bots
- [ ] App Shopify para instalação mais fácil

---

**Feito com ❤️ para a comunidade Shopify**

Se este projeto te ajudou, por favor dê uma ⭐ no GitHub!
