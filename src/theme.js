import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#2196f3' : '#90caf9',
    },
    secondary: {
      main: mode === 'light' ? '#f50057' : '#f48fb1',
    },
    background: {
      default: mode === 'light' ? '#f5f5f5' : '#121212',
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'light' 
            ? '0 4px 6px rgba(0,0,0,0.1)' 
            : '0 4px 6px rgba(0,0,0,0.3)',
        },
      },
    },
  },
});