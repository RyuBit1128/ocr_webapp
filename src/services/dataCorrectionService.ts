import { OcrResult, PackagingRecord, MachineOperationRecord } from '@/types';
import { FuzzyMatchService } from './fuzzyMatchService';
import { GoogleSheetsService } from './googleSheetsService';

/**
 * OCR結果のデータ補正サービス
 */
export class DataCorrectionService {
  /**
   * OCR結果全体を補正
   */
  static async correctOcrResult(ocrResult: OcrResult): Promise<OcrResult> {
    const masterData = await GoogleSheetsService.getMasterData();
    
    console.log('🔧 データ補正開始');
    console.log(`📊 マスターデータ: 従業員${masterData.employees.length}名, 商品${masterData.products.length}種類`);
    console.log('👥 マスターデータ従業員一覧:', masterData.employees);
    
    // ヘッダー情報の補正
    const correctedHeader = await this.correctHeader(ocrResult.ヘッダー, masterData.products);
    
    // 包装作業記録の補正
    const correctedPackaging = await this.correctPackagingRecords(
      ocrResult.包装作業記録 || [],
      masterData.employees
    );
    
    // 機械操作記録の補正
    const correctedMachine = await this.correctMachineRecords(
      ocrResult.機械操作記録 || [],
      masterData.employees
    );
    
    const correctedResult = {
      ヘッダー: correctedHeader,
      包装作業記録: correctedPackaging,
      機械操作記録: correctedMachine
    };
    
    // 補正結果のログ出力
    console.log('========================');
    console.log('🔧 データ補正結果');
    console.log('========================');
    
    // 商品名の補正結果
    if (correctedHeader.originalProductName) {
      console.log(`📦 商品名補正: ${correctedHeader.originalProductName} → ${correctedHeader.商品名} (${Math.round((correctedHeader.productConfidence || 0) * 100)}%)`);
    }
    
    // 包装作業者の補正結果
    console.log('\n👥 包装作業者名補正:');
    correctedPackaging.forEach((record, index) => {
      // すべての記録を表示（originalNameの有無に関係なく）
      const confidenceColor = (record.confidence || 0) >= 0.9 ? '🟢' : (record.confidence || 0) >= 0.5 ? '🟡' : '🔴';
      const originalName = record.originalName || record.氏名;
      console.log(`  ${index + 1}. ${originalName} → ${record.氏名} ${confidenceColor}(${Math.round((record.confidence || 0) * 100)}%)`);
    });
    
    // 機械操作者の補正結果
    console.log('\n⚙️ 機械操作者名補正:');
    correctedMachine.forEach((record, index) => {
      // すべての記録を表示（originalNameの有無に関係なく）
      const confidenceColor = (record.confidence || 0) >= 0.9 ? '🟢' : (record.confidence || 0) >= 0.5 ? '🟡' : '🔴';
      const originalName = record.originalName || record.氏名;
      console.log(`  ${index + 1}. ${originalName} → ${record.氏名} ${confidenceColor}(${Math.round((record.confidence || 0) * 100)}%)`);
    });
    
    console.log('========================');
    
    return correctedResult;
  }

  /**
   * ヘッダー情報の補正
   */
  private static async correctHeader(header: any, products: string[]): Promise<any> {
    const correctedHeader = { ...header };
    
    // 商品名の補正（必ず最も近い商品を選択）
    if (header.商品名) {
      const productMatch = FuzzyMatchService.findBestProductMatch(header.商品名, products);
      
      if (productMatch.match) {
        correctedHeader.商品名 = productMatch.match;
        correctedHeader.originalProductName = header.商品名;
        correctedHeader.productConfidence = productMatch.confidence;
        correctedHeader.productMatchType = productMatch.type;
        
        // 元の商品名と修正後の商品名が違う場合のみ補正情報を記録
        if (header.商品名 !== productMatch.match) {
          correctedHeader.originalProductName = header.商品名;
        }
        
        // 信頼度が低い場合はエラーフラグを設定
        if (productMatch.confidence < 0.4) {
          correctedHeader.productError = true;
        }
      }
    }
    
    return correctedHeader;
  }

  /**
   * 包装作業記録の補正
   */
  private static async correctPackagingRecords(
    records: PackagingRecord[],
    employees: string[]
  ): Promise<PackagingRecord[]> {
    return records.map(record => {
      const correctedRecord = { ...record };
      
      // 氏名の補正（優先度付きマッチング）
      // スプレッドシートに記載されている人しかいない前提で必ず最も近い人を選択
      if (record.氏名) {
        const nameMatch = FuzzyMatchService.findBestMatch(record.氏名, employees);
        console.log(`🔍 マッチング結果 - 入力: ${record.氏名}, マッチ: ${nameMatch.match}, 信頼度: ${nameMatch.confidence}`);
        
        if (nameMatch.match) {
          // 元の名前を記録（補正結果の表示用）
          correctedRecord.originalName = record.氏名;
          correctedRecord.氏名 = nameMatch.match;
          correctedRecord.confidence = nameMatch.confidence;
          correctedRecord.matchType = nameMatch.type;
          correctedRecord.isLastNameMatch = nameMatch.isLastNameMatch;
          
          // 信頼度が低い場合はエラーフラグを設定
          if (nameMatch.confidence < 0.4) {
            correctedRecord.nameError = true;
            console.log(`🔴 エラーフラグ設定: ${record.氏名} → ${nameMatch.match} (${Math.round(nameMatch.confidence * 100)}%)`);
          }
        } else {
          // マッチが見つからない場合（信頼度0%）
          correctedRecord.originalName = record.氏名;
          correctedRecord.氏名 = record.氏名; // 元の名前をそのまま使用
          correctedRecord.confidence = 0;
          correctedRecord.matchType = 'no_match';
          correctedRecord.nameError = true;
          console.log(`🔴 マッチなし: ${record.氏名} - エラーフラグ設定`);
        }
      }
      
      return correctedRecord;
    });
  }

  /**
   * 機械操作記録の補正
   */
  private static async correctMachineRecords(
    records: MachineOperationRecord[],
    employees: string[]
  ): Promise<MachineOperationRecord[]> {
    return records.map(record => {
      const correctedRecord = { ...record };
      
      // 氏名の補正（優先度付きマッチング）
      // スプレッドシートに記載されている人しかいない前提で必ず最も近い人を選択
      if (record.氏名) {
        const nameMatch = FuzzyMatchService.findBestMatch(record.氏名, employees);
        console.log(`🔍 マッチング結果 - 入力: ${record.氏名}, マッチ: ${nameMatch.match}, 信頼度: ${nameMatch.confidence}`);
        
        if (nameMatch.match) {
          // 元の名前を記録（補正結果の表示用）
          correctedRecord.originalName = record.氏名;
          correctedRecord.氏名 = nameMatch.match;
          correctedRecord.confidence = nameMatch.confidence;
          correctedRecord.matchType = nameMatch.type;
          correctedRecord.isLastNameMatch = nameMatch.isLastNameMatch;
          
          // 信頼度が低い場合はエラーフラグを設定
          if (nameMatch.confidence < 0.4) {
            correctedRecord.nameError = true;
            console.log(`🔴 エラーフラグ設定: ${record.氏名} → ${nameMatch.match} (${Math.round(nameMatch.confidence * 100)}%)`);
          }
        } else {
          // マッチが見つからない場合（信頼度0%）
          correctedRecord.originalName = record.氏名;
          correctedRecord.氏名 = record.氏名; // 元の名前をそのまま使用
          correctedRecord.confidence = 0;
          correctedRecord.matchType = 'no_match';
          correctedRecord.nameError = true;
          console.log(`🔴 マッチなし: ${record.氏名} - エラーフラグ設定`);
        }
      }
      
      return correctedRecord;
    });
  }
}