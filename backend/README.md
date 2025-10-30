# Backend (Django REST + WebSocket)

API et temps réel pour GMessagerie.

## Prérequis
- Python 3.10+
- PostgreSQL 13+

## Configuration
Créer `backend/.env` (non versionné). Exemple dans `backend/.env.example`:
```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
DB_NAME=<db>
DB_USER=<user>
DB_PASSWORD=<password>
DB_HOST=<host>
DB_PORT=<port>
```

## Installation
```bash
python -m venv .venv
. .venv/bin/activate        # macOS/Linux
# .\.venv\Scripts\Activate.ps1  # Windows PowerShell

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optionnel
```

## Lancement (dev)
```bash
python manage.py runserver 0.0.0.0:8000
# ou ASGI server
# daphne -b 0.0.0.0 -p 8000 config.asgi:application
# uvicorn config.asgi:application --host 0.0.0.0 --port 8000
```

## Authentification
- JWT (le `user_id` est présent dans le payload côté frontend).
- Header: `Authorization: Bearer <token>`.

## Endpoints
- `POST /auth/login/` → obtenir le JWT.
- `GET  /messages/?with=<user_id>` → historique de conversation.
- `POST /messages/send/` → envoyer un message.
  - Texte: JSON `{ receiver, content, message_type: 'text' }`.
  - Média: `multipart/form-data` avec `receiver`, `message_type` ∈ `audio|video`, `file`.
- `GET  /users/<id>/` → profil + présence (si exposé: `online`, `last_seen`).

## WebSocket
- URL: `ws://<host>:8000/ws/chat?token=<JWT>`
- Événements sortants (exemples):
  - `message_created` `{ id, from, to, content, message_type, created_at, status }`
  - `message_delivered` `{ id }`
  - `message_read` `{ id }`
  - `presence_update` `{ user_id, online, last_seen }`
  - `presence_snapshot` `{ online_user_ids: number[] }`

## Présence & accusés
- Le serveur publie `presence_update` à la connexion/déconnexion.
- Pour accusés:
  - À la remise au destinataire → émettre `message_delivered`.
  - À la lecture → émettre `message_read`.

## Gestion des médias
- Valider type MIME et taille côté serveur.
- Stockage sur disque ou service objet (S3/MinIO) recommandé en production.

## Sécurité
- Ne pas commiter de secrets (`.env` ignoré par Git).
- En cas de fuite: rotation des secrets + nettoyage d’historique (cf. README racine).
- CORS: restreindre aux origines nécessaires.

## Tests (exemples)
```bash
pytest -q
# ou
python manage.py test
```

## Déploiement
- Utiliser un serveur ASGI (daphne/uvicorn) derrière un reverse proxy.
- Mettre en place Redis si vous utilisez Channels + layer pour le scaling.
