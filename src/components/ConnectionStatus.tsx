import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Alert, 
  IconButton, 
  Collapse, 
  Typography,
  Chip,
  Stack
} from '@mui/material';
import { 
  Close, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  Error,
  Warning
} from '@mui/icons-material';
import { OpenAIOcrService } from '@/services/ocrService';
import { GoogleSheetsService } from '@/services/googleSheetsService';

interface ConnectionStatusProps {
  onStatusChange?: (isReady: boolean) => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onStatusChange }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [openaiStatus, setOpenaiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [googleStatus, setGoogleStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkConnections = async () => {
      if (!isOnline) {
        setOpenaiStatus('error');
        setGoogleStatus('error');
        setIsVisible(true);
        setHasChecked(true);
        onStatusChange?.(false);
        return;
      }

      try {
        // OpenAI API 接続確認
        const openaiValid = await OpenAIOcrService.validateApiKey();
        setOpenaiStatus(openaiValid ? 'ok' : 'error');

        // Google Sheets API 接続確認
        const googleValid = await GoogleSheetsService.checkAvailability();
        setGoogleStatus(googleValid ? 'ok' : 'error');

        const allReady = openaiValid && googleValid;
        
        // エラーがある場合のみ表示
        if (!allReady) {
          setIsVisible(true);
        }
        
        onStatusChange?.(allReady);
        
      } catch (error) {
        console.error('接続確認エラー:', error);
        setOpenaiStatus('error');
        setGoogleStatus('error');
        setIsVisible(true);
        onStatusChange?.(false);
      } finally {
        setHasChecked(true);
      }
    };

    // オンライン状態の監視
    const handleOnline = () => {
      setIsOnline(true);
      if (hasChecked && (openaiStatus === 'error' || googleStatus === 'error')) {
        checkConnections();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsVisible(true);
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初回チェック
    checkConnections();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, hasChecked, openaiStatus, googleStatus, onStatusChange]);

  const getStatusIcon = (status: 'checking' | 'ok' | 'error') => {
    switch (status) {
      case 'checking':
        return <Warning color="warning" />;
      case 'ok':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
    }
  };

  const getStatusColor = (status: 'checking' | 'ok' | 'error') => {
    switch (status) {
      case 'checking':
        return 'warning';
      case 'ok':
        return 'success';
      case 'error':
        return 'error';
    }
  };

  const getStatusText = (status: 'checking' | 'ok' | 'error') => {
    switch (status) {
      case 'checking':
        return '確認中';
      case 'ok':
        return '正常';
      case 'error':
        return 'エラー';
    }
  };

  if (!hasChecked && isOnline) {
    return null; // 初回チェック中は何も表示しない
  }

  return (
    <Collapse in={isVisible}>
      <Alert
        severity={!isOnline ? 'error' : (openaiStatus === 'error' || googleStatus === 'error') ? 'warning' : 'info'}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => setIsVisible(false)}
          >
            <Close fontSize="inherit" />
          </IconButton>
        }
        sx={{ mb: 2 }}
      >
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isOnline ? <Wifi fontSize="small" /> : <WifiOff fontSize="small" />}
            <Typography variant="body2" fontWeight={600}>
              接続状態: {isOnline ? 'オンライン' : 'オフライン'}
            </Typography>
          </Box>

          {isOnline && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                icon={getStatusIcon(openaiStatus)}
                label={`OpenAI API: ${getStatusText(openaiStatus)}`}
                color={getStatusColor(openaiStatus)}
                size="small"
                variant="outlined"
              />
              <Chip
                icon={getStatusIcon(googleStatus)}
                label={`Google API: ${getStatusText(googleStatus)}`}
                color={getStatusColor(googleStatus)}
                size="small"
                variant="outlined"
              />
            </Stack>
          )}

          {!isOnline && (
            <Typography variant="body2">
              ネットワーク接続を確認してください。一部機能が利用できません。
            </Typography>
          )}

          {isOnline && (openaiStatus === 'error' || googleStatus === 'error') && (
            <Typography variant="body2">
              API設定を確認してください。一部機能が正常に動作しない可能性があります。
            </Typography>
          )}
        </Stack>
      </Alert>
    </Collapse>
  );
};

export default ConnectionStatus;