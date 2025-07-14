import { OcrResult } from '@/types';
import { EnvironmentValidator } from '@/utils/envConfig';

/**
 * Google Sheets API を使用したデータ管理サービス
 */
export class GoogleSheetsService {
  private static config = EnvironmentValidator.getConfig();
  private static accessToken: string | null = null;

  /**
   * Google OAuth認証を開始
   */
  static async authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.google) {
        reject(new Error('Google API ライブラリが読み込まれていません'));
        return;
      }

      window.google.accounts.oauth2.initTokenClient({
        client_id: this.config.googleClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`認証エラー: ${response.error}`));
            return;
          }
          this.accessToken = response.access_token;
          resolve(response.access_token);
        },
      }).requestAccessToken();
    });
  }

  /**
   * アクセストークンの有効性をチェック
   */
  static async validateToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 必要に応じて認証を実行
   */
  private static async ensureAuthenticated(): Promise<void> {
    const isValid = await this.validateToken();
    if (!isValid) {
      await this.authenticate();
    }
  }

  /**
   * マスターデータ（従業員・商品一覧）を取得
   * 従業員マスターのA列：氏名、B列：商品名から取得
   */
  static async getMasterData(): Promise<{
    employees: string[];
    products: string[];
  }> {
    await this.ensureAuthenticated();

    try {
      // 管理シートからA列とB列を取得
      const masterDataResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/管理!A:B?key=${this.config.googleApiKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!masterDataResponse.ok) {
        throw new Error('マスターデータの取得に失敗しました');
      }

      const masterData = await masterDataResponse.json();

      if (!masterData.values || masterData.values.length === 0) {
        throw new Error('マスターデータが空です');
      }

      // A列（氏名）とB列（商品名）を分離
      const employees: string[] = [];
      const productSet = new Set<string>();

      masterData.values.forEach((row: string[]) => {
        // A列：氏名
        if (row[0] && row[0].trim()) {
          employees.push(row[0].trim());
        }
        // B列：商品名
        if (row[1] && row[1].trim()) {
          productSet.add(row[1].trim());
        }
      });

      const products = Array.from(productSet);

      console.log('マスターデータを取得しました:', {
        employees: employees.length,
        products: products.length,
      });

      return { employees, products };

    } catch (error) {
      console.error('マスターデータ取得エラー:', error);
      
      // フォールバック用のダミーデータ
      return {
        employees: [
          '田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '渡辺健',
          '土橋舞子', '野沢真紀', '今村健太郎', '山田次郎', '小林恵美',
        ],
        products: [
          'クリアファイル', 'プラスチック容器', 'ビニール袋',
          'パッケージボックス', 'シュリンクフィルム',
        ],
      };
    }
  }

  /**
   * 個人シートにデータを保存
   */
  static async saveToPersonalSheets(ocrResult: OcrResult): Promise<void> {
    await this.ensureAuthenticated();

    try {
      // 全作業者のリストを作成
      const allWorkers = [
        ...(ocrResult.作業者記録 || []).map(record => record.氏名),
        ...(ocrResult.機械操作記録 || []).map(record => record.氏名),
      ].filter(name => name && name.trim());

      console.log('========================');
      console.log('💾 Google Sheetsへの保存開始');
      console.log('========================');
      console.log(`📅 作業日: ${ocrResult.ヘッダー.作業日}`);
      console.log(`🏭 工場名: ${ocrResult.ヘッダー.工場名}`);
      console.log(`📦 商品名: ${ocrResult.ヘッダー.商品名}`);
      console.log(`👥 対象作業者: ${allWorkers.join(', ')}`);

      // 各作業者の個人シートに保存
      const savePromises = allWorkers.map(async (workerName) => {
        await this.saveWorkerData(workerName, ocrResult);
      });

      await Promise.all(savePromises);
      
      console.log('✅ 全ての個人シートへの保存が完了しました');
      console.log('========================');

    } catch (error) {
      console.error('❌ 個人シート保存エラー:', error);
      throw new Error('データの保存に失敗しました。ネットワーク接続を確認してください。');
    }
  }

  /**
   * 個別の作業者データを保存
   */
  private static async saveWorkerData(workerName: string, ocrResult: OcrResult): Promise<void> {
    if (!workerName || !workerName.trim()) return;

    const sheetName = `${workerName}_記録`;
    
    // 作業者の作業者記録を検索
    const packagingRecord = ocrResult.作業者記録.find(record => record.氏名 === workerName);
    // 作業者の機械操作記録を検索
    const machineRecord = ocrResult.機械操作記録.find(record => record.氏名 === workerName);

    if (!packagingRecord && !machineRecord) {
      return; // この作業者のデータがない場合はスキップ
    }

    // 複数の時刻スロットがある場合、それぞれの時刻に対して行を作成
    const allRows: string[][] = [];
    
    if (packagingRecord) {
      // 時刻リストがある場合はそれを使用、なければ基本時刻を使用
      const timeSlots = packagingRecord.時刻リスト || [{ 開始時刻: packagingRecord.開始時刻, 終了時刻: packagingRecord.終了時刻 }];
      
      timeSlots.forEach(timeSlot => {
        const rowData = [
          ocrResult.ヘッダー.作業日,
          ocrResult.ヘッダー.工場名,
          ocrResult.ヘッダー.商品名,
          workerName,
          '作業者作業',
          timeSlot.開始時刻,
          timeSlot.終了時刻,
          packagingRecord.休憩.昼休み ? '有' : '無',
          packagingRecord.休憩.中休み ? '有' : '無',
          packagingRecord.生産数,
          new Date().toISOString(), // 登録日時
        ];
        allRows.push(rowData);
      });
    }
    
    if (machineRecord) {
      // 時刻リストがある場合はそれを使用、なければ基本時刻を使用
      const timeSlots = machineRecord.時刻リスト || [{ 開始時刻: machineRecord.開始時刻, 終了時刻: machineRecord.終了時刻 }];
      
      timeSlots.forEach(timeSlot => {
        const rowData = [
          ocrResult.ヘッダー.作業日,
          ocrResult.ヘッダー.工場名,
          ocrResult.ヘッダー.商品名,
          workerName,
          '機械操作',
          timeSlot.開始時刻,
          timeSlot.終了時刻,
          machineRecord.休憩.昼休み ? '有' : '無',
          machineRecord.休憩.中休み ? '有' : '無',
          machineRecord.生産数,
          new Date().toISOString(), // 登録日時
        ];
        allRows.push(rowData);
      });
    }

    try {
      // 全ての行データを一度に追加
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}!A:K:append?valueInputOption=RAW&key=${this.config.googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: allRows,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // シートが存在しない場合は作成を試みる
        if (response.status === 400 && errorData.error?.message?.includes('Unable to parse range')) {
          await this.createWorkerSheet(sheetName);
          // シート作成後に再度データを追加
          await this.saveWorkerData(workerName, ocrResult);
          return;
        }
        
        throw new Error(`個人シート保存エラー (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      console.log(`📝 ${workerName}のデータを保存しました (${allRows.length}行)`);

    } catch (error) {
      console.error(`${workerName}のデータ保存エラー:`, error);
      throw error;
    }
  }

  /**
   * 作業者用のシートを作成
   */
  private static async createWorkerSheet(sheetName: string): Promise<void> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}:batchUpdate?key=${this.config.googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`シート作成エラー: ${errorData.error?.message || response.statusText}`);
      }

      // ヘッダー行を追加
      const headerResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}!A1:K1?valueInputOption=RAW&key=${this.config.googleApiKey}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [
              [
                '作業日',
                '工場名', 
                '商品名',
                '氏名',
                '作業種別',
                '開始時刻',
                '終了時刻',
                '昼休み',
                '中休み',
                '生産数',
                '登録日時',
              ],
            ],
          }),
        }
      );

      if (!headerResponse.ok) {
        console.warn('ヘッダー行の追加に失敗しました');
      }

      console.log(`シート "${sheetName}" を作成しました`);

    } catch (error) {
      console.error('シート作成エラー:', error);
      throw error;
    }
  }

  /**
   * Google Sheetsが利用可能かチェック
   */
  static async checkAvailability(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}?key=${this.config.googleApiKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Google API ライブラリの型定義
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}