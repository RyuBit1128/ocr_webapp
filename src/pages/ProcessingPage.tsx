import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Button,
} from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';
import { useAppStore } from '@/stores/appStore';
import { DataCorrectionService } from '@/services/dataCorrectionService';
import { OpenAIOcrService } from '@/services/ocrService';

const ProcessingPage: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('画像を分析中...');
  
  const {
    capturedImage,
    setOcrResult,
    setCurrentStep,
    setError,
    setIsProcessing,
    error,
  } = useAppStore();

  // 撮影画像がない場合はカメラページに戻る
  useEffect(() => {
    if (!capturedImage) {
      navigate('/camera');
      return;
    }
  }, [capturedImage, navigate]);

  // 実際のOCR処理
  useEffect(() => {
    if (!capturedImage) return;

    const processImage = async () => {
      setIsProcessing(true);
      setCurrentStep(2);
      
      try {
        // プログレスバーとメッセージの更新を受け取るコールバック
        const onProgress = (progressValue: number, message: string) => {
          setProgress(progressValue);
          setStatusMessage(message);
        };

        // OpenAI Vision APIでOCR処理
        const ocrResult = await OpenAIOcrService.processImage(capturedImage, onProgress);

        // データ補正処理
        setStatusMessage('データを補正中...');
        setProgress(95);
        const correctedResult = await DataCorrectionService.correctOcrResult(ocrResult);
        
        // デフォルトの作業日を今日の日付に設定
        if (!correctedResult.ヘッダー.作業日) {
          const today = new Date();
          correctedResult.ヘッダー.作業日 = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        }
        
        setProgress(100);
        setStatusMessage('処理完了！');
        setOcrResult(correctedResult);
        setCurrentStep(3);
        
        setTimeout(() => {
          navigate('/confirmation');
        }, 1000);
        
      } catch (error) {
        console.error('OCR処理エラー:', error);
        
        let errorMessage = '文字認識に失敗しました。もう一度撮影してください。';
        
        if (error instanceof Error) {
          if (error.message.includes('API')) {
            errorMessage = error.message;
          } else if (error.message.includes('環境変数')) {
            errorMessage = 'API設定に問題があります。管理者にお問い合わせください。';
          }
        }
        
        setError({
          type: 'OCR_ERROR',
          message: errorMessage,
          details: error,
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processImage();
  }, [capturedImage, navigate, setOcrResult, setCurrentStep, setError, setIsProcessing]);

  const handleRetry = () => {
    navigate('/camera');
  };

  if (error) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          ❌ 処理エラー
        </Typography>
        
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
            <Button
              variant="contained"
              onClick={handleRetry}
              startIcon={<Refresh />}
              size="large"
            >
              再撮影する
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        🔍 文字を読み取り中
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Search sx={{ fontSize: 60, color: 'primary.main' }} />
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            {statusMessage}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 2,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />

          <Typography variant="body2" color="text.secondary">
            {progress}% 完了
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ⏳ しばらくお待ちください...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            手書きの文字を認識し、データを整理しています。
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProcessingPage;