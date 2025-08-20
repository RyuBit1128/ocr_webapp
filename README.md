# 作業記録簿OCRアプリ

手書きの作業記録をスマートフォンで撮影し、OCR処理で自動的にテキスト化してGoogleスプレッドシートに保存するPWA（Progressive Web App）です。

## 特徴

- 📱 **スマートフォン対応** - PWAとして動作し、ホーム画面に追加可能
- 🤖 **高精度OCR** - GPT-4 Vision APIによる日本語手書き文字認識
- 📊 **自動データ管理** - 従業員別の月次シートに自動保存
- ✨ **データ自動補正** - マスターデータに基づく氏名・商品名の自動補正
- 🔄 **重複データ処理** - 同一従業員・同一日の複数作業を自動マージ

## 動作環境

- モダンブラウザ（Chrome, Safari, Edge等）
- スマートフォン/タブレット/PC対応
- インターネット接続必須

## 技術スタック

- **フロントエンド**: React + TypeScript
- **UI フレームワーク**: Material-UI
- **状態管理**: Zustand
- **ビルドツール**: Vite
- **OCR**: OpenAI GPT-4 Vision API
- **データストレージ**: Google Sheets API
- **ホスティング**: GitHub Pages

## プロジェクト構成

```
ocr_webapp/
├── src/
│   ├── pages/          # ページコンポーネント
│   ├── components/     # 共通コンポーネント
│   ├── services/       # APIサービス
│   ├── stores/         # 状態管理
│   ├── hooks/          # カスタムフック
│   ├── prompts/        # OCRプロンプト
│   └── types/          # 型定義
├── public/             # 静的ファイル
├── SETUP.md           # セットアップガイド
├── CLAUDE.md          # 開発ガイドライン
└── スプレッドシート構造.md  # データ構造仕様
```

## インストール

1. リポジトリをクローン
```bash
git clone [repository-url]
cd ocr_webapp
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定（詳細は[SETUP.md](./SETUP.md)を参照）
```bash
cp .env.example .env.local
# .env.localファイルを編集してAPIキーを設定
```

4. 開発サーバーを起動
```bash
npm run dev
```

## 使い方

1. **撮影**: 作業記録の写真を撮影またはアップロード
2. **OCR処理**: 自動的に文字認識が実行される
3. **確認・修正**: 認識結果を確認し、必要に応じて修正
4. **保存**: Googleスプレッドシートに自動保存

## データ構造

### 管理シート
- 従業員名リスト（A列）
- 商品名リスト（B列）

### 個人シート（従業員名_年月）
- 日付、商品名、作業時間、生産数などを記録
- 21日〜翌月20日を1ヶ月として管理

詳細は[スプレッドシート構造.md](./スプレッドシート構造.md)を参照

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check

# リンター実行
npm run lint

# リンター自動修正
npm run lint:fix
```

## セットアップ

### Google API認証情報の取得方法

#### 1. Google Cloud Consoleでプロジェクトを作成
1. [Google Cloud Console](https://console.cloud.google.com)にアクセス
2. 新しいプロジェクトを作成

#### 2. Google Sheets APIを有効化
1. 左メニューから「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索して有効化

#### 3. OAuth同意画面の設定（初回のみ）
1. 「APIとサービス」→「OAuth同意画面」を選択
2. User Type：「外部」を選択して「作成」
3. アプリ情報を入力：
   - アプリ名：作業記録簿OCR（任意）
   - ユーザーサポートメール：あなたのメールアドレス
   - デベロッパーの連絡先情報：あなたのメールアドレス
4. スコープの設定：
   - 「スコープを追加または削除」をクリック
   - `https://www.googleapis.com/auth/spreadsheets` を選択
5. テストユーザーの設定（重要）：
   - 「テストユーザーを追加」をクリック
   - 使用するGoogleアカウントのメールアドレスを追加（例：r.hy.r.1128@gmail.com）
   - 最大100人まで追加可能
6. 「保存して次へ」で完了

**注意事項：**
- テストモードの場合、登録したテストユーザーのみがアプリを使用できます
- 本番公開する場合は「公開ステータス」を「本番環境」に変更する必要があります
- 本番環境への変更にはGoogleの審査が必要な場合があります

#### 4. OAuth 2.0 クライアントIDの作成（VITE_GOOGLE_CLIENT_ID）
1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック
3. アプリケーションの種類：「ウェブアプリケーション」を選択
4. 名前：任意（例：作業記録簿OCR Web Client）
5. 承認済みのJavaScript生成元に以下を追加：
   - `http://localhost:5173` （開発環境用）
   - `https://[your-github-username].github.io` （本番環境用、例：`https://ryubit1128.github.io`）
   - 注：サブパス（/ocr_0714_V2など）は含めない
6. 承認済みのリダイレクトURI：設定不要（暗黙的フローを使用するため）
7. 作成後、クライアントIDをコピー

#### 5. APIキーの作成（VITE_GOOGLE_API_KEY）
1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「APIキー」をクリック
3. 作成されたAPIキーをコピー
4. APIキーの制限を設定（推奨）：
   - 「APIキーを制限」をクリック
   - APIの制限：「Google Sheets API」のみに制限

### GitHub Secretsの設定（本番環境）

本番環境（GitHub Pages）にデプロイする場合：

1. GitHubリポジトリの Settings → Secrets and variables → Actions
2. 以下のSecretsを追加：
   - `VITE_OPENAI_API_KEY`: OpenAI APIキー
   - `VITE_GOOGLE_CLIENT_ID`: Google OAuth クライアントID
   - `VITE_GOOGLE_API_KEY`: Google APIキー
   - `VITE_SPREADSHEET_ID`: GoogleスプレッドシートID

#### Secrets変更後の反映方法

GitHub Secretsを変更した後は、以下のいずれかの方法で再デプロイが必要です：

**方法1: 空コミットでリビルド**
```bash
git commit --allow-empty -m "GitHub Secretsを更新したため再ビルド"
git push
```

**方法2: GitHub UIから手動実行**
1. リポジトリのActionsタブを開く
2. 最新のワークフローを選択
3. 「Re-run all jobs」をクリック

**注意事項:**
- Secrets変更は自動的には反映されません
- ブラウザキャッシュのクリア（Ctrl+Shift+R）も必要な場合があります

詳細なセットアップ手順は[SETUP.md](./SETUP.md)を参照してください。

## 開発ガイドライン

開発時の注意事項や規約については[CLAUDE.md](./CLAUDE.md)を参照してください。

## ライセンス

本プロジェクトはプライベートプロジェクトです。

## サポート

質問や問題がある場合は、Issueを作成してください。