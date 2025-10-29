from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes, permission_classes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer, LoginSerializer, MessageSerializer
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.contrib.auth import get_user_model
from accounts.tokenauthentications import JWTAuthentication
from .models import Message
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import urllib.request
import json as pyjson


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([JWTAuthentication])
def register_user(request):
    """Inscription d'un nouvel utilisateur.

    Reçoit `email`, `password`, `first_name`, `last_name` et crée un compte.
    Retourne 201 en cas de succès, sinon 400 avec les erreurs de validation.
    """
    if request.method == 'POST':
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST )

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def list_messages(request):
    """Retourne l'historique des messages entre l'utilisateur courant et `with`.

    Paramètre query: `with=<user_id>`.
    """
    other_id = request.query_params.get('with')
    if not other_id:
        return Response({'detail': "Missing 'with' query parameter."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        other_id_int = int(other_id)
    except ValueError:
        return Response({'detail': "Invalid 'with' parameter."}, status=status.HTTP_400_BAD_REQUEST)

    qs = Message.objects.filter(
        Q(sender_id=request.user.id, receiver_id=other_id_int) |
        Q(sender_id=other_id_int, receiver_id=request.user.id)
    ).order_by('created_at')
    data = MessageSerializer(qs, many=True).data
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def list_users(request):
    """Liste les autres utilisateurs (pour la sidebar de discussions)."""
    User = get_user_model()
    users = User.objects.exclude(id=request.user.id).values('id', 'first_name', 'last_name', 'email')
    return Response(list(users), status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def user_detail(request, user_id):
    """Retourne les informations publiques d'un utilisateur (ou soi-même)."""
    User = get_user_model()
    try:
        if int(user_id) == request.user.id:
            u = request.user
        else:
            u = User.objects.get(id=user_id)
    except (User.DoesNotExist, ValueError):
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    data = {
        'id': u.id,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'email': u.email,
    }
    return Response(data, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Envoie un message (texte ou média) via l'API REST et notifie en temps réel.

    Corps JSON ou multipart selon le type:
    - text: { receiver, content, message_type: 'text' }
    - media: multipart (receiver, message_type in ['audio','video'], file)
    """
    serializer = MessageSerializer(data=request.data)
    if serializer.is_valid():
        msg = serializer.save(sender=request.user)
        data = MessageSerializer(msg).data
        payload = {
            'type': 'chat.message',
            'event': 'message_created',
            'data': {
                'id': data['id'],
                'from': data['sender'],
                'to': data['receiver'],
                'content': data.get('content'),
                'message_type': data.get('message_type', 'text'),
                'file': data.get('file'),
                'created_at': data['created_at'],
                'status': data.get('status', 'sent'),
            }
        }
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f"user_{data['sender']}", payload)
        async_to_sync(channel_layer.group_send)(f"user_{data['receiver']}", payload)
        return Response(data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([JWTAuthentication])
def login_user(request):
    """Authentifie un utilisateur et retourne un JWT court (30 min).

    Réponses:
    - 200: { token }
    - 4xx: détail d'erreur selon le cas
    """
    if request.method == 'POST':
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token = JWTAuthentication.generate_token(user)
            return Response({
                'token': token
            }, status=status.HTTP_200_OK)
        errors = serializer.errors
        if 'non_field_errors' in errors:
            msg = errors['non_field_errors'][0] if isinstance(errors['non_field_errors'], list) and errors['non_field_errors'] else 'Invalid credentials.'
            http_status = status.HTTP_401_UNAUTHORIZED if 'Invalid credentials' in msg else status.HTTP_403_FORBIDDEN if 'not active' in msg else status.HTTP_400_BAD_REQUEST
            return Response({'detail': msg}, status=http_status)
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([JWTAuthentication])
def login_google(request):
    """Authentifie via Google (ID Token) et retourne un JWT applicatif.

    Corps: { id_token }
    Étapes:
    - Vérifier l'ID token côté Google (endpoint tokeninfo)
    - Récupérer l'email et le nom
    - Créer l'utilisateur s'il n'existe pas
    - Retourner un JWT propre à l'application
    """
    try:
        body = request.data if hasattr(request, 'data') else pyjson.loads(request.body or '{}')
    except Exception:
        body = {}
    id_token = body.get('id_token')
    if not id_token:
        return Response({'detail': 'Missing id_token'}, status=status.HTTP_400_BAD_REQUEST)

    # Vérification simple via endpoint public Google
    try:
        with urllib.request.urlopen(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}") as resp:
            payload = pyjson.loads(resp.read().decode('utf-8'))
    except Exception:
        return Response({'detail': 'Invalid Google token'}, status=status.HTTP_401_UNAUTHORIZED)

    email = payload.get('email')
    if not email:
        return Response({'detail': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)

    User = get_user_model()
    user, created = User.objects.get_or_create(email=email, defaults={
        'username': email,
        'first_name': payload.get('given_name', '') or '',
        'last_name': payload.get('family_name', '') or '',
        'is_active': True,
    })

    token = JWTAuthentication.generate_token(user)
    return Response({'token': token}, status=status.HTTP_200_OK)