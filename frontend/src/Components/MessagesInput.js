import React from 'react'
import Box from '@mui/material/Box';
import { TextField, Button, Stack } from '@mui/material';

export default function MessagesInput({ onSend }) {
    const [text, setText] = React.useState('');
    const [recording, setRecording] = React.useState(false);
    const mediaRef = React.useRef(null);
    const chunksRef = React.useRef([]);
    const fileInputRef = React.useRef(null);
    const [pendingMedia, setPendingMedia] = React.useState(null); // { type: 'audio'|'video', file, url }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend?.(text);
        setText('');
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRef.current = mr;
            chunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
                const url = URL.createObjectURL(file);
                setPendingMedia({ type: 'audio', file, url });
                chunksRef.current = [];
                stream.getTracks().forEach(t => t.stop());
            };
            mr.start();
            setRecording(true);
        } catch {}
    };

    const stopRecording = () => {
        try { mediaRef.current?.stop(); } catch {}
        setRecording(false);
    };

    const pickVideo = () => fileInputRef.current?.click();
    const onVideoPicked = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPendingMedia({ type: 'video', file, url });
            e.target.value = '';
        }
    };

    const sendPending = () => {
        if (!pendingMedia) return;
        onSend?.({ type: pendingMedia.type, file: pendingMedia.file });
        if (pendingMedia.url) URL.revokeObjectURL(pendingMedia.url);
        setPendingMedia(null);
    };

    const cancelPending = () => {
        if (pendingMedia?.url) URL.revokeObjectURL(pendingMedia.url);
        setPendingMedia(null);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            {pendingMedia && (
                <Box sx={{ mb: 1 }}>
                    {pendingMedia.type === 'audio' ? (
                        <audio controls src={pendingMedia.url} style={{ width: '100%' }} />
                    ) : (
                        <video controls src={pendingMedia.url} style={{ maxWidth: 360, width: '100%', borderRadius: 8 }} />
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button variant="contained" onClick={sendPending}>Envoyer</Button>
                        <Button variant="outlined" color="error" onClick={cancelPending}>Annuler</Button>
                    </Stack>
                </Box>
            )}
            <Stack direction="row" spacing={1} alignItems="center">
                <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={onVideoPicked} />
                {recording ? (
                    <Button variant="outlined" color="error" onClick={stopRecording}>Arrêter</Button>
                ) : (
                    <Button variant="outlined" onClick={startRecording}>
                        🎙️   
                    </Button>
                )}
                <Button variant="outlined" onClick={pickVideo}>🎥</Button>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Écrire un message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <Button type="submit" variant="contained">
                    Envoyer
                </Button>
            </Stack>
        </Box>
    )
}
