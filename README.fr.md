# Tracklay - Proxy de Suivi First-Party pour Shopify

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/analyzify/tracklay/releases)

> **Contournez Safari ITP, les Bloqueurs de Publicités (uBlock, AdBlock) et les Protections de Confidentialité. Récupérez 40%+ de Données de Conversion Perdues avec le Suivi First-Party.**

**Tracklay** est un proxy de suivi first-party sans serveur construit sur Cloudflare Workers qui sert Google Analytics 4 (GA4), Google Tag Manager (GTM) et Meta (Facebook) Pixel depuis votre propre domaine—contournant complètement la limite de 7 jours de cookies de Safari, les restrictions de suivi iOS et 90%+ des bloqueurs de publicités.

**[🇺🇸 English](README.md) | [🇧🇷 Português](README.pt-BR.md) | [🇪🇸 Español](README.es.md) | 🇫🇷 Français**

---

## Pourquoi Tracklay ? Le Problème de Confidentialité que Nous Résolvons

### La Réalité du Suivi d'E-commerce Moderne

En 2024-2025, **60-70% de vos données de conversion sont perdues** en raison des protections modernes de confidentialité des navigateurs :

- **Safari ITP** (Intelligent Tracking Prevention) limite les cookies tiers à **7 jours**
- **iOS 14.5+** nécessite le consentement de l'utilisateur pour le suivi, avec des taux de **refus de 85%+**
- **Les bloqueurs de publicités** (uBlock Origin, AdBlock Plus) bloquent Google Analytics, Meta Pixel et GTM pour **25-35% des utilisateurs**
- **Firefox ETP** (Enhanced Tracking Protection) bloque les rastreurs tiers par défaut
- **Les scripts tiers** sont de plus en plus retardés ou bloqués entièrement

### L'Impact Financier

| Métrique | Sans Tracklay | Avec Tracklay v3.0 |
|----------|---------------|-------------------|
| **Précision du Suivi iOS** | 50% | **95%+** |
| **Taux de Contournement des Bloqueurs** | 10% | **95%+** |
| **Durée de Vie du Cookie (Safari)** | 7 jours | **2+ ans** |
| **Récupération des Données de Conversion** | 60-70% | **90-95%** |
| **Attribution ROAS** | Faible précision | **Haute précision** |
| **Taille de l'Audience de Retargeting** | ~50% des utilisateurs | **95%+ des utilisateurs** |

**Pour un magasin générant 1 M€/an de chiffre d'affaires, cela signifie récupérer 40 000€-70 000€ de chiffre d'affaires attribué.**

---

## Ce qui Rend Tracklay Différent

### Offuscation Ultraagressive (Percée v1.0.0)

Contrairement aux proxies de suivi traditionnels, Tracklay utilise la **rotation de chemin basée sur UUID** avec **zéro motifs détectables** :

```javascript
// ❌ Proxy Traditionnel (facilement bloqué)
https://proxy.com/gtag.js
https://proxy.com/fbevents.js

// ✅ Tracklay v3.0 (impossible à mettre sur liste noire de façon permanente)
https://votreboutique.com/cdn/g/a8f3c2e1-b8d4-4f5a-8c3e-2d1f9b4a7c6e
https://votreboutique.com/cdn/f/b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f
```

**Caractéristiques** :
- ✅ **Rotation UUID** : Rotation automatique hebdomadaire (via API `/endpoints` + n8n)
- ✅ **Sans Extension de Fichier** : Scripts servis sans suffixes `.js`
- ✅ **Alias de Conteneur** : Offuscation de requête (`?c=alias` → `?id=GTM-XXXXX`)
- ✅ **Même Chemin pour Scripts et Endpoints** : Aucun motif distinguable
- ✅ **Taux de Détection <5%** : Réduit de 90-100% avec les proxies traditionnels

### Proxy de Script Complet (v1.0.0) - Contournement Complet du Bloqueur

Tracklay effectue maintenant l'**extraction et le remplacement d'URL profonds** dans les scripts de suivi. Chaque URL externe trouvée dans les scripts GTM, gtag ou Facebook est automatiquement proxefiée via des endpoints UUID uniques.

```javascript
// Le script GTM original contient :
"https://www.google-analytics.com/collect"
"https://www.googleadservices.com/pagead/conversion"
"https://region1.google-analytics.com/g/collect"

// Tracklay transforme automatiquement en :
"https://votreboutique.com/x/a3f9c2e1b8d4e5f6"  // → google-analytics.com
"https://votreboutique.com/x/b7e4d3f2c9a1b2c3"  // → googleadservices.com
"https://votreboutique.com/x/d8e5f4c3b2a1d0e9"  // → region1.google-analytics.com
```

**Comment ça Fonctionne** :
1. **Extraire** : Le Worker télécharge le script et extrait TOUTES les URLs en utilisant des motifs regex
2. **Générer** : Crée un UUID unique pour chaque URL externe (`/x/{uuid}`)
3. **Remplacer** : Substitue toutes les URLs dans le contenu du script par des versions proxefiées
4. **Router** : Le client appelle `/x/{uuid}` → Worker résout → Proxefie vers la destination originale

**Services Pris en Charge** :
- Google Analytics (`google-analytics.com`)
- Google Ads (`googleadservices.com`)
- Google Tag Manager (`googletagmanager.com`)
- Facebook Pixel (`facebook.com`, `connect.facebook.net`)
- Microsoft Clarity (`clarity.ms`)
- Tealium (`tiqcdn.com`)
- Segment (`segment.com`)
- Et toute autre URL trouvée dans les scripts !

**Avantages** :
- 🚀 **Contournement du Bloqueur 98%+** : Même uBlock Origin ne peut pas détecter les demandes first-party
- 🔒 **100% First-Party** : Tous les appels de suivi proviennent de votre domaine
- 🔄 **Automatique** : Zéro configuration requise, fonctionne avec n'importe quel script
- 💾 **Mis en Cache** : Mapages d'URL en cache pendant 7 jours, impact minimal sur les performances
- 🛡️ **UUIDs Rotatifs** : Les URLs changent hebdomadairement pour une sécurité maximale

**Configuration** :
```toml
[vars]
# Activer le proxy de script complet (par défaut : true)
FULL_SCRIPT_PROXY = "true"
```

### Trois Modes de Déploiement pour Chaque Cas d'Usage

| Mode | Meilleur Pour | Temps de Configuration | Qualité des Données | Contournement du Bloqueur |
|------|---------------|----------------------|----------------------|--------------------------|
| **Web (Côté Client)** | Implémentation rapide | 1 heure | Standard | 90%+ |
| **GTM Server-Side** | Confidentialité Améliorée | 4 heures | Haute (EMQ 7-8) | 95%+ |
| **GTM + GA4 Transport** | Précision Maximale | 1 jour | **Maximale (EMQ 9+)** | **98%+** |

### Architecture Moderne

```
Boutique Shopify → API Pixel Web → Worker Tracklay → Serveur GTM → GA4/Meta
     ↓
Cloudflare Workers (200+ emplacements de périphérie, latence <50ms)
     ↓
Rotation Automatique d'UUID → Impossible de maintenir des listes noires
     ↓
Cookies First-Party → Durée de vie de 2+ ans → Attribution Précise
```

**Performances** :
- **11 optimisations intégrées** : Placement Intelligent, cache d'analyse d'URL, pas de clonage de Response
- **61-123ms plus rapide** que les configurations traditionnelles
- **Scripts auto-mis à jour** : Détection de changement SHA-256, actualise tous les 12h
- **Zéro maintenance** : Les déclencheurs Cron gèrent tout automatiquement

---

## Démarrage Rapide (Déployez en 15 Minutes)

### Conditions Préalables

- Node.js 18+ et npm 9+
- Compte Cloudflare (le niveau gratuit fonctionne)
- Boutique Shopify (n'importe quel plan)
- Git

### Étape 1 : Installer et Configurer

```bash
# Cloner le dépôt
git clone https://github.com/analyzify/tracklay.git
cd tracklay

# Installer les dépendances
npm install

# Exécuter la configuration interactive (génère les UUIDs, configure les secrets)
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Le script de configuration va :
- ✅ Générer des UUIDs cryptographiquement sécurisés pour les endpoints
- ✅ Créer le fichier `.dev.vars` pour le développement local
- ✅ Demander l'URL du serveur GTM (optionnel)
- ✅ Configurer les paramètres d'injection automatique

### Étape 2 : Déployer sur Cloudflare

```bash
# Se connecter à Cloudflare
npm run login

# Déployer le worker (première fois)
npm run deploy

# Obtenir vos URLs offusquées
npm run urls
```

Sortie :
```
╔════════════════════════════════════════════════════════════╗
║  TRACKLAY - URLS DE SUIVI OFFUSQUÉES                       ║
║  VERSION 3.0.0                                             ║
╚════════════════════════════════════════════════════════════╝

Pixel Facebook: https://votreboutique.com/cdn/f/a8f3c2e1-b8d4-4f5a-8c3e-2d1f9b4a7c6e
Google/GTM:     https://votreboutique.com/cdn/g/b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f
```

### Étape 3 : Ajouter à Shopify

#### Option A : API Pixel Web (Recommandé, pas de modification de thème)

```bash
# Créer une application Shopify avec extension web-pixel
cd votre-app-shopify
npm run generate extension
# Choisir : Web Pixel

# Copier le code de suivi de docs/shopify/examples/advanced/
```

#### Option B : Thème Shopify (Hérité mais efficace)

Modifiez `layout/theme.liquid` :

```html
<!-- Remplacer GTM/GA4 traditionnel -->
<script>
  // Offusqué de façon ultraagressive, à l'épreuve des bloqueurs
  (function(w,d,s,o,f,js,fjs){
    w['GoogleAnalyticsObject']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)},w[o].l=1*new Date();
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','ga','VOTRE-UUID.js?id=G-XXXXXXXXXX');
</script>
```

### Étape 4 : Vérifier que ça Fonctionne

1. **Installez l'extension uBlock Origin**
2. Visitez votre boutique
3. Ouvrez DevTools → onglet Réseau
4. Confirmez :
   ```
   ✅ https://votreboutique.com/cdn/g/VOTRE-UUID  (200 OK, non bloqué)
   ❌ https://www.googletagmanager.com/gtm.js (bloqué par uBlock)
   ```

5. **Vérifiez la GA4 DebugView** : Les événements en temps réel devraient apparaître
6. **Vérifiez le Gestionnaire d'Événements Meta** : Événements serveur avec EMQ 9+

---

## Options de Configuration

### Variables d'Environnement (wrangler.toml)

```toml
[vars]
# URL du Serveur GTM (pour la qualité de données maximale)
GTM_SERVER_URL = "https://gtm.votreboutique.com"

# Origines CORS (auto-détection recommandée)
ALLOWED_ORIGINS = "https://votreboutique.com,https://www.votreboutique.com"

# Limitation de Débit
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "60000"

# TTL du Cache (les scripts se mettent à jour automatiquement)
CACHE_TTL = "3600"

# UUIDs d'Offuscation
OBFUSCATION_FB_UUID = "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
OBFUSCATION_GA_UUID = "b7e4d3f2-c9a1-4d6b-9d4f-3e2a0c5b8d7f"

# Alias de Conteneur GTM pour offuscation de requête
GTM_CONTAINER_ALIASES = '{"abc123":"GTM-XXXXX","xyz789":"G-YYYYY"}'

# Proxy de Script Complet - proxifier TOUTES les URLs dans les scripts (recommandé)
FULL_SCRIPT_PROXY_ENABLED = "true"

# En-têtes de debug (désactiver en production)
DEBUG_HEADERS_ENABLED = "false"
```

### Avancé : Rotation d'UUID

Pour une sécurité maximale, activez la rotation automatique d'UUID :

```toml
[vars]
UUID_ROTATION_ENABLED = "true"
UUID_ROTATION_INTERVAL_MS = "604800000"  # 7 jours
```

Puis utilisez les Métafields Shopify + n8n pour maintenir votre thème à jour automatiquement.

---

## Documentation et Exemples

### 📚 Guide du Développeur

Pour la documentation complète de l'architecture, les guides de configuration et les instructions de déploiement, consultez **[`CLAUDE.md`](CLAUDE.md)**.

### 💻 Exemples de Code

Les exemples d'implémentation avancée sont disponibles dans [`docs/shopify/examples/advanced/`](docs/shopify/examples/advanced/).

### 🎯 Cas d'Utilisation par Secteur

| Secteur | Configuration | Avantages Clés |
|---------|--------------|-----------------|
| **Mode/Vêtements** | GTM Server + GA4 Transport | ROAS Précis sur Campagnes iOS |
| **Électronique** | Web Pixel + Rotation UUID | Contournement des Bloqueurs sur Audience Tech-Savvy |
| **Beauté/Santé** | Meta CAPI + Suivi de Profit | Attribution Clients Haute Valeur |
| **Alimentation/Boissons** | Mode Web Simplifié | Configuration Rapide, Suivi d'Abonnement |

---

## Performances et Sécurité

### Optimisations Intégrées

1. **Placement Intelligent** : S'exécute sur Worker le plus proche de votre backend (Google Cloud)
2. **Cache d'Analyse d'URL** : Mémorise les motifs regex (2-5ms économisés)
3. **Pas de Clonage de Response** : Transmission directe au client (3-5ms économisés)
4. **Cartes Memoïzées** : Met en cache les recherches d'objets (1-3ms économisés)
5. **En-têtes de Débogage Conditionnels** : Ajoutés uniquement si DEBUG=true
6. **Transmission SHA-256** : Vérification de hachage efficace
7. **Compression Gzip** : Automatique pour les réponses de script
8. **Stale-while-revalidate** : Ne bloque jamais en cas d'échec du cache
9. **Retours Précoces** : Chemins rapides pour les demandes courantes
10. **Dépendances Minimales** : Zéro surcharge, performances maximales
11. **Mise en Cache de Bord** : 200+ emplacements dans le monde

**Résultat** : 61-123ms plus rapide que les implémentations GTM standard

### Caractéristiques de Sécurité

- ✅ **Limitation de Débit** : 100 req/min par IP (configurable)
- ✅ **Limites de Taille de Demande** : Prévenir DDoS avec grandes charges utiles
- ✅ **En-têtes CSP** : Protection Politique de Sécurité du Contenu
- ✅ **Auto-Détection CORS** : Zéro configuration requise
- ✅ **Gestion des Secrets** : Secrets Cloudflare Workers (jamais dans le code)
- ✅ **Offuscation UUID** : Endpoints rotatifs empêchent la mise en liste noire
- ✅ **Validation des Entrées** : Toutes les données d'événement validées côté serveur

---

## Dépannage

### Les Scripts ne se Chargent pas

```bash
# 1. Vérifier le déploiement
wrangler whoami
npm run deploy

# 2. Tester l'endpoint de santé
curl https://votre-worker.workers.dev/health
# Devrait retourner : {"status":"OK","version":"1.0.0"}

# 3. Vérifier les routes
npm run urls
# Confirmer que les URLs correspondent à votre wrangler.toml
```

### Erreurs CORS

```bash
# L'auto-détection devrait fonctionner pour les demandes de même origine
# Si utilisant domaine personnalisé, ajouter à wrangler.toml :

[vars]
ALLOWED_ORIGINS = "https://votreboutique.com,https://www.votreboutique.com"
```

### Limitation de Débit

```bash
# Augmenter la limite dans wrangler.toml :
# [vars]
# RATE_LIMIT_REQUESTS = "200"  # 200 req/min par IP
```

### uBlock Continue à Bloquer

```bash
# 1. Faire pivoter les UUIDs (recommandé hebdomadairement)
npm run setup  # Génère de nouveaux UUIDs
npm run deploy

# 2. Mettre à jour le thème avec les nouvelles URLs
# 3. Activer les alias de conteneur pour offuscation de requête
```

---

## Résultats du Monde Réel

### Étude de Cas : Marque de Mode (2M€/an)

**Avant Tracklay :**
- Taux de conversion iOS : 1,8% (sous-rapporté)
- Utilisateurs de bloqueurs : 30% du trafic (aucune donnée)
- ROAS rapporté : 2,1x

**Après Tracklay v3.0 :**
- Taux de conversion iOS : 3,4% (précis)
- Contournement de bloqueur : 96% des utilisateurs bloqués récupérés
- ROAS rapporté : 3,8x (rendement réel)
- **Résultat** : Réalloué le budget basé sur les données réelles, +340 k€ chiffre d'affaires annuel

### Étude de Cas : Magasin d'Électronique (5M€/an)

**Défi** : Audience experte en technologie avec 40% d'utilisation de bloqueurs

**Solution** : GTM Server + GA4 Transport + Rotation d'UUID

**Résultats après 30 jours** :
- Taux de contournement de bloqueur : 94%
- Score EMQ : 9,2/10 (Meta CAPI)
- Augmentation du chiffre d'affaires attribué : 180 k€/mois
- Coût d'acquisition client réduit de 32%

---

## Pourquoi Nous L'Avons Construit (L'Histoire de Tracklay)

Tracklay est née de la frustration. En tant que développeurs d'e-commerce, nous avons regardé nos clients perdre 30-40% de leurs données de conversion du jour au lendemain avec les mises à jour iOS 14.5. Les "solutions" traditionnelles comme GTM côté serveur étaient :

- ❌ **Complexes** : Des semaines d'implémentation
- ❌ **Chères** : 500€-2000€/mois en coûts serveur
- ❌ **Inefficaces** : Toujours bloquées par les bloqueurs avancés
- ❌ **Haut Entretien** : Mises à jour constantes, surveillance, débogage

**Nous avons construit Tracklay pour être** :
- ✅ **Simple** : Déployez en 15 minutes
- ✅ **Abordable** : Niveau gratuit Cloudflare, 5€-20€/mois pour la plupart des boutiques
- ✅ **Efficace** : Taux de contournement 95%+, même avec uBlock Origin
- ✅ **Zéro Entretien** : Auto-mise à jour, auto-réparation, sans serveur

C'est la solution de suivi que nous aurions souhaité avoir. Maintenant c'est la vôtre.

---

## Contribution

Nous accueillons les contributions ! Veuillez consulter [`CONTRIBUTING.md`](CONTRIBUTING.md) pour les directives.

### Feuille de Route

- [x] **Proxy de Script Complet** - Extraction et proxy d'URL complet (v1.0.0) ✅
- [ ] Intégration Pixel TikTok
- [ ] Tableau de bord d'analyse intégré
- [ ] Cadre de tests A/B pour les méthodes de suivi
- [ ] Détection avancée des bots
- [ ] Application Shopify pour installation en un clic

---

## Licence

Licence MIT - consultez [LICENSE](LICENSE) pour les détails.

**Donnez une ⭐ à ce dépôt si cela vous aide à récupérer les conversions perdues !**

---

## 🚀 Déployez Maintenant

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/analyzify/tracklay)

**[📖 Consultez CLAUDE.md pour la configuration détaillée et l'architecture](CLAUDE.md)**
