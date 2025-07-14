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
  Divider,
  Stack,
} from '@mui/material';
import { CameraAlt, PhotoCamera, Refresh, Upload, CloudUpload } from '@mui/icons-material';
import Webcam from 'react-webcam';
import { useAppStore } from '@/stores/appStore';

const CameraPage: React.FC = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const { setCapturedImage, setCurrentStep, resetData } = useAppStore();

  // カメラ設定
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: { ideal: 'environment' }, // 背面カメラを優先
  };

  // 写真撮影
  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      processImage(imageSrc);
    }
  };

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
          setUploadedImage(result);
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

  // カメラエラーハンドリング
  const handleCameraError = (error: string | DOMException) => {
    console.error('カメラエラー:', error);
    setCameraError('カメラにアクセスできません。設定を確認してください。');
  };

  // データリセット
  const handleReset = () => {
    resetData();
    setCameraError(null);
    setIsCapturing(false);
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        📷 作業記録簿を読み取り
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          {cameraError ? (
            <Box sx={{ py: 4 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {cameraError}
              </Alert>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<Refresh />}
                size="large"
              >
                再試行
              </Button>
            </Box>
          ) : uploadedImage ? (
            <Box sx={{ position: 'relative' }}>
              <img
                src={uploadedImage}
                alt="アップロードされた画像"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: 'auto',
                  borderRadius: '12px',
                }}
              />
              
              {isCapturing && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    borderRadius: '12px',
                  }}
                >
                  <CircularProgress size={60} sx={{ color: 'white' }} />
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMediaError={handleCameraError}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: 'auto',
                  borderRadius: '12px',
                }}
              />
              
              {isCapturing && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    borderRadius: '12px',
                  }}
                >
                  <CircularProgress size={60} sx={{ color: 'white' }} />
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

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
          onClick={capturePhoto}
          disabled={!!cameraError || isCapturing || !!uploadedImage}
          startIcon={isCapturing ? <CircularProgress size={24} /> : <PhotoCamera />}
          sx={{ 
            minWidth: '200px',
            bgcolor: isCapturing ? 'grey.400' : 'primary.main',
          }}
        >
          {isCapturing ? '撮影中...' : '📸 撮影する'}
        </Button>
        
        <Divider sx={{ my: 2 }}>または</Divider>
        
        <Button
          variant="outlined"
          size="large"
          onClick={openFileDialog}
          disabled={isCapturing}
          startIcon={<CloudUpload />}
          sx={{ 
            minWidth: '200px',
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          }}
        >
          📁 ファイルを選択
        </Button>
      </Stack>

      {uploadedImage && (
        <Button
          variant="text"
          onClick={handleReset}
          startIcon={<Refresh />}
          sx={{ mb: 2 }}
        >
          リセット
        </Button>
      )}

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