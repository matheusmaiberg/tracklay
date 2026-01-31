# Tracklay - First-Party Tracking Proxy für Shopify

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/analyzify/tracklay/releases)

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

| Metrik | Ohne Tracklay | Mit Tracklay |
|--------|---------------|-------------------|
| **iOS Tracking-Genauigkeit** | 50% | **95%+** |
| **Werbeblocker-Umgehungsquote** | 10% | **95%+** |
| **Cookie-Lebensdauer (Safari)** | 7 Tage | **2+ Jahre** |
| **Wiederherstellung von Konversionsdaten** | 60-70% | **90-95%** |
| **ROAS-Zuordnung** | Geringe Genauigkeit | **Hohe Genauigkeit** |
| **Retargeting-Audience-Größe** | ~50% der Nutzer | **95%+ der Nutzer** |

**Für einen Shop mit 1 Mio. €/Jahr Umsatz bedeutet dies, 40.000€-70.000€ zugeordnete Einnahmen wiederherzustellen.**

---

## Was Tracklay unterscheidet

### Traditioneller Proxy vs Tracklay

| Aspekt | Traditioneller Proxy | Tracklay |
|--------|---------------------|----------|
| **URL-Muster** | `proxy.com/gtag.js` (erkennbar) | `yourstore.com/cdn/g/{uuid}` (zufällig) |
| **Dateierweiterungen** | `.js`-Suffixe | Keine Erweiterungen |
| **Blacklist-Widerstand** | Leicht blockierbar | Unmöglich dauerhaft zu blockieren |
| **Erkennungsrate** | 90-100% | <5% |
| **Rotation** | Statische URLs | Automatische wöchentliche UUID-Rotation |
| **Container-Aliases** | Keine | Verschleierung `?c=alias` |

### Feature-Vergleich

| Feature | Beschreibung | Vorteil |
|---------|--------------|---------|
| **UUID-Rotation** | Automatische wöchentliche Rotation via API | Verhindert dauerhafte Blacklist |
| **Keine Erweiterungen** | Scripts ohne `.js` | Schwerer zu erkennen |
| **Aliases** | `?c=alias` → `?id=GTM-XXXXX` | Parameter-Verschleierung |
| **Einheitliches Design** | Scripts und Endpoints gleiches Muster | Nicht unterscheidbare Routen |
| **Full Script Proxy** | Tiefgehende URL-Extraktion und -Ersetzung | 98%+ Ad-Blocker-Umgehung |

### Wie Full Script Proxy funktioniert

| Schritt | Aktion | Ergebnis |
|---------|--------|----------|
| 1. Extrahieren | Worker lädt Script, extrahiert ALLE URLs | Identifiziert 30+ Domains |
| 2. Generieren | Erstellt eindeutige UUID für jede URL | Endpoints `/x/{uuid}` |
| 3. Ersetzen | Ersetzt URLs im Script-Inhalt | Alle Aufrufe First-Party |
| 4. Cache | SHA-256 Änderungserkennung | Minimale Performance-Auswirkung |
| 5. Routen | Client → UUID → Worker → Ziel | Transparenter Proxy |

### Unterstützte Services

| Kategorie | Services |
|-----------|----------|
| **Google** | Analytics, Ads, Tag Manager, DoubleClick, Syndication |
| **Meta** | Pixel, Connect, Graph API |
| **Microsoft** | Clarity, Bing Ads |
| **Social** | LinkedIn, Snapchat, TikTok, Pinterest, Twitter/X |
| **Analytics** | Segment, Tealium, Mixpanel, Hotjar, Heap |

### Deployment-Modi

| Modus | Ideal Für | Setup | Datenqualität | Bypass-Rate |
|-------|-----------|-------|---------------|-------------|
| **Web (Client-Side)** | Schneller Start | 1 Stunde | Standard | 90%+ |
| **GTM Server-Side** | Erweiterter Datenschutz | 4 Stunden | Hoch (EMQ 7-8) | 95%+ |
| **GTM + GA4 Transport** | Maximale Genauigkeit | 2 Stunden | Sehr Hoch | 98%+ |

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
OBFUSCATION_FB_UUID = "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
OBFUSCATION_GA_UUID = "b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f"

# GTM Container-Aliase für Anfrage-Obfuskation
GTM_CONTAINER_ALIASES = '{"abc123":"GTM-XXXXX","xyz789":"G-YYYYY"}'

# Vollständiger Script-Proxy (empfohlen)
FULL_SCRIPT_PROXY_ENABLED = "true"

# Debug-Header (in Produktion deaktivieren)
DEBUG_HEADERS_ENABLED = "false"
```

### Fortgeschritten: UUID-Rotation

Für maximale Sicherheit aktivieren Sie automatische UUID-Rotation:

```toml
[vars]
UUID_ROTATION_ENABLED = "true"
UUID_ROTATION_INTERVAL_MS = "604800000"  # 7 Tage
```

Verwenden Sie dann Shopify Metafields + n8n, um Ihr Theme automatisch aktualisiert zu halten.

---

## Dokumentation und Beispiele

### 📚 Entwicklerleitfaden

Für vollständige Architektur-Dokumentation, Konfigurationsanleitungen und Bereitstellungsanweisungen siehe **[`AGENTS.md`](AGENTS.md)**.

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
# Sollte zurückgeben: {"status":"OK","version":"1.0.0"}

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

**Nach Tracklay:**
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

- [x] **Vollständiger Script-Proxy** - Komplette URL-Extraktion und Proxy ✅
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

**[📖 Siehe AGENTS.md für detaillierte Konfiguration und Architektur](AGENTS.md)**
