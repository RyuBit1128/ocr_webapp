import { useState, useEffect } from 'react';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { MasterDataError } from '@/types';

export interface MasterData {
  employees: string[];
  products: string[];
}

export const useMasterData = () => {
  const [masterData, setMasterData] = useState<MasterData>({ employees: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MasterDataError | null>(null);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await GoogleSheetsService.getMasterData();
      setMasterData(data);
    } catch (err) {
      console.error('マスターデータの取得に失敗:', err);
      if (err && typeof err === 'object' && 'errorType' in err) {
        // MasterDataErrorの場合
        setError(err as MasterDataError);
      } else {
        // その他のエラーの場合、汎用的なMasterDataErrorに変換
        const genericError = new Error('予期しないエラーが発生しました') as MasterDataError;
        genericError.errorType = 'CONFIG_ERROR';
        genericError.canRetry = true;
        genericError.userAction = 'ページを更新して再度お試しください';
        genericError.details = err;
        setError(genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  return { 
    masterData, 
    loading, 
    error,
    refetch: fetchMasterData  // 再取得用の関数も提供
  };
};