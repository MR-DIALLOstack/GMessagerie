import React from 'react'
import Box from '@mui/material/Box';
import { TextField, Button, Container, Stack, Typography, Card, CardContent, Alert, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

const Login = () => {
    const BASE_URL = 'http://localhost:8000';
    const navigate = useNavigate();
    const [user, setUser] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState({ general: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({ general: '', email: '', password: '' });
        fetch(`${BASE_URL}/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                    if (data.detail) {
                        setErrors({ general: data.detail });
                    } else if (data.email) {
                        setErrors({ email: data.email[0] });
                    } else if (data.password) {
                        setErrors({ password: data.password[0] });
                    } else {
                        setErrors({ general: 'Échec de la connexion' });
                    }
                    alert('email ou mot de passe invalide');
                } else {
                    if (data?.token) {
                        localStorage.setItem('token', data.token);
                        navigate('/chat');
                    }
                }
            })
            .catch((error) => {
                setErrors({ general: 'email ou mot de passe invalide' });
                alert('email ou mot de passe invalide');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#0F1115',
                color: '#F1F1F3'
            }}
        >
            <Container maxWidth="sm">
                <Stack alignItems="center" spacing={3} sx={{ mb: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box component="img" src="/logo.png" alt="Gandyam" sx={{ width: 36, height: 36, borderRadius: '8px' }} />
                        <Typography variant="h5" fontWeight={800}>Messagerie</Typography>
                    </Stack>
                </Stack>

                <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#1B1E24', color: '#F1F1F3', border: '1px solid #232831' }}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="h6" fontWeight={800} gutterBottom>
                                    Bon retour parmi nous !
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#A8A8AE' }}>
                                    Veuillez entrer vos informations pour vous connecter.
                                </Typography>
                            </Box>

                            {/* Onglets  */}
                            <Stack direction="row" spacing={2}>
                                <Button size="small" variant="contained" sx={{ borderRadius: 999, px: 2, fontWeight: 700 }}>Se connecter</Button>
                                <Button size="small" variant="text" component={RouterLink} to="/register" sx={{ borderRadius: 999, px: 2, color: '#A8A8AE', fontWeight: 700 }}>Créer un compte</Button>
                            </Stack>

                            <Box component="form" noValidate onSubmit={handleFormSubmit} autoComplete="off">
                                <Stack spacing={2}>
                                    {errors.general ? (
                                        <Alert severity="error">{errors.general}</Alert>
                                    ) : null}
                                    <Box>
                                        <Typography variant="caption" sx={{ color: '#A8A8AE' }}>Email</Typography>
                                        <TextField
                                            id="email"
                                            type="email"
                                            placeholder="Entrez votre email"
                                            variant="outlined"
                                            fullWidth
                                            value={user.email}
                                            onChange={(e) => setUser({ ...user, email: e.target.value })}
                                            error={Boolean(errors.email)}
                                            helperText={errors.email}
                                            sx={{
                                                mt: 0.5,
                                                '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#12151A' },
                                                '& .MuiInputBase-input': { color: '#F1F1F3' }
                                            }}
                                        />
                                    </Box>
                                    <Box>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" sx={{ color: '#A8A8AE' }}>Mot de passe</Typography>
                                            <Button variant="text" size="small" sx={{ color: '#6EA8FF', textTransform: 'none' }}>Mot de passe oublié ?</Button>
                                        </Stack>
                                        <TextField
                                            id="password"
                                            type="password"
                                            placeholder="Entrez votre mot de passe"
                                            variant="outlined"
                                            fullWidth
                                            value={user.password}
                                            onChange={(e) => setUser({ ...user, password: e.target.value })}
                                            error={Boolean(errors.password)}
                                            helperText={errors.password}
                                            sx={{
                                                mt: 0.5,
                                                '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#12151A' },
                                                '& .MuiInputBase-input': { color: '#F1F1F3' }
                                            }}
                                        />
                                    </Box>
                                    <Button
                                        type="submit"
                                        size="large"
                                        fullWidth
                                        variant="contained"
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: 'primary.main', ':hover': { bgcolor: 'secondary.main' } }}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                                <CircularProgress size={20} sx={{ color: 'white' }} />
                                                <span>Connexion...</span>
                                            </Stack>
                                        ) : (
                                            'Se connecter'
                                        )}
                                    </Button>

                                    
                                </Stack>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
};

export default Login;