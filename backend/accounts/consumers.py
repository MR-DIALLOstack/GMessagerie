import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone
from urllib.parse import parse_qs
from django.conf import settings
import jwt

from .models import Message

# Consommateur WebSocket gérant:
# - l'authentification par jeton (JWT) passé en query string
# - la présence (utilisateurs en ligne / hors ligne)
# - la diffusion des messages en temps réel et des accusés (delivered/read)
class ChatConsumer(AsyncJsonWebsocketConsumer):
    ONLINE_USERS = set()

    async def connect(self):
        """Établit la connexion WebSocket.
        Étapes:
        1) Récupérer le token JWT depuis la query string et authentifier l'utilisateur
        2) Ajouter la socket aux groupes (groupe utilisateur et groupe présence)
        3) Envoyer un instantané des utilisateurs en ligne et notifier la présence en ligne
        """
        # Authenticate via token query param
        query = parse_qs(self.scope.get('query_string', b'').decode())
        token = (query.get('token') or [None])[0]
        if not token:
            await self.close()
            return
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            User = get_user_model()
            self.user = await self._get_user(User, user_id)
            if not self.user:
                await self.close()
                return
        except Exception:
            await self.close()
            return

        self.user_group = f"user_{self.user.id}"
        self.presence_group = "presence"
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.channel_layer.group_add(self.presence_group, self.channel_name)
        await self.accept()
        # L'utilisateur vient de se connecter: on le marque comme en ligne (mémoire locale du processus)
        ChatConsumer.ONLINE_USERS.add(self.user.id)
        # Envoyer au client la liste courante des utilisateurs en ligne
        try:
            await self.send_json({
                'type': 'presence_snapshot',
                'online_user_ids': list(ChatConsumer.ONLINE_USERS),
            })
        except Exception:
            pass
        await self.channel_layer.group_send(
            self.presence_group,
            {"type": "presence.update", "user_id": self.user.id, "online": True, "last_seen": None}
        )

    async def disconnect(self, code):
        """Nettoie la connexion: quitte les groupes et diffuse l'événement hors-ligne.

        Met à jour ON/OFF et envoie un `presence_update` avec `last_seen`.
        """
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        if hasattr(self, 'presence_group'):
            await self.channel_layer.group_discard(self.presence_group, self.channel_name)
        # Marquer l'utilisateur comme hors-ligne avec l'horodatage
        if hasattr(self, 'user'):
            ChatConsumer.ONLINE_USERS.discard(self.user.id)
            await self.channel_layer.group_send(
                "presence",
                {"type": "presence.update", "user_id": self.user.id, "online": False, "last_seen": timezone.now().isoformat()}
            )

    async def receive_json(self, content, **kwargs):
        """Router des messages entrants envoyés par le client.

        - `send_message`: envoyer un message au destinataire
        - `read_ack`: accusé de lecture pour un message
        """
        msg_type = content.get('type')
        if msg_type == 'send_message':
            await self._handle_send_message(content)
        elif msg_type == 'read_ack':
            await self._handle_read_ack(content)

    async def _handle_send_message(self, content):
        """Persiste le message et le diffuse aux deux utilisateurs (émetteur et destinataire).

        Met également à jour l'état "delivered" si le destinataire est en ligne.
        """
        to = content.get('to')
        text = content.get('content')
        if not to or not text:
            return
        # Persist message
        message = await self._create_message(self.user.id, to, text)
        data = {
            'id': message.id,
            'from': message.sender_id,
            'to': message.receiver_id,
            'content': message.content,
            'created_at': message.created_at.isoformat(),
            'status': message.status,
        }
        # Notifier l'émetteur (moi)
        await self.channel_layer.group_send(f"user_{self.user.id}", {"type": "chat.message", "event": "message_created", "data": data})
        # Notifier le destinataire
        await self.channel_layer.group_send(f"user_{message.receiver_id}", {"type": "chat.message", "event": "message_created", "data": data})

        # Si le destinataire est en ligne, passer le message à l'état "delivered"
        if int(to) in ChatConsumer.ONLINE_USERS:
            from asgiref.sync import sync_to_async
            message.delivered_at = timezone.now()
            message.status = 'delivered'
            await sync_to_async(message.save)()
            delivered = {'id': message.id, 'delivered_at': message.delivered_at.isoformat(), 'status': message.status}
            await self.channel_layer.group_send(f"user_{message.sender_id}", {"type": "chat.message", "event": "message_delivered", "data": delivered})
            await self.channel_layer.group_send(f"user_{message.receiver_id}", {"type": "chat.message", "event": "message_delivered", "data": delivered})

    async def _handle_read_ack(self, content):
        """Gère l'accusé de lecture: marque comme lu si le récepteur est l'utilisateur courant."""
        msg_id = content.get('id')
        if not msg_id:
            return
        
        try:
            msg = await self._get_message(msg_id)
            if msg and msg.receiver_id == self.user.id and msg.read_at is None:
                msg.read_at = timezone.now()
                msg.status = 'read'
                await self._save_message(msg)
                data = {'id': msg.id, 'read_at': msg.read_at.isoformat(), 'status': msg.status}
                await self.channel_layer.group_send(f"user_{msg.sender_id}", {"type": "chat.message", "event": "message_read", "data": data})
                await self.channel_layer.group_send(f"user_{msg.receiver_id}", {"type": "chat.message", "event": "message_read", "data": data})
        except Exception:
            pass

    async def chat_message(self, event):
        """Transmet un événement de chat (créé/delivered/read) au client WebSocket."""
        await self.send_json({'type': event.get('event'), **event.get('data', {})})

    async def presence_update(self, event):
        """Transmet une mise à jour de présence (online/offline) au client."""
        await self.send_json({'type': 'presence_update', **{k: v for k, v in event.items() if k not in ['type']}})

    
    @staticmethod
    async def _get_user(User, user_id):
        """Récupère un utilisateur par son identifiant de façon asynchrone."""
        from asgiref.sync import sync_to_async
        try:
            return await sync_to_async(User.objects.get)(id=user_id)
        except User.DoesNotExist:
            return None

    @staticmethod
    async def _create_message(sender_id, receiver_id, content):
        """Crée un objet Message en base (appel synchronisé encapsulé)."""
        from asgiref.sync import sync_to_async
        return await sync_to_async(Message.objects.create)(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            status='sent'
        )

    @staticmethod
    async def _get_message(msg_id):
        """Charge un message par identifiant."""
        from asgiref.sync import sync_to_async
        try:
            return await sync_to_async(Message.objects.get)(id=msg_id)
        except Message.DoesNotExist:
            return None

    @staticmethod
    async def _save_message(msg):
        """Sauvegarde un message (wrap asynchrone)."""
        from asgiref.sync import sync_to_async
        await sync_to_async(msg.save)()
