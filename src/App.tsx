import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from '@/theme/theme';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import CameraPage from '@/pages/CameraPage';
import ProcessingPage from '@/pages/ProcessingPage';
import ConfirmationPage from '@/pages/ConfirmationPage';
import SuccessPage from '@/pages/SuccessPage';
import { GoogleSheetsService } from '@/services/googleSheetsService';

function App() {
  // アプリ起動時に認証リダイレクトをチェック
  useEffect(() => {
    try {
      const wasRedirected = GoogleSheetsService.handleAuthRedirect();
      if (wasRedirected) {
        console.log('🎉 Google認証が完了しました！');
        // 必要に応じて特定のページにリダイレクト
        // window.location.href = '/camera';
      }
    } catch (error) {
      console.error('❌ 認証リダイレクト処理エラー:', error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router basename="/ocr_0714_V2">
          <Layout>
            <Routes>
              <Route path="/" element={<CameraPage />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/processing" element={<ProcessingPage />} />
              <Route path="/confirmation" element={<ConfirmationPage />} />
              <Route path="/success" element={<SuccessPage />} />
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;