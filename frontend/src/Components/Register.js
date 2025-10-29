import React, { useState } from 'react'
import Box from '@mui/material/Box';
import { TextField, Button, Container, Stack, Typography, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const BASE_URL = 'http://localhost:8000';
    const navigate = useNavigate();
    const [user, setUser] = useState({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
    });
    const handleFormSubmit = (e) => {
        e.preventDefault();
        fetch(`${BASE_URL}/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        })
        .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.detail || 'Échec de l\'inscription');
            }
            // Auto-login after successful registration
            return fetch(`${BASE_URL}/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: user.password })
            });
        })
        .then(async (response) => {
            const data = await response.json();
            if (!response.ok || !data?.token) {
                throw new Error(data?.detail || 'Impossible de se connecter après inscription');
            }
            localStorage.setItem('token', data.token);
            navigate('/chat');
        })
        .catch(error => {
            console.error(error);
            alert(error.message || 'Une erreur est survenue');
        })
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)'
            }}
        >
            <Container maxWidth="sm">
                <Card elevation={3} sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#edfd03ff' }}>
                                    Créer un compte
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Rejoignez-nous en quelques secondes. Simple et rapide.
                                </Typography>
                            </Box>

                            <Box
                                component="form"
                                noValidate
                                onSubmit={handleFormSubmit}
                                autoComplete="off"
                            >
                                <Stack spacing={2}>
                                    <TextField
                                        id="email"
                                        type="email"
                                        label="Email"
                                        variant="outlined"
                                        fullWidth
                                        value={user.email}
                                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                                    />
                                    <TextField
                                        id="first_name"
                                        type="text"
                                        label="Nom"
                                        variant="outlined"
                                        fullWidth
                                        value={user.first_name}
                                        onChange={(e) => setUser({ ...user, first_name: e.target.value })}
                                    />
                                    <TextField
                                        id="last_name"
                                        type="text"
                                        label="Prénom"
                                        variant="outlined"
                                        fullWidth
                                        value={user.last_name}
                                        onChange={(e) => setUser({ ...user, last_name: e.target.value })}
                                    />
                                    <TextField
                                        id="password"
                                        type="password"
                                        label="Mot de passe"
                                        variant="outlined"
                                        fullWidth
                                        value={user.password}
                                        onChange={(e) => setUser({ ...user, password: e.target.value })}
                                    />
                                    <Button
                                        type="submit"
                                        size="large"
                                        fullWidth
                                        variant="contained"
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            backgroundColor: '#edfd03ff',
                                            '&:hover': { backgroundColor: '#767e07ff' }
                                        }}  
                                    >
                                        Créer mon compte
                                    </Button>
                                </Stack>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    )
}