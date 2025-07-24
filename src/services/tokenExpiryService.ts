/**
 * トークン期限監視サービス
 * 認証期限の10分前に警告を表示し、ユーザーに更新を促す
 */
import { log } from '@/utils/logger';

export class TokenExpiryService {
  private static warningShown = false;
  private static monitoringTimer: NodeJS.Timeout | null = null;
  private static countdownTimer: NodeJS.Timeout | null = null;
  
  /**
   * トークン期限監視を開始
   */
  static startMonitoring(): void {
    this.stopMonitoring(); // 既存の監視を停止
    
    const expiresAt = localStorage.getItem('google_token_expires_at');
          if (!expiresAt) {
        log.debug('トークン期限情報がありません');
        return;
      }
      
      const expiryTime = parseInt(expiresAt, 10);
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      
      if (timeUntilExpiry <= 0) {
        log.debug('トークンは既に期限切れです');
        return;
      }
    
    // 10分前に警告（最低5秒後に実行）
    const warningTime = Math.max(timeUntilExpiry - (10 * 60 * 1000), 5000);
    
    this.monitoringTimer = setTimeout(() => {
      this.showRenewalDialog();
    }, warningTime);
    
          const expiryDate = new Date(expiryTime);
      const warningDate = new Date(now + warningTime);
      log.debug('認証監視開始', {
        expiryTime: expiryDate.toLocaleTimeString(),
        warningTime: warningDate.toLocaleTimeString()
      });
  }
  
  /**
   * 認証更新ダイアログを表示
   */
  private static showRenewalDialog(): void {
    if (this.warningShown) return;
    this.warningShown = true;
    
          log.production('認証更新ダイアログを表示');
    
    // カスタムイベントでダイアログ表示を要求
    const event = new CustomEvent('show-auth-renewal-dialog', {
      detail: {
        remainingTime: this.getRemainingTime()
      }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * 残り時間を秒単位で取得
   */
  static getRemainingTime(): number {
    const expiresAt = localStorage.getItem('google_token_expires_at');
    if (!expiresAt) return 0;
    
    const expiryTime = parseInt(expiresAt, 10);
    const now = Date.now();
    const remainingMs = expiryTime - now;
    
    return Math.max(Math.floor(remainingMs / 1000), 0);
  }
  
  /**
   * 監視を停止
   */
  static stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearTimeout(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.warningShown = false;
          log.debug('トークン監視を停止');
  }
  
  /**
   * 監視をリセット（認証成功後に使用）
   */
      static resetMonitoring(): void {
      log.debug('トークン監視をリセット');
      this.warningShown = false;
      this.startMonitoring();
    }
  
  /**
   * 現在の監視状態を取得
   */
  static getMonitoringStatus(): {
    isMonitoring: boolean;
    expiryTime: Date | null;
    remainingTime: number;
  } {
    const expiresAt = localStorage.getItem('google_token_expires_at');
    const isMonitoring = this.monitoringTimer !== null;
    const expiryTime = expiresAt ? new Date(parseInt(expiresAt, 10)) : null;
    const remainingTime = this.getRemainingTime();
    
    return {
      isMonitoring,
      expiryTime,
      remainingTime
    };
  }

  /**
   * デバッグ用: テスト用ダイアログを即座に表示
   * 開発・デバッグ時のみ使用
   */
      static showTestDialog(): void {
      log.dev('テスト用認証ダイアログを表示');
    
    const event = new CustomEvent('show-auth-renewal-dialog', {
      detail: {
        remainingTime: 600 // 10分のテスト
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * デバッグ用: 短時間でのテスト監視を開始（5秒後に警告）
   * 開発・デバッグ時のみ使用
   */
      static startTestMonitoring(): void {
      this.stopMonitoring();
      
      log.dev('テスト監視を開始（5秒後に警告表示）');
    
    this.monitoringTimer = setTimeout(() => {
      this.showRenewalDialog();
    }, 5000); // 5秒後に表示
  }
} 