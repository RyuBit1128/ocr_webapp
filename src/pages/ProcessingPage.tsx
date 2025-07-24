import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useAppStore } from '@/stores/appStore';
import { OpenAIOcrService } from '@/services/ocrService';
import { DataCorrectionService } from '@/services/dataCorrectionService';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { log } from '@/utils/logger';

const ProcessingPage: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('画像を分析中...');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  
  const {
    capturedImage,
    setOcrResult,
    setCurrentStep,
    setError,
    setIsProcessing,
    error,
    resetData,
  } = useAppStore();

  // 撮影画像がない場合はカメラページに戻る
  useEffect(() => {
    if (!capturedImage) {
      navigate('/camera');
      return;
    }
  }, [capturedImage, navigate]);

  // OCR処理状態を管理
  const [hasProcessed, setHasProcessed] = useState(false);

  // 実際のOCR処理
  useEffect(() => {
    if (!capturedImage) return;
    
    // 既に処理済み、またはエラーがある場合は処理しない
    if (hasProcessed || error) return;

    const processImage = async () => {
      setIsProcessing(true);
      setCurrentStep(2);
      setHasProcessed(true); // 処理開始をマーク
      
      try {
        // プログレスバーとメッセージの更新を受け取るコールバック
        const onProgress = (progressValue: number, message: string) => {
          setProgress(progressValue);
          setStatusMessage(message);
        };

        // 事前認証チェック（認証が必要な場合は自動的にリダイレクト）
        setStatusMessage('認証を確認中...');
        setProgress(5);
        try {
          await GoogleSheetsService.checkAuthentication();
                  } catch (authError) {
            // 認証エラーの場合は自動的にリダイレクトされるため、ここには通常到達しない
            log.debug('認証チェックでリダイレクトが発生');
            return;
          }

        // OpenAI Vision APIでOCR処理
        setStatusMessage('画像を分析中...');
        setProgress(10);
        const ocrResult = await OpenAIOcrService.processImage(capturedImage, onProgress);

        // データ補正処理
        setStatusMessage('データを補正中...');
        setProgress(95);
        const correctedResult = await DataCorrectionService.correctOcrResult(ocrResult);
        
        // デフォルトの作業日を今日の日付に設定
                  if (!correctedResult.ヘッダー.作業日 || correctedResult.ヘッダー.作業日 === 'undefined') {
            const today = new Date();
            correctedResult.ヘッダー.作業日 = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
            log.debug('作業日をデフォルト値に設定', correctedResult.ヘッダー.作業日);
          }
        
        setProgress(100);
        setStatusMessage('処理完了！');
        setOcrResult(correctedResult);
                  setCurrentStep(3);
          
          log.process('OCR処理完了 - 確認画面に移動');
          setTimeout(() => {
            navigate('/confirmation');
          }, 1000);
        
      } catch (error) {
        log.error('OCR処理エラー:', error);
        
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
          log.debug('エラーダイアログを表示');
          setErrorDialogOpen(true);
      } finally {
        setIsProcessing(false);
      }
    };

    processImage();
  }, [capturedImage, hasProcessed, error, navigate, setOcrResult, setCurrentStep, setError, setIsProcessing]);

  // エラーが発生したらダイアログを開く
  useEffect(() => {
    if (error) {
      setErrorDialogOpen(true);
    }
  }, [error]);


      const handleErrorConfirm = () => {
      log.debug('確認ボタンが押された');
      // ローカル状態をリセット
      setErrorDialogOpen(false);
    setHasProcessed(false);
    setProgress(0);
    setStatusMessage('画像を分析中...');
    // グローバル状態をリセット
    resetData();
    // replaceを使って履歴を置き換え、確実に遷移
    navigate('/camera', { replace: true });
  };

  if (error) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          🔍 文字を読み取り中
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <CircularProgress sx={{ fontSize: 60, color: 'primary.main' }} />
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            処理中にエラーが発生しました
          </Typography>

          <LinearProgress
            variant="determinate"
            value={100}
            color="error"
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
            エラーが発生しました
          </Typography>
        </Paper>

        {/* エラーダイアログ */}
        <Dialog
          open={errorDialogOpen}
          onClose={() => {}}
          aria-labelledby="error-dialog-title"
          aria-describedby="error-dialog-description"
          maxWidth="sm"
          fullWidth
          disableEscapeKeyDown
        >
          <DialogTitle id="error-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress color="error" />
            読み取りエラー
          </DialogTitle>
          <DialogContent>
            <Typography id="error-dialog-description" sx={{ fontSize: '16px' }}>
              {error.message}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleErrorConfirm} 
              color="primary" 
              variant="contained"
              autoFocus
            >
              確認
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        🔍 文字を読み取り中
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress sx={{ fontSize: 60, color: 'primary.main' }} />
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
      </Paper>

      <Paper>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CircularProgress size={24} />
        </Box>
        <Typography variant="body1">
          ⏳ しばらくお待ちください...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          手書きの文字を認識し、データを整理しています。
        </Typography>
      </Paper>
    </Box>
  );
};

export default ProcessingPage;