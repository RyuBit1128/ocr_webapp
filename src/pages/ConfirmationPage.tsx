import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Stack,
  Chip,
  Autocomplete,
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
  AccessTime,
} from '@mui/icons-material';
import { useAppStore } from '@/stores/appStore';
import { OcrResult, PackagingRecord, MachineOperationRecord, TimeSlot } from '@/types';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { useMasterData } from '@/hooks/useMasterData';

const ConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const { ocrResult, setCurrentStep, setSuccess } = useAppStore();
  const { masterData, loading: masterDataLoading } = useMasterData();
  const [editedData, setEditedData] = useState<OcrResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    setEditedData({
      ...editedData,
      ヘッダー: {
        ...editedData.ヘッダー,
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  // 包装作業記録の更新
  const updatePackagingRecord = (index: number, field: keyof PackagingRecord, value: any) => {
    const newRecords = [...editedData.包装作業記録];
    newRecords[index] = {
      ...newRecords[index],
      [field]: value,
    };
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
      包装作業記録: [...editedData.包装作業記録, newRecord],
    });
    setHasChanges(true);
  };

  // 機械操作記録の更新
  const updateMachineRecord = (index: number, field: keyof MachineOperationRecord, value: any) => {
    const newRecords = [...editedData.機械操作記録];
    newRecords[index] = {
      ...newRecords[index],
      [field]: value,
    };
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
      機械操作記録: [...editedData.機械操作記録, newRecord],
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
    const hasProductError = (editedData.ヘッダー as any).productError;
    const hasNameErrors = [
      ...editedData.包装作業記録.map(r => r.nameError),
      ...editedData.機械操作記録.map(r => r.nameError)
    ].some(error => error);

    if (hasProductError || hasNameErrors) {
      alert('エラーがあるデータは保存できません。赤色で表示されている項目を修正してください。');
      return;
    }

    setIsSaving(true);
    
    try {
      // Google Sheetsに保存
      await GoogleSheetsService.saveToPersonalSheets(editedData);
      
      setSuccess('✅ データを保存しました！');
      setCurrentStep(4);
      navigate('/success');
      
    } catch (error) {
      console.error('保存エラー:', error);
      
      let errorMessage = 'データの保存に失敗しました。';
      if (error instanceof Error) {
        if (error.message.includes('認証')) {
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
              <DatePicker
                label="作業日"
                value={dayjs(editedData.ヘッダー.作業日)}
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
                        height: '40px',
                        fontSize: '14px',
                      }
                    }
                  }
                }}
              />
            </LocalizationProvider>
            <TextField
              label="工場名"
              value={editedData.ヘッダー.工場名}
              onChange={(e) => updateHeader('工場名', e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': {
                  height: '40px',
                  fontSize: '14px',
                }
              }}
            />
            <Box>
              <Autocomplete
                options={masterData.products}
                value={editedData.ヘッダー.商品名}
                onChange={(event, newValue) => {
                  updateHeader('商品名', newValue || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="商品名"
                    variant="outlined"
                    error={(editedData.ヘッダー as any).productError}
                    helperText={(editedData.ヘッダー as any).productError ? 'スプレッドシートに登録されていない商品名です' : ''}
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
                        fontSize: '14px',
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
                    color={(editedData.ヘッダー as any).productError ? 'error' : 
                           (getCorrectionInfo(editedData.ヘッダー, '商品名')?.confidence || 0) >= 0.9 ? 'success' : 'warning'}
                    sx={{ height: '18px', fontSize: '10px' }}
                  />
                </Box>
              )}
            </Box>
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
        </CardContent>
      </Card>

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
              sx={{ minHeight: '36px' }}
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
                {/* 1行目：氏名（幅広・高さ短く） */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    氏名
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Autocomplete
                      options={masterData.employees}
                      value={worker.氏名}
                      onChange={(event, newValue) => {
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
                              fontSize: '12px',
                              height: '32px',
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
                        sx={{ height: '18px', fontSize: '10px' }}
                      />
                    </Box>
                  )}
                </Box>
                
                {/* 2行目：開始時刻、終了時刻、休憩 */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, mb: 1 }}>
                  {/* 時刻リスト */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary' }}>
                        開始・終了時刻
                      </Typography>
                      <IconButton
                        onClick={() => addPackagingTimeSlot(index)}
                        size="small"
                        color="primary"
                        sx={{ width: '20px', height: '20px' }}
                      >
                        <Add sx={{ fontSize: '14px' }} />
                      </IconButton>
                    </Box>
                    {worker.時刻リスト?.map((timeSlot, timeSlotIndex) => (
                      <Box key={timeSlotIndex} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, mb: 0.5 }}>
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
                              height: '28px',
                              fontSize: '11px',
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
                              height: '28px',
                              fontSize: '11px',
                            }
                          }}
                        />
                        {worker.時刻リスト && worker.時刻リスト.length > 1 && (
                          <IconButton
                            onClick={() => deletePackagingTimeSlot(index, timeSlotIndex)}
                            size="small"
                            color="error"
                            sx={{ width: '20px', height: '20px' }}
                          >
                            <Delete sx={{ fontSize: '12px' }} />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Box>
                  
                  {/* 休憩 */}
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      休憩
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        label="昼休み"
                        size="small"
                        color={worker.休憩.昼休み ? 'primary' : 'default'}
                        onClick={() => updateBreak('packaging', index, '昼休み', !worker.休憩.昼休み)}
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: worker.休憩.昼休み ? 600 : 400,
                          fontSize: '10px',
                          height: '24px',
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
                          fontSize: '10px',
                          height: '24px',
                        }}
                      />
                    </Stack>
                  </Box>
                </Box>
                
                {/* 3行目：生産数と操作 */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'end' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
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
                          height: '32px',
                          fontSize: '12px',
                        }
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      操作
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
              sx={{ minHeight: '36px' }}
            >
              操作者追加
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
                {/* 1行目：氏名（幅広・高さ短く） */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    氏名
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Autocomplete
                      options={masterData.employees}
                      value={operation.氏名}
                      onChange={(event, newValue) => {
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
                              fontSize: '12px',
                              height: '32px',
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
                        sx={{ height: '18px', fontSize: '10px' }}
                      />
                    </Box>
                  )}
                </Box>
                
                {/* 2行目：開始時刻、終了時刻、休憩 */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, mb: 1 }}>
                  {/* 時刻リスト */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary' }}>
                        開始・終了時刻
                      </Typography>
                      <IconButton
                        onClick={() => addMachineTimeSlot(index)}
                        size="small"
                        color="primary"
                        sx={{ width: '20px', height: '20px' }}
                      >
                        <Add sx={{ fontSize: '14px' }} />
                      </IconButton>
                    </Box>
                    {operation.時刻リスト?.map((timeSlot, timeSlotIndex) => (
                      <Box key={timeSlotIndex} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, mb: 0.5 }}>
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
                              height: '28px',
                              fontSize: '11px',
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
                              height: '28px',
                              fontSize: '11px',
                            }
                          }}
                        />
                        {operation.時刻リスト && operation.時刻リスト.length > 1 && (
                          <IconButton
                            onClick={() => deleteMachineTimeSlot(index, timeSlotIndex)}
                            size="small"
                            color="error"
                            sx={{ width: '20px', height: '20px' }}
                          >
                            <Delete sx={{ fontSize: '12px' }} />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Box>
                  
                  {/* 休憩 */}
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      休憩
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        label="昼休み"
                        size="small"
                        color={operation.休憩.昼休み ? 'primary' : 'default'}
                        onClick={() => updateBreak('machine', index, '昼休み', !operation.休憩.昼休み)}
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: operation.休憩.昼休み ? 600 : 400,
                          fontSize: '10px',
                          height: '24px',
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
                          fontSize: '10px',
                          height: '24px',
                        }}
                      />
                    </Stack>
                  </Box>
                </Box>
                
                {/* 3行目：生産数と操作 */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'end' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
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
                          height: '32px',
                          fontSize: '12px',
                        }
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                      操作
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
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<ArrowBack />}
          sx={{ flex: 1 }}
        >
          やり直す
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<Save />}
          sx={{ flex: 2 }}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '💾 保存する'}
        </Button>
      </Box>
    </Box>
  );
};

export default ConfirmationPage;