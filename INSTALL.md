# インストールガイド

Holodex Chat Background Chrome拡張機能のインストール手順です。

## 前提条件

- Google Chrome または Chromiumベースのブラウザ（Edge, Brave等）
- Git（リポジトリのクローン用）

## インストール手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/shirota773/extention-holodex-chat-background.git
cd extention-holodex-chat-background
```

### 2. アイコンの準備（オプション）

`icons/` ディレクトリに以下のアイコンを配置:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

アイコンがない場合は、`manifest.json` からiconsセクションを削除:

```json
{
  "manifest_version": 3,
  "name": "Holodex Chat Background",
  "version": "1.0.0",
  "description": "Holodex用チャット欄をバックグラウンドで管理し、オーバーレイ表示する拡張機能",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://holodex.net/*",
    "https://*.youtube.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://holodex.net/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
  // iconsセクションを削除
}
```

### 3. Chromeで拡張機能を読み込む

1. Chromeを開く

2. アドレスバーに `chrome://extensions/` を入力してEnter

3. 右上の「デベロッパーモード」をONにする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. クローンしたディレクトリ（`extention-holodex-chat-background`）を選択

6. 拡張機能が読み込まれたことを確認

### 4. 動作確認

1. [Holodex](https://holodex.net)にアクセス

2. 任意のライブストリームを開く

3. 動画上にマウスを移動すると、チャット入力欄が表示されることを確認

4. 右上の💬ボタンをクリックすると、チャットオーバーレイが表示されることを確認

5. キーボードショートカットを試す:
   - `t`キー: チャット入力欄がアクティブになる
   - `Tab`キー: 次の動画のチャット欄に切り替わる

## トラブルシューティング

### 拡張機能が読み込まれない

- manifest.jsonの構文エラーをチェック
- アイコンファイルが存在するか確認（または iconsセクションを削除）
- Chromeのバージョンが最新か確認（Manifest V3対応）

### チャットが表示されない

1. デベロッパーツールを開く（F12）
2. コンソールでエラーメッセージを確認
3. Holodexのページ構造が変更された可能性があるため、`content.js` の `detectVideos()` メソッドを調整

### キーボードショートカットが動作しない

- 他の拡張機能との競合をチェック
- ページがフォーカスされているか確認
- 入力欄などがアクティブでないか確認

## アンインストール

1. `chrome://extensions/` にアクセス
2. 「Holodex Chat Background」の「削除」ボタンをクリック

## アップデート

```bash
cd extention-holodex-chat-background
git pull origin main
```

その後、`chrome://extensions/` で拡張機能の「更新」ボタンをクリック

## 開発モード

開発者向け:

```bash
# リポジトリをフォーク後
git clone https://github.com/YOUR_USERNAME/extention-holodex-chat-background.git
cd extention-holodex-chat-background

# 新しいブランチを作成
git checkout -b feature/your-feature

# 変更を加えたら
git add .
git commit -m "Your changes"
git push origin feature/your-feature
```

変更後は `chrome://extensions/` で拡張機能の更新ボタンをクリックして再読み込み。

## サポート

問題が発生した場合:
1. [Issues](https://github.com/shirota773/extention-holodex-chat-background/issues) に報告
2. デベロッパーツールのコンソールログを添付
3. 使用しているChromeのバージョンを記載
