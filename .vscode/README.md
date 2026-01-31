# VS Code Configuration

This folder contains VS Code workspace settings and configurations for the Tracklay project.

## Quick Start

### 1. File Nesting (Agrupamento de Arquivos)

O VS Code está configurado para agrupar automaticamente os arquivos `.example` com seus arquivos principais:

```
📄 .env
  📄 .env.example         ← Agrupado sob .env
📄 .dev.vars
  📄 .dev.vars.example    ← Agrupado sob .dev.vars
📄 wrangler.toml
  📄 wrangler.toml.example ← Agrupado sob wrangler.toml
```

Para ver os arquivos agrupados, clique na seta ao lado do arquivo principal no Explorer.

### 2. Copiar Arquivos de Exemplo

Abra o Command Palette (`Ctrl+Shift+P` ou `Cmd+Shift+P`) e execute:

```
Tasks: Run Task → Setup: Copy all .example files
```

Ou individualmente:
- `Setup: Copy .env.example → .env`
- `Setup: Copy .dev.vars.example → .dev.vars`
- `Setup: Copy wrangler.toml.example → wrangler.toml`

### 3. Editar Configuração

Após copiar, edite os arquivos com seus valores reais:

| Arquivo | Descrição |
|---------|-----------|
| **`.env`** | Variáveis de ambiente |
| **`.dev.vars`** | Secrets de desenvolvimento (não commitado) |
| **`wrangler.toml`** | Configuração do Cloudflare Worker |

### 4. Iniciar Desenvolvimento

```
Tasks: Run Task → Development: Start dev server
```

Ou use o atalho: `Ctrl+Shift+B`

## Tasks Disponíveis

### Setup
- **Copy all .example files** - Copia todos os arquivos de exemplo
- Copy individual (.env, .dev.vars, wrangler.toml)

### Development
- **Start dev server** - Inicia servidor de desenvolvimento
- **Deploy to production** - Faz deploy para produção
- **View logs** - Visualiza logs em tempo real

### Code Quality
- **Format all files** - Formata com Prettier
- **Lint** - Executa ESLint

### Testing
- **Run all tests** - Executa suite de testes
- **Run tests in watch mode** - Testes com watch

### Secrets
- **Set OBFUSCATION_SECRET** - Configura secret
- **Set ENDPOINTS_API_TOKEN** - Configura token

### Utilities
- **Generate: New UUIDs** - Gera novos UUIDs

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+B` | Iniciar dev server |
| `Ctrl+Shift+P` → `task` | Ver todas as tasks |
| `F5` | Iniciar debugging |

## File Associations

- `.env*` → Properties
- `.dev.vars*` → Properties  
- `wrangler.toml` → TOML

## Extensões Recomendadas

Veja `extensions.json`:
- **Prettier** - Formatação
- **ESLint** - Linting
- **Material Icon Theme** - Ícones
- **Even Better TOML** - Suporte TOML
- **GitLens** - Integração Git

## File Nesting

A configuração `explorer.fileNesting` agrupa arquivos relacionados:

```json
{
  ".env": ".env.example",
  ".dev.vars": ".dev.vars.example",
  "wrangler.toml": "wrangler.toml.example"
}
```

Isso mantém os arquivos de exemplo organizados junto com seus arquivos principais.
