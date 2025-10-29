
from django.contrib import admin
from django.urls import path
from accounts import views
from django.conf import settings
from django.conf.urls.static import static

# Fichier de routage principal (HTTP) du projet.
# Expose les endpoints REST de l'application accounts et
# sert les fichiers médias en développement via MEDIA_URL.
urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('login/google/', views.login_google, name='login_google'),
    path('messages/', views.list_messages, name='list_messages'),
    path('messages/send/', views.send_message, name='send_message'),
    path('users/', views.list_users, name='list_users'),
    path('users/<int:user_id>/', views.user_detail, name='user_detail'),
]

# En mode DEBUG uniquement: exposition des fichiers uploadés (images/vidéos/audio)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
