# 作業記録簿OCRアプリ セットアップガイド

## 概要
このアプリは手書きの作業記録簿をスマートフォンのカメラで撮影し、OpenAI Vision APIで文字認識を行い、Google Sheetsに自動保存するPWAアプリです。

## 必要なもの
1. OpenAI APIキー（GPT-4 Vision）
2. Google Cloud Console プロジェクト
3. Google Sheets API の有効化
4. Google OAuth 2.0 認証情報

## セットアップ手順

### 1. OpenAI API設定

1. [OpenAI Platform](https://platform.openai.com) にログイン
2. API Keys ページでAPIキーを作成
3. 作成したAPIキーをコピー（`sk-`で始まる文字列）

### 2. Google Cloud設定

#### 2-1. プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 新しいプロジェクトを作成

#### 2-2. API有効化
1. APIライブラリで「Google Sheets API」を検索
2. Google Sheets APIを有効化

#### 2-3. OAuth認証情報作成
1. 認証情報 > 認証情報を作成 > OAuth 2.0 クライアントID
2. アプリケーションタイプ: ウェブアプリケーション
3. 承認済みのJavaScript生成元: `http://localhost:5173` (開発用)
4. 作成後、クライアントIDをコピー

#### 2-4. APIキー作成
1. 認証情報 > 認証情報を作成 > APIキー
2. 作成したAPIキーをコピー
3. セキュリティのため、Google Sheets APIに制限することを推奨

### 3. Google Sheets準備

#### 3-1. マスタースプレッドシート作成
1. 新しいGoogle Sheetsを作成
2. 以下のシートを作成：

**従業員マスター**シート:
```
A列: 氏名
田中太郎
佐藤花子
鈴木一郎
土橋舞子
野沢真紀
今村健太郎
（従業員名を1列に記載）
```

**商品マスター**シート:
```
A列: 商品名
クリアファイル
プラスチック容器
ビニール袋
（商品名を1列に記載）
```

3. スプレッドシートのURLからIDをコピー
   - URL: `https://docs.google.com/spreadsheets/d/{スプレッドシートID}/edit`
   - IDは44文字の英数字文字列

### 4. 環境変数設定

`.env.local` ファイルを編集：

```env
# OpenAI API設定
VITE_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google API設定
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google スプレッドシート設定
VITE_SPREADSHEET_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# アプリ設定
VITE_APP_NAME=作業記録簿OCR
VITE_APP_VERSION=1.0.0

# 開発モード設定
VITE_DEV_MODE=true
```

### 5. アプリケーション起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス

## 使用方法

1. **撮影**: カメラで作業記録簿を撮影またはファイルアップロード
2. **処理**: OpenAI Vision APIで文字認識
3. **確認**: 認識結果を確認・編集
4. **保存**: Google Sheetsの個人別シートに保存

## データ保存形式

各作業者用に個別シートが作成され、以下の形式で保存されます：

| 作業日 | 工場名 | 商品名 | 氏名 | 作業種別 | 開始時刻 | 終了時刻 | 昼休み | 中休み | 生産数 | 登録日時 |
|--------|--------|--------|------|----------|----------|----------|--------|--------|--------|----------|

## 特徴機能

- **曖昧マッチング**: 名字のみでも従業員を特定
- **データ補正**: OCR結果をマスターデータと照合して自動補正
- **個人別保存**: 各作業者の専用シートに記録保存
- **PWA対応**: スマートフォンでアプリライクに使用可能
- **オフライン対応**: 一度読み込めばネットワークなしでも基本機能が利用可能

## トラブルシューティング

### よくある問題

1. **APIキーエラー**
   - `.env.local`ファイルの設定を確認
   - APIキーが正しく設定されているか確認

2. **Google認証エラー**
   - Google Cloud Consoleでドメインが登録されているか確認
   - OAuth設定が正しいか確認

3. **スプレッドシートアクセスエラー**
   - スプレッドシートIDが正しいか確認
   - スプレッドシートが適切に共有されているか確認

### 本番環境への展開

1. GitHub Pages等の静的ホスティングサービスを使用
2. 本番URL用のOAuth設定を追加
3. 環境変数を本番環境用に更新

## セキュリティ注意事項

- APIキーは公開リポジトリにコミットしない
- 本番環境では適切なドメイン制限を設定
- スプレッドシートの共有設定を適切に管理

## 費用について

- **OpenAI API**: 月額約500円程度（使用量による）
- **Google API**: 通常の使用範囲では無料
- **ホスティング**: GitHub Pages等の無料サービスを利用可能

月額約500円程度で運用可能です。