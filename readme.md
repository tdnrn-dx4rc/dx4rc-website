`README.md`

```markdown
# 🏥 地域医療DX ポートフォリオ ＆ 開発ギャラリー

Google Apps Script (GAS)、Google Drive、Google Sheets をサーバーレスなバックエンド（CMS）として活用した、地域医療DXプロジェクトの成果品・開発ギャラリーWebアプリケーションです。

---

## 💡 システム概要

フロントエンド（HTML/CSS/JavaScript）から管理者権限で投稿された成果品データおよび画像ファイルを、GASを経由してGoogle Cloudインフラ（Drive & Sheets）へ自動同期・保存します。

- **画像ストレージ**: Google Drive（自動公開設定・ファイルID管理）
- **データベース**: Google Sheets（ポートフォリオメタデータ・アクセスログ・環境設定）
- **バックエンド API**: Google Apps Script（Web App POST API）
- **フロントエンド**: HTML5, CSS3 (CSS Variables), Pure JavaScript (ES6+, Async/Await)

---

## 🛠 システム構成 & データフロー

```plain
[ Web Front (portfolio.html / JS) ]
      │
      ├─ (1) CSV Fetch (GET) ──────────► [ Google Sheets (Pub/Sub CSV) ]
      │                                             ▲
      └─ (2) Admin Data Post (POST) ──┐             │
                                      ▼             │ (ログ・データ記録)
                            [ GAS Web App (doPost) ]─┴─► [ Google Sheets DB ]
                                      │
                                      └─ (3) Image File Save ─► [ Google Drive Folder ]

```

---

## ✨ 主な機能

### 1. 成果品ギャラリー（閲覧・検索）

* **リアルタイム表示**: 公開済みスプレッドシートのCSVデータを動的パースしてカード描画。
* **ドライブ画像最適化**: DB（スプレッドシート）にはGoogle Driveの `File ID` のみを保持。表示時に `https://lh3.googleusercontent.com/d/{File_ID}` へ自動変換して高速軽量表示。
* **フィルタリング・検索**: キーワード検索およびカテゴリ/タグ（`clinical`, `automation`, `ai`, `gas`, `sheets`, `slack`）による絞り込み。

### 2. 管理者投稿機能（`?admin=true`）

* **パスワード認証**: Config用スプレッドシートと照合するセキュア認証。
* **自動ID重複回避**: 入力されたIDが既存データと重複する場合、`id-1`, `id-2` のように自動でインクリメントして一意化。
* **画像Base64自動変換・圧縮**: フォームからアップロードされた画像（PNG/JPEG等）をブラウザ側でエンコードし、GAS経由でGoogle Driveへ保存＆自動公開共有設定 (`ANYONE_WITH_LINK`) を適用。
* **論理削除 (Soft Delete)**: 管理者画面からの削除操作により、スプレッドシート上の `status` 列を `'deleted'` へ更新。

### 3. デバッグ・堅牢性

* **リアルタイムログ出力**: GASの実行過程（受信サイズ、MIME判定、ドライブ作成、エラー例外）をスプレッドシートの `debug_log` シートへタイムスタンプ付きで自動記録。

---

## 📂 ファイル構成

```text
.
├── index.html              # ホームページ
├── portfolio.html          # 成果品ギャラリーメインページ（管理者投稿フォーム内蔵）
├── portfolio.js            # ギャラリー描画、CSVパース、GAS通信、画像変換ロジック
├── devlog.html             # 開発ログページ
├── contact.html            # お問い合わせフォーム
├── style.css               # 共通スタイルシート
├── コード.gs                # Google Apps Script（Web API / doPost処理）
└── README.md               # 本ドキュメント

```

---

## ⚙️ セットアップ & 導入手順

### 1. Google Drive & Sheets の準備

1. 画像保存用の **Google Drive フォルダ** を作成し、フォルダIDを取得します。
2. データベース用の **Google スプレッドシート** を作成し、以下のシートを準備します：

* `portfolio` シート（ヘッダー: `id`, `title`, `category`, `tags`, `description`, `advice`, `image_url`, `status`）
* `config` シート（セル `B1` に管理者パスワードを設定）

3. `portfolio` シートを **「ファイル」>「共有」>「Webに公開」** でCSV形式で公開します。

### 2. Google Apps Script (GAS) の設定

1. スプレッドシートの「拡張機能」>「Apps Script」を開き、`コード.gs` の内容を貼り付けます。
2. 定数 `DRIVE_FOLDER_ID` および `CONFIG_SPREADSHEET_ID` をご自身の環境のIDに書き換えます。
3. エディタ上で `testCreateFile` 関数を手動実行し、Google Drive へのアクセス権限（OAuthスコープ）を承認します。
4. **「デプロイ」>「新しいデプロイ」** を選択：

* **種類**: Web アプリ
* **実行ユーザー**: 自分
* **アクセスできるユーザー**: 全員 (Anyone)

5. 発行された **WebアプリURL** を取得します。

### 3. フロントエンドの設定

1. `portfolio.js` 内の定数を書き換えます：

```javascript
const PORTFOLIO_CSV_URL = 'YOUR_PUBLISHED_CSV_URL';
const GAS_WEBHOOK_URL = 'YOUR_GAS_WEB_APP_URL';

```

2. Webサーバー（GitHub Pages、Netlify、Vercel等）へデプロイします。

---

## 🔑 管理者モードの利用方法

1. ブラウザで `portfolio.html?admin=true` にアクセスします。
2. ダイアログにパスワードを入力すると、管理者モードが有効化され投稿フォームと各カードの削除ボタンが表示されます。

---

## 📝 ライセンス

© 2026 DX4RC (DX for Regional Care). All rights reserved.

```

```
