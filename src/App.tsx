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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router basename="/ocr_0714_v2">
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