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
   * スプレッドシート内の全シート名を取得
   */
  static async getAllSheetNames(): Promise<string[]> {
    if (!this.accessToken) {
      throw new Error('認証が必要です');
    }

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}?key=${this.config.googleApiKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`シート一覧取得エラー: ${response.statusText}`);
      }

      const data = await response.json();
      return data.sheets?.map((sheet: any) => sheet.properties.title) || [];
    } catch (error) {
      console.error('シート一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 作業日から適切な年月を計算（21日サイクル）
   */
  private static calculatePeriodYearMonth(workDate: Date): { year: number; month: number } {
    const year = workDate.getFullYear();
    const month = workDate.getMonth() + 1; // 0ベースなので+1
    const day = workDate.getDate();

    // 21日以降は翌月扱い
    if (day >= 21) {
      if (month === 12) {
        return { year: year + 1, month: 1 };
      } else {
        return { year, month: month + 1 };
      }
    } else {
      return { year, month };
    }
  }

  /**
   * 従業員名と作業日から個人シートを検索
   */
  static async findPersonalSheet(employeeName: string, workDate: string): Promise<string | null> {
    try {
      // 作業日をDateオブジェクトに変換
      const date = new Date(workDate);
      if (isNaN(date.getTime())) {
        throw new Error('無効な日付形式です');
      }

      // 21日サイクルで年月を計算
      const { year, month } = this.calculatePeriodYearMonth(date);
      
      // 期待されるシート名パターン
      const expectedSheetName = `${employeeName}_${year}年${month}月`;
      
      // 全シート名を取得
      const allSheetNames = await this.getAllSheetNames();
      
      // 完全一致を確認
      if (allSheetNames.includes(expectedSheetName)) {
        console.log(`✅ 個人シートが見つかりました: ${expectedSheetName}`);
        return expectedSheetName;
      }

      // 部分一致も試す（従業員名が完全一致しない場合）
      const partialMatch = allSheetNames.find(sheetName => {
        const pattern = new RegExp(`^${employeeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{4}年\\d{1,2}月$`);
        return pattern.test(sheetName);
      });

      if (partialMatch) {
        console.log(`⚠️ 部分一致で個人シートが見つかりました: ${partialMatch}`);
        return partialMatch;
      }

      console.log(`❌ 個人シートが見つかりません: ${expectedSheetName}`);
      console.log('利用可能なシート:', allSheetNames.filter(name => name.includes(employeeName)));
      
      return null;
    } catch (error) {
      console.error('個人シート検索エラー:', error);
      throw error;
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
        ...(ocrResult.包装作業記録 || []).map(record => record.氏名),
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

    console.log(`\n👤 作業者データ保存開始: ${workerName}`);
    console.log(`📅 作業日: ${ocrResult.ヘッダー.作業日}`);

    // 作業日から適切な個人シートを検索
    const personalSheetName = await this.findPersonalSheet(workerName, ocrResult.ヘッダー.作業日!);
    
    if (!personalSheetName) {
      console.log(`❌ 個人シートが見つかりません: ${workerName}`);
      throw new Error(`${workerName}の個人シートが見つかりません。シート名: {従業員名}_{YYYY}年{MM}月 で作成してください。`);
    }
    
    console.log(`📋 対象シート: ${personalSheetName}`);
    
    // 作業者の包装作業記録を検索
    const packagingRecord = ocrResult.包装作業記録.find(record => record.氏名 === workerName);
    // 作業者の機械操作記録を検索
    const machineRecord = ocrResult.機械操作記録.find(record => record.氏名 === workerName);

    console.log(`📦 包装作業記録: ${packagingRecord ? 'あり' : 'なし'}`);
    console.log(`⚙️ 機械操作記録: ${machineRecord ? 'あり' : 'なし'}`);

    if (!packagingRecord && !machineRecord) {
      console.log(`⚠️ ${workerName}のデータがないためスキップ`);
      return;
    }

    // スプレッドシート構造に従ってデータを保存
    await this.saveToPersonalSheetStructure(personalSheetName, ocrResult, packagingRecord, machineRecord);
    console.log(`✅ ${workerName}のデータ保存完了`);
  }


  /**
   * スプレッドシート構造.mdに従った個人シートへのデータ保存
   */
  private static async saveToPersonalSheetStructure(
    sheetName: string, 
    ocrResult: OcrResult, 
    packagingRecord: any, 
    machineRecord: any
  ): Promise<void> {
    try {
      // 作業日を正規化（M/D形式）
      const workDate = this.normalizeDate(ocrResult.ヘッダー.作業日!);
      console.log(`📋 シート「${sheetName}」への保存処理開始`);
      console.log(`📅 正規化された作業日: ${workDate}`);
      
      // 既存データの確認（A列の日付で検索）
      const existingRowIndex = await this.findExistingRowByDate(sheetName, workDate);
      console.log(`🔍 既存データ検索結果: ${existingRowIndex > 0 ? `行${existingRowIndex}に存在` : '新規データ'}`);
      
      // データ作成と保存
      let rowData: (string | number)[];
      
      if (existingRowIndex > 0) {
        // 既存行の場合：既存データと新規データを統合
        rowData = await this.createMergedRowData(sheetName, existingRowIndex, ocrResult, packagingRecord, machineRecord, workDate);
        await this.updatePersonalSheetRow(sheetName, existingRowIndex, rowData);
        console.log(`🔄 ${sheetName} の行${existingRowIndex}を更新しました (${workDate})`);
      } else {
        // 新規行の場合：新規データを作成
        rowData = this.createNewRowData(ocrResult, packagingRecord, machineRecord, workDate);
        await this.appendPersonalSheetRow(sheetName, rowData);
        console.log(`➕ ${sheetName} に新規行を追加しました (${workDate})`);
      }
      
      console.log(`✅ シート「${sheetName}」への保存完了`);
      
    } catch (error) {
      console.error(`❌ シート「${sheetName}」への保存エラー:`, error);
      throw error;
    }
  }

  /**
   * 日付をM/D形式に正規化
   */
  private static normalizeDate(dateStr: string): string {
    console.log(`📅 日付正規化処理: 入力値 "${dateStr}"`);
    
    // MM/DD形式（0埋めあり）を M/D形式に正規化
    let match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const normalized = `${month}/${day}`;
      if (normalized !== dateStr) {
        console.log(`✅ MM/DD形式を正規化: "${dateStr}" → "${normalized}"`);
        return normalized;
      } else {
        console.log(`✅ 既にM/D形式: "${dateStr}"`);
        return dateStr;
      }
    }
    
    // YYYY/MM/DD形式の場合
    match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (match) {
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      const normalized = `${month}/${day}`;
      console.log(`✅ YYYY/MM/DD形式から変換: "${dateStr}" → "${normalized}"`);
      return normalized;
    }
    
    // YYYY-MM-DD形式の場合
    match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      const normalized = `${month}/${day}`;
      console.log(`✅ YYYY-MM-DD形式から変換: "${dateStr}" → "${normalized}"`);
      return normalized;
    }
    
    // MM/DD/YYYY形式の場合
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const normalized = `${month}/${day}`;
      console.log(`✅ MM/DD/YYYY形式から変換: "${dateStr}" → "${normalized}"`);
      return normalized;
    }
    
    // その他の形式はそのまま返す
    console.log(`⚠️ 未対応形式のためそのまま返却: "${dateStr}"`);
    return dateStr;
  }

  /**
   * A列の日付で既存行を検索
   */
  private static async findExistingRowByDate(sheetName: string, workDate: string): Promise<number> {
    try {
      console.log(`🔍 既存行検索開始: シート "${sheetName}", 対象日付 "${workDate}"`);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}!A:A?key=${this.config.googleApiKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.log(`❌ A列取得API失敗: ${response.status} ${response.statusText}`);
        return -1;
      }

      const data = await response.json();
      const values = data.values || [];
      console.log(`📊 A列データ取得完了: ${values.length}行`);
      
      // すべてのA列の値をログ出力（デバッグ用）
      values.forEach((row: any[], index: number) => {
        if (row[0]) {
          console.log(`  A${index + 1}: "${row[0]}" ${row[0] === workDate ? '🎯 一致!' : ''}`);
        }
      });
      
      // A列の各セルで日付を検索（完全一致）
      for (let i = 0; i < values.length; i++) {
        const cellValue = values[i][0];
        if (cellValue === workDate) {
          const rowNumber = i + 1;
          console.log(`✅ 完全一致で既存行発見: 行${rowNumber} (A${rowNumber} = "${cellValue}")`);
          return rowNumber;
        }
      }
      
      // 完全一致しない場合、正規化して再検索
      console.log(`🔄 完全一致なし。正規化して再検索...`);
      const normalizedWorkDate = this.normalizeDate(workDate);
      console.log(`🎯 検索対象日付も正規化: "${workDate}" → "${normalizedWorkDate}"`);
      
      for (let i = 0; i < values.length; i++) {
        const cellValue = values[i][0];
        if (cellValue) {
          const normalizedCellValue = this.normalizeDate(cellValue.toString());
          
          // 両方を正規化して比較
          if (normalizedCellValue === normalizedWorkDate) {
            const rowNumber = i + 1;
            console.log(`✅ 正規化後一致で既存行発見: 行${rowNumber}`);
            console.log(`  シート値: "${cellValue}" → "${normalizedCellValue}"`);
            console.log(`  検索値: "${workDate}" → "${normalizedWorkDate}"`);
            return rowNumber;
          }
        }
      }
      
      console.log(`❌ 対象日付 "${workDate}" の既存行は見つかりませんでした`);
      return -1;
      
    } catch (error) {
      console.error('❌ 既存行検索エラー:', error);
      return -1;
    }
  }

  /**
   * 既存行の現在のデータを取得
   */
  private static async getCurrentRowData(sheetName: string, rowIndex: number): Promise<(string | number)[]> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}!A${rowIndex}:P${rowIndex}?key=${this.config.googleApiKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return new Array(16).fill('');
      }

      const data = await response.json();
      const values = data.values?.[0] || [];
      
      // 16列に調整（不足分は空文字で埋める）
      const currentData = new Array(16).fill('');
      for (let i = 0; i < Math.min(values.length, 16); i++) {
        currentData[i] = values[i] || '';
      }
      
      return currentData;
    } catch (error) {
      console.error('既存行データ取得エラー:', error);
      return new Array(16).fill('');
    }
  }

  /**
   * 既存行と新規データを統合した行データを作成
   */
  private static async createMergedRowData(
    sheetName: string,
    existingRowIndex: number,
    ocrResult: OcrResult, 
    packagingRecord: any, 
    machineRecord: any, 
    _workDate: string
  ): Promise<(string | number)[]> {
    // 既存行のデータを取得
    const existingData = await this.getCurrentRowData(sheetName, existingRowIndex);
    console.log(`📋 既存行${existingRowIndex}のデータを取得して統合`);
    
    // 新しい値がある場合のみ上書き（空の場合は既存値を保持）
    
    // A列: 日付は既存値を保持（検索に使った値なので変更しない）
    console.log(`  A列(日付): 既存値 "${existingData[0]}" を保持`);
    
    // C列: 商品名（新しい値がある場合のみ設定）
    if (ocrResult.ヘッダー.商品名) {
      existingData[2] = ocrResult.ヘッダー.商品名;
      console.log(`  C列(商品名): "${ocrResult.ヘッダー.商品名}" を設定`);
    }
    
    if (packagingRecord) {
      // 複数区間がある場合は連続労働時間を計算
      if (packagingRecord.時刻リスト && packagingRecord.時刻リスト.length > 1) {
        const continuousTime = this.calculateContinuousWorkTime(packagingRecord.時刻リスト);
        // D列: 開始時刻
        if (continuousTime.開始時刻) {
          existingData[3] = continuousTime.開始時刻;
          console.log(`  D列(包装開始): "${continuousTime.開始時刻}" を設定（連続労働時間計算）`);
        }
        // E列: 終了時刻
        if (continuousTime.終了時刻) {
          existingData[4] = continuousTime.終了時刻;
          console.log(`  E列(包装終了): "${continuousTime.終了時刻}" を設定（連続労働時間計算）`);
        }
      } else {
        // 単一区間の場合は従来通り
        if (packagingRecord.開始時刻) {
          existingData[3] = packagingRecord.開始時刻;
          console.log(`  D列(包装開始): "${packagingRecord.開始時刻}" を設定`);
        }
        if (packagingRecord.終了時刻) {
          existingData[4] = packagingRecord.終了時刻;
          console.log(`  E列(包装終了): "${packagingRecord.終了時刻}" を設定`);
        }
      }
      
      // F列: 休憩時間
      const restTime = this.calculateRestTime(packagingRecord.休憩);
      if (restTime && restTime !== '0:00') {
        existingData[5] = restTime;
        console.log(`  F列(包装休憩): "${restTime}" を設定`);
      }
      // H列: 生産数（新しい値がある場合のみ設定）
      if (packagingRecord.生産数) {
        existingData[7] = packagingRecord.生産数;
        console.log(`  H列(包装生産数): "${packagingRecord.生産数}" を設定`);
      }
    }
    
    if (machineRecord) {
      // 複数区間がある場合は連続労働時間を計算
      if (machineRecord.時刻リスト && machineRecord.時刻リスト.length > 1) {
        const continuousTime = this.calculateContinuousWorkTime(machineRecord.時刻リスト);
        // J列: 機械開始時刻
        if (continuousTime.開始時刻) {
          existingData[9] = continuousTime.開始時刻;
          console.log(`  J列(機械開始): "${continuousTime.開始時刻}" を設定（連続労働時間計算）`);
        }
        // K列: 機械終了時刻
        if (continuousTime.終了時刻) {
          existingData[10] = continuousTime.終了時刻;
          console.log(`  K列(機械終了): "${continuousTime.終了時刻}" を設定（連続労働時間計算）`);
        }
      } else {
        // 単一区間の場合は従来通り
        if (machineRecord.開始時刻) {
          existingData[9] = machineRecord.開始時刻;
          console.log(`  J列(機械開始): "${machineRecord.開始時刻}" を設定`);
        }
        if (machineRecord.終了時刻) {
          existingData[10] = machineRecord.終了時刻;
          console.log(`  K列(機械終了): "${machineRecord.終了時刻}" を設定`);
        }
      }
      
      // L列: 機械休憩時間
      const restTime = this.calculateRestTime(machineRecord.休憩);
      if (restTime && restTime !== '0:00') {
        existingData[11] = restTime;
        console.log(`  L列(機械休憩): "${restTime}" を設定`);
      }
      // N列: 機械生産数（新しい値がある場合のみ設定）
      if (machineRecord.生産数) {
        existingData[13] = machineRecord.生産数;
        console.log(`  N列(機械生産数): "${machineRecord.生産数}" を設定`);
      }
    }
    
    // P列: 備考（複数区間の情報がある場合のみ設定）
    const remarks = this.createRemarks(packagingRecord, machineRecord);
    if (remarks) {
      existingData[15] = remarks;
      console.log(`  P列(備考): "${remarks}" を設定`);
    }
    
    return existingData;
  }

  /**
   * 新規行データを作成
   */
  private static createNewRowData(
    ocrResult: OcrResult, 
    packagingRecord: any, 
    machineRecord: any, 
    workDate: string
  ): (string | number)[] {
    console.log(`📋 新規行データを作成`);
    const rowData: (string | number)[] = new Array(16).fill('');
    
    // A列: 日付
    rowData[0] = workDate;
    console.log(`  A列(日付): "${workDate}" を設定`);
    
    // C列: 商品名（値がある場合のみ設定）
    if (ocrResult.ヘッダー.商品名) {
      rowData[2] = ocrResult.ヘッダー.商品名;
      console.log(`  C列(商品名): "${ocrResult.ヘッダー.商品名}" を設定`);
    }
    
    if (packagingRecord) {
      // 複数区間がある場合は連続労働時間を計算
      if (packagingRecord.時刻リスト && packagingRecord.時刻リスト.length > 1) {
        const continuousTime = this.calculateContinuousWorkTime(packagingRecord.時刻リスト);
        // D列: 開始時刻
        if (continuousTime.開始時刻) {
          rowData[3] = continuousTime.開始時刻;
          console.log(`  D列(包装開始): "${continuousTime.開始時刻}" を設定（連続労働時間計算）`);
        }
        // E列: 終了時刻
        if (continuousTime.終了時刻) {
          rowData[4] = continuousTime.終了時刻;
          console.log(`  E列(包装終了): "${continuousTime.終了時刻}" を設定（連続労働時間計算）`);
        }
      } else {
        // 単一区間の場合は従来通り
        if (packagingRecord.開始時刻) {
          rowData[3] = packagingRecord.開始時刻;
          console.log(`  D列(包装開始): "${packagingRecord.開始時刻}" を設定`);
        }
        if (packagingRecord.終了時刻) {
          rowData[4] = packagingRecord.終了時刻;
          console.log(`  E列(包装終了): "${packagingRecord.終了時刻}" を設定`);
        }
      }
      
      // F列: 休憩時間
      const restTime = this.calculateRestTime(packagingRecord.休憩);
      if (restTime && restTime !== '0:00') {
        rowData[5] = restTime;
        console.log(`  F列(包装休憩): "${restTime}" を設定`);
      }
      // H列: 生産数（値がある場合のみ設定）
      if (packagingRecord.生産数) {
        rowData[7] = packagingRecord.生産数;
        console.log(`  H列(包装生産数): "${packagingRecord.生産数}" を設定`);
      }
    }
    
    if (machineRecord) {
      // 複数区間がある場合は連続労働時間を計算
      if (machineRecord.時刻リスト && machineRecord.時刻リスト.length > 1) {
        const continuousTime = this.calculateContinuousWorkTime(machineRecord.時刻リスト);
        // J列: 機械開始時刻
        if (continuousTime.開始時刻) {
          rowData[9] = continuousTime.開始時刻;
          console.log(`  J列(機械開始): "${continuousTime.開始時刻}" を設定（連続労働時間計算）`);
        }
        // K列: 機械終了時刻
        if (continuousTime.終了時刻) {
          rowData[10] = continuousTime.終了時刻;
          console.log(`  K列(機械終了): "${continuousTime.終了時刻}" を設定（連続労働時間計算）`);
        }
      } else {
        // 単一区間の場合は従来通り
        if (machineRecord.開始時刻) {
          rowData[9] = machineRecord.開始時刻;
          console.log(`  J列(機械開始): "${machineRecord.開始時刻}" を設定`);
        }
        if (machineRecord.終了時刻) {
          rowData[10] = machineRecord.終了時刻;
          console.log(`  K列(機械終了): "${machineRecord.終了時刻}" を設定`);
        }
      }
      
      // L列: 機械休憩時間
      const restTime = this.calculateRestTime(machineRecord.休憩);
      if (restTime && restTime !== '0:00') {
        rowData[11] = restTime;
        console.log(`  L列(機械休憩): "${restTime}" を設定`);
      }
      // N列: 機械生産数（値がある場合のみ設定）
      if (machineRecord.生産数) {
        rowData[13] = machineRecord.生産数;
        console.log(`  N列(機械生産数): "${machineRecord.生産数}" を設定`);
      }
    }
    
    // P列: 備考（複数区間の情報がある場合のみ設定）
    const remarks = this.createRemarks(packagingRecord, machineRecord);
    if (remarks) {
      rowData[15] = remarks;
      console.log(`  P列(備考): "${remarks}" を設定`);
    }
    
    return rowData;
  }

  /**
   * 時刻文字列を分数に変換
   */
  private static timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * 分数を時刻文字列に変換
   */
  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * 複数区間から連続的な労働時間を計算
   */
  private static calculateContinuousWorkTime(timeSlots: any[]): { 開始時刻: string; 終了時刻: string; 間の休憩時間: number } {
    if (!timeSlots || timeSlots.length <= 1) {
      // 単一区間または区間なしの場合はそのまま返す
      const slot = timeSlots?.[0] || { 開始時刻: '', 終了時刻: '' };
      return {
        開始時刻: slot.開始時刻,
        終了時刻: slot.終了時刻,
        間の休憩時間: 0
      };
    }

    // 時刻順にソート
    const sortedSlots = timeSlots
      .filter(slot => slot.開始時刻 && slot.終了時刻)
      .sort((a, b) => this.timeToMinutes(a.開始時刻) - this.timeToMinutes(b.開始時刻));

    if (sortedSlots.length === 0) {
      return { 開始時刻: '', 終了時刻: '', 間の休憩時間: 0 };
    }

    console.log(`📊 複数区間の連続労働時間計算:`);
    console.log(`  元区間: ${sortedSlots.map(slot => `${slot.開始時刻}-${slot.終了時刻}`).join(', ')}`);

    // 最初の開始時刻
    const startTime = sortedSlots[0].開始時刻;
    
    // 間の休憩時間を計算
    let totalBreakMinutes = 0;
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentEnd = this.timeToMinutes(sortedSlots[i].終了時刻);
      const nextStart = this.timeToMinutes(sortedSlots[i + 1].開始時刻);
      const breakMinutes = nextStart - currentEnd;
      
      if (breakMinutes > 0) {
        totalBreakMinutes += breakMinutes;
        console.log(`  休憩${i + 1}: ${sortedSlots[i].終了時刻}-${sortedSlots[i + 1].開始時刻} = ${breakMinutes}分`);
      }
    }

    // 最後の終了時刻から間の休憩時間を引く
    const lastEndTime = sortedSlots[sortedSlots.length - 1].終了時刻;
    const lastEndMinutes = this.timeToMinutes(lastEndTime);
    const adjustedEndMinutes = lastEndMinutes - totalBreakMinutes;
    const adjustedEndTime = this.minutesToTime(adjustedEndMinutes);

    console.log(`  間の休憩時間合計: ${totalBreakMinutes}分`);
    console.log(`  調整後終了時刻: ${lastEndTime} - ${totalBreakMinutes}分 = ${adjustedEndTime}`);
    console.log(`  スプレッドシート記録: ${startTime}-${adjustedEndTime}`);

    return {
      開始時刻: startTime,
      終了時刻: adjustedEndTime,
      間の休憩時間: totalBreakMinutes
    };
  }

  /**
   * 休憩時間を分数で計算
   */
  private static calculateRestTime(restInfo: any): string {
    if (!restInfo) return '0:00';
    
    let totalMinutes = 0;
    if (restInfo.昼休み) totalMinutes += 45; // 昼休み45分
    if (restInfo.中休み) totalMinutes += 15; // 中休み15分
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * 備考欄を作成（複数区間の場合）
   */
  private static createRemarks(packagingRecord: any, machineRecord: any): string {
    const remarks: string[] = [];
    
    if (packagingRecord?.時刻リスト && packagingRecord.時刻リスト.length > 1) {
      const timeSlots = packagingRecord.時刻リスト.map((slot: any) => 
        `${slot.開始時刻}-${slot.終了時刻}`
      ).join(', ');
      remarks.push(`元区間: ${timeSlots}`);
    }
    
    if (machineRecord?.時刻リスト && machineRecord.時刻リスト.length > 1) {
      const timeSlots = machineRecord.時刻リスト.map((slot: any) => 
        `${slot.開始時刻}-${slot.終了時刻}`
      ).join(', ');
      remarks.push(`機械区間: ${timeSlots}`);
    }
    
    return remarks.join(' | ');
  }

  /**
   * 個人シートの既存行を更新
   */
  private static async updatePersonalSheetRow(
    sheetName: string, 
    rowIndex: number, 
    rowData: (string | number)[]
  ): Promise<void> {
    console.log(`🔄 行更新API呼び出し: ${sheetName}!A${rowIndex}:P${rowIndex}`);
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}!A${rowIndex}:P${rowIndex}?valueInputOption=RAW&key=${this.config.googleApiKey}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ 行更新API失敗: ${response.status} ${response.statusText}`, errorData);
      throw new Error(`行更新エラー: ${errorData.error?.message || response.statusText}`);
    }
    
    console.log(`✅ 行更新API成功: ${sheetName} 行${rowIndex}`);
  }

  /**
   * 個人シートに新規行を追加
   */
  private static async appendPersonalSheetRow(
    sheetName: string, 
    rowData: (string | number)[]
  ): Promise<void> {
    console.log(`➕ 行追加API呼び出し: ${sheetName}!A:P`);
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}!A:P:append?valueInputOption=RAW&key=${this.config.googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ 行追加API失敗: ${response.status} ${response.statusText}`, errorData);
      throw new Error(`行追加エラー: ${errorData.error?.message || response.statusText}`);
    }
    
    const responseData = await response.json();
    const updatedRange = responseData.updates?.updatedRange;
    console.log(`✅ 行追加API成功: ${sheetName} - 追加範囲: ${updatedRange}`);
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