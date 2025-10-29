import React from 'react'
import Box from '@mui/material/Box';
import { Paper, Typography, Stack } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';

const sample = [
    { id: 1, from: 'other', text: 'Salut ! Comment ça va ?', time: '09:41' },
    { id: 2, from: 'me', text: 'Très bien, merci. On se parle plus tard ?', time: '09:42' },
    { id: 3, from: 'other', text: 'Parfait, à tout à l’heure 👋', time: '09:43' },
];

export default function Messages({ messages, myId, baseUrl }) {
    const normalize = (m) => {
        // If already in UI shape
        if (m && (m.text || m.from || m.type)) {
            return m;
        }
        // Backend shape -> map
        const myNum = myId == null ? null : Number(myId);
        const backendFrom = (m && (m.sender != null ? m.sender : m.from));
        const from = (myNum != null && backendFrom != null) ? (Number(backendFrom) === myNum ? 'me' : 'other') : 'other';
        const type = m.message_type || 'text';
        const base = {
            id: m.id,
            from,
            time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        };
        if (type === 'text') return { ...base, text: m.content, type };
        const url = m.file ? (String(m.file).startsWith('http') ? m.file : `${baseUrl}${m.file}`) : undefined;
        return { ...base, type, url };
    };

    const data = Array.isArray(messages) && messages.length ? messages.map(normalize) : sample;
    return (
        <Stack spacing={1.25}>
            {data.map((m) => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            px: 1.5,
                            py: 1,
                            maxWidth: '75%',
                            bgcolor: m.from === 'me' ? '#2563eb' : '#111827',
                            border: '1px solid',
                            borderColor: m.from === 'me' ? '#1d4ed8' : '#1f2937',
                            borderRadius: 3,
                        }}
                    >
                        {m.type === 'audio' ? (
                            <audio controls src={m.url} style={{ maxWidth: '100%' }} />
                        ) : m.type === 'video' ? (
                            <video controls src={m.url} style={{ maxWidth: 320, width: '100%', borderRadius: 8 }} />
                        ) : (
                            <Typography variant="body2" sx={{ color: m.from === 'me' ? '#ffffff' : '#e5e7eb' }}>{m.text}</Typography>
                        )}
                        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="caption" color={m.from === 'me' ? 'rgba(255,255,255,0.8)' : 'text.secondary'}>
                                    {m.time}
                                </Typography>
                                {m.from === 'me' && (
                                    m.status === 'read' ? (
                                        <DoneAllIcon sx={{ fontSize: 16, color: '#60a5fa' }} />
                                    ) : m.status === 'delivered' ? (
                                        <DoneAllIcon sx={{ fontSize: 16, color: m.from === 'me' ? 'rgba(255,255,255,0.8)' : 'text.secondary' }} />
                                    ) : (
                                        <CheckIcon sx={{ fontSize: 16, color: m.from === 'me' ? 'rgba(255,255,255,0.8)' : 'text.secondary' }} />
                                    )
                                )}
                            </Stack>
                        </Box>
                    </Paper>
                </Box>
            ))}
        </Stack>
    )
}