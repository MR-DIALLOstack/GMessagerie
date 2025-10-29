import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import { AppBar, Toolbar, Button, Container, Stack, Avatar, Typography } from '@mui/material';
import Home from './Home';
import Register from './Register';
import Login from './Login';
import ChatPage from './ChatPage';

const Navigate = () => {
  const [currentUser, setCurrentUser] = useState(null);

  const decodeTokenUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.user_id || null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const uid = decodeTokenUserId();
    const token = localStorage.getItem('token');
    if (!uid || !token) { setCurrentUser(null); return; }
    fetch(`http://localhost:8000/users/${uid}/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <Router>
      <AppBar position="static" elevation={0} sx={{ bgcolor: (t) => t.palette.background.paper, color: (t) => t.palette.text.primary, borderBottom: '1px solid', borderColor: (t) => t.palette.divider }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" component={Link} to="/" style={{ textDecoration: 'none' }}>
            <Box component="img" src="/logo.png" alt="Gandyam" sx={{ width: 28, height: 28, borderRadius: '6px' }} />
            <Box sx={{ fontWeight: 800, fontSize: 18, color: (t) => t.palette.primary.main }}>GANDYAM</Box>
          </Stack>
          {currentUser ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 32, height: 32 }}>
                {((currentUser.first_name || currentUser.last_name) ? (currentUser.first_name?.[0] || currentUser.last_name?.[0]) : currentUser.email?.[0] || 'U')}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {`${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email}
              </Typography>
              <Button onClick={handleLogout} variant="outlined" color="primary" sx={{ textTransform: 'none' }}>
                Déconnexion
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button component={Link} to="/login" variant="text" sx={{ textTransform: 'none' }} color="primary">
                Se connecter
              </Button>
              <Button component={Link} to="/register" variant="contained" sx={{ textTransform: 'none' }} color="primary">
                S'inscrire
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" disableGutters sx={{ p: 0 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default Navigate;
