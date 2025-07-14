import { useState, useEffect } from 'react';
import { GoogleSheetsService } from '@/services/googleSheetsService';

export interface MasterData {
  employees: string[];
  products: string[];
}

export const useMasterData = () => {
  const [masterData, setMasterData] = useState<MasterData>({ employees: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);
        const data = await GoogleSheetsService.getMasterData();
        setMasterData(data);
        setError(null);
      } catch (err) {
        console.error('マスターデータの取得に失敗:', err);
        setError('マスターデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  return { masterData, loading, error };
};