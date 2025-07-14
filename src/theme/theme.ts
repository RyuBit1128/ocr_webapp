import { createTheme } from '@mui/material/styles';

// デジタル苦手な人向けのテーマ設定
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      marginBottom: '1rem',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginBottom: '0.75rem',
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginBottom: '0.5rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontSize: '1rem',
      fontWeight: 600,
      textTransform: 'none', // 大文字変換を無効化
    },
  },
  components: {
    // ボタンを大きく、見やすくする
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '56px',
          fontSize: '1.1rem',
          fontWeight: 600,
          borderRadius: '12px',
          padding: '16px 32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          },
        },
        contained: {
          '&:disabled': {
            backgroundColor: '#e0e0e0',
            color: '#9e9e9e',
          },
        },
      },
    },
    // カードを見やすくする
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          marginBottom: '16px',
        },
      },
    },
    // テキストフィールドを大きくする
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            fontSize: '1.1rem',
            minHeight: '56px',
          },
          '& .MuiInputLabel-root': {
            fontSize: '1rem',
          },
        },
      },
    },
    // チップを見やすくする
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
          height: '40px',
          borderRadius: '20px',
        },
      },
    },
    // ステッパーを見やすくする
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontSize: '1rem',
          fontWeight: 500,
        },
      },
    },
  },
  spacing: 8, // 8pxベースのスペーシング
});