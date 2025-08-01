import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Login, Refresh } from '@mui/icons-material';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { log } from '@/utils/logger';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // デバイス検出
  const getDeviceType = () => {
    const userAgent = navigator.userAgent;
    
    if (/iPhone/.test(userAgent)) {
      return 'iphone';
    } else if (/iPad/.test(userAgent)) {
      return 'ipad';
    } else if (/Android/.test(userAgent)) {
      return 'android';
    } else {
      return 'desktop';
    }
  };

  // PWA環境かどうかを判定
  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  };

  // デバイス別のUser-Agentを取得
  const getDeviceUserAgent = () => {
    const deviceType = getDeviceType();
    
    switch (deviceType) {
      case 'iphone':
        return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      case 'ipad':
        return 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      case 'android':
        return 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
      default:
        return navigator.userAgent;
    }
  };

  // デバイス別の認証方法を選択
  const shouldUseRedirectAuth = () => {
    const deviceType = getDeviceType();
    
    // iPhone のみリダイレクト方式を強制
    if (deviceType === 'iphone') {
      return true;
    }
    
    // iPad と Android は PWA 認証も許可
    return !isPWA();
  };

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('google_access_token');
      const expiresAt = localStorage.getItem('google_token_expires_at');
      
      if (!token || !expiresAt) {
        log.debug('認証情報なし');
        setIsAuthenticated(false);
        return;
      }

      const expiryTime = parseInt(expiresAt, 10);
      if (Date.now() >= expiryTime) {
        log.debug('トークン期限切れ');
        setIsAuthenticated(false);
        return;
      }

      // トークンの有効性を確認
      const isValid = await GoogleSheetsService.validateToken();
      setIsAuthenticated(isValid);
      
      if (isValid) {
        log.success('認証確認完了');
      } else {
        log.debug('トークン無効');
      }
    } catch (error) {
      log.error('認証チェックエラー', error);
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);
      
      const deviceType = getDeviceType();
      log.debug('デバイス検出結果', { deviceType, isPWA: isPWA() });
      
      if (shouldUseRedirectAuth()) {
        // リダイレクト方式（iPhone または通常ブラウザ）
        log.debug('リダイレクト方式で認証開始', { deviceType });
        await GoogleSheetsService.authenticate();
      } else {
        // PWAモードの場合は新しいウィンドウで認証を開始（iPad/Android）
        log.debug('PWAモードで認証開始', { deviceType });
        const config = (GoogleSheetsService as any).getConfig();
        const redirectUri = window.location.origin + '/ocr_0714_V2/';
        
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', config.googleClientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/spreadsheets');
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('include_granted_scopes', 'true');
        authUrl.searchParams.set('state', 'auth_redirect_pwa');
        
        // デバイス別のUser-Agent情報を追加
        const deviceType = getDeviceType();
        const userAgent = getDeviceUserAgent();
        authUrl.searchParams.set('user_agent', userAgent);
        authUrl.searchParams.set('device_type', deviceType);

        // PWAでは新しいタブで開く
        const authWindow = window.open(authUrl.toString(), '_blank');
        
        if (!authWindow) {
          throw new Error('ポップアップがブロックされました。ブラウザの設定を確認してください。');
        }

        // ポップアップの完了を監視
        const checkAuth = setInterval(() => {
          try {
            if (authWindow.closed) {
              clearInterval(checkAuth);
              setIsAuthenticating(false);
              // 認証状態を再チェック
              setTimeout(() => {
                checkAuthentication();
              }, 1000);
            }
          } catch (error) {
            // Cross-origin エラーは無視
          }
        }, 1000);
      }
    } catch (error) {
      log.error('ログインエラー', error);
      setAuthError(error instanceof Error ? error.message : '認証に失敗しました');
      setIsAuthenticating(false);
    }
  };

  const handleRetry = () => {
    setAuthError(null);
    checkAuthentication();
  };

  useEffect(() => {
    checkAuthentication();

    // PWA認証完了の監視
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'auth_success') {
        log.success('PWA認証が完了しました');
        setIsAuthenticating(false);
        setTimeout(() => {
          checkAuthentication();
        }, 1000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 認証状態をチェック中
  if (isAuthenticated === null) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          認証状態を確認中...
        </Typography>
      </Box>
    );
  }

  // 未認証の場合はログイン画面を表示
  if (!isAuthenticated) {
    const deviceType = getDeviceType();
    const isPWAEnv = isPWA();
    
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Card sx={{ maxWidth: 400, mx: 'auto' }}>
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              🔐 ログインが必要です
            </Typography>

            {authError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {authError}
              </Alert>
            )}

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              作業記録簿OCRを使用するには<br />
              Googleアカウントでログインしてください
            </Typography>

            {isPWAEnv && deviceType !== 'iphone' && (
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                PWAモードで動作中です。認証画面が新しいタブで開きます。
              </Alert>
            )}

            {deviceType === 'iphone' && (
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                iPhoneではリダイレクト方式で認証を行います。
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleLogin}
                disabled={isAuthenticating}
                startIcon={isAuthenticating ? <CircularProgress size={20} /> : <Login />}
                sx={{ minWidth: '160px' }}
              >
                {isAuthenticating ? 'ログイン中...' : 'Googleでログイン'}
              </Button>

              {authError && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleRetry}
                  startIcon={<Refresh />}
                >
                  再試行
                </Button>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              Googleスプレッドシートへのアクセス権限が必要です
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // 認証済みの場合は子コンポーネントを表示
  return <div data-auth-guard>{children}</div>;
};

export default AuthGuard;