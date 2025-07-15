/**
 * 環境変数設定と検証
 */

interface EnvConfig {
  openaiApiKey: string;
  googleClientId: string;
  googleApiKey: string;
  spreadsheetId: string;
  appName: string;
  appVersion: string;
  isDev: boolean;
}

class EnvironmentValidator {
  private static validateRequired(value: string | undefined, name: string): string {
    if (!value || value.includes('your_') || value === '') {
      // 本番環境では設定画面から入力できるようにする
      console.warn(`環境変数 ${name} が設定されていません。設定画面から入力してください。`);
      return '';
    }
    return value;
  }

  static getConfig(): EnvConfig {
    const config: EnvConfig = {
      openaiApiKey: this.validateRequired(import.meta.env.VITE_OPENAI_API_KEY, 'VITE_OPENAI_API_KEY'),
      googleClientId: this.validateRequired(import.meta.env.VITE_GOOGLE_CLIENT_ID, 'VITE_GOOGLE_CLIENT_ID'),
      googleApiKey: this.validateRequired(import.meta.env.VITE_GOOGLE_API_KEY, 'VITE_GOOGLE_API_KEY'),
      spreadsheetId: this.validateRequired(import.meta.env.VITE_SPREADSHEET_ID, 'VITE_SPREADSHEET_ID'),
      appName: import.meta.env.VITE_APP_NAME || '作業記録簿OCR',
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      isDev: import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV === true,
    };

    console.log('環境設定を読み込みました:', {
      ...config,
      openaiApiKey: config.openaiApiKey.substring(0, 8) + '...',
      googleApiKey: config.googleApiKey.substring(0, 8) + '...',
    });

    return config;
  }

  static validateOpenAIKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }

  static validateGoogleClientId(clientId: string): boolean {
    return clientId.includes('.googleusercontent.com');
  }

  static validateSpreadsheetId(id: string): boolean {
    return /^[a-zA-Z0-9-_]{44}$/.test(id);
  }
}

export { EnvironmentValidator };
export type { EnvConfig };