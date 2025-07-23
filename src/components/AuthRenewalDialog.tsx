import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  LinearProgress,
  Box,
  Chip,
} from '@mui/material';
import { AccessTime, Security, Refresh } from '@mui/icons-material';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { TokenExpiryService } from '@/services/tokenExpiryService';

const AuthRenewalDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10分 = 600秒
  const [isRenewing, setIsRenewing] = useState(false);

  // ダイアログ表示イベントのリスナー
  useEffect(() => {
    const handleShowDialog = (event: CustomEvent) => {
      const remainingTime = event.detail?.remainingTime || 600;
      setCountdown(remainingTime);
      setOpen(true);
      console.log('🔔 認証更新ダイアログを表示:', { remainingTime });
    };

    window.addEventListener('show-auth-renewal-dialog', handleShowDialog as EventListener);
    
    return () => {
      window.removeEventListener('show-auth-renewal-dialog', handleShowDialog as EventListener);
    };
  }, []);

  // カウントダウンタイマー
  useEffect(() => {
    if (!open || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          setOpen(false);
          return 0;
        }
        return newCount;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdown]);

  // 時間フォーマット関数
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // 進行状況の計算（10分 = 600秒）
  const progressValue = Math.max(((600 - countdown) / 600) * 100, 0);

  // 認証更新処理
  const handleRenewAuth = async () => {
    setIsRenewing(true);
    try {
      console.log('🔄 認証更新を開始します');
      await GoogleSheetsService.authenticate();
      // リダイレクトされるため、この行には到達しない
    } catch (error) {
      console.error('❌ 認証更新エラー:', error);
      setIsRenewing(false);
    }
  };

  // 後で対応する
  const handleLater = () => {
    setOpen(false);
    console.log('⏰ 認証更新を延期しました');
    
    // 5分後に再度警告
    setTimeout(() => {
      if (TokenExpiryService.getRemainingTime() > 0) {
        setCountdown(TokenExpiryService.getRemainingTime());
        setOpen(true);
      }
    }, 5 * 60 * 1000);
  };

  // 緊急度による色の決定
  const getUrgencyColor = (): 'warning' | 'error' => {
    return countdown <= 300 ? 'error' : 'warning'; // 5分以下なら赤
  };

  // 緊急度によるアイコンの決定
  const getUrgencyIcon = () => {
    return countdown <= 300 ? '🚨' : '🕒';
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'background.paper',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Security color={getUrgencyColor()} fontSize="large" />
          <Typography variant="h6" component="span">
            {getUrgencyIcon()} 認証の更新が必要です
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body1" color="text.primary" sx={{ mb: 2 }}>
            Google認証の有効期限が近づいています
          </Typography>
          
          {/* 残り時間表示 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            <AccessTime color={getUrgencyColor()} />
            <Typography variant="h5" color={getUrgencyColor()}>
              残り {formatTime(countdown)}
            </Typography>
          </Box>

          {/* プログレスバー */}
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progressValue}
              color={getUrgencyColor()}
              sx={{ 
                height: 8, 
                borderRadius: 4,
                bgcolor: `${getUrgencyColor()}.light`,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                }
              }}
            />
          </Box>

          {/* 状態チップ */}
          <Chip
            icon={countdown <= 300 ? undefined : <AccessTime />}
            label={countdown <= 300 ? '緊急' : '警告'}
            color={getUrgencyColor()}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary">
            {countdown <= 300 
              ? '作業中の場合は保存してから更新してください' 
              : '今すぐ更新するか、5分後に再度通知します'
            }
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1, justifyContent: 'center' }}>
        {countdown > 300 && (
          <Button 
            onClick={handleLater}
            variant="outlined"
            color="secondary"
            sx={{ minWidth: 100 }}
          >
            後で
          </Button>
        )}
        
        <Button 
          onClick={handleRenewAuth}
          variant="contained"
          color={getUrgencyColor()}
          disabled={isRenewing}
          startIcon={isRenewing ? undefined : <Refresh />}
          sx={{ 
            minWidth: 140,
            fontWeight: 600,
          }}
          autoFocus
        >
          {isRenewing ? '更新中...' : '今すぐ更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthRenewalDialog; 