/**
 * 環境に応じたログレベル管理システム
 * 本番環境では機密情報を含むデバッグログを自動的に無効化
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableTimestamp: boolean;
  maskSensitiveData: boolean;
  enableProductionLogs: boolean;
}

class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  private constructor() {
    // 環境に応じた設定
    const isDev = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
    
    this.config = {
      level: isDev ? 'debug' : 'error',  // 本番では error のみ
      enableConsole: isDev,              // 本番ではコンソール出力無効
      enableTimestamp: isDev,
      maskSensitiveData: !isDev,         // 本番では機密データをマスク
      enableProductionLogs: true,        // 本番でも重要ログは表示
    };

    if (isDev) {
      console.log('🔧 Logger初期化 - 開発モード (全ログ有効)');
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enableConsole) return false;
    
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      none: 4
    };
    
    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(_level: LogLevel, message: string, ...args: any[]): [string, ...any[]] {
    let formattedMessage = message;
    
    if (this.config.enableTimestamp) {
      const timestamp = new Date().toLocaleTimeString();
      formattedMessage = `[${timestamp}] ${formattedMessage}`;
    }
    
    // 機密データのマスク処理
    if (this.config.maskSensitiveData) {
      args = args.map(arg => this.maskSensitiveData(arg));
    }
    
    return [formattedMessage, ...args];
  }

  private maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // APIキーのマスク
      if (data.startsWith('sk-') || data.includes('googleapis.com')) {
        return data.substring(0, 8) + '***';
      }
      // URLからAPIキーを除去
      if (data.includes('key=')) {
        return data.replace(/key=[^&]+/g, 'key=***');
      }
      // アクセストークンのマスク
      if (data.startsWith('ya29.') || data.length > 50) {
        return data.substring(0, 10) + '***';
      }
      // 日本人名らしきデータのマスク（3文字以上の日本語）
      if (data.length >= 3 && data.length <= 8 && /^[ぁ-んァ-ヶー一-龯]+$/.test(data)) {
        return data.charAt(0) + '*'.repeat(data.length - 1);
      }
    }
    
    if (Array.isArray(data)) {
      return data.length > 0 ? [`[${data.length}件のデータ]`] : [];
    }
    
    if (typeof data === 'object' && data !== null) {
      const masked: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.includes('token') || key.includes('key') || key.includes('secret') || key.includes('Api')) {
          masked[key] = '***';
        } else if (key.includes('employees') || key.includes('products')) {
          masked[key] = Array.isArray(value) ? `[${value.length}件]` : value;
        } else {
          masked[key] = this.maskSensitiveData(value);
        }
      }
      return masked;
    }
    
    return data;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('debug', message, ...args);
      console.log(`🔍 ${formattedMessage}`, ...formattedArgs);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('info', message, ...args);
      console.info(`ℹ️ ${formattedMessage}`, ...formattedArgs);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('warn', message, ...args);
      console.warn(`⚠️ ${formattedMessage}`, ...formattedArgs);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('error', message, ...args);
      console.error(`❌ ${formattedMessage}`, ...formattedArgs);
    }
  }

  // 成功メッセージ（本番でも重要な情報は表示）
  success(message: string, ...args: any[]): void {
    if (this.config.enableProductionLogs || this.config.enableConsole) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('info', message, ...args);
      console.log(`✅ ${formattedMessage}`, ...formattedArgs);
    }
  }

  // 開発環境専用ログ
  dev(message: string, ...args: any[]): void {
    if (import.meta.env.DEV) {
      console.log(`🧪 [DEV] ${message}`, ...args);
    }
  }

  // 本番環境でも表示する重要なログ
  production(message: string, ...args: any[]): void {
    if (this.config.enableProductionLogs) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('info', message, ...args);
      console.log(`🏭 ${formattedMessage}`, ...formattedArgs);
    }
  }

  // APIコール関連（統計用・本番でも表示）
  api(message: string, ...args: any[]): void {
    if (this.config.enableProductionLogs) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('info', message, ...args);
      console.log(`📡 ${formattedMessage}`, ...formattedArgs);
    }
  }

  // プロセス進行状況（ユーザー体験向上）
  process(message: string, ...args: any[]): void {
    if (this.config.enableProductionLogs || this.config.enableConsole) {
      const [formattedMessage, ...formattedArgs] = this.formatMessage('info', message, ...args);
      console.log(`⚙️ ${formattedMessage}`, ...formattedArgs);
    }
  }
}

// シングルトンインスタンス
export const logger = Logger.getInstance();

// 従来のconsole.logの代替関数（段階的移行用）
export const log = {
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  success: (message: string, ...args: any[]) => logger.success(message, ...args),
  dev: (message: string, ...args: any[]) => logger.dev(message, ...args),
  production: (message: string, ...args: any[]) => logger.production(message, ...args),
  api: (message: string, ...args: any[]) => logger.api(message, ...args),
  process: (message: string, ...args: any[]) => logger.process(message, ...args),
}; 