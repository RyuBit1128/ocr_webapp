// 確認状態の型定義
export type ConfirmationStatus = 'pending' | 'approved' | 'editing';

// ヘッダー情報の型定義
export interface HeaderInfo {
  作業日?: string; // OCRで読み取らないため、オプショナルに
  工場名: string;
  商品名: string;
  作業時間: string;
  // 補正情報
  originalProductName?: string;
  productConfidence?: number;
  productMatchType?: 'exact' | 'fuzzy' | 'no_match';
  productError?: boolean;
  // 確認状態
  productConfirmationStatus?: ConfirmationStatus;
}

// 休憩情報の型定義
export interface BreakInfo {
  昼休み: boolean;
  中休み: boolean;
}

// 時刻ペアの型定義
export interface TimeSlot {
  開始時刻: string;
  終了時刻: string;
}

// 包装作業記録の型定義
export interface PackagingRecord {
  氏名: string;
  開始時刻: string;
  終了時刻: string;
  時刻リスト?: TimeSlot[]; // 複数時刻対応
  休憩: BreakInfo;
  生産数: string;
  // 補正情報
  originalName?: string;
  confidence?: number;
  matchType?: 'exact' | 'lastname' | 'fuzzy' | 'no_match';
  isLastNameMatch?: boolean;
  nameError?: boolean;
  // 確認状態
  nameConfirmationStatus?: ConfirmationStatus;
}

// 機械操作記録の型定義
export interface MachineOperationRecord {
  氏名: string;
  開始時刻: string;
  終了時刻: string;
  時刻リスト?: TimeSlot[]; // 複数時刻対応
  休憩: BreakInfo;
  生産数: string;
  // 補正情報
  originalName?: string;
  confidence?: number;
  matchType?: 'exact' | 'lastname' | 'fuzzy' | 'no_match';
  isLastNameMatch?: boolean;
  nameError?: boolean;
  // 確認状態
  nameConfirmationStatus?: ConfirmationStatus;
}

// OCR結果の型定義
export interface OcrResult {
  ヘッダー: HeaderInfo;
  包装作業記録: PackagingRecord[];
  機械操作記録: MachineOperationRecord[];
}

// 補正結果の型定義
export interface CorrectionResult {
  original: string;
  corrected: string;
  confidence: number;
  isManuallyEdited: boolean;
}

// マスターデータの型定義
export interface MasterData {
  employees: string[];
  products: string[];
}

// 作業記録の型定義（スプレッドシート用）
export interface WorkRecord {
  date: string;
  workplace: string;
  product: string;
  startTime: string;
  endTime: string;
  completedCount: number;
  breaks: string;
  machineOperation: string;
  notes: string;
}

// アプリケーションの状態型定義
export interface AppState {
  // 撮影状態
  capturedImage: string | null;
  setCapturedImage: (image: string | null) => void;
  
  // OCR結果
  ocrResult: OcrResult | null;
  setOcrResult: (result: OcrResult | null) => void;
  
  // 編集状態
  editedData: WorkRecord[] | null;
  setEditedData: (data: WorkRecord[] | null) => void;
  
  // 処理状態
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  
  // エラー状態
  error: string | null;
  setError: (error: string | null) => void;
  
  // 成功状態
  success: string | null;
  setSuccess: (success: string | null) => void;
}

// Google Sheets API関連の型定義
export interface SheetData {
  values: string[][];
}

export interface BatchUpdateRequest {
  requests: any[];
}

// エラーハンドリング用の型定義
export type ErrorType = 'OCR_ERROR' | 'SHEETS_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'MASTER_DATA_ERROR';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
}

// マスターデータエラーの詳細タイプ
export type MasterDataErrorType = 
  | 'API_KEY_BLOCKED'        // APIキー制限エラー
  | 'UNAUTHORIZED'           // 認証エラー  
  | 'PERMISSION_DENIED'      // 権限エラー
  | 'NOT_FOUND'             // スプレッドシート/シート未存在
  | 'NETWORK_ERROR'         // ネットワークエラー
  | 'INVALID_RESPONSE'      // レスポンス解析エラー
  | 'EMPTY_DATA'            // データが空
  | 'CONFIG_ERROR';         // 設定エラー

export interface MasterDataError extends Error {
  errorType: MasterDataErrorType;
  status?: number;
  canRetry: boolean;        // 再試行で解決可能か
  userAction: string;       // ユーザーへの推奨アクション
  details?: any;
}