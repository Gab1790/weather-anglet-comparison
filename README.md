# 🌤️ Météo Anglet — Comparaison des sources météo

Site web qui compare les prévisions météorologiques pour **Anglet (France)** en utilisant jusqu'à **10 sources météo différentes**, côte à côte.

---

## 🚀 Démo rapide

Ouvrez simplement `index.html` dans votre navigateur — **deux sources fonctionnent sans clé API** (Open-Meteo et Météo Concept avec clé gratuite), les autres s'activent en ajoutant vos clés.

---

## ✨ Fonctionnalités

- **10 sources météo** affichées en grille de cartes
- **Tableau comparatif** côte à côte (température, ressenti, humidité, vent, pression, UV index, conditions)
- **Prévisions 7 jours** via Open-Meteo (gratuit, sans clé)
- **Résumé** : température moyenne / min / max de toutes les sources actives
- **Bascule °C / °F** en un clic
- **Panneau de configuration des clés API** — stockées dans le `localStorage` du navigateur, jamais transmises à un tiers
- **Auto-refresh** toutes les 10 minutes
- **Design responsive** dark mode — compatible desktop et mobile
- **Skeleton loading** pendant le chargement

---

## 📡 Sources météo intégrées

| # | Source | Clé requise | Plan gratuit |
|---|--------|-------------|--------------|
| 1 | [Open-Meteo](https://open-meteo.com) | ❌ Non | ✅ Totalement gratuit |
| 2 | [Météo Concept](https://api.meteo-concept.com/) | ✅ Oui | ✅ Clé gratuite |
| 3 | [OpenWeatherMap](https://openweathermap.org/appid) | ✅ Oui | ✅ 60 req/min |
| 4 | [WeatherAPI](https://www.weatherapi.com/signup.aspx) | ✅ Oui | ✅ 1M req/mois |
| 5 | [Visual Crossing](https://www.visualcrossing.com/sign-up) | ✅ Oui | ✅ 1 000 req/jour |
| 6 | [Tomorrow.io](https://app.tomorrow.io/signup) | ✅ Oui | ✅ 500 req/jour |
| 7 | [Weatherstack](https://weatherstack.com/signup/free) | ✅ Oui | ✅ 1 000 req/mois |
| 8 | [AccuWeather](https://developer.accuweather.com/) | ✅ Oui | ✅ 50 req/jour |
| 9 | [Pirate Weather](https://pirateweather.net/getting-started) | ✅ Oui | ✅ Plan gratuit |
| 10 | [Meteosource](https://www.meteosource.com/client/register) | ✅ Oui | ✅ Plan gratuit |

---

## 🏗️ Structure du projet

```
weather-anglet-comparison/
├── index.html          # Page principale
├── css/
│   └── styles.css      # Styles (dark mode responsive)
├── js/
│   ├── config.js       # Coordonnées d'Anglet + définition des 10 sources
│   ├── weather-apis.js # Intégrations API (une fonction par source)
│   └── app.js          # Logique UI, rendu, gestion des états
└── README.md
```

---

## ⚙️ Configuration des clés API

1. Ouvrez le site dans votre navigateur
2. Cliquez sur le bouton **"Configurer les clés API"** (bannière en haut)
3. Entrez vos clés pour les sources souhaitées
4. Cliquez sur **"💾 Sauvegarder"**

Les clés sont stockées dans le `localStorage` de votre navigateur (jamais envoyées à un serveur tiers).

---

## 🌍 Localisation

- **Ville** : Anglet, France
- **Latitude** : 43.4863° N
- **Longitude** : 1.5402° W (−1.5402)
- **Timezone** : Europe/Paris

---

## 🛠️ Stack technique

- **HTML5** sémantique
- **CSS3** (variables CSS, Grid, Flexbox, animations)
- **JavaScript vanilla** (ES2020+, async/await, fetch)
- Aucune dépendance externe (pas de framework, pas de build step)
- Police : [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts

---

## 📱 Compatibilité

- ✅ Chrome, Firefox, Safari, Edge (modernes)
- ✅ Desktop (1400px+)
- ✅ Tablette (768px)
- ✅ Mobile (480px)

---

## 📄 Licence

MIT — libre d'utilisation et de modification.