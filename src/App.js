import { useState } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './theme';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Tambahkan useTheme di sini
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const { darkMode } = useTheme();
  const theme = createAppTheme(darkMode ? 'dark' : 'light');

  const handleToggleForm = () => {
    setShowLogin(!showLogin);
  };

  if (!isLoggedIn) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {showLogin ? (
          <Login onToggleForm={handleToggleForm} />
        ) : (
          <Register onToggleForm={handleToggleForm} />
        )}
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Dashboard />
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;