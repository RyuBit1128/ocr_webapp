import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { CameraAlt, Upload, CloudUpload } from '@mui/icons-material';
import { useAppStore } from '@/stores/appStore';

const CameraPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const { setCapturedImage, setCurrentStep } = useAppStore();



  // ファイルアップロード
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 画像ファイルかチェック
      if (!file.type.startsWith('image/')) {
        setCameraError('画像ファイルを選択してください（JPG、PNG、GIF）');
        return;
      }

      // ファイルサイズチェック（10MB以下）
      if (file.size > 10 * 1024 * 1024) {
        setCameraError('ファイルサイズは10MB以下にしてください');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          processImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 画像処理（撮影・アップロード共通）
  const processImage = (imageSrc: string) => {
    setIsCapturing(true);
    setCapturedImage(imageSrc);
    setCurrentStep(2);
    
    // 少し遅延を入れてから次のページに遷移
    setTimeout(() => {
      navigate('/processing');
    }, 500);
  };

  // ファイル選択ダイアログを開く
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };



  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        作業記録簿を読み取り
      </Typography>

      {cameraError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {cameraError}
        </Alert>
      )}

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* アクションボタン */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={openFileDialog}
          disabled={isCapturing}
          startIcon={isCapturing ? <CircularProgress size={24} /> : <CloudUpload />}
          sx={{ 
            minWidth: '200px',
          }}
        >
          {isCapturing ? '処理中...' : '📁 ファイルを選択 / 撮影する'}
        </Button>
      </Stack>


      {/* 使用方法の説明 */}
      <Card sx={{ textAlign: 'left' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CameraAlt sx={{ mr: 1 }} /> 使用方法
          </Typography>
          <Typography variant="body1" component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>📝 作業記録簿全体が画面に収まるようにしてください</li>
            <li>💡 明るい場所で撮影してください</li>
            <li>📐 記録簿が水平になるように調整してください</li>
            <li>🚫 影や反射を避けてください</li>
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Upload sx={{ mr: 1 }} /> ファイルアップロード
          </Typography>
          <Typography variant="body1" component="ul" sx={{ pl: 2, mb: 0 }}>
            <li>📁 JPG、PNG、GIFファイルに対応</li>
            <li>📏 ファイルサイズは10MB以下</li>
            <li>🖼️ 既に撮影済みの画像を使用できます</li>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CameraPage;