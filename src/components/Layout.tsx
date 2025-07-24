import React, { useState } from 'react';
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
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import { 
  CameraAlt, 
  Search, 
  CheckCircle, 
  Done,
  AccountCircle,
  Logout,
  Settings,
  Person,
} from '@mui/icons-material';
import { useAppStore } from '@/stores/appStore';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { TokenExpiryService } from '@/services/tokenExpiryService';
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
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleCloseError = () => {
    setError(null);
  };

  const handleCloseSuccess = () => {
    setSuccess(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    // 確認ダイアログを表示
    const confirmed = window.confirm(
      '🔓 ログアウトしますか？\n\n' +
      'Google認証が解除され、次回利用時に再度ログインが必要になります。'
    );
    
    if (confirmed) {
      try {
        // トークン監視を停止
        TokenExpiryService.stopMonitoring();
        
        // localStorage からトークンを削除
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expires_at');
        
        // マスターデータキャッシュもクリア
        localStorage.removeItem('master_data_cache');
        localStorage.removeItem('master_data_cache_timestamp');
        
        console.log('🔓 ログアウト完了');
        
        // ページを再読み込みして初期状態に戻す
        window.location.reload();
        
      } catch (error) {
        console.error('❌ ログアウトエラー:', error);
        alert('ログアウト処理でエラーが発生しました。ページを再読み込みしてください。');
      }
    }
    
    handleUserMenuClose();
  };

  const handleReAuth = () => {
    try {
      console.log('🔄 再認証を開始します');
      GoogleSheetsService.authenticate();
    } catch (error) {
      console.error('❌ 再認証エラー:', error);
    }
    handleUserMenuClose();
  };

  // 認証状態を確認
  const isAuthenticated = !!localStorage.getItem('google_access_token');

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ヘッダー */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            📋 作業記録簿OCR
          </Typography>
          
          {/* ユーザーメニュー */}
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleUserMenuOpen}
            sx={{ ml: 2 }}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                minWidth: 200,
                mt: 1,
              }
            }}
          >
            <MenuItem disabled>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="アカウント" 
                secondary={isAuthenticated ? 'Google認証済み' : '未認証'}
              />
            </MenuItem>
            
            <Divider />
            
            {isAuthenticated && (
              <MenuItem onClick={handleReAuth}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="再認証" />
              </MenuItem>
            )}
            
            {isAuthenticated && (
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="ログアウト" />
              </MenuItem>
            )}
            
            {!isAuthenticated && (
              <MenuItem onClick={handleReAuth}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="ログイン" />
              </MenuItem>
            )}
          </Menu>
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