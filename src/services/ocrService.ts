import { OcrResult } from '@/types';
import { OCR_PROMPT, OCR_CONFIG } from '@/prompts/ocrPrompt';
import { EnvironmentValidator } from '@/utils/envConfig';

/**
 * OpenAI Vision APIを使用したOCRサービス
 */
export class OpenAIOcrService {
  private static config: any = null;
  
  private static getConfig() {
    if (!this.config) {
      try {
        this.config = EnvironmentValidator.getConfig();
      } catch (error) {
        console.warn('環境設定の読み込みに失敗しました:', error);
        this.config = {
          openaiApiKey: '',
          googleClientId: '',
          googleApiKey: '',
          spreadsheetId: '',
          appName: '作業記録簿OCR',
          appVersion: '1.0.0',
          isDev: false
        };
      }
    }
    return this.config;
  }


  /**
   * 画像を圧縮（ファイルサイズ制限対応）
   */
  private static async compressImage(imageData: string, maxSizeKB: number = 2048): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // 最大サイズを制限（長辺1600px以下）
        const maxDimension = 1600;
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        const calculateDimensions = (w: number, h: number) => {
          if (w > h && w > maxDimension) {
            return { width: maxDimension, height: (h * maxDimension) / w };
          } else if (h > maxDimension) {
            return { width: (w * maxDimension) / h, height: maxDimension };
          }
          return { width: w, height: h };
        };
        
        const { width, height } = calculateDimensions(originalWidth, originalHeight);
        
        canvas.width = width;
        canvas.height = height;
        
        // 高品質でリサイズ
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPEG品質を調整してファイルサイズを制限
        const compressWithQuality = (currentQuality: number): string => {
          const data = canvas.toDataURL('image/jpeg', currentQuality);
          const maxSize = maxSizeKB * 1024 * 4/3;
          
          if (data.length <= maxSize || currentQuality <= 0.3) {
            return data;
          }
          
          return compressWithQuality(currentQuality - 0.1);
        };
        
        const compressedData = compressWithQuality(0.9);
        resolve(compressedData);
      };
      img.src = imageData;
    });
  }

  /**
   * OpenAI Vision APIでOCR処理を実行
   */
  static async processImage(
    imageData: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<OcrResult> {
    try {
      onProgress?.(10, '画像を準備中...');
      
      // 画像データの形式を確認・変換
      const processedImageData = imageData.startsWith('data:image/') 
        ? imageData 
        : `data:image/jpeg;base64,${imageData}`;

      // 画像を圧縮
      onProgress?.(20, '画像を最適化中...');
      const compressedImage = await this.compressImage(processedImageData);
      
      onProgress?.(30, 'OpenAI APIに接続中...');
      
      // ユーザー指定のモデルを使用
      const requestBody = {
        model: 'gpt-4.1', // gpt-4.1モデルを使用
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: OCR_PROMPT
              },
              {
                type: 'image_url',
                image_url: {
                  url: compressedImage,
                  detail: 'high' // 高解像度解析を有効
                }
              }
            ]
          }
        ],
        max_tokens: OCR_CONFIG.max_tokens,
        temperature: OCR_CONFIG.temperature,
      };

      onProgress?.(50, '文字認識を実行中...');

      // OpenAI APIへのリクエスト
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getConfig().openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      onProgress?.(80, 'レスポンスを処理中...');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API エラー (${response.status}): ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('OpenAI APIから無効なレスポンスが返されました');
      }

      const content = data.choices[0].message.content;
      
      onProgress?.(90, 'データを解析中...');

      // JSONレスポンスを解析
      const parseOcrResult = (): OcrResult => {
        try {
          // JSONブロックを抽出（```json ... ``` の場合に対応）
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : content;
          
          return JSON.parse(jsonString.trim());
        } catch (parseError) {
          console.error('JSON解析エラー:', parseError);
          console.error('レスポンス内容:', content);
          throw new Error('OCR結果の解析に失敗しました。画像が不鮮明な可能性があります。');
        }
      };
      
      const ocrResult = parseOcrResult();

      // レスポンス形式の検証
      if (!ocrResult.ヘッダー || !ocrResult.包装作業記録) {
        throw new Error('OCR結果の形式が正しくありません。もう一度撮影してください。');
      }

      onProgress?.(100, '処理完了');

      // 使用量をログ出力
      if (data.usage) {
        console.log('OpenAI API使用量:', {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        });
      }

      // OCR結果の詳細ログ出力
      console.log('========================');
      console.log('🔍 OCR結果 (GPT-4.1 Vision)');
      console.log('========================');
      console.log('📋 ヘッダー情報:');
      console.log(`  作業日: ${ocrResult.ヘッダー.作業日}`);
      console.log(`  工場名: ${ocrResult.ヘッダー.工場名}`);
      console.log(`  商品名: ${ocrResult.ヘッダー.商品名}`);
      console.log(`  作業時間: ${ocrResult.ヘッダー.作業時間}`);
      
      console.log('\n👥 包装作業記録:');
      if (ocrResult.包装作業記録 && ocrResult.包装作業記録.length > 0) {
        ocrResult.包装作業記録.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.氏名}`);
          console.log(`     開始時刻: ${record.開始時刻}`);
          console.log(`     終了時刻: ${record.終了時刻}`);
          console.log(`     休憩: 昼休み=${record.休憩.昼休み ? '有' : '無'}, 中休み=${record.休憩.中休み ? '有' : '無'}`);
          console.log(`     生産数: ${record.生産数}`);
          if (record.時刻リスト && record.時刻リスト.length > 1) {
            console.log(`     時刻リスト:`);
            record.時刻リスト.forEach((timeSlot, timeIndex) => {
              console.log(`       ${timeIndex + 1}. ${timeSlot.開始時刻} - ${timeSlot.終了時刻}`);
            });
          }
        });
      } else {
        console.log('  なし');
      }
      
      console.log('\n⚙️ 機械操作記録:');
      if (ocrResult.機械操作記録 && ocrResult.機械操作記録.length > 0) {
        ocrResult.機械操作記録.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.氏名}`);
          console.log(`     開始時刻: ${record.開始時刻}`);
          console.log(`     終了時刻: ${record.終了時刻}`);
          console.log(`     休憩: 昼休み=${record.休憩.昼休み ? '有' : '無'}, 中休み=${record.休憩.中休み ? '有' : '無'}`);
          console.log(`     生産数: ${record.生産数}`);
          if (record.時刻リスト && record.時刻リスト.length > 1) {
            console.log(`     時刻リスト:`);
            record.時刻リスト.forEach((timeSlot, timeIndex) => {
              console.log(`       ${timeIndex + 1}. ${timeSlot.開始時刻} - ${timeSlot.終了時刻}`);
            });
          }
        });
      } else {
        console.log('  なし');
      }

      console.log('\n📊 補正情報:');
      // ヘッダーの補正情報
      if ((ocrResult.ヘッダー as any).originalProductName) {
        console.log(`  商品名: ${(ocrResult.ヘッダー as any).originalProductName} → ${ocrResult.ヘッダー.商品名} (${Math.round(((ocrResult.ヘッダー as any).productConfidence || 0) * 100)}%)`);
      }
      
      // 包装作業記録の補正情報
      (ocrResult.包装作業記録 || []).forEach((record, index) => {
        if (record.originalName) {
          console.log(`  作業者${index + 1}: ${record.originalName} → ${record.氏名} (${Math.round((record.confidence || 0) * 100)}%)`);
        }
      });
      
      // 機械操作記録の補正情報
      (ocrResult.機械操作記録 || []).forEach((record, index) => {
        if (record.originalName) {
          console.log(`  機械操作者${index + 1}: ${record.originalName} → ${record.氏名} (${Math.round((record.confidence || 0) * 100)}%)`);
        }
      });
      
      console.log('========================');

      return ocrResult;

    } catch (error) {
      console.error('OCR処理エラー:', error);
      
      // エラータイプに応じたメッセージを返す
      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          throw new Error('API利用制限に達しました。しばらく待ってから再試行してください。');
        }
        if (error.message.includes('insufficient_quota')) {
          throw new Error('API利用枠を超過しました。設定を確認してください。');
        }
        if (error.message.includes('invalid_api_key')) {
          throw new Error('APIキーが無効です。設定を確認してください。');
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('ネットワークエラーが発生しました。接続を確認してください。');
        }
        throw error;
      }
      
      throw new Error('OCR処理中に予期しないエラーが発生しました。');
    }
  }

  /**
   * APIキーの有効性をチェック
   */
  static async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.getConfig().openaiApiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}