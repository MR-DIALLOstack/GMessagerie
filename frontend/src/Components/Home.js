import React from 'react'
import Box from '@mui/material/Box';
import { Container, Stack, Typography, Button, Card, CardContent } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Home = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: (t) => t.palette.background.default,
        overflow: 'hidden',
      }}
    >
      {/* Animated accent blob */}
      <Box sx={{
        position: 'absolute',
        top: -120,
        right: -120,
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: (t) => `radial-gradient(closest-side, ${t.palette.primary.main}, transparent 70%)`,
        filter: 'blur(40px)',
        opacity: 0.3,
        animation: 'float 12s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(20px) translateX(-10px)' },
        },
      }} />

      {/* Hero */}
      <Container maxWidth="md" sx={{ flex: 1, display: 'flex', alignItems: 'center', py: { xs: 4, sm: 8 } }}>
        <Card elevation={6} sx={{ width: '100%', borderRadius: 4, bgcolor: (t) => t.palette.background.paper }}>
          <CardContent sx={{ p: { xs: 3, sm: 6 } }}>
            <Stack spacing={4} alignItems="center" textAlign="center">
              {/* Title */}
              <Stack spacing={1}>
                <Typography variant="h3" fontWeight={900}>
                  Discutez simplement, en toute élégance
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Rejoignez vos amis et collègues avec une messagerie rapide, sûre et intuitive.
                </Typography>
              </Stack>

              {/* Feature highlights */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
                {[
                  { title: 'En temps réel', desc: 'Messages instantanés et fluides.' },
                  { title: 'Sécurisé', desc: 'Connexion sécurisée et contrôle.' },
                  { title: 'Simple', desc: 'Interface épurée et efficace.' },
                ].map((f, i) => (
                  <Box key={i} sx={{ flex: 1, p: 2, borderRadius: 3, border: '1px solid', borderColor: (t) => t.palette.divider }}>
                    <Typography variant="subtitle1" fontWeight={700}>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                  </Box>
                ))}
              </Stack>

              {/* Actions */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
                <Button
                  component={RouterLink}
                  to="/register"
                  fullWidth
                  size="large"
                  variant="contained"
                  color="primary"
                  sx={{ fontWeight: 800, borderRadius: 2 }}
                >
                  Commencer
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  fullWidth
                  size="large"
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 800, borderRadius: 2 }}
                >
                  Se connecter
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      {/* Footer note */}
      <Box component="footer" sx={{ py: 4 }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Confiance • Sécurité • Simplicité
        </Typography>
      </Box>
    </Box>
  )
}

export default Home
