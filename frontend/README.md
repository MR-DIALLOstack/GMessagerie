# Frontend (React + MUI)

Client de messagerie temps réel.

## Prérequis
- Node.js 18+
- npm/yarn/pnpm

## Variables d’environnement (optionnel)
Créez `frontend/.env` si nécessaire:
```
REACT_APP_API_BASE=http://localhost:8000
REACT_APP_WS_BASE=ws://localhost:8000
```

## Installation
```bash
npm install
# ou
yarn install
```

## Développement
```bash
npm start
# http://localhost:3000
```

## Build production
```bash
npm run build
```

## Composants clés
- `src/Components/ChatArea.js`: connexion WS, présence, liste, envoi.
- `src/Components/Messages.js`: bulles + accusés `sent/delivered/read`.
- `src/Components/MessagesInput.js`: texte, enregistrement audio, sélection vidéo, aperçu avant envoi.

## Notes UI
- Messages sortants → à droite, bleus. Entrants → à gauche, sombre.
- Accusés:
  - 1 coche: envoyé.
  - 2 coches grises: livré.
  - 2 coches bleues: lu.

## Débogage
- Autoriser les notifications navigateur pour voir les notifications de nouveaux messages.
- Si le WS tombe, le polling REST prend le relais pour l’historique.
