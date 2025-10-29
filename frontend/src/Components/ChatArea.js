import React, { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box';
import { Stack, Typography, Avatar, Divider, Paper } from '@mui/material';
import Messages from './Messages';
import MessagesInput from './MessagesInput';

export default function ChatArea({ initialMessages = [], receiverId }) {
    // Etat local des messages affichés dans la conversation.
    const [messages, setMessages] = useState(initialMessages);
    const BASE_URL = 'http://localhost:8000';
    const WS_URL = 'ws://localhost:8000/ws/chat';
    // Référence vers la connexion WebSocket (pour éviter de recréer à chaque rendu).
    const wsRef = useRef(null);
    // Indicateurs de présence de l'interlocuteur (en ligne / dernière activité).
    const [online, setOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    // Informations basiques de l'interlocuteur (nom, email) pour l'entête.
    const [peer, setPeer] = useState(null);
    // Identifiant de l'utilisateur courant (décodé depuis le JWT).
    const [myId, setMyId] = useState(null);

    const decodeTokenUserId = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            const parts = token.split('.');
            if (parts.length < 2) return null;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return (payload.user_id == null ? null : Number(payload.user_id));
        } catch (e) {
            return null;
        }
    };

    // Récupère l'historique des messages pour l'utilisateur sélectionné.
    // - Appelle l'API REST /messages/?with=<receiverId>
    // - Met à jour la liste locale des messages (le mapping UI est fait dans <Messages /> via myId)
    const fetchMessages = async () => {
        if (!receiverId) return;
        const token = localStorage.getItem('token');
        try {
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${BASE_URL}/messages/?with=${receiverId}`, { headers });
            if (!res.ok) return;
            const data = await res.json();
            setMessages(data);
        } catch (e) {
            // En cas d'erreur réseau/API, on ignore pour laisser l'UI continuer de fonctionner.
        }
    };

    // Rafraîchit périodiquement les messages pour la conversation courante.
    useEffect(() => {
        fetchMessages();
        const id = setInterval(fetchMessages, 4000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receiverId]);

    // Set myId from token once
    // Initialise l'identifiant utilisateur (myId) à partir du JWT en localStorage.
    useEffect(() => {
        setMyId(decodeTokenUserId());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch peer details + presence (poll)
    // Récupère les informations et présence de l'interlocuteur puis met à jour périodiquement.
    useEffect(() => {
        let timer;
        const run = () => {
            if (!receiverId) { setPeer(null); setOnline(false); setLastSeen(null); return; }
            const token = localStorage.getItem('token');
            if (!token) { setPeer(null); setOnline(false); setLastSeen(null); return; }
            const headers = { 'Authorization': `Bearer ${token}` };
            fetch(`${BASE_URL}/users/${receiverId}/`, { headers })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (!data) return;
                    setPeer(data);
                    if (Object.prototype.hasOwnProperty.call(data, 'online')) setOnline(!!data.online);
                    if (Object.prototype.hasOwnProperty.call(data, 'last_seen')) setLastSeen(data.last_seen || null);
                })
                .catch(() => {});
        };
        run();
        timer = setInterval(run, 10000);
        return () => { if (timer) clearInterval(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receiverId]);

    // WebSocket connect
    // Etablit la connexion WebSocket pour recevoir les événements temps réel:
    // - message_created: nouveau message (envoi/réception)
    // - message_delivered / message_read: accusés d'état
    // - presence_update / presence_snapshot: statut en ligne / hors-ligne
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
        wsRef.current = ws;
        ws.onmessage = (evt) => {
            try {
                const msg = JSON.parse(evt.data);
                if (msg.type === 'message_created') {
                    const uid = myId ?? decodeTokenUserId();
                    const uidNum = uid == null ? null : Number(uid);
                    // Si le message concerne une autre conversation, on génère une notification et on incrémente les non lus.
                    const relatesToCurrent = receiverId && (Number(msg.from) === Number(receiverId) || Number(msg.to) === Number(receiverId));
                    if (!relatesToCurrent) {
                        try {
                            const fromId = Number(msg.from);
                            const key = 'unreadCounts';
                            const raw = localStorage.getItem(key);
                            const obj = raw ? JSON.parse(raw) : {};
                            const k = String(fromId);
                            obj[k] = (obj[k] || 0) + 1;
                            localStorage.setItem(key, JSON.stringify(obj));
                            // Dispatch d'un événement custom pour mettre à jour la sidebar
                            window.dispatchEvent(new CustomEvent('unread', { detail: { from: fromId, count: obj[String(fromId)] } }));
                            // Notification navigateur (si permis)
                            if (typeof Notification !== 'undefined') {
                                if (Notification.permission === 'granted') {
                                    new Notification('Nouveau message', { body: msg.content });
                                }
                            }
                        } catch {}
                        return;
                    }
                    // Ajout dans la conversation courante
                    const base = {
                        id: msg.id,
                        from: (uidNum != null && Number(msg.from) === uidNum) ? 'me' : 'other',
                        time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: msg.status,
                    };
                    // Si c'est un message reçu de l'interlocuteur courant, considérer l'utilisateur en ligne et MAJ lastSeen
                    if (receiverId && Number(msg.from) === Number(receiverId)) {
                        setOnline(true);
                        setLastSeen(new Date().toISOString());
                    }
                    const mtype = msg.message_type || 'text';
                    if (mtype === 'text') {
                        setMessages((prev) => ([...prev, { ...base, text: msg.content, type: 'text' }]));
                    } else {
                        const url = msg.file ? (msg.file.startsWith('http') ? msg.file : `${BASE_URL}${msg.file}`) : undefined;
                        setMessages((prev) => ([...prev, { ...base, type: mtype, url }]));
                    }
                } else if (msg.type === 'message_delivered') {
                    setMessages((prev) => prev.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m));
                } else if (msg.type === 'message_read') {
                    setMessages((prev) => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
                } else if (msg.type === 'presence_update') {
                    if (receiverId && Number(msg.user_id) === Number(receiverId)) {
                        setOnline(!!msg.online);
                        setLastSeen(msg.last_seen || null);
                    }
                } else if (msg.type === 'presence_snapshot') {
                    if (receiverId && Array.isArray(msg.online_user_ids)) {
                        setOnline(msg.online_user_ids.includes(Number(receiverId)));
                    }
                }
            } catch (e) {
                // On ignore les payloads non conformes (sécurité/robustesse UI).
            }
        };
        ws.close();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receiverId]);

    // Demande la permission de notification au premier rendu si disponible.
    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            try { Notification.requestPermission(); } catch {}
        }
    }, []);

    // Recalcule périodiquement le statut en ligne selon lastSeen (fallback si le backend ne pousse pas toujours la présence).
    useEffect(() => {
        const id = setInterval(() => {
            if (!receiverId) return;
            if (!lastSeen) return;
            const diff = Date.now() - new Date(lastSeen).getTime();
            setOnline(diff < 60_000);
        }, 15000);
        return () => clearInterval(id);
    }, [receiverId, lastSeen]);

    // Envoi d'un message:
    // 1) Ajout optimiste dans l'UI (bulle "me")
    // 2) Requête POST /messages/send/
    // 3) Rafraîchissement de la conversation à la réponse
    const handleSend = (payload) => {
        // payload can be a string (text) or { type: 'audio'|'video', file }
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (typeof payload === 'string') {
            if (!payload?.trim()) return;
            setMessages((prev) => [...prev, { id: Date.now(), from: 'me', text: payload, time: now, type: 'text', status: 'sent' }]);
            if (receiverId) {
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                fetch(`${BASE_URL}/messages/send/`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ receiver: receiverId, content: payload, message_type: 'text' })
                }).then(() => fetchMessages()).catch(() => {});
            }
            return;
        }

        // media
        if (payload && payload.type && payload.file) {
            const url = URL.createObjectURL(payload.file);
            setMessages((prev) => [...prev, { id: Date.now(), from: 'me', time: now, type: payload.type, url, status: 'sent' }]);
            if (receiverId) {
                const token = localStorage.getItem('token');
                const fd = new FormData();
                fd.append('receiver', String(receiverId));
                fd.append('message_type', payload.type);
                fd.append('file', payload.file);
                const headers = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                fetch(`${BASE_URL}/messages/send/`, { method: 'POST', headers, body: fd })
                    .then(() => fetchMessages())
                    .catch(() => {});
            }
        }
    };

    // Rendu principal: entête (avatar + nom + présence), liste de messages, champ de saisie.
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0f172a' }}>
            {/* Header */}
            <Box sx={{ p: 2, bgcolor: '#0b1220', borderBottom: '1px solid', borderColor: '#1f2937' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ bgcolor: online ? '#16a34a' : '#374151' }}>{(peer && ((peer.first_name || peer.last_name) ? `${(peer.first_name||'')[0] || (peer.last_name||'')[0]}` : (peer.email||'')[0])) || '—'}</Avatar>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {peer ? ((`${peer.first_name || ''} ${peer.last_name || ''}`.trim()) || peer.email) : 'Sélectionnez une conversation'}
                        </Typography>
                        {peer ? (
                            <Typography variant="caption" color="text.secondary">
                                {online ? 'En ligne' : (lastSeen ? `Vu à ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Hors ligne')}
                            </Typography>
                        ) : null}
                    </Box>
                </Stack>
            </Box>

            {/* Messages list or empty state */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 2 }, backgroundColor: '#0f172a' }}>
                {receiverId ? (
                    <Stack spacing={1.5}>
                        <Messages messages={messages} myId={myId} baseUrl={BASE_URL} />
                    </Stack>
                ) : (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ mb: 0.5 }}>Selectionnez une conversation</Typography>
                            <Typography variant="body2">Choisir parmi les conversations existantes, ou commencer une nouvelle conversation.</Typography>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Input */}
            <Divider sx={{ borderColor: '#1f2937' }} />
            <Paper elevation={0} square sx={{ p: 1.5, bgcolor: '#0b1220' }}>
                <MessagesInput onSend={handleSend} />
            </Paper>
        </Box>
    )
}
