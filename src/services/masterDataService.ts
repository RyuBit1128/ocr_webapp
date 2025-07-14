import { MasterData } from '@/types';

/**
 * マスターデータ管理サービス
 * 現時点ではダミーデータを使用。後でGoogle Sheets APIと連携
 */
export class MasterDataService {
  // ダミーのマスターデータ
  private static dummyMasterData: MasterData = {
    employees: [
      '土橋舞子',
      '野沢真紀',
      '渡野二三子',
      '菊池結音',
      '勝谷輝善',
      '金丸千恵子',
      '清水直美',
      '小森真澄',
      '田原川',
      'オレ',
      '針垣',
      '高垣',
      '今村龍太郎',
      '田中太郎',
      '佐藤花子',
      '山田次郎'
    ],
    products: [
      '11250プラスチック',
      'タラタラスティック',
      'お菓子A',
      'お菓子B',
      'プラスチック部品A',
      'プラスチック部品B',
      '包装資材セットA',
      '包装資材セットB'
    ]
  };

  /**
   * 従業員名リストを取得
   */
  static async getEmployeeNames(): Promise<string[]> {
    // 実際のアプリケーションではGoogle Sheets APIから取得
    // 現在はダミーデータを返す
    return this.dummyMasterData.employees;
  }

  /**
   * 商品名リストを取得
   */
  static async getProductNames(): Promise<string[]> {
    // 実際のアプリケーションではGoogle Sheets APIから取得
    // 現在はダミーデータを返す
    return this.dummyMasterData.products;
  }

  /**
   * マスターデータを取得
   */
  static async getMasterData(): Promise<MasterData> {
    // 実際のアプリケーションではGoogle Sheets APIから取得
    // 現在はダミーデータを返す
    return this.dummyMasterData;
  }

  /**
   * マスターデータをリフレッシュ
   */
  static async refreshMasterData(): Promise<void> {
    // 実際のアプリケーションではGoogle Sheets APIから最新データを取得
    // 現在は何もしない
    console.log('マスターデータをリフレッシュしました');
  }

  /**
   * 従業員が存在するかチェック
   */
  static async isEmployeeExists(name: string): Promise<boolean> {
    const employees = await this.getEmployeeNames();
    return employees.includes(name);
  }

  /**
   * 商品が存在するかチェック
   */
  static async isProductExists(name: string): Promise<boolean> {
    const products = await this.getProductNames();
    return products.includes(name);
  }
}