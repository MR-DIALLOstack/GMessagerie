"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/

Configuration ASGI du projet :
- HTTP : géré par l'application Django classique (get_asgi_application)
- WebSocket : géré par Django Channels via un routeur qui pointe sur `accounts.routing`
- Sécurisation : AllowedHostsOriginValidator applique ALLOWED_HOSTS pour les origines WS
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django_asgi_app = get_asgi_application()

# Import des routes WebSocket après l'initialisation de Django (évite les imports prématurés)
from accounts import routing as accounts_routing  # 

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        URLRouter(accounts_routing.websocket_urlpatterns)
    ),
})
