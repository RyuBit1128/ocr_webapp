/**
 * 曖昧一致・名字一致サービス
 */

interface MatchResult {
  match: string | null;
  confidence: number;
  type: 'exact' | 'lastname' | 'fuzzy' | 'no_match';
  isLastNameMatch?: boolean;
}

export class FuzzyMatchService {
  /**
   * レーベンシュタイン距離を計算
   */
  private static calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    // 初期化: 最初の行を設定
    Array.from({ length: str1.length + 1 }, (_, i) => {
      matrix[0][i] = i;
    });

    // 初期化: 最初の列を設定
    Array.from({ length: str2.length + 1 }, (_, j) => {
      matrix[j][0] = j;
    });

    // 動的プログラミングで距離を計算
    Array.from({ length: str2.length }, (_, j) => {
      Array.from({ length: str1.length }, (_, i) => {
        const rowIndex = j + 1;
        const colIndex = i + 1;
        const indicator = str1[i] === str2[j] ? 0 : 1;
        
        matrix[rowIndex][colIndex] = Math.min(
          matrix[rowIndex][colIndex - 1] + 1, // 削除
          matrix[rowIndex - 1][colIndex] + 1, // 挿入
          matrix[rowIndex - 1][colIndex - 1] + indicator, // 置換
        );
      });
    });

    return matrix[str2.length][str1.length];
  }

  /**
   * 文字列の類似度を計算（0-1の範囲）
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const distance = this.calculateLevenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1.0 - (distance / maxLength);
  }

  /**
   * 名字を抽出（スペースまたは全角スペースで分割）
   */
  private static extractLastName(fullName: string): string {
    // スペースまたは全角スペースで分割し、最初の部分を名字として扱う
    const parts = fullName.split(/[\s　]+/);
    return parts[0] || fullName;
  }

  /**
   * 名字一致を含む曖昧一致検索（優先度付き）
   * 優先度: 完全一致 > 名字一致 > ファジーマッチング
   * 必ず最も近い人を返す（スプレッドシートの人しかいない前提）
   */
  static findBestMatch(input: string, candidates: string[]): MatchResult {
    if (!input || candidates.length === 0) {
      return { match: null, confidence: 0, type: 'no_match' };
    }

    const trimmedInput = input.trim();

    // 1. 完全一致チェック（最優先）
    const exactMatch = candidates.find(candidate => 
      candidate.trim() === trimmedInput
    );
    if (exactMatch) {
      return { match: exactMatch, confidence: 1.0, type: 'exact' };
    }

    // 2. 名字一致チェック（苗字のみの入力に対応）
    const inputLastName = this.extractLastName(trimmedInput);
    
    // 名字のみの入力の場合の処理
    if (trimmedInput === inputLastName) {
      for (const candidate of candidates) {
        const candidateLastName = this.extractLastName(candidate);
        
        // 名字が完全一致する場合（同じ苗字の人がいないという前提）
        if (inputLastName === candidateLastName) {
          return { 
            match: candidate, 
            confidence: 0.95, 
            type: 'lastname',
            isLastNameMatch: true 
          };
        }
      }
    }

    // 3. ファジーマッチング（手書き誤字対応）
    // 必ず最も近い人を返す
    const findBestFuzzyMatch = (): MatchResult => {
      return candidates.reduce((bestMatch, candidate) => {
        // 全体での類似度
        const fullSimilarity = this.calculateSimilarity(trimmedInput, candidate);
        
        // 名字での類似度も考慮
        const candidateLastName = this.extractLastName(candidate);
        const lastNameSimilarity = this.calculateSimilarity(inputLastName, candidateLastName);
        
        // より高い類似度を採用（名字の類似度を重視）
        const similarity = Math.max(fullSimilarity, lastNameSimilarity * 0.9);
        
        if (similarity > bestMatch.confidence) {
          return { 
            match: candidate, 
            confidence: similarity,
            type: 'fuzzy' 
          };
        }
        
        return bestMatch;
      }, { match: null, confidence: 0, type: 'no_match' } as MatchResult);
    };

    // 必ず最も近い人を返す（閾値なし）
    return findBestFuzzyMatch();
  }

  /**
   * 商品名の厳密マッチング（スプレッドシートB列の値のみ許可）
   * 必ず最も近い商品を返す
   */
  static findBestProductMatch(input: string, candidates: string[]): MatchResult {
    if (!input || candidates.length === 0) {
      return { match: null, confidence: 0, type: 'no_match' };
    }

    const trimmedInput = input.trim();

    // 1. 完全一致チェック（最優先）
    const exactMatch = candidates.find(candidate => 
      candidate.trim() === trimmedInput
    );
    if (exactMatch) {
      return { match: exactMatch, confidence: 1.0, type: 'exact' };
    }

    // 2. 大文字小文字を無視した完全一致
    const caseInsensitiveMatch = candidates.find(candidate => 
      candidate.trim().toLowerCase() === trimmedInput.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      return { match: caseInsensitiveMatch, confidence: 0.98, type: 'exact' };
    }

    // 3. ファジーマッチング（手書き誤字対応）
    // 必ず最も近い商品を返す
    const findBestProductFuzzyMatch = (): MatchResult => {
      return candidates.reduce((bestMatch, candidate) => {
        // 通常の類似度
        const regularSimilarity = this.calculateSimilarity(trimmedInput, candidate);
        
        // カタカナの濁音・半濁音を正規化して比較
        const normalizedInput = this.normalizeKatakana(trimmedInput);
        const normalizedCandidate = this.normalizeKatakana(candidate);
        const normalizedSimilarity = this.calculateSimilarity(normalizedInput, normalizedCandidate);
        
        // より高い類似度を採用
        const similarity = Math.max(regularSimilarity, normalizedSimilarity);
        
        if (similarity > bestMatch.confidence) {
          return { 
            match: candidate, 
            confidence: similarity,
            type: 'fuzzy' 
          };
        }
        
        return bestMatch;
      }, { match: null, confidence: 0, type: 'no_match' } as MatchResult);
    };

    // 必ず最も近い商品を返す（閾値なし）
    return findBestProductFuzzyMatch();
  }

  /**
   * カタカナの濁音・半濁音を正規化
   */
  private static normalizeKatakana(str: string): string {
    return str
      .replace(/[ガギグゲゴ]/g, match => String.fromCharCode(match.charCodeAt(0) - 1))
      .replace(/[ザジズゼゾ]/g, match => String.fromCharCode(match.charCodeAt(0) - 1))
      .replace(/[ダヂヅデド]/g, match => String.fromCharCode(match.charCodeAt(0) - 1))
      .replace(/[バビブベボ]/g, match => String.fromCharCode(match.charCodeAt(0) - 1))
      .replace(/[パピプペポ]/g, match => String.fromCharCode(match.charCodeAt(0) - 2));
  }
}