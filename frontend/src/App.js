import React from 'react';
import './App.css';
import Navigate from './Components/Navigate';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#D4A300' },
    secondary: { main: '#E0B100' },
    background: { default: '#0F0F0F', paper: '#121212' },
    divider: '#444444',
    text: { primary: '#FFFFFF', secondary: '#CFCFCF' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { color: '#FFFFFF', backgroundColor: '#0F0F0F' },
      },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 10 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E',
          '& fieldset': { borderColor: '#444444' },
          '&:hover fieldset': { borderColor: '#444444' },
          '&.Mui-focused fieldset': { borderColor: '#D4A300' },
        },
        input: { color: '#FFFFFF' }
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <Navigate />
      </div>
    </ThemeProvider>
  );
}

export default App;
