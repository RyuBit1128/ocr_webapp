import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Alert,
  Stack,
  Chip,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ja';
import {
  CheckCircle,
  Save,
  ArrowBack,
  Delete,
  Add,
  PersonAdd,
  Edit,
  Warning,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useAppStore } from '@/stores/appStore';
import { OcrResult, PackagingRecord, MachineOperationRecord } from '@/types';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { useMasterData } from '@/hooks/useMasterData';

const ConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const { ocrResult, setCurrentStep, setSuccess } = useAppStore();
  const { masterData, loading: masterDataLoading } = useMasterData();
  const [editedData, setEditedData] = useState<OcrResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [overwriteCallback, setOverwriteCallback] = useState<(() => Promise<void>) | null>(null);
  const [failedWorkers, setFailedWorkers] = useState<string[]>([]);
  const [missingSheetDialogOpen, setMissingSheetDialogOpen] = useState(false);
  const [missingSheetMessage, setMissingSheetMessage] = useState('');

  // 時間フォーマット関数
  const formatTimeInput = (input: string): string => {
    const numbersOnly = input.replace(/[^\d]/g, '');
    
    if (numbersOnly.length === 0) return '';
    
    if (numbersOnly.length <= 2) {
      return numbersOnly + ':00';
    } else if (numbersOnly.length === 3) {
      return numbersOnly[0] + ':' + numbersOnly.slice(1);
    } else if (numbersOnly.length === 4) {
      return numbersOnly.slice(0, 2) + ':' + numbersOnly.slice(2);
    } else {
      return numbersOnly.slice(0, 2) + ':' + numbersOnly.slice(2, 4);
    }
  };

  // 時刻リストの初期化（すべてのプロパティを保持）
  const initializeTimeSlots = (record: any): any => {
    if (!record.時刻リスト) {
      return {
        ...record, // すべてのプロパティ（nameError, confidence等）を保持
        時刻リスト: [{ 開始時刻: record.開始時刻, 終了時刻: record.終了時刻 }]
      };
    }
    return { ...record }; // すべてのプロパティを保持してコピー
  };

  // OCR結果がない場合はカメラページに戻る
  useEffect(() => {
    if (!ocrResult) {
      navigate('/camera');
      return;
    }
    setCurrentStep(3);
    
    // 開始時刻・終了時刻が両方nullまたは空のレコードを除外し、時刻リストを初期化
    const filterEmptyRecords = (records: any[]) => 
      records.filter(record => record.開始時刻 || record.終了時刻);
    
    // 先に時刻リストを初期化してから空レコードを除外（nameErrorプロパティを保持するため）
    const initializedData = {
      ...ocrResult,
      包装作業記録: filterEmptyRecords((ocrResult.包装作業記録 || []).map(initializeTimeSlots)),
      機械操作記録: filterEmptyRecords((ocrResult.機械操作記録 || []).map(initializeTimeSlots)),
    };
    
    // デバッグ用：nameErrorの確認
    console.log('🔍 読み取り結果確認画面でのnameError確認:');
    initializedData.包装作業記録?.forEach((record: any, index: number) => {
      if (record.nameError) {
        console.log(`  包装作業記録[${index}]: ${record.氏名} - nameError: ${record.nameError}`);
      }
    });
    initializedData.機械操作記録?.forEach((record: any, index: number) => {
      if (record.nameError) {
        console.log(`  機械操作記録[${index}]: ${record.氏名} - nameError: ${record.nameError}`);
      }
    });
    
    setEditedData(initializedData);
  }, [ocrResult, navigate, setCurrentStep]);

  if (!editedData || !ocrResult) {
    return null;
  }

  // ヘッダー情報の更新
  const updateHeader = (field: string, value: string) => {
    const updatedHeader = {
      ...editedData.ヘッダー,
      [field]: value,
    };
    
    // 商品名を更新した場合、productErrorをクリア
    if (field === '商品名' && masterData.products.includes(value)) {
      delete (updatedHeader as any).productError;
    }
    
    setEditedData({
      ...editedData,
      ヘッダー: updatedHeader,
    });
    setHasChanges(true);
  };

  // 包装作業記録の更新
  const updatePackagingRecord = (index: number, field: keyof PackagingRecord, value: any) => {
    const newRecords = [...editedData.包装作業記録];
    const updatedRecord = {
      ...newRecords[index],
      [field]: value,
    };
    
    // 氏名を更新した場合、nameErrorをクリア
    if (field === '氏名' && masterData.employees.includes(value)) {
      delete (updatedRecord as any).nameError;
    }
    
    newRecords[index] = updatedRecord;
    setEditedData({
      ...editedData,
      包装作業記録: newRecords,
    });
    setHasChanges(true);
  };

  // 包装作業記録の削除
  const deletePackagingRecord = (index: number) => {
    const newRecords = editedData.包装作業記録.filter((_, i) => i !== index);
    setEditedData({
      ...editedData,
      包装作業記録: newRecords,
    });
    setHasChanges(true);
  };

  // 包装作業記録の時刻スロット追加
  const addPackagingTimeSlot = (index: number) => {
    const newRecords = [...editedData.包装作業記録];
    const record = newRecords[index];
    if (!record.時刻リスト) {
      record.時刻リスト = [{ 開始時刻: record.開始時刻, 終了時刻: record.終了時刻 }];
    }
    record.時刻リスト.push({ 開始時刻: '8:00', 終了時刻: '17:00' });
    setEditedData({
      ...editedData,
      包装作業記録: newRecords,
    });
    setHasChanges(true);
  };

  // 包装作業記録の時刻スロット削除
  const deletePackagingTimeSlot = (recordIndex: number, timeSlotIndex: number) => {
    const newRecords = [...editedData.包装作業記録];
    const record = newRecords[recordIndex];
    if (record.時刻リスト && record.時刻リスト.length > 1) {
      record.時刻リスト.splice(timeSlotIndex, 1);
      // 最初のスロットを基本時刻に反映
      record.開始時刻 = record.時刻リスト[0].開始時刻;
      record.終了時刻 = record.時刻リスト[0].終了時刻;
    }
    setEditedData({
      ...editedData,
      包装作業記録: newRecords,
    });
    setHasChanges(true);
  };

  // 包装作業記録の時刻スロット更新
  const updatePackagingTimeSlot = (recordIndex: number, timeSlotIndex: number, field: '開始時刻' | '終了時刻', value: string) => {
    const newRecords = [...editedData.包装作業記録];
    const record = newRecords[recordIndex];
    if (record.時刻リスト) {
      record.時刻リスト[timeSlotIndex][field] = value;
      // 最初のスロットを基本時刻に反映
      if (timeSlotIndex === 0) {
        record[field] = value;
      }
    }
    setEditedData({
      ...editedData,
      包装作業記録: newRecords,
    });
    setHasChanges(true);
  };

  // 包装作業記録の追加
  const addPackagingRecord = () => {
    const newRecord: PackagingRecord = {
      氏名: '',
      開始時刻: '8:00',
      終了時刻: '17:00',
      時刻リスト: [{ 開始時刻: '8:00', 終了時刻: '17:00' }],
      休憩: { 昼休み: true, 中休み: false },
      生産数: '0',
    };
    setEditedData({
      ...editedData,
      包装作業記録: [newRecord, ...editedData.包装作業記録],
    });
    setHasChanges(true);
  };

  // 機械操作記録の更新
  const updateMachineRecord = (index: number, field: keyof MachineOperationRecord, value: any) => {
    const newRecords = [...editedData.機械操作記録];
    const updatedRecord = {
      ...newRecords[index],
      [field]: value,
    };
    
    // 氏名を更新した場合、nameErrorをクリア
    if (field === '氏名' && masterData.employees.includes(value)) {
      delete (updatedRecord as any).nameError;
    }
    
    newRecords[index] = updatedRecord;
    setEditedData({
      ...editedData,
      機械操作記録: newRecords,
    });
    setHasChanges(true);
  };

  // 機械操作記録の削除
  const deleteMachineRecord = (index: number) => {
    const newRecords = editedData.機械操作記録.filter((_, i) => i !== index);
    setEditedData({
      ...editedData,
      機械操作記録: newRecords,
    });
    setHasChanges(true);
  };

  // 機械操作記録の時刻スロット追加
  const addMachineTimeSlot = (index: number) => {
    const newRecords = [...editedData.機械操作記録];
    const record = newRecords[index];
    if (!record.時刻リスト) {
      record.時刻リスト = [{ 開始時刻: record.開始時刻, 終了時刻: record.終了時刻 }];
    }
    record.時刻リスト.push({ 開始時刻: '8:00', 終了時刻: '17:00' });
    setEditedData({
      ...editedData,
      機械操作記録: newRecords,
    });
    setHasChanges(true);
  };

  // 機械操作記録の時刻スロット削除
  const deleteMachineTimeSlot = (recordIndex: number, timeSlotIndex: number) => {
    const newRecords = [...editedData.機械操作記録];
    const record = newRecords[recordIndex];
    if (record.時刻リスト && record.時刻リスト.length > 1) {
      record.時刻リスト.splice(timeSlotIndex, 1);
      // 最初のスロットを基本時刻に反映
      record.開始時刻 = record.時刻リスト[0].開始時刻;
      record.終了時刻 = record.時刻リスト[0].終了時刻;
    }
    setEditedData({
      ...editedData,
      機械操作記録: newRecords,
    });
    setHasChanges(true);
  };

  // 機械操作記録の時刻スロット更新
  const updateMachineTimeSlot = (recordIndex: number, timeSlotIndex: number, field: '開始時刻' | '終了時刻', value: string) => {
    const newRecords = [...editedData.機械操作記録];
    const record = newRecords[recordIndex];
    if (record.時刻リスト) {
      record.時刻リスト[timeSlotIndex][field] = value;
      // 最初のスロットを基本時刻に反映
      if (timeSlotIndex === 0) {
        record[field] = value;
      }
    }
    setEditedData({
      ...editedData,
      機械操作記録: newRecords,
    });
    setHasChanges(true);
  };

  // 機械操作記録の追加
  const addMachineRecord = () => {
    const newRecord: MachineOperationRecord = {
      氏名: '',
      開始時刻: '8:00',
      終了時刻: '17:00',
      時刻リスト: [{ 開始時刻: '8:00', 終了時刻: '17:00' }],
      休憩: { 昼休み: false, 中休み: false },
      生産数: '0',
    };
    setEditedData({
      ...editedData,
      機械操作記録: [newRecord, ...editedData.機械操作記録],
    });
    setHasChanges(true);
  };

  // 休憩情報の更新
  const updateBreak = (
    recordType: 'packaging' | 'machine',
    index: number,
    breakType: '昼休み' | '中休み',
    value: boolean
  ) => {
    if (recordType === 'packaging') {
      updatePackagingRecord(index, '休憩', {
        ...editedData.包装作業記録[index].休憩,
        [breakType]: value,
      });
    } else {
      updateMachineRecord(index, '休憩', {
        ...editedData.機械操作記録[index].休憩,
        [breakType]: value,
      });
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!editedData) return;

    // バリデーションチェック
    const hasProductError = !editedData.ヘッダー.商品名 || 
                           (editedData.ヘッダー as any).productError || 
                           !masterData.products.includes(editedData.ヘッダー.商品名);
    const hasNameErrors = [
      ...editedData.包装作業記録.map(r => !r.氏名 || r.nameError || !masterData.employees.includes(r.氏名)),
      ...editedData.機械操作記録.map(r => !r.氏名 || r.nameError || !masterData.employees.includes(r.氏名))
    ].some(error => error);

    if (hasProductError || hasNameErrors) {
      alert('エラーがあるデータは保存できません。赤色で表示されている項目を修正してください。');
      return;
    }

    // 実際の保存処理
    const performSave = async () => {
      setIsSaving(true);
      
      try {
        // Google Sheetsに保存
        const result = await GoogleSheetsService.saveToPersonalSheets(editedData);
        
        // 失敗した作業者がいる場合
        if (result && result.failedWorkers && result.failedWorkers.length > 0) {
          setFailedWorkers(result.failedWorkers);
          
          // 失敗した作業者のみを残してデータを更新
          const failedPackaging = editedData.包装作業記録.filter(record => 
            result.failedWorkers!.includes(record.氏名)
          );
          const failedMachine = editedData.機械操作記録.filter(record => 
            result.failedWorkers!.includes(record.氏名)
          );
          
          setEditedData({
            ...editedData,
            包装作業記録: failedPackaging,
            機械操作記録: failedMachine,
          });
          
          // 作業日から年月を計算
          const workDate = new Date(editedData.ヘッダー.作業日!);
          const year = workDate.getFullYear();
          const month = workDate.getMonth() + 1;
          const day = workDate.getDate();
          
          // 21日サイクルで年月を計算（GoogleSheetsServiceと同じロジック）
          let periodYear = year;
          let periodMonth = month;
          if (day <= 20) {
            if (month === 1) {
              periodYear = year - 1;
              periodMonth = 12;
            } else {
              periodMonth = month - 1;
            }
          }
          
          setMissingSheetMessage(`以下の作業者の個人シート（${periodYear}年${periodMonth.toString().padStart(2, '0')}月度）が見つかりませんでした。\nスプレッドシートで個人シートを作成してください。\n\n作業者: ${result.failedWorkers.join(', ')}`);
          setMissingSheetDialogOpen(true);
        } else {
          // 全員成功した場合
          setSuccess('✅ データを保存しました！');
          setCurrentStep(4);
          navigate('/success');
        }
        
      } catch (error) {
        console.error('保存エラー:', error);
        
        let errorMessage = 'データの保存に失敗しました。';
        if (error instanceof Error) {
          if (error.message.includes('個人シートがありません')) {
            errorMessage = error.message;
          } else if (error.message.includes('認証')) {
            errorMessage = 'Google認証に失敗しました。再度お試しください。';
          } else if (error.message.includes('ネットワーク')) {
            errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
          } else {
            errorMessage = error.message;
          }
        }
        
        alert(errorMessage);
      } finally {
        setIsSaving(false);
      }
    };

    setIsSaving(true);

    try {
      // 既存データの確認（個人ごとの判定）
      const existingDataMap = await GoogleSheetsService.checkExistingData(editedData);
      
      // 既存データがある作業者がいるかチェック
      const hasAnyExistingData = Object.values(existingDataMap).some(hasData => hasData);
      
      if (hasAnyExistingData) {
        // 既存データがある作業者がいる場合は確認ダイアログを表示
        const existingWorkers = Object.entries(existingDataMap)
          .filter(([_, hasData]) => hasData)
          .map(([workerName, _]) => workerName);
        
        console.log(`📋 既存データがある作業者: ${existingWorkers.join(', ')}`);
        setOverwriteCallback(() => performSave);
        setConfirmDialogOpen(true);
        setIsSaving(false);
      } else {
        // 全員新規データの場合はそのまま保存
        await performSave();
      }
    } catch (error) {
      console.error('既存データ確認エラー:', error);
      // エラーが発生しても保存は続行（ダイアログは表示しない）
      await performSave();
    }
  };

  // 上書きキャンセル処理
  const handleCancelOverwrite = () => {
    setConfirmDialogOpen(false);
    setOverwriteCallback(null);
  };

  const handleBack = () => {
    if (hasChanges) {
      if (!window.confirm('変更内容が保存されていません。戻りますか？')) {
        return;
      }
    }
    navigate('/camera');
  };

  // 補正情報の取得
  const getCorrectionInfo = (record: any, field: string) => {
    if (field === '氏名' && record.originalName) {
      return {
        original: record.originalName,
        confidence: record.confidence,
      };
    }
    if (field === '商品名' && (editedData.ヘッダー as any).originalProductName) {
      return {
        original: (editedData.ヘッダー as any).originalProductName,
        confidence: (editedData.ヘッダー as any).productConfidence,
      };
    }
    return null;
  };

  // 信頼度に基づいたアイコン表示
  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return null;
    if (confidence >= 0.9) return <CheckCircle color="success" fontSize="small" />;
    if (confidence >= 0.7) return <Warning color="warning" fontSize="small" />;
    return <Warning color="error" fontSize="small" />;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        📋 読み取り結果確認
      </Typography>

      {hasChanges && (
        <Alert severity="info" sx={{ mb: 2 }}>
          変更があります。保存ボタンを押すと反映されます。
        </Alert>
      )}

      {/* ヘッダー情報 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Edit sx={{ mr: 1 }} />
            基本情報
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 作業日と作業時間を横並び */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                <DatePicker
                  label="作業日"
                  value={editedData.ヘッダー.作業日 ? dayjs(editedData.ヘッダー.作業日) : null}
                  onChange={(newValue: Dayjs | null) => {
                    if (newValue) {
                      updateHeader('作業日', newValue.format('YYYY/MM/DD'));
                    }
                  }}
                  format="YYYY/MM/DD"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      sx: {
                        '& .MuiInputBase-root': {
                          height: '48px',
                          fontSize: '16px',
                        }
                      }
                    }
                  }}
                />
              </LocalizationProvider>
              <TextField
                label="作業時間"
                value={editedData.ヘッダー.作業時間}
                onChange={(e) => updateHeader('作業時間', e.target.value)}
                fullWidth
                variant="outlined"
                sx={{
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '14px',
                  }
                }}
              />
            </Box>
            <TextField
              label="工場名"
              value={editedData.ヘッダー.工場名}
              onChange={(e) => updateHeader('工場名', e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': {
                  height: '56px',
                  fontSize: '18px',
                }
              }}
            />
            <Box>
              <Autocomplete
                options={masterData.products}
                value={editedData.ヘッダー.商品名}
                onChange={(_, newValue) => {
                  updateHeader('商品名', newValue || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="商品名"
                    variant="outlined"
                    error={!editedData.ヘッダー.商品名 || (editedData.ヘッダー as any).productError || !masterData.products.includes(editedData.ヘッダー.商品名)}
                    helperText={!editedData.ヘッダー.商品名 || (editedData.ヘッダー as any).productError || !masterData.products.includes(editedData.ヘッダー.商品名) ? 'スプレッドシートに登録されていない商品名です' : ''}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          {getConfidenceIcon((editedData.ヘッダー as any).productConfidence)}
                        </>
                      ),
                    }}
                    sx={{
                      '& .MuiInputBase-root': {
                        fontSize: '16px',
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: (!editedData.ヘッダー.商品名 || (editedData.ヘッダー as any).productError || !masterData.products.includes(editedData.ヘッダー.商品名)) ? 'error.main' : undefined,
                          borderWidth: (!editedData.ヘッダー.商品名 || (editedData.ヘッダー as any).productError || !masterData.products.includes(editedData.ヘッダー.商品名)) ? 2 : 1,
                        },
                      }
                    }}
                  />
                )}
                freeSolo
                fullWidth
                disabled={masterDataLoading}
              />
              {getCorrectionInfo(editedData.ヘッダー, '商品名') && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="primary">
                    元: {getCorrectionInfo(editedData.ヘッダー, '商品名')?.original}
                  </Typography>
                  <Chip
                    label={`${Math.round((getCorrectionInfo(editedData.ヘッダー, '商品名')?.confidence || 0) * 100)}%`}
                    size="small"
                    color={(!editedData.ヘッダー.商品名 || (editedData.ヘッダー as any).productError || !masterData.products.includes(editedData.ヘッダー.商品名)) ? 'error' : 
                           (getCorrectionInfo(editedData.ヘッダー, '商品名')?.confidence || 0) >= 0.9 ? 'success' : 'warning'}
                    sx={{ height: '24px', fontSize: '13px' }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 失敗した作業者がいる場合の警告メッセージ */}
      {failedWorkers.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            以下の作業者のシートが見つかりませんでした：
          </Typography>
          <Typography variant="body2">
            {failedWorkers.join('、')}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            正しい名前に修正して、再度保存してください。
          </Typography>
        </Alert>
      )}

      {/* 包装作業記録 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              👥 包装作業記録
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={addPackagingRecord}
              sx={{ minHeight: '28px', fontSize: '14px' }}
            >
              作業者追加
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {editedData.包装作業記録.map((worker, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: index % 2 === 0 ? 'background.default' : 'grey.50',
                  borderTop: index > 0 ? '2px solid' : 'none',
                  borderTopColor: 'primary.main',
                }}
              >
                {/* 1行目：氏名と生産数を横並び */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  {/* 氏名 */}
                  <Box sx={{ flex: 2 }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      氏名
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Autocomplete
                        options={masterData.employees}
                        value={worker.氏名}
                        onChange={(_, newValue) => {
                          updatePackagingRecord(index, '氏名', newValue || '');
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            error={!worker.氏名 || worker.nameError}
                            helperText=''
                            sx={{
                              '& .MuiInputBase-root': {
                                fontSize: '16px',
                                height: '40px',
                              },
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                  borderColor: (!worker.氏名 || worker.nameError || !masterData.employees.includes(worker.氏名)) ? 'error.main' : undefined,
                                  borderWidth: (!worker.氏名 || worker.nameError || !masterData.employees.includes(worker.氏名)) ? 2 : 1,
                                },
                              }
                            }}
                          />
                        )}
                        freeSolo
                        fullWidth
                        disabled={masterDataLoading}
                      />
                      {getConfidenceIcon(worker.confidence)}
                    </Box>
                    {worker.originalName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" color="primary">
                          元: {worker.originalName}
                        </Typography>
                        <Chip
                          label={`${Math.round((worker.confidence || 0) * 100)}%`}
                          size="small"
                          color={worker.nameError ? 'error' : 
                                 worker.confidence && worker.confidence >= 0.9 ? 'success' : 'warning'}
                          sx={{ height: '24px', fontSize: '13px' }}
                        />
                      </Box>
                    )}
                  </Box>
                  {/* 生産数 */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      生産数
                    </Typography>
                    <TextField
                      value={worker.生産数}
                      onChange={(e) => updatePackagingRecord(index, '生産数', e.target.value)}
                      fullWidth
                      type="number"
                      placeholder="生産数"
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '40px',
                          fontSize: '16px',
                        }
                      }}
                    />
                  </Box>
                </Box>
                
                {/* 2行目：開始時刻、終了時刻、休憩 */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
                  {/* 時刻リスト */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                        開始・終了時刻
                      </Typography>
                      <IconButton
                        onClick={() => addPackagingTimeSlot(index)}
                        size="small"
                        color="primary"
                        sx={{ width: '32px', height: '32px' }}
                      >
                        <Add sx={{ fontSize: '20px' }} />
                      </IconButton>
                    </Box>
                    {worker.時刻リスト?.map((timeSlot, timeSlotIndex) => (
                      <Box key={timeSlotIndex} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mb: 1, alignItems: 'center' }}>
                        <TextField
                          value={timeSlot.開始時刻}
                          onChange={(e) => updatePackagingTimeSlot(index, timeSlotIndex, '開始時刻', e.target.value)}
                          onBlur={(e) => {
                            const formatted = formatTimeInput(e.target.value);
                            if (formatted !== e.target.value) {
                              updatePackagingTimeSlot(index, timeSlotIndex, '開始時刻', formatted);
                            }
                          }}
                          fullWidth
                          placeholder="例: 800 → 8:00"
                          sx={{
                            '& .MuiInputBase-root': {
                              height: '24px',
                              fontSize: '18px',
                            }
                          }}
                        />
                        <TextField
                          value={timeSlot.終了時刻}
                          onChange={(e) => updatePackagingTimeSlot(index, timeSlotIndex, '終了時刻', e.target.value)}
                          onBlur={(e) => {
                            const formatted = formatTimeInput(e.target.value);
                            if (formatted !== e.target.value) {
                              updatePackagingTimeSlot(index, timeSlotIndex, '終了時刻', formatted);
                            }
                          }}
                          fullWidth
                          placeholder="例: 1730 → 17:30"
                          sx={{
                            '& .MuiInputBase-root': {
                              height: '24px',
                              fontSize: '18px',
                            }
                          }}
                        />
                        {worker.時刻リスト && worker.時刻リスト.length > 1 && (
                          <IconButton
                            onClick={() => deletePackagingTimeSlot(index, timeSlotIndex)}
                            size="small"
                            color="error"
                            sx={{ width: '32px', height: '32px' }}
                          >
                            <Delete sx={{ fontSize: '18px' }} />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
                
                {/* 3行目：休憩と削除操作を横並び */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      休憩
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Chip
                        label="昼休み"
                        size="small"
                        color={worker.休憩.昼休み ? 'primary' : 'default'}
                        onClick={() => updateBreak('packaging', index, '昼休み', !worker.休憩.昼休み)}
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: worker.休憩.昼休み ? 600 : 400,
                          fontSize: '13px',
                          height: '32px',
                          minWidth: '80px',
                          borderRadius: '16px',
                        }}
                      />
                      <Chip
                        label="中休み"
                        size="small"
                        color={worker.休憩.中休み ? 'secondary' : 'default'}
                        onClick={() => updateBreak('packaging', index, '中休み', !worker.休憩.中休み)}
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: worker.休憩.中休み ? 600 : 400,
                          fontSize: '13px',
                          height: '32px',
                          minWidth: '80px',
                          borderRadius: '16px',
                        }}
                      />
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      削除
                    </Typography>
                    <IconButton
                      onClick={() => deletePackagingRecord(index)}
                      color="error"
                      size="small"
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'error.light',
                          color: 'white',
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* 機械操作記録 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              ⚙️ 機械操作記録
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addMachineRecord}
              sx={{ minHeight: '28px', fontSize: '14px' }}
            >
              作業者追加
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {editedData.機械操作記録.map((operation, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: index % 2 === 0 ? 'background.default' : 'grey.50',
                  borderTop: index > 0 ? '2px solid' : 'none',
                  borderTopColor: 'primary.main',
                }}
              >
                {/* 1行目：氏名と生産数を横並び */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  {/* 氏名 */}
                  <Box sx={{ flex: 2 }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      氏名
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Autocomplete
                        options={masterData.employees}
                        value={operation.氏名}
                        onChange={(_, newValue) => {
                          updateMachineRecord(index, '氏名', newValue || '');
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            error={!operation.氏名 || operation.nameError}
                            helperText=''
                            sx={{
                              '& .MuiInputBase-root': {
                                fontSize: '16px',
                                height: '40px',
                              },
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                  borderColor: (!operation.氏名 || operation.nameError || !masterData.employees.includes(operation.氏名)) ? 'error.main' : undefined,
                                  borderWidth: (!operation.氏名 || operation.nameError || !masterData.employees.includes(operation.氏名)) ? 2 : 1,
                                },
                              }
                            }}
                          />
                        )}
                        freeSolo
                        fullWidth
                        disabled={masterDataLoading}
                      />
                      {getConfidenceIcon(operation.confidence)}
                    </Box>
                    {operation.originalName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" color="primary">
                          元: {operation.originalName}
                        </Typography>
                        <Chip
                          label={`${Math.round((operation.confidence || 0) * 100)}%`}
                          size="small"
                          color={operation.nameError ? 'error' : 
                                 operation.confidence && operation.confidence >= 0.9 ? 'success' : 'warning'}
                          sx={{ height: '24px', fontSize: '13px' }}
                        />
                      </Box>
                    )}
                  </Box>
                  {/* 生産数 */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      生産数
                    </Typography>
                    <TextField
                      value={operation.生産数}
                      onChange={(e) => updateMachineRecord(index, '生産数', e.target.value)}
                      fullWidth
                      type="number"
                      placeholder="生産数"
                      sx={{
                        '& .MuiInputBase-root': {
                          height: '40px',
                          fontSize: '16px',
                        }
                      }}
                    />
                  </Box>
                </Box>
                
                {/* 2行目：開始時刻、終了時刻、休憩 */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
                  {/* 時刻リスト */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary' }}>
                        開始・終了時刻
                      </Typography>
                      <IconButton
                        onClick={() => addMachineTimeSlot(index)}
                        size="small"
                        color="primary"
                        sx={{ width: '32px', height: '32px' }}
                      >
                        <Add sx={{ fontSize: '20px' }} />
                      </IconButton>
                    </Box>
                    {operation.時刻リスト?.map((timeSlot, timeSlotIndex) => (
                      <Box key={timeSlotIndex} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mb: 1, alignItems: 'center' }}>
                        <TextField
                          value={timeSlot.開始時刻}
                          onChange={(e) => updateMachineTimeSlot(index, timeSlotIndex, '開始時刻', e.target.value)}
                          onBlur={(e) => {
                            const formatted = formatTimeInput(e.target.value);
                            if (formatted !== e.target.value) {
                              updateMachineTimeSlot(index, timeSlotIndex, '開始時刻', formatted);
                            }
                          }}
                          fullWidth
                          placeholder="例: 800 → 8:00"
                          sx={{
                            '& .MuiInputBase-root': {
                              height: '24px',
                              fontSize: '18px',
                            }
                          }}
                        />
                        <TextField
                          value={timeSlot.終了時刻}
                          onChange={(e) => updateMachineTimeSlot(index, timeSlotIndex, '終了時刻', e.target.value)}
                          onBlur={(e) => {
                            const formatted = formatTimeInput(e.target.value);
                            if (formatted !== e.target.value) {
                              updateMachineTimeSlot(index, timeSlotIndex, '終了時刻', formatted);
                            }
                          }}
                          fullWidth
                          placeholder="例: 1730 → 17:30"
                          sx={{
                            '& .MuiInputBase-root': {
                              height: '24px',
                              fontSize: '18px',
                            }
                          }}
                        />
                        {operation.時刻リスト && operation.時刻リスト.length > 1 && (
                          <IconButton
                            onClick={() => deleteMachineTimeSlot(index, timeSlotIndex)}
                            size="small"
                            color="error"
                            sx={{ width: '32px', height: '32px' }}
                          >
                            <Delete sx={{ fontSize: '18px' }} />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
                
                {/* 3行目：休憩と削除操作を横並び */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      休憩
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Chip
                        label="昼休み"
                        size="small"
                        color={operation.休憩.昼休み ? 'primary' : 'default'}
                        onClick={() => updateBreak('machine', index, '昼休み', !operation.休憩.昼休み)}
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: operation.休憩.昼休み ? 600 : 400,
                          fontSize: '13px',
                          height: '32px',
                          minWidth: '80px',
                          borderRadius: '16px',
                        }}
                      />
                      <Chip
                        label="中休み"
                        size="small"
                        color={operation.休憩.中休み ? 'secondary' : 'default'}
                        onClick={() => updateBreak('machine', index, '中休み', !operation.休憩.中休み)}
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: operation.休憩.中休み ? 600 : 400,
                          fontSize: '13px',
                          height: '32px',
                          minWidth: '80px',
                          borderRadius: '16px',
                        }}
                      />
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography variant="caption" sx={{ fontSize: '13px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      削除
                    </Typography>
                    <IconButton
                      onClick={() => deleteMachineRecord(index)}
                      color="error"
                      size="small"
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'error.light',
                          color: 'white',
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, maxWidth: '393px', mx: 'auto' }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<ArrowBack />}
          sx={{ 
            width: '160px',
            height: '48px',
            fontSize: '14px',
            minWidth: '160px'
          }}
        >
          やり直す
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <Save />}
          sx={{ 
            width: '200px',
            height: '48px',
            fontSize: '14px',
            minWidth: '200px'
          }}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '💾 保存する'}
        </Button>
      </Box>

      {/* 上書き確認ダイアログ */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelOverwrite}
        aria-labelledby="overwrite-dialog-title"
        aria-describedby="overwrite-dialog-description"
      >
        <DialogTitle id="overwrite-dialog-title">
          <Warning color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          既存のデータを上書きしますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="overwrite-dialog-description">
            {editedData?.ヘッダー?.作業日} の日付で、既にデータが記録されている作業者がいます。
            <br />
            既存のデータに上書きしてもよろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelOverwrite} color="primary">
            キャンセル
          </Button>
          <Button 
            onClick={() => {
              if (overwriteCallback) {
                overwriteCallback();
              }
              setConfirmDialogOpen(false);
            }} 
            color="primary" 
            variant="contained"
            autoFocus
          >
            上書きする
          </Button>
        </DialogActions>
      </Dialog>

      {/* 個人シート見つからない通知ダイアログ */}
      <Dialog
        open={missingSheetDialogOpen}
        onClose={() => setMissingSheetDialogOpen(false)}
        aria-labelledby="missing-sheet-dialog-title"
        aria-describedby="missing-sheet-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="missing-sheet-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" />
          個人シートが見つかりません
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="missing-sheet-dialog-description" sx={{ whiteSpace: 'pre-line', fontSize: '16px' }}>
            {missingSheetMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setMissingSheetDialogOpen(false)} 
            color="primary" 
            variant="contained"
            autoFocus
          >
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfirmationPage;