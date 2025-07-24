/**
 * マスターデータのキャッシュ管理システム
 * ローカルストレージにTTL付きでマスターデータをキャッシュ
 */

export interface MasterData {
  employees: string[];
  products: string[];
}

interface CachedMasterData {
  data: MasterData;
  timestamp: number;
  version: string;
}

export class MasterDataCache {
  private static readonly CACHE_KEY = 'masterData_cache';
  private static readonly CACHE_VERSION = '1.0';
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30分

  /**
   * キャッシュからマスターデータを取得
   */
  static getCachedData(): MasterData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cachedData: CachedMasterData = JSON.parse(cached);
      
      // バージョンチェック
      if (cachedData.version !== this.CACHE_VERSION) {
        this.clearCache();
        return null;
      }

      // TTLチェック
      const age = Date.now() - cachedData.timestamp;
      if (age > this.CACHE_TTL) {
        this.clearCache();
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.warn('マスターデータキャッシュ読み込みエラー:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * マスターデータをキャッシュに保存
   */
  static setCachedData(data: MasterData): void {
    try {
      const cachedData: CachedMasterData = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('マスターデータキャッシュ保存エラー:', error);
    }
  }

  /**
   * キャッシュをクリア
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('マスターデータキャッシュクリアエラー:', error);
    }
  }

  /**
   * キャッシュの状態を取得
   */
  static getCacheStatus(): {
    exists: boolean;
    age: number;
    isValid: boolean;
  } {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        return { exists: false, age: 0, isValid: false };
      }

      const cachedData: CachedMasterData = JSON.parse(cached);
      const age = Date.now() - cachedData.timestamp;
      const isValid = cachedData.version === this.CACHE_VERSION && age <= this.CACHE_TTL;

      return { exists: true, age, isValid };
    } catch (error) {
      return { exists: false, age: 0, isValid: false };
    }
  }
}