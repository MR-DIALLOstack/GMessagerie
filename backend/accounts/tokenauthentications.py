import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authentication import BaseAuthentication
from django.conf import settings
from django.contrib.auth import get_user_model
from datetime import datetime, timezone
from datetime import timedelta

class JWTAuthentication(BaseAuthentication):
    """Authentication DRF basée sur un JWT court (HS256).

    - Extrait le token de l'en-tête `Authorization: Bearer ...`
    - Vérifie la signature et l'expiration
    - Récupère l'utilisateur à partir du `user_id` dans le payload
    """
    def authenticate(self, request):
        token = self.extract_token(request)
        if token:
            try:
                payload = self.verify_token(token)
                user = get_user_model().objects.get(id=payload['user_id'])
                return (user, token)
            except AuthenticationFailed:
                raise AuthenticationFailed('Invalid token.')
        return None
        
    @staticmethod
    def generate_token(user):
        """Génère un JWT de courte durée (30 min) pour l'utilisateur donné."""
        expiration_time = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {
            'user_id': user.id,
            'email': user.email,
            'exp': expiration_time,
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return token

    def extract_token(self, request):
        """Extrait le jeton de l'en-tête Authorization s'il est présent."""
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header.split(' ')[1]
        return None

    @staticmethod
    def verify_token(token):
        """Vérifie la validité du token (signature et expiration)."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            return payload
        except InvalidTokenError:
            raise AuthenticationFailed('Invalid token.')
        except ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired.')
        except Exception as e:
            raise AuthenticationFailed(str(e))