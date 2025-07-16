import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import { CameraAlt, Search, CheckCircle, Done } from '@mui/icons-material';
import { useAppStore } from '@/stores/appStore';
import ConnectionStatus from './ConnectionStatus';

interface LayoutProps {
  children: React.ReactNode;
}

const steps = [
  { label: '撮影', icon: <CameraAlt /> },
  { label: '処理中', icon: <Search /> },
  { label: '確認', icon: <CheckCircle /> },
  { label: '完了', icon: <Done /> },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentStep, error, success, setError, setSuccess } = useAppStore();

  const handleCloseError = () => {
    setError(null);
  };

  const handleCloseSuccess = () => {
    setSuccess(null);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ヘッダー */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            📋 作業記録簿OCR
          </Typography>
        </Toolbar>
      </AppBar>

      {/* ステッパー */}
      <Box sx={{ bgcolor: 'white', py: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Container maxWidth="md">
          <Stepper activeStep={currentStep - 1} alternativeLabel>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: currentStep > index ? 'primary.main' : 
                               currentStep === index + 1 ? 'primary.main' : 'grey.300',
                        color: currentStep >= index + 1 ? 'white' : 'grey.600',
                      }}
                    >
                      {step.icon}
                    </Box>
                  )}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      fontWeight: currentStep === index + 1 ? 600 : 400,
                      color: currentStep === index + 1 ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Container>
      </Box>

      {/* メインコンテンツ */}
      <Container maxWidth="md" sx={{ py: 3, flex: 1 }}>
        <ConnectionStatus />
        {children}
      </Container>

      {/* エラー表示 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: '100%', fontSize: '1rem' }}
        >
          {error?.message}
        </Alert>
      </Snackbar>

      {/* 成功メッセージ表示 */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          sx={{ width: '100%', fontSize: '1rem' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;