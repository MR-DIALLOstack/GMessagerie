"""Modèles de l'application Accounts.

Ce module définit:
- `UserManager` et `User`: modèle utilisateur personnalisé (authentification par email)
- `Message`: stockage des messages (texte, audio, vidéo) et de leurs statuts
"""
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    """Gestionnaire personnalisé pour le modèle `User`.

    Fournit des méthodes utilitaires pour créer des utilisateurs et des super-utilisateurs
    en utilisant l'email comme identifiant principal.
    """
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser, PermissionsMixin):
    """Modèle utilisateur personnalisé.

    - Authentification par l'email (`USERNAME_FIELD = 'email'`).
    - `username` est conservé pour compatibilité mais forcé unique.
    """
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def __str__(self):
        return self.email


class Message(models.Model):
    """Message échangé entre deux utilisateurs.

    Supporte différents types via `message_type` et un fichier associé pour audio/vidéo.
    Des champs de statut simplifiés sont fournis pour suivi (sent/delivered/read).
    """
    sender = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField(blank=True)  # Contenu texte (facultatif si media)
    message_type = models.CharField(max_length=10, choices=(
        ('text', 'text'),
        ('audio', 'audio'),
        ('video', 'video'),
    ), default='text')
    file = models.FileField(upload_to='messages/', null=True, blank=True)  # Fichier media associé
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=(
        ('sent', 'sent'),
        ('delivered', 'delivered'),
        ('read', 'read'),
    ), default='sent')
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        preview = self.content[:20] if self.content else self.message_type
        return f"{self.sender_id} -> {self.receiver_id}: {preview}"

