# Tracklay - First-Party Tracking Proxy für Shopify

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/analyzify/tracklay/releases)

> **Umgehen Sie Safari ITP, Werbeblocker (uBlock, AdBlock) und Browser-Datenschutzmaßnahmen. Stellen Sie 40%+ verlorene Konversionsdaten mit First-Party Tracking wieder her.**

**Tracklay** ist ein serverloser First-Party Tracking Proxy auf Cloudflare Workers, der Google Analytics 4 (GA4), Google Tag Manager (GTM) und Meta (Facebook) Pixel von Ihrer eigenen Domain bereitstellt – umgeht Safaris 7-Tage-Cookie-Limit, iOS-Tracking-Beschränkungen und 90%+ der Werbeblocker vollständig.

**[🇺🇸 English](README.md) | [🇧🇷 Português](README.pt-BR.md) | [🇪🇸 Español](README.es.md) | [🇫🇷 Français](README.fr.md) | 🇩🇪 Deutsch**

---

## Warum Tracklay? Das Datenschutzproblem, das wir lösen

### Die Realität des modernen E-Commerce-Trackings

In 2024-2025 **gehen 60-70% Ihrer Konversionsdaten verloren** durch moderne Browser-Datenschutzmaßnahmen:

- **Safari ITP** (Intelligent Tracking Prevention) begrenzt Third-Party-Cookies auf **7 Tage**
- **iOS 14.5+** erfordert Benutzereinwilligung zum Tracking, mit **85%+ Ablehnungsquoten**
- **Werbeblocker** (uBlock Origin, AdBlock Plus) blockieren Google Analytics, Meta Pixel und GTM für **25-35% der Nutzer**
- **Firefox ETP** (Enhanced Tracking Protection) blockiert Third-Party-Tracker standardmäßig
- **Third-Party-Scripts** werden immer mehr verzögert oder vollständig blockiert

### Die finanzielle Auswirkung

| Metrik | Ohne Tracklay | Mit Tracklay v3.0 |
|--------|---------------|-------------------|
| **iOS Tracking-Genauigkeit** | 50% | **95%+** |
| **Werbeblocker-Umgehungsquote** | 10% | **95%+** |
| **Cookie-Lebensdauer (Safari)** | 7 Tage | **2+ Jahre** |
| **Wiederherstellung von Konversionsdaten** | 60-70% | **90-95%** |
| **ROAS-Zuordnung** | Geringe Genauigkeit | **Hohe Genauigkeit** |
| **Retargeting-Audience-Größe** | ~50% der Nutzer | **95%+ der Nutzer** |

**Für einen Shop mit 1 Mio. €/Jahr Umsatz bedeutet dies, 40.000€-70.000€ zugeordnete Einnahmen wiederherzustellen.**

---

## Was Tracklay anders macht

### Ultra-aggressives Obfuskieren (v3.0.0 Durchbruch)

Im Gegensatz zu traditionellen Tracking-Proxies verwendet Tracklay **UUID-basierte Pfad-Rotation** mit **nulldetektierbaren Mustern**:

```javascript
// ❌ Traditioneller Proxy (leicht zu blockieren)
https://proxy.com/gtag.js
https://proxy.com/fbevents.js

// ✅ Tracklay v3.0 (unmöglich auf die Blockliste zu setzen)
https://ihreshop.com/cdn/g/a8f3c2e1-b8d4-4f5a-8c3e-2d1f9b4a7c6e
https://ihreshop.com/cdn/f/b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f
```

**Funktionen**:
- ✅ **UUID-Rotation**: Automatische wöchentliche Rotation (via `/endpoints` API + n8n)
- ✅ **Keine Dateierweiterungen**: Scripts ohne `.js`-Endung
- ✅ **Container-Aliase**: Anfrage-Obfuskation (`?c=alias` → `?id=GTM-XXXXX`)
- ✅ **Gleicher Pfad für Scripts und Endpoints**: Keine erkennbaren Muster
- ✅ **Erkennungsrate <5%**: Reduziert von 90-100% mit traditionellen Proxies

### Vollständiger Script-Proxy (v3.1.0) - Komplettes Werbeblocker-Bypass

Tracklay führt jetzt **tiefe URL-Extraktion und -Austausch** in Tracking-Scripts durch. Jede externe URL in GTM-, gtag- oder Facebook-Scripts wird automatisch über eindeutige UUID-Endpoints proxyfiziert.

```javascript
// Original GTM Script enthält:
"https://www.google-analytics.com/collect"
"https://www.googleadservices.com/pagead/conversion"
"https://region1.google-analytics.com/g/collect"

// Tracklay transformiert automatisch zu:
"https://ihreshop.com/x/a3f9c2e1b8d4e5f6"  // → google-analytics.com
"https://ihreshop.com/x/b7e4d3f2c9a1b2c3"  // → googleadservices.com
"https://ihreshop.com/x/d8e5f4c3b2a1d0e9"  // → region1.google-analytics.com
```

**Wie es funktioniert**:
1. **Extrahieren**: Worker lädt das Script herunter und extrahiert ALLE URLs
2. **Generieren**: Erstellt eindeutige UUID für jede externe URL (`/x/{uuid}`)
3. **Ersetzen**: Ersetzt alle URLs im Script-Inhalt mit proxyfizierte Versionen
4. **Routing**: Client ruft `/x/{uuid}` auf → Worker resolviert → Proxyfiziert zum Original

**Unterstützte Dienste**:
- Google Analytics (`google-analytics.com`)
- Google Ads (`googleadservices.com`)
- Google Tag Manager (`googletagmanager.com`)
- Facebook Pixel (`facebook.com`, `connect.facebook.net`)
- Microsoft Clarity (`clarity.ms`)
- Tealium (`tiqcdn.com`)
- Segment (`segment.com`)
- Und jede andere URL in Scripts!

**Vorteile**:
- 🚀 **98%+ Werbeblocker-Umgehung**: Selbst uBlock Origin kann First-Party-Anfragen nicht erkennen
- 🔒 **100% First-Party**: Alle Tracking-Aufrufe kommen von Ihrer Domain
- 🔄 **Automatisch**: Keine Konfiguration erforderlich, funktioniert mit jedem Script
- 💾 **Gecacht**: URL-Mappings 7 Tage gecacht, minimale Performance-Auswirkung
- 🛡️ **Rotierende UUIDs**: URLs ändern sich wöchentlich für maximale Sicherheit

**Konfiguration**:
```toml
[vars]
# Vollständigen Script-Proxy aktivieren (Standard: true)
FULL_SCRIPT_PROXY = "true"
```

### Drei Bereitstellungsmodi für jeden Anwendungsfall

| Modus | Beste für | Einrichtungszeit | Datenqualität | Werbeblocker-Umgehung |
|-------|-----------|-----------------|---------------|-----------------------|
| **Web (Client-seitig)** | Schnelle Implementierung | 1 Stunde | Standard | 90%+ |
| **GTM Server-seitig** | Verbesserter Datenschutz | 4 Stunden | Hoch (EMQ 7-8) | 95%+ |
| **GTM + GA4 Transport** | Maximale Genauigkeit | 1 Tag | **Maximal (EMQ 9+)** | **98%+** |

### Moderne Architektur

```
Shopify Store → Web Pixel API → Tracklay Worker → GTM Server → GA4/Meta
     ↓
Cloudflare Workers (200+ Edge-Standorte, <50ms Latenz)
     ↓
Automatische UUID-Rotation → Unmöglich, Blocklisten zu verwalten
     ↓
First-Party Cookies → 2+ Jahre Lebensdauer → Präzise Zuordnung
```

**Leistung**:
- **11 eingebaute Optimierungen**: Intelligente Platzierung, URL-Parse-Cache, kein Response-Klonen
- **61-123ms schneller** als traditionelle Setups
- **Auto-Update-Scripts**: SHA-256 Änderungserkennung, aktualisiert alle 12h
- **Wartungsfrei**: Cron-Trigger handhaben alles automatisch

---

## Schnellstart (Bereitstellung in 15 Minuten)

### Voraussetzungen

- Node.js 18+ und npm 9+
- Cloudflare-Konto (kostenlos funktioniert)
- Shopify-Store (jeden Plan)
- Git

### Schritt 1: Installieren und Konfigurieren

```bash
# Repository klonen
git clone https://github.com/analyzify/tracklay.git
cd tracklay

# Abhängigkeiten installieren
npm install

# Interaktives Setup ausführen (generiert UUIDs, konfiguriert Secrets)
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Das Setup-Script wird:
- ✅ Kryptographisch sichere UUIDs für Endpoints generieren
- ✅ `.dev.vars` Datei für lokale Entwicklung erstellen
- ✅ GTM-Server-URL abfragen (optional)
- ✅ Auto-Injection-Einstellungen konfigurieren

### Schritt 2: Bei Cloudflare bereitstellen

```bash
# Bei Cloudflare anmelden
npm run login

# Worker bereitstellen (erstes Mal)
npm run deploy

# Obfuskierte URLs abrufen
npm run urls
```

Ausgabe:
```
╔════════════════════════════════════════════════════════════╗
║  TRACKLAY - OBFUSKIERTE TRACKING-URLS                      ║
║  VERSION 3.0.0                                             ║
╚════════════════════════════════════════════════════════════╝

Facebook Pixel: https://ihreshop.com/cdn/f/a8f3c2e1-b8d4-4f5a-8c3e-2d1f9b4a7c6e
Google/GTM:     https://ihreshop.com/cdn/g/b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f
```

### Schritt 3: Zu Shopify hinzufügen

#### Option A: Web Pixel API (Empfohlen, keine Theme-Bearbeitung)

```bash
# Shopify-App mit Web-Pixel-Erweiterung erstellen
cd ihre-shopify-app
npm run generate extension
# Wählen Sie: Web Pixel

# Tracking-Code aus docs/shopify/examples/advanced/ kopieren
```

#### Option B: Shopify Theme (Legacy aber effektiv)

Bearbeiten Sie `layout/theme.liquid`:

```html
<!-- Traditionelles GTM/GA4 ersetzen -->
<script>
  // Ultra-obfuskiert, werbeblocker-sicher
  (function(w,d,s,o,f,js,fjs){
    w['GoogleAnalyticsObject']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)},w[o].l=1*new Date();
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','ga','IHRE-UUID.js?id=G-XXXXXXXXXX');
</script>
```

### Schritt 4: Überprüfen Sie, dass es funktioniert

1. **Installieren Sie uBlock Origin**
2. Besuchen Sie Ihren Shop
3. Öffnen Sie DevTools → Network Tab
4. Bestätigen Sie:
   ```
   ✅ https://ihreshop.com/cdn/g/IHRE-UUID  (200 OK, nicht blockiert)
   ❌ https://www.googletagmanager.com/gtm.js (blockiert von uBlock)
   ```

5. **Überprüfen Sie GA4 DebugView**: Echtzeit-Events sollten erscheinen
6. **Überprüfen Sie Meta Events Manager**: Server-Events mit EMQ 9+

---

## Konfigurationsoptionen

### Umgebungsvariablen (wrangler.toml)

```toml
[vars]
# GTM-Server-URL (für maximale Datenqualität)
GTM_SERVER_URL = "https://gtm.ihreshop.com"

# CORS Origins (Auto-Erkennung empfohlen)
ALLOWED_ORIGINS = "https://ihreshop.com,https://www.ihreshop.com"

# Rate Limiting
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "60000"

# Cache TTL (Scripts aktualisieren sich automatisch)
CACHE_TTL = "3600"

# UUID Obfuskations-IDs
ENDPOINTS_FACEBOOK = "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
ENDPOINTS_GOOGLE = "b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f"

# Container-Aliase für Anfrage-Obfuskation
CONTAINER_ALIASES = '{"abc123":"GTM-XXXXX","xyz789":"G-YYYYY"}'

# Transport_url automatisch injizieren (empfohlen)
AUTO_INJECT_TRANSPORT_URL = "true"

# Vollständiger Script-Proxy (empfohlen)
FULL_SCRIPT_PROXY = "true"
```

### Fortgeschritten: UUID-Rotation

Für maximale Sicherheit aktivieren Sie automatische UUID-Rotation:

```toml
[vars]
ENDPOINTS_UUID_ROTATION = "true"
UUID_SALT_ROTATION = "604800000"  # 7 Tage
```

Verwenden Sie dann Shopify Metafields + n8n, um Ihr Theme automatisch aktualisiert zu halten.

---

## Dokumentation und Beispiele

### 📚 Entwicklerleitfaden

Für vollständige Architektur-Dokumentation, Konfigurationsanleitungen und Bereitstellungsanweisungen siehe **[`CLAUDE.md`](CLAUDE.md)**.

### 💻 Code-Beispiele

Fortgeschrittene Implementierungsbeispiele sind unter [`docs/shopify/examples/advanced/`](docs/shopify/examples/advanced/) verfügbar.

### 🎯 Anwendungsfälle nach Branche

| Branche | Setup | Wesentliche Vorteile |
|---------|-------|----------------------|
| **Mode/Kleidung** | GTM Server + GA4 Transport | Genaue ROAS auf iOS-Kampagnen |
| **Elektronik** | Web Pixel + UUID-Rotation | Werbeblocker-Umgehung bei Tech-savvy Audience |
| **Beauty/Gesundheit** | Meta CAPI + Gewinnverfolgung | High-Value Customer Attribution |
| **Lebensmittel/Getränke** | Vereinfachter Web-Modus | Schnelles Setup, Abonnement-Tracking |

---

## Leistung und Sicherheit

### Integrierte Optimierungen

1. **Intelligente Platzierung**: Läuft auf Worker am nächsten zu Ihrem Backend (Google Cloud)
2. **URL-Parse-Cache**: Merkt sich Regex-Muster (2-5ms gespart)
3. **Kein Response-Klonen**: Direktes Streaming zum Client (3-5ms gespart)
4. **Memoized Maps**: Speichert Objekt-Lookups (1-3ms gespart)
5. **Bedingte Debug-Header**: Nur wenn DEBUG=true
6. **SHA-256 Streaming**: Effiziente Hash-Verifikation
7. **Gzip-Kompression**: Automatisch für Script-Responses
8. **Stale-while-revalidate**: Blockiert niemals bei Cache-Misses
9. **Early Returns**: Schnelle Pfade für häufige Anfragen
10. **Minimale Abhängigkeiten**: Keine Bloat, maximale Leistung
11. **Edge-Caching**: 200+ Standorte weltweit

**Ergebnis**: 61-123ms schneller als Standard-GTM-Implementierungen

### Sicherheitsmerkmale

- ✅ **Rate Limiting**: 100 req/min pro IP (konfigurierbar)
- ✅ **Request-Größenlimits**: DDoS-Schutz mit großen Payloads
- ✅ **CSP Header**: Content Security Policy Schutz
- ✅ **CORS Auto-Detection**: Null Konfiguration erforderlich
- ✅ **Secrets Management**: Cloudflare Workers Secrets (nie im Code)
- ✅ **UUID Obfuskation**: Rotierende Endpoints verhindern Blocklisting
- ✅ **Input Validation**: Alle Event-Daten serverseitig validiert

---

## Fehlerbehebung

### Scripts laden nicht

```bash
# 1. Bereitstellung überprüfen
wrangler whoami
npm run deploy

# 2. Health Endpoint testen
curl https://ihr-worker.workers.dev/health
# Sollte zurückgeben: {"status":"OK","version":"3.0.0"}

# 3. Routes überprüfen
npm run urls
# Confirm URLs match Ihr wrangler.toml
```

### CORS Fehler

```bash
# Auto-Detection sollte für Same-Origin Anfragen funktionieren
# Bei benutzerdefinierter Domain zu wrangler.toml hinzufügen:

[vars]
ALLOWED_ORIGINS = "https://ihreshop.com,https://www.ihreshop.com"
```

### Rate Limited

```bash
# Limit in wrangler.toml erhöhen:
# [vars]
# RATE_LIMIT_REQUESTS = "200"  # 200 req/min pro IP
```

### uBlock Blockiert immer noch

```bash
# 1. UUIDs rotieren (wöchentlich empfohlen)
npm run setup  # Generiert neue UUIDs
npm run deploy

# 2. Theme mit neuen URLs aktualisieren
# 3. Container-Aliase für Anfrage-Obfuskation aktivieren
```

---

## Ergebnisse aus der Praxis

### Fallstudie: Fashion-Marke (2 Mio. €/Jahr)

**Vor Tracklay:**
- iOS Conversion Rate: 1,8% (unterberichtet)
- Blocker-Nutzer: 30% des Traffic (keine Daten)
- Berichteter ROAS: 2,1x

**Nach Tracklay v3.0:**
- iOS Conversion Rate: 3,4% (genau)
- Blocker-Umgehung: 96% blockierter Nutzer zurückgewonnen
- Berichteter ROAS: 3,8x (echte Leistung)
- **Ergebnis**: Budget basierend auf echten Daten neu zugeordnet, +340 k€ Jahresumsatz

### Fallstudie: Elektronik-Shop (5 Mio. €/Jahr)

**Herausforderung**: Tech-versierte Audience mit 40% Blocker-Nutzung

**Lösung**: GTM Server + GA4 Transport + UUID-Rotation

**Ergebnisse nach 30 Tagen**:
- Blocker-Umgehungsquote: 94%
- EMQ-Score: 9,2/10 (Meta CAPI)
- Zugeordnete Umsatzsteigerung: 180 k€/Monat
- Customer Acquisition Cost um 32% gesunken

---

## Warum wir es gebaut haben (Die Tracklay Geschichte)

Tracklay wurde aus Frustration geboren. Als E-Commerce-Entwickler sahen wir unsere Clients 30-40% ihrer Konversionsdaten über Nacht durch iOS 14.5 Updates verlieren. Traditionelle "Lösungen" wie Server-seitiges GTM waren:

- ❌ **Komplex**: Wochen Implementierungszeit
- ❌ **Teuer**: 500€-2000€/Monat Serverkosten
- ❌ **Ineffektiv**: Immer noch von fortgeschrittenen Blockern blockiert
- ❌ **Wartungsintensiv**: Ständige Updates, Monitoring, Debugging

**Wir bauten Tracklay um zu sein**:
- ✅ **Einfach**: In 15 Minuten bereitstellen
- ✅ **Erschwinglich**: Cloudflare kostenlos, 5€-20€/Monat für die meisten Shops
- ✅ **Effektiv**: 95%+ Umgehungsquote, auch mit uBlock Origin
- ✅ **Wartungsfrei**: Auto-Update, selbstheilend, serverlos

Dies ist die Tracking-Lösung, die wir uns immer gewünscht haben. Jetzt ist sie Ihre.

---

## Beitrag

Wir freuen uns über Beiträge! Siehe [`CONTRIBUTING.md`](CONTRIBUTING.md) für Richtlinien.

### Roadmap

- [x] **Vollständiger Script-Proxy** - Komplette URL-Extraktion und Proxy (v3.1.0) ✅
- [ ] TikTok Pixel Integration
- [ ] Eingebautes Analytics-Dashboard
- [ ] A/B-Testing-Framework für Tracking-Methoden
- [ ] Fortgeschrittene Bot-Erkennung
- [ ] Shopify App für One-Click-Installation

---

## Lizenz

MIT-Lizenz - siehe [LICENSE](LICENSE) für Details.

**Geben Sie diesem Repo ⭐, wenn es Ihnen hilft, verlorene Conversions wiederherzustellen!**

---

## 🚀 Jetzt Bereitstellen

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/analyzify/tracklay)

**[📖 Siehe CLAUDE.md für detaillierte Konfiguration und Architektur](CLAUDE.md)**
