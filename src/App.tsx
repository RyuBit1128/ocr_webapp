import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from '@/theme/theme';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthRenewalDialog from '@/components/AuthRenewalDialog';
import AuthGuard from '@/components/AuthGuard';
import CameraPage from '@/pages/CameraPage';
import ProcessingPage from '@/pages/ProcessingPage';
import ConfirmationPage from '@/pages/ConfirmationPage';
import SuccessPage from '@/pages/SuccessPage';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { TokenExpiryService } from '@/services/tokenExpiryService';
import { log } from '@/utils/logger';

function App() {
  // デバッグ用ログ
  console.log('🚀 App component initializing...');
  console.log('Environment:', {
    NODE_ENV: import.meta.env.NODE_ENV,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    BASE_URL: import.meta.env.BASE_URL,
    VITE_DEV_MODE: import.meta.env.VITE_DEV_MODE
  });
  console.log('Current location:', window.location.href);
  console.log('Router basename:', import.meta.env.PROD ? "/ocr_webapp" : "/");

  // アプリ起動時に認証リダイレクトをチェック
  useEffect(() => {
    try {
      const wasRedirected = GoogleSheetsService.handleAuthRedirect();
      if (wasRedirected) {
        log.success('Google認証が完了しました');
        // 認証完了後にトークン監視を開始
        TokenExpiryService.resetMonitoring();
      } else {
        // 既存のトークンがある場合は監視を開始
        const token = localStorage.getItem('google_access_token');
        const expiresAt = localStorage.getItem('google_token_expires_at');
        
        if (token && expiresAt) {
          const expiryTime = parseInt(expiresAt, 10);
          if (Date.now() < expiryTime) {
            log.debug('既存のトークンで監視を開始');
            TokenExpiryService.startMonitoring();
          }
        }
      }
    } catch (error) {
      log.error('認証リダイレクト処理エラー', error);
    }

    // 開発環境でのテスト用グローバル関数
    if (import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true') {
      (window as any).authTest = {
        showDialog: () => TokenExpiryService.showTestDialog(),
        startTest: () => TokenExpiryService.startTestMonitoring(),
        stopMonitoring: () => TokenExpiryService.stopMonitoring(),
        getStatus: () => TokenExpiryService.getMonitoringStatus(),
      };
      log.dev('開発モード: ブラウザコンソールで authTest.showDialog() でテスト可能');
    }
  }, []);

  // アプリ終了時のクリーンアップ
  useEffect(() => {
    return () => {
      TokenExpiryService.stopMonitoring();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router basename={import.meta.env.PROD ? "/ocr_webapp" : "/"}>
          <Layout>
            <AuthGuard>
              <Routes>
                <Route path="/" element={<CameraPage />} />
                <Route path="/camera" element={<CameraPage />} />
                <Route path="/processing" element={<ProcessingPage />} />
                <Route path="/confirmation" element={<ConfirmationPage />} />
                <Route path="/success" element={<SuccessPage />} />
              </Routes>
            </AuthGuard>
          </Layout>
          {/* 認証更新ダイアログ */}
          <AuthRenewalDialog />
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;