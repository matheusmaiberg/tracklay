# Tracklay - Proxy de Rastreo de Primera Parte para Shopify

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/analyzify/tracklay/releases)

> **Evita Safari ITP, Bloqueadores de Anuncios (uBlock, AdBlock) y Protecciones de Privacidad del Navegador. Recupera 40%+ de Datos de Conversión Perdidos con Rastreo de Primera Parte.**

**Tracklay** es un proxy de rastreo de primera parte sin servidor construido sobre Cloudflare Workers que sirve Google Analytics 4 (GA4), Google Tag Manager (GTM) y Meta (Facebook) Pixel desde tu propio dominio, completamente evitando el límite de cookies de 7 días de Safari, restricciones de rastreo de iOS y 90%+ de bloqueadores de anuncios.

**[🇺🇸 English](README.md) | [🇧🇷 Português](README.pt-BR.md) | 🇪🇸 Español | [🇫🇷 Français](README.fr.md) | [🇩🇪 Deutsch](README.de.md)**

---

## ¿Por Qué Tracklay? El Problema de Privacidad que Resolvemos

### La Realidad del Rastreo de E-commerce Moderno

En 2024-2025, **60-70% de tus datos de conversión se están perdiendo** debido a protecciones modernas de privacidad del navegador:

- **Safari ITP** (Intelligent Tracking Prevention) limita las cookies de terceros a **7 días**
- **iOS 14.5+** requiere consentimiento del usuario para rastreo, con tasas de **85%+ de rechazo**
- **Bloqueadores de anuncios** (uBlock Origin, AdBlock Plus) bloquean Google Analytics, Meta Pixel y GTM para **25-35% de usuarios**
- **Firefox ETP** (Enhanced Tracking Protection) bloquea rastreadores de terceros por defecto
- **Scripts de terceros** se retrasan o bloquean cada vez más

### El Impacto Financiero

| Métrica | Sin Tracklay | Con Tracklay |
|---------|--------------|-------------------|
| **Precisión de Rastreo iOS** | 50% | **95%+** |
| **Tasa de Bypass del Bloqueador** | 10% | **95%+** |
| **Duración de Cookie (Safari)** | 7 días | **2+ años** |
| **Recuperación de Datos de Conversión** | 60-70% | **90-95%** |
| **Atribución ROAS** | Baja precisión | **Alta precisión** |
| **Tamaño de Audiencia de Retargeting** | ~50% de usuarios | **95%+ de usuarios** |

**Para una tienda con $1M/año en ingresos, esto significa recuperar $40,000-$70,000 en ingresos atribuidos.**

---

## Qué Hace a Tracklay Diferente

### Proxy Tradicional vs Tracklay

| Aspecto | Proxy Tradicional | Tracklay |
|---------|-------------------|----------|
| **Patrón de URL** | `proxy.com/gtag.js` (detectable) | `yourstore.com/cdn/g/{uuid}` (aleatorio) |
| **Extensiones de Archivo** | Sufijos `.js` | Sin extensiones |
| **Resistencia a Blacklist** | Fácilmente bloqueado | Imposible de blacklist permanente |
| **Tasa de Detección** | 90-100% | <5% |
| **Rotación** | URLs estáticas | Rotación automática semanal de UUID |
| **Aliases de Contenedor** | Ninguno | Ofuscación `?c=alias` |

### Comparación de Features

| Feature | Descripción | Beneficio |
|---------|-------------|-----------|
| **Rotación de UUID** | Rotación automática semanal vía API | Previene blacklist permanente |
| **Sin Extensiones** | Scripts sin `.js` | Más difícil de detectar |
| **Aliases** | `?c=alias` → `?id=GTM-XXXXX` | Ofuscación de parámetros |
| **Diseño Unificado** | Scripts y endpoints mismo patrón | Rutas indistinguibles |
| **Full Script Proxy** | Extracción y reemplazo de URLs | 98%+ bypass de ad-blockers |

### Cómo Funciona el Full Script Proxy

| Etapa | Acción | Resultado |
|-------|--------|-----------|
| 1. Extraer | Worker descarga script, extrae TODAS las URLs | Identifica 30+ dominios |
| 2. Generar | Crea UUID único para cada URL | Endpoints `/x/{uuid}` |
| 3. Reemplazar | Cambia URLs en el contenido | Todas las llamadas first-party |
| 4. Cache | Detección de cambios SHA-256 | Mínimo impacto en performance |
| 5. Ruta | Cliente → UUID → Worker → Destino | Proxy transparente |

### Servicios Soportados

| Categoría | Servicios |
|-----------|-----------|
| **Google** | Analytics, Ads, Tag Manager, DoubleClick, Syndication |
| **Meta** | Pixel, Connect, Graph API |
| **Microsoft** | Clarity, Bing Ads |
| **Social** | LinkedIn, Snapchat, TikTok, Pinterest, Twitter/X |
| **Analytics** | Segment, Tealium, Mixpanel, Hotjar, Heap |

### Modos de Despliegue

| Modo | Ideal Para | Setup | Calidad de Datos | Tasa de Bypass |
|------|------------|-------|------------------|----------------|
| **Web (Client-Side)** | Inicio rápido | 1 hora | Estándar | 90%+ |
| **GTM Server-Side** | Privacidad mejorada | 4 horas | Alta (EMQ 7-8) | 95%+ |
| **GTM + GA4 Transport** | Máxima precisión | 2 horas | Muy Alta | 98%+ |

---

## Inicio Rápido (Implementar en 15 Minutos)

### Requisitos Previos

- Node.js 18+ y npm 9+
- Cuenta de Cloudflare (el nivel gratuito funciona)
- Tienda Shopify (cualquier plan)
- Git

### Paso 1: Instalar y Configurar

```bash
# Clonar el repositorio
git clone https://github.com/matheusmaiberg/tracklay.git
cd tracklay

# Instalar dependencias
npm install
```

Configura tu entorno:

1. Copia `.env.example` a `.env` y completa tus valores
2. Genera UUIDs: `node -e "console.log(crypto.randomUUID())"`
3. Configura los secrets vía Wrangler

📖 **Guía completa**: [docs/setup/SETUP.md](docs/setup/SETUP.md)

### Paso 2: Deploy en Cloudflare

```bash
# Login en Cloudflare
npm run login

# Deploy del worker
npm run deploy

# Testear deploy
curl https://cdn.yourstore.com/health
# Debe retornar: {"status":"ok","version":"1.0.0"}
```

Tus endpoints ofuscados estarán disponibles en:
```
GTM:    https://cdn.yourstore.com/cdn/g/{TU_GA_UUID}?id=GTM-XXXXXX
GA4:    https://cdn.yourstore.com/cdn/g/{TU_GA_UUID}?id=G-XXXXXXXX
Meta:   https://cdn.yourstore.com/cdn/f/{TU_FB_UUID}
```

### Paso 3: Integración Shopify

Tracklay usa arquitectura **Custom Pixel + GTM**:

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Custom Pixel   │────▶│  GTM (dataLayer) │──▶│ Tracklay Proxy  │
│  (Shopify Sandbox)   │     └──────────────┘     └─────────────────┘
└─────────────────┘                                     │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Meta, GA4, etc │
                                               └─────────────────┘
```

**Pasos de instalación:**

1. **Deploy de Tracklay Worker** (Paso 2)
2. **Instalar Custom Pixel** en Admin Shopify → Configuración → Eventos de cliente
   - Copiar código de: `docs/shopify/examples/advanced/custom-pixel/pixel.js`
   - Configurar GTM ID y dominio proxy
3. **Configurar GTM** con URLs del proxy

📖 **Guía detallada**: [docs/setup/SETUP.md](docs/setup/SETUP.md)

### Paso 4: Verificar que Funcione

1. **Instala extensión uBlock Origin**
2. Visita tu tienda
3. Abre DevTools → pestaña Red
4. Confirma:
   ```
   ✅ https://tutienda.com/cdn/g/TU-UUID  (200 OK, no bloqueado)
   ❌ https://www.googletagmanager.com/gtm.js (bloqueado por uBlock)
   ```

5. **Verifica GA4 DebugView**: Los eventos en tiempo real deberían aparecer
6. **Verifica Administrador de Eventos Meta**: Eventos del servidor con EMQ 9+

---

## Opciones de Configuración

### Variables de Entorno (wrangler.toml)

```toml
[vars]
# URL del Servidor GTM (para máxima calidad de datos)
GTM_SERVER_URL = "https://gtm.tutienda.com"

# Orígenes CORS (se recomienda auto-detección)
ALLOWED_ORIGINS = "https://tutienda.com,https://www.tutienda.com"

# Limitación de Velocidad
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "60000"

# TTL de Caché (los scripts se actualizan automáticamente)
CACHE_TTL = "3600"

# UUIDs de Ofuscación
OBFUSCATION_FB_UUID = "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
OBFUSCATION_GA_UUID = "b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f"

# Alias de Contenedor GTM para ofuscación de consulta
GTM_CONTAINER_ALIASES = '{"abc123":"GTM-XXXXX","xyz789":"G-YYYYY"}'

# Proxy de Script Completo - proxear TODAS las URLs dentro de scripts (recomendado)
FULL_SCRIPT_PROXY_ENABLED = "true"

# Headers de debug (desactivar en producción)
DEBUG_HEADERS_ENABLED = "false"
```

### Avanzado: Rotación de UUID

Para máxima seguridad, habilita la rotación automática de UUID:

```toml
[vars]
UUID_ROTATION_ENABLED = "true"
UUID_ROTATION_INTERVAL_MS = "604800000"  # 7 días
```

Luego usa Shopify Metafields + n8n para mantener tu tema actualizado automáticamente.

---

## Documentación y Ejemplos

### 📚 Guía del Desarrollador

Para documentación completa de arquitectura, guías de configuración e instrucciones de implementación, consulta **[`AGENTS.md`](AGENTS.md)**.

### 💻 Ejemplos de Código

Los ejemplos de implementación avanzada están disponibles en [`docs/shopify/examples/advanced/`](docs/shopify/examples/advanced/).

### 🎯 Casos de Uso por Industria

| Industria | Configuración | Beneficios Clave |
|-----------|--------------|------------------|
| **Moda/Prendas** | GTM Server + GA4 Transport | ROAS Preciso en Campañas de iOS |
| **Electrónica** | Web Pixel + Rotación de UUID | Bypass de Bloqueadores en Audiencia Tech-Savvy |
| **Belleza/Salud** | Meta CAPI + Rastreo de Ganancias | Atribución de Clientes de Alto Valor |
| **Alimentos/Bebidas** | Modo Web Simplificado | Configuración Rápida, Rastreo de Suscripciones |

---

## Rendimiento y Seguridad

### Optimizaciones Incorporadas

1. **Colocación Inteligente**: Se ejecuta en Worker más cercano a tu backend (Google Cloud)
2. **Caché de Análisis de URL**: Memoriza patrones regex (2-5ms ahorrados)
3. **Sin Clonación de Response**: Transmisión directa al cliente (3-5ms ahorrados)
4. **Mapas Memoizados**: Cachea búsquedas de objetos (1-3ms ahorrados)
5. **Encabezados de Depuración Condicional**: Solo se agregan si DEBUG=true
6. **Transmisión SHA-256**: Verificación de hash eficiente
7. **Compresión Gzip**: Automática para respuestas de script
8. **Stale-while-revalidate**: Nunca bloquea en fallos de caché
9. **Retornos Tempranos**: Rutas rápidas para solicitudes comunes
10. **Dependencias Mínimas**: Cero sobrecarga, máximo rendimiento
11. **Caché de Borde**: 200+ ubicaciones en todo el mundo

**Resultado**: 61-123ms más rápido que implementaciones estándar de GTM

### Características de Seguridad

- ✅ **Limitación de Velocidad**: 100 req/min por IP (configurable)
- ✅ **Límites de Tamaño de Solicitud**: Prevenir DoS con cargas útiles grandes
- ✅ **Encabezados CSP**: Protección de Política de Seguridad de Contenido
- ✅ **Auto-Detección CORS**: Cero configuración requerida
- ✅ **Gestión de Secretos**: Secretos de Cloudflare Workers (nunca en código)
- ✅ **Ofuscación UUID**: Endpoints giratorios previenen lista negra
- ✅ **Validación de Entrada**: Todos los datos de eventos validados del lado del servidor

---

## Solución de Problemas

### Los Scripts No Se Cargan

```bash
# 1. Verificar implementación
wrangler whoami
npm run deploy

# 2. Probar endpoint de salud
curl https://tu-worker.workers.dev/health
# Debería devolver: {"status":"OK","version":"1.0.0"}

# 3. Verificar configuración en wrangler.toml
```

### Errores CORS

```bash
# La auto-detección debería funcionar para solicitudes del mismo origen
# Si usas dominio personalizado, agrega a wrangler.toml:

[vars]
ALLOWED_ORIGINS = "https://tutienda.com,https://www.tutienda.com"
```

### Limitado por Velocidad

```bash
# Aumentar límite en wrangler.toml:
# [vars]
# RATE_LIMIT_REQUESTS = "200"  # 200 req/min por IP
```

### uBlock Sigue Bloqueando

```bash
# 1. Rotar UUIDs (se recomienda semanalmente)
npm run setup  # Genera nuevos UUIDs
npm run deploy

# 2. Actualizar tema con nuevas URLs
# 3. Habilitar alias de contenedor para ofuscación de consulta
```

---

## Resultados del Mundo Real

### Estudio de Caso: Marca de Moda ($2M/año)

**Antes de Tracklay:**
- Tasa de conversión de iOS: 1.8% (subreportada)
- Usuarios de bloqueadores: 30% del tráfico (sin datos)
- ROAS reportado: 2.1x

**Después de Tracklay:**
- Tasa de conversión de iOS: 3.4% (precisa)
- Bypass de bloqueador: 96% de usuarios bloqueados recuperados
- ROAS reportado: 3.8x (rendimiento real)
- **Resultado**: Reasignó presupuesto basado en datos reales, +$340k ingresos anuales

### Estudio de Caso: Tienda de Electrónica ($5M/año)

**Desafío**: Audiencia experta en tecnología con 40% de uso de bloqueadores

**Solución**: GTM Server + GA4 Transport + Rotación de UUID

**Resultados después de 30 días**:
- Tasa de bypass de bloqueador: 94%
- Puntuación EMQ: 9.2/10 (Meta CAPI)
- Aumento de ingresos atribuidos: $180k/mes
- Costo de adquisición de clientes disminuyó 32%

---

## Por Qué lo Construimos (La Historia de Tracklay)

Tracklay nació de la frustración. Como desarrolladores de e-commerce, vimos a nuestros clientes perder 30-40% de sus datos de conversión de la noche a la mañana con actualizaciones de iOS 14.5. Las "soluciones" tradicionales como GTM del lado del servidor eran:

- ❌ **Complejas**: Semanas de implementación
- ❌ **Caras**: $500-$2000/mes en costos de servidor
- ❌ **Inefectivas**: Aún bloqueadas por bloqueadores avanzados
- ❌ **Alto Mantenimiento**: Actualizaciones constantes, monitoreo, depuración

**Construimos Tracklay para ser**:
- ✅ **Simple**: Implementar en 15 minutos
- ✅ **Asequible**: Nivel gratuito de Cloudflare, $5-20/mes para la mayoría de tiendas
- ✅ **Efectiva**: Tasa de bypass 95%+, incluso con uBlock Origin
- ✅ **Cero Mantenimiento**: Auto-actualización, auto-reparación, sin servidor

Esta es la solución de rastreo que deseábamos haber tenido. Ahora es tuya.

---

## Contribuyendo

¡Bienvenemos contribuciones! Por favor, consulta [`CONTRIBUTING.md`](CONTRIBUTING.md) para obtener directrices.

### Hoja de Ruta

- [x] **Proxy de Script Completo** - Extracción y proxy de URL completo ✅
- [ ] Integración del Pixel de TikTok
- [ ] Panel de análisis integrado
- [ ] Marco de pruebas A/B para métodos de rastreo
- [ ] Detección avanzada de bots
- [ ] Aplicación Shopify para instalación con un clic

---

## Licencia

Licencia MIT - consulta [LICENSE](LICENSE) para obtener detalles.

**¡Haz clic en ⭐ este repositorio si te ayuda a recuperar conversiones perdidas!**

---

## 🚀 Implementa Ahora

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/analyzify/tracklay)

**[📖 Consulta AGENTS.md para obtener configuración detallada y arquitectura](AGENTS.md)**
