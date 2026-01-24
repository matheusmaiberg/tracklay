# Tracklay

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **Proxy first-party de rastreamento para lojas Shopify. Contorne bloqueadores e proteções de navegador.**

Contorne bloqueadores de anúncios, proteções de rastreamento do navegador (ITP, ETP) e melhore a precisão do rastreamento de conversões servindo scripts de analytics do seu próprio domínio.

[English](README.md) | [Português](README.pt-BR.md)

---

## Funcionalidades

- **Contexto First-Party**: Sirva Google Analytics, GTM e Meta Pixel do seu domínio
- **Bypass de Ad-Blockers**: Caminhos customizados (`/cdn/`, `/assets/`) evitam detecção
- **Resistente a ITP/ETP**: Cookies first-party com tempo de vida estendido (7+ dias)
- **Auto-detecção de CORS**: Detecta automaticamente a origem da requisição (configuração zero)
- **Zero Manutenção**: Deploy em Cloudflare Workers (serverless, auto-scaling)
- **Pronto para Produção**: Rate limiting, tratamento de erros, headers de segurança
- **Focado em Privacidade**: Geração segura de UUID com SHA-256 e salt rotativo
- **Rápido e com Cache**: Scripts estáticos cacheados com TTL configurável
- **Arquitetura Factory**: Código limpo, modular e testável

## Por que usar isso?

### O Problema

Navegadores modernos e bloqueadores de anúncios bloqueiam scripts de rastreamento third-party:

- **Safari ITP** (Intelligent Tracking Prevention): Limita cookies a 7 dias, bloqueia rastreamento cross-site
- **Firefox ETP** (Enhanced Tracking Protection): Bloqueia rastreadores conhecidos
- **Ad-blockers**: Bloqueiam `google-analytics.com`, `googletagmanager.com`, `facebook.net`
- **Resultado**: 20-40% das conversões não são rastreadas, atribuição imprecisa

### A Solução

Este proxy serve analytics do **seu próprio domínio** como requisições **first-party**:

```
Antes: https://www.googletagmanager.com/gtag/js?id=G-XXXXX
Depois: https://sualojanabolsa.com.br/cdn/gtag/js?id=G-XXXXX
```

Benefícios:

- Cookies definidos como first-party (tempo de vida maior)
- Requisições não bloqueadas por ad-blockers ou navegadores
- Melhor precisão no rastreamento de conversões
- Funciona com GTM Server-Side para configuração completa

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
