import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
} from '@mui/material';
import { CheckCircle, CameraAlt, OpenInNew } from '@mui/icons-material';
import { useAppStore } from '@/stores/appStore';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentStep, resetData } = useAppStore();

  useEffect(() => {
    setCurrentStep(4);
  }, [setCurrentStep]);

  const handleNewCapture = () => {
    resetData();
    navigate('/camera');
  };

  const handleOpenSpreadsheet = () => {
    // TODO: 実際のスプレッドシートURLを開く
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${import.meta.env.VITE_SPREADSHEET_ID}/edit`;
    window.open(spreadsheetUrl, '_blank');
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        🎉 保存完了！
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'success.main',
              mx: 'auto',
              mb: 2,
            }}
          >
            <CheckCircle sx={{ fontSize: 40 }} />
          </Avatar>

          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            データを正常に保存しました
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            作業記録簿の内容が<br />
            Googleスプレッドシートに記録されました
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleOpenSpreadsheet}
              startIcon={<OpenInNew />}
              sx={{ minWidth: '160px' }}
            >
              📊 スプレッドシートを開く
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 処理結果
          </Typography>
          <Box sx={{ textAlign: 'left', maxWidth: '300px', mx: 'auto' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              ✅ 基本情報を抽出しました
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              ✅ 作業者記録を処理しました
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              ✅ 機械操作記録を処理しました
            </Typography>
            <Typography variant="body2">
              ✅ スプレッドシートに保存しました
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        size="large"
        onClick={handleNewCapture}
        startIcon={<CameraAlt />}
        sx={{ minWidth: '200px' }}
      >
        📸 新しく撮影する
      </Button>
    </Box>
  );
};

export default SuccessPage;