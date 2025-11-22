# Holodex Chat Background

Holodex用のChrome拡張機能で、チャット欄をバックグラウンドで管理し、動画上にオーバーレイ表示できるようにします。

## 概要

Holodexはyoutubeライブ動画とチャットを複数自由に並べて再生できるプラットフォームですが、レイアウトの保持がウィンドウのリサイズに対して弱く、特にチャット欄の配置が不安定です。

この拡張機能は、チャット欄をユーザー設定での配置を不要にし、バックグラウンド（表示はせず）で保持することでUXを改善します。

## 機能

### 1. バックグラウンドチャット管理
- 各動画に対して1つのバックグラウンドチャット欄を保持
- YouTubeチャットをiframeで取得・管理

### 2. 動的チャット入力欄
- 動画上にカーソルを合わせるとチャット入力欄が表示
- 自動的に非アクティブ化（5秒後）

### 3. チャットオーバーレイ表示
- ボタンクリックでチャットを動画上にオーバーレイ表示
- スライドインアニメーション付き

### 4. キーボードショートカット
- **tキー**: チャット入力欄をアクティブ化
- **Tabキー**: 次の動画のチャット欄に切り替え

## インストール方法

### 開発モードでのインストール

1. このリポジトリをクローン:
```bash
git clone https://github.com/shirota773/extention-holodex-chat-background.git
cd extention-holodex-chat-background
```

2. Chromeで拡張機能ページを開く:
   - `chrome://extensions/` にアクセス
   - 右上の「デベロッパーモード」を有効化

3. 「パッケージ化されていない拡張機能を読み込む」をクリック

4. このリポジトリのディレクトリを選択

### アイコンの準備

`icons/` ディレクトリに以下のアイコンを配置してください:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

アイコンがない場合は、manifest.jsonから一時的にiconsセクションを削除してください。

## 使い方

1. [Holodex](https://holodex.net)にアクセス

2. 動画を再生すると、自動的にチャット管理が開始されます

3. 動画上にマウスカーソルを合わせると、チャット入力欄が表示されます

4. 右上の💬ボタンをクリックすると、チャットオーバーレイが表示/非表示されます

5. キーボードショートカット:
   - `t`: チャット入力欄をアクティブ化
   - `Tab`: 次の動画のチャット欄に切り替え

## ファイル構成

```
extention-holodex-chat-background/
├── manifest.json       # 拡張機能のマニフェストファイル
├── background.js       # バックグラウンドサービスワーカー
├── content.js          # コンテンツスクリプト（メインロジック）
├── styles.css          # スタイルシート
├── icons/              # アイコンディレクトリ
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # このファイル
```

## 技術仕様

### アーキテクチャ

- **Manifest V3**: 最新のChrome拡張機能仕様
- **Service Worker**: バックグラウンドでのチャット状態管理
- **Content Script**: Holodexページへの機能注入
- **YouTube Chat iframe**: YouTubeの公式チャット埋め込み

### 主要クラス

#### `HolodexChatManager`
コンテンツスクリプトのメインクラス。動画の検出、UI作成、キーボードショートカットを管理。

主要メソッド:
- `detectVideos()`: Holodexの動画要素を検出
- `registerVideo()`: 動画を登録し、UIを追加
- `createVideoUI()`: チャット入力欄、トグルボタン、オーバーレイを作成
- `setupKeyboardShortcuts()`: キーボードショートカットを設定

### チャット取得方法

YouTubeの公式live_chat埋め込みを使用:
```javascript
https://www.youtube.com/live_chat?v={VIDEO_ID}&embed_domain={DOMAIN}
```

## 制限事項

1. **メッセージ送信**: 現在、チャットの表示のみサポート。メッセージ送信にはYouTube APIの認証が必要
2. **Holodex固有のUI**: Holodexの内部構造に依存するため、サイトの更新で動作しなくなる可能性がある
3. **パフォーマンス**: 多数の動画を同時に開くと、パフォーマンスに影響する可能性がある

## 今後の改善予定

- [ ] チャットメッセージの送信機能
- [ ] チャットのカスタマイズオプション（サイズ、位置など）
- [ ] チャット履歴の保存
- [ ] 複数言語サポート
- [ ] パフォーマンス最適化

## 開発

### デバッグ方法

1. Chromeのデベロッパーツールを開く（F12）
2. コンソールで `[Holodex Chat Manager]` のログを確認
3. バックグラウンドスクリプトのデバッグは `chrome://extensions/` の拡張機能詳細から「Service Worker」をクリック

### コントリビューション

プルリクエストを歓迎します！以下の手順でコントリビュートしてください:

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

MIT License

## 作者

[@shirota773](https://github.com/shirota773)

## 参考

- [Holodex](https://holodex.net) - オリジナルプラットフォーム
- [HolodexNet/Holodex](https://github.com/HolodexNet/Holodex) - Holodexのソースコード
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
