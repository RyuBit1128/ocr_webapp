import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert } from '@mui/material';
import { log } from '@/utils/logger';
import { Refresh, BugReport } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('ErrorBoundary caught an error', { error, errorInfo });
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            bgcolor: 'background.default',
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <BugReport sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                アプリケーションエラー
              </Typography>
              
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                予期しないエラーが発生しました。アプリケーションを再読み込みしてください。
              </Alert>

              {this.state.error && (
                <Box sx={{ mb: 3, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    エラー詳細:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {this.state.error.message}
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                onClick={this.handleReload}
                startIcon={<Refresh />}
                size="large"
                sx={{ mt: 2 }}
              >
                アプリを再読み込み
              </Button>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                問題が続く場合は、ブラウザのキャッシュをクリアするか、<br />
                開発者にお問い合わせください。
              </Typography>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;