# GMessagerie

Messagerie temps réel type WhatsApp, composée d’un backend Django REST + WebSocket et d’un frontend React + MUI.

## Sommaire
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Configuration des variables d’environnement](#configuration-des-variables-denvironnement)
- [Démarrage rapide](#démarrage-rapide)
- [Backend (Django/DRF + WebSocket)](#backend-djangodrf--websocket)
- [Frontend (React + MUI)](#frontend-react--mui)
- [Accusés de réception et présence](#accusés-de-réception-et-présence)
- [Gestion des médias (audio/vidéo)](#gestion-des-médias-audiovidéo)
- [Sécurité & bonnes pratiques](#sécurité--bonnes-pratiques)
- [Roadmap](#roadmap)

## Fonctionnalités
- Envoi de messages texte et médias (audio/vidéo).
- WebSocket pour la messagerie en temps réel.
- Présence en ligne et dernière activité (fallback via `last_seen`).
- Accusés de réception style WhatsApp: `sent`, `delivered`, `read` (icônes 1 coche, 2 coches grises, 2 coches bleues).
- Notifications navigateur (si autorisées) et compteur de non lus par conversation.

## Architecture
- Backend: Django REST Framework, JWT pour auth, Postgres; WebSocket (Django Channels / ASGI) pour événements temps réel.
- Frontend: React + Material UI.
- Communication:
  - REST: historique, envoi, profil utilisateur.
  - WS: `message_created`, `message_delivered`, `message_read`, `presence_update`, `presence_snapshot`.

## Prérequis
- Python 3.10+ (recommandé)
- Node.js 18+ et npm / yarn / pnpm
- PostgreSQL 13+

## Configuration des variables d’environnement
Ne JAMAIS commiter de secrets. Utilisez `.env` en local, et `.env.example` comme référence.

Backend (`backend/.env` non versionné):
```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
DB_NAME=<db>
DB_USER=<user>
DB_PASSWORD=<password>
DB_HOST=<host>
DB_PORT=<port>
```

Frontend: si besoin, créez `frontend/.env` pour les URLs:
```
REACT_APP_API_BASE=http://localhost:8000
REACT_APP_WS_BASE=ws://localhost:8000
```

## Démarrage rapide
1) Backend
- Créez et remplissez `backend/.env` (voir `.env.example`).
- Installez les dépendances Python et lancez le serveur de dev.

2) Frontend
- Installez les dépendances Node et lancez le client React.

3) Ouvrez l’app
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- WS: ws://localhost:8000/ws/chat

## Backend (Django/DRF + WebSocket)
Dans `webApp/backend`:

```bash
# Créer un venv (exemple Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
python manage.py migrate

# Créer un superuser (optionnel)
python manage.py createsuperuser

# Lancer le serveur de dev (ASGI compatible)
python manage.py runserver 0.0.0.0:8000
# Si vous utilisez daphne/uvicorn (optionnel)
# daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

Endpoints typiques:
- `POST /auth/login/` → JWT
- `GET /messages/?with=<user_id>` → historique
- `POST /messages/send/` → envoi (texte ou multipart/form-data pour médias)
- `GET /users/<id>/` → profil + présence (`online`, `last_seen` si dispo)
- WS: `ws://<host>/ws/chat?token=<JWT>` → événements temps réel

## Frontend (React + MUI)
Dans `webApp/frontend`:

```bash
npm install
npm start
# ou
# yarn install && yarn start
```

Composants clés:
- `src/Components/ChatArea.js`: logique WS, présence, envoi, rendu principal.
- `src/Components/Messages.js`: rendu des bulles et des accusés de réception.
- `src/Components/MessagesInput.js`: saisie texte, enregistrement audio, sélection vidéo, aperçu + envoi/annulation.

Variables configurables:
- `BASE_URL` (HTTP) et `WS_URL` (WS) utilisés dans `ChatArea.js`.

## Accusés de réception et présence
- Accusés: 
  - `sent` (optimiste à l’envoi),
  - `delivered` (événement WS `message_delivered`),
  - `read` (événement WS `message_read`).
- Présence:
  - Mise à jour via WS `presence_update` / `presence_snapshot`.
  - Fallback via polling `GET /users/:id/` et dérivation par `last_seen < 60s`.

## Gestion des médias (audio/vidéo)
- Audio: enregistrement via `MediaRecorder`; à l’arrêt, aperçu (pas d’envoi auto), boutons Envoyer/Annuler.
- Vidéo: sélection de fichier, aperçu, Envoyer/Annuler.
- Upload via `multipart/form-data` vers `POST /messages/send/`.

## Sécurité & bonnes pratiques
- Secrets: `.env` non versionné; `.env.example` fourni comme modèle.
- Après fuite accidentelle, révoquez/rotatez les secrets, nettoyez l’historique (effectué dans ce repo).
- JWT stocké côté client et envoyé via `Authorization: Bearer <token>`.
- Limitez la taille des fichiers uploadés et vérifiez les types MIME côté backend.

## Roadmap
- Indicateur de saisie (typing indicator).
- Conversations de groupe.
- Recherche et épinglage de messages.
- Appels audio/vidéo et chiffrement de bout en bout.

---

