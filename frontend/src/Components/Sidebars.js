import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box';
import { Stack, Typography, TextField, List, ListItemButton, ListItemText, Avatar, Divider, Badge } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Sidebars() {
    const [users, setUsers] = useState([]);
    const [q, setQ] = useState('');
    const [unread, setUnread] = useState({});
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const selectedId = Number(params.get('with')) || null;
    const BASE_URL = 'http://localhost:8000';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch(`${BASE_URL}/users/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.ok ? res.json() : [])
            .then(data => setUsers(Array.isArray(data) ? data : []))
            .catch(() => setUsers([]));
    }, []);

    // Charger les compteurs non lus depuis localStorage et écouter les événements 'unread'
    useEffect(() => {
        try {
            const raw = localStorage.getItem('unreadCounts');
            setUnread(raw ? JSON.parse(raw) : {});
        } catch { setUnread({}); }
        const handler = (e) => {
            try {
                const raw = localStorage.getItem('unreadCounts');
                setUnread(raw ? JSON.parse(raw) : {});
            } catch {}
        };
        window.addEventListener('unread', handler);
        return () => window.removeEventListener('unread', handler);
    }, []);

    const stripAccents = (s = '') => s.normalize('NFD').replace(/\p{Diacritic}+/gu, '');
    const norm = (s = '') => stripAccents(String(s).toLowerCase().trim());
    const query = norm(q);
    const filtered = users.filter(u => {
        if (!query) return true;
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        const email = u.email || '';
        return norm(name).includes(query) || norm(email).includes(query);
    });

    const openChat = (id) => {
        // Réinitialiser le compteur pour cet utilisateur
        try {
            const key = 'unreadCounts';
            const raw = localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            if (obj[id]) { delete obj[id]; localStorage.setItem(key, JSON.stringify(obj)); }
            setUnread(obj);
        } catch {}
        navigate(`/chat?with=${id}`);
    };

    return (
        <Box sx={{ width: { xs: '100%', sm: 340 }, bgcolor: '#121212', color: (t) => t.palette.text.primary, height: '100%', borderRight: '1px solid', borderColor: (t) => t.palette.divider }}>
            <Stack spacing={2} sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#2B2B2B' }}>{'C'}</Avatar>
                    <Typography fontWeight={700}>Chats</Typography>
                </Stack>

                <TextField
                    size="small"
                    placeholder="Rechercher des messages"
                    fullWidth
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: '#1E1E1E',
                            borderRadius: 10,
                            '& fieldset': { borderColor: '#444444' },
                            '&:hover fieldset': { borderColor: '#444444' },
                            '&.Mui-focused fieldset': { borderColor: '#D4A300' },
                        },
                    }}
                />

                <Divider />

                <List dense sx={{ pt: 0 }}>
                    {filtered.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1 }}>
                            Aucun résultat
                        </Typography>
                    ) : null}
                    {filtered.map((u) => {
                        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
                        return (
                            <ListItemButton
                                key={u.id}
                                selected={selectedId === u.id}
                                sx={{
                                    borderRadius: 2,
                                    mb: 0.5,
                                    '&.Mui-selected': { bgcolor: '#2B2B2B' },
                                    '&.Mui-selected:hover': { bgcolor: '#2B2B2B' },
                                }}
                                onClick={() => openChat(u.id)}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                                    <Badge color="primary" badgeContent={unread[u.id] || 0} overlap="circular" invisible={!unread[u.id]}>
                                        <Avatar sx={{ width: 36, height: 36, bgcolor: '#2B2B2B' }}>{name[0]}</Avatar>
                                    </Badge>
                                    <ListItemText
                                        primary={<Typography variant="subtitle2" fontWeight={600}>{name}</Typography>}
                                        secondary={<Typography variant="caption" color="text.secondary">Appuyer pour discuter</Typography>}
                                    />
                                </Stack>
                            </ListItemButton>
                        );
                    })}
                </List>
            </Stack>
        </Box>
    )
}