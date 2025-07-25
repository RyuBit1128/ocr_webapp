import { OcrResult, PackagingRecord, MachineOperationRecord } from '@/types';
import { FuzzyMatchService } from './fuzzyMatchService';
import { GoogleSheetsService } from './googleSheetsService';
import { log } from '@/utils/logger';

/**
 * OCR結果のデータ補正サービス
 */
export class DataCorrectionService {
  /**
   * OCR結果全体を補正
   */
  static async correctOcrResult(ocrResult: OcrResult): Promise<OcrResult> {
    const masterData = await GoogleSheetsService.getMasterData();
    
    log.process('データ補正開始');
    log.debug('マスターデータ取得完了', {
      employees: masterData.employees.length,
      products: masterData.products.length
    });
    
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
    
    // 補正結果のログ出力（開発環境のみ）
    log.process('データ補正完了');
    
    // 商品名の補正結果
    if (correctedHeader.originalProductName) {
      log.debug('商品名補正実行', {
        confidence: Math.round((correctedHeader.productConfidence || 0) * 100)
      });
    }
    
    // 包装作業者の補正結果
    if (correctedPackaging.length > 0) {
      log.debug('包装作業者名補正完了', { count: correctedPackaging.length });
      correctedPackaging.forEach((record, index) => {
        log.dev(`包装作業者${index + 1}: ${record.originalName || record.氏名} → ${record.氏名} (${Math.round((record.confidence || 0) * 100)}%)`);
      });
    }
    
    // 機械操作者の補正結果
    if (correctedMachine.length > 0) {
      log.debug('機械操作者名補正完了', { count: correctedMachine.length });
      correctedMachine.forEach((record, index) => {
        log.dev(`機械操作者${index + 1}: ${record.originalName || record.氏名} → ${record.氏名} (${Math.round((record.confidence || 0) * 100)}%)`);
      });
    }
    
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
        
        // 信頼度が低い場合、またはマスターデータに存在しない場合はエラーフラグを設定
        if (productMatch.confidence < 0.4 || !products.includes(productMatch.match)) {
          correctedHeader.productError = true;
        }
      } else {
        // マッチする商品が見つからない場合もエラーフラグを設定
        correctedHeader.productError = true;
      }
    } else {
      // 商品名が空の場合もエラーフラグを設定
      correctedHeader.productError = true;
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
        log.dev(`包装作業マッチング: ${record.氏名} → ${nameMatch.match} (${Math.round((nameMatch.confidence || 0) * 100)}%)`);
        
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
            log.warn('包装作業者名マッチング信頼度が低い', {
              confidence: Math.round(nameMatch.confidence * 100)
            });
          }
        } else {
          // マッチが見つからない場合（信頼度0%）
          correctedRecord.originalName = record.氏名;
          correctedRecord.氏名 = record.氏名; // 元の名前をそのまま使用
          correctedRecord.confidence = 0;
          correctedRecord.matchType = 'no_match';
          correctedRecord.nameError = true;
          log.warn('包装作業者名マッチング失敗 - エラーフラグ設定');
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
        log.dev(`機械操作マッチング: ${record.氏名} → ${nameMatch.match} (${Math.round((nameMatch.confidence || 0) * 100)}%)`);
        
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
            log.warn('機械操作者名マッチング信頼度が低い', {
              confidence: Math.round(nameMatch.confidence * 100)
            });
          }
        } else {
          // マッチが見つからない場合（信頼度0%）
          correctedRecord.originalName = record.氏名;
          correctedRecord.氏名 = record.氏名; // 元の名前をそのまま使用
          correctedRecord.confidence = 0;
          correctedRecord.matchType = 'no_match';
          correctedRecord.nameError = true;
          log.warn('機械操作者名マッチング失敗 - エラーフラグ設定');
        }
      }
      
      return correctedRecord;
    });
  }
}