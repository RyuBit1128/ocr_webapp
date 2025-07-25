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
  CircularProgress,
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
  CloudSync,
  TableChart,
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
  const [isUpdatingMasterData, setIsUpdatingMasterData] = useState(false);

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
        
        // PWA対応：より確実な初期化のため明示的にURLリダイレクト
        setTimeout(() => {
          window.location.href = window.location.origin + '/ocr_0714_V2/';
        }, 100);
        
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

  const handleUpdateMasterData = async () => {
    setIsUpdatingMasterData(true);
    handleUserMenuClose();
    
    try {
      console.log('🔄 マスターデータの更新を開始します');
      
      // キャッシュをクリア
      const { MasterDataCache } = await import('@/services/masterDataCache');
      MasterDataCache.clearCache();
      console.log('✅ キャッシュをクリアしました');
      
      // 最新のマスターデータを取得
      await GoogleSheetsService.getMasterData();
      
      setSuccess('✅ マスターデータを更新しました！\n従業員・商品リストが最新になります。');
      console.log('✅ マスターデータ更新完了');
      
      // ConfirmationPageが表示されている場合、ドロップダウンリストを即座に更新
      window.dispatchEvent(new CustomEvent('masterDataUpdated'));
      
    } catch (error) {
      console.error('❌ マスターデータ更新エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'マスターデータの更新に失敗しました';
      setError({ message: errorMessage, type: 'MASTER_DATA_ERROR' });
    } finally {
      setIsUpdatingMasterData(false);
    }
  };

  const handleOpenMasterSheet = () => {
    try {
      console.log('📊 管理シートを開きます');
      const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;
      
      if (spreadsheetId) {
        // 管理シートに直接アクセスするURL（gid=0は最初のシート）
        const masterSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
        window.open(masterSheetUrl, '_blank', 'noopener,noreferrer');
        console.log('✅ 管理シートを新しいタブで開きました');
      } else {
        setError({ message: 'スプレッドシートIDが設定されていません', type: 'MASTER_DATA_ERROR' });
      }
    } catch (error) {
      console.error('❌ 管理シート表示エラー:', error);
      setError({ message: '管理シートの表示に失敗しました', type: 'MASTER_DATA_ERROR' });
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
              <MenuItem onClick={handleOpenMasterSheet}>
                <ListItemIcon>
                  <TableChart fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="管理シート" 
                  secondary="従業員・商品の編集"
                />
              </MenuItem>
            )}
            
            {isAuthenticated && (
              <MenuItem onClick={handleUpdateMasterData} disabled={isUpdatingMasterData}>
                <ListItemIcon>
                  {isUpdatingMasterData ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CloudSync fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={isUpdatingMasterData ? "更新中..." : "データ更新"} 
                  secondary="従業員・商品情報"
                />
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