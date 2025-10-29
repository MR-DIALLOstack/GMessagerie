"""Sérialiseurs de l'application Accounts.

Contient:
- UserSerializer: création d'utilisateur (email comme identifiant)
- LoginSerializer: validation des identifiants pour l'émission du JWT
- MessageSerializer: sérialisation/validation des messages (texte, audio, vidéo)
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from .models import Message
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    def create(self, validated_data):
        email = validated_data['email']
        username = email  # ensure uniqueness and satisfy required username
        user = get_user_model().objects.create_user(
            email=email,
            username=username,
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )
        return user
    
    class Meta:
        model = get_user_model()
        fields = ('email', 'password', 'first_name', 'last_name')
        extra_kwargs = {'password': {'write_only': True}}

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        """Vérifie l'existence de l'utilisateur et la validité du mot de passe.

        Retourne l'utilisateur validé dans `attrs['user']`.
        """
        User = get_user_model()
        try:
            user = User.objects.get(email=attrs['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid credentials.')

        if not user.check_password(attrs['password']):
            raise serializers.ValidationError('Invalid credentials.')

        if not user.is_active:
            raise serializers.ValidationError('User is not active.')

        attrs['user'] = user
        return attrs

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    receiver = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    file = serializers.FileField(required=False, allow_null=True)
    message_type = serializers.ChoiceField(choices=(('text','text'),('audio','audio'),('video','video')), required=False)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'content', 'message_type', 'file', 'created_at', 'is_read']
        read_only_fields = ['id', 'created_at', 'is_read']

    def validate(self, attrs):
        """Valide la cohérence type/contenu.

        - text: `content` requis
        - audio/vidéo: `file` requis
        """
        mtype = attrs.get('message_type') or 'text'
        content = attrs.get('content')
        file = attrs.get('file')
        if mtype == 'text':
            if not content:
                raise serializers.ValidationError({'content': 'Content is required for text messages.'})
        else:
            if file is None:
                raise serializers.ValidationError({'file': 'File is required for non-text messages.'})
        attrs['message_type'] = mtype
        return attrs

