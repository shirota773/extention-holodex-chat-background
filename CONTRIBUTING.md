# コントリビューションガイド

Holodex Chat Backgroundへのコントリビューションをありがとうございます！

## 行動規範

- 敬意を持って他の貢献者と接する
- 建設的なフィードバックを提供する
- コミュニティの成長に貢献する

## コントリビューション方法

### バグ報告

バグを見つけた場合:

1. [Issues](https://github.com/shirota773/extention-holodex-chat-background/issues)で既存の報告を確認
2. 新しいIssueを作成し、以下の情報を含める:
   - バグの説明
   - 再現手順
   - 期待される動作
   - 実際の動作
   - スクリーンショット（あれば）
   - 環境情報（Chrome バージョン、OS等）

### 機能リクエスト

新機能の提案:

1. [Issues](https://github.com/shirota773/extention-holodex-chat-background/issues)で既存の提案を確認
2. 新しいIssueを作成し、以下を記述:
   - 機能の説明
   - ユースケース
   - 期待される動作
   - 実装のアイデア（あれば）

### プルリクエスト

コードの貢献:

1. **リポジトリをフォーク**
   ```bash
   # GitHubでフォークボタンをクリック
   git clone https://github.com/YOUR_USERNAME/extention-holodex-chat-background.git
   cd extention-holodex-chat-background
   ```

2. **新しいブランチを作成**
   ```bash
   git checkout -b feature/your-feature-name
   # または
   git checkout -b fix/bug-description
   ```

3. **変更を加える**
   - コードスタイルを統一
   - コメントを適切に追加
   - 既存のコードとの整合性を保つ

4. **テスト**
   - Holodexで実際に動作を確認
   - 複数の動画で動作確認
   - 異なる画面サイズで確認

5. **コミット**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # または
   git commit -m "fix: resolve issue #123"
   ```

   コミットメッセージの規則:
   - `feat:` - 新機能
   - `fix:` - バグ修正
   - `docs:` - ドキュメント変更
   - `style:` - コードスタイル変更（動作に影響なし）
   - `refactor:` - リファクタリング
   - `test:` - テスト追加・変更
   - `chore:` - ビルド・設定変更

6. **プッシュ**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **プルリクエストを作成**
   - GitHubでプルリクエストを作成
   - 変更内容を詳しく説明
   - 関連するIssueを参照（`Fixes #123`など）
   - スクリーンショットやGIFを添付（UI変更の場合）

## 開発ガイドライン

### コードスタイル

- **JavaScript**:
  - セミコロンを使用
  - インデント: 2スペース
  - クラス名: PascalCase
  - 変数名: camelCase
  - 定数: UPPER_SNAKE_CASE

- **CSS**:
  - クラス名: kebab-case
  - プレフィックス: `holodex-`
  - インデント: 2スペース

### ファイル構成

```
extention-holodex-chat-background/
├── manifest.json       # 拡張機能マニフェスト
├── background.js       # バックグラウンドサービスワーカー
├── content.js          # コンテンツスクリプト
├── styles.css          # スタイルシート
├── icons/              # アイコン
└── docs/               # ドキュメント（今後追加予定）
```

### テスト

現在自動テストはありませんが、以下を手動で確認:

1. Holodex.netで動作確認
2. 複数の動画を同時に開いて動作確認
3. キーボードショートカット（t, Tab）の動作確認
4. チャット入力欄の表示/非表示
5. チャットオーバーレイの表示/非表示
6. 異なる画面サイズでの動作確認

### ドキュメント

コードの変更に伴い、以下のドキュメントを更新:

- `README.md` - 主要な機能変更
- `INSTALL.md` - インストール手順の変更
- コード内のコメント - 複雑なロジックの説明

## 優先的な貢献エリア

以下のエリアへの貢献を特に歓迎します:

1. **チャットメッセージ送信機能**: YouTube APIとの統合
2. **パフォーマンス最適化**: 多数の動画を開いた時の最適化
3. **Holodex UI検出の改善**: より堅牢な動画要素の検出
4. **カスタマイズオプション**: 設定ページの追加
5. **多言語対応**: i18nの実装
6. **テスト**: 自動テストの追加
7. **アイコン**: 拡張機能のアイコンデザイン

## 質問・サポート

- 質問がある場合は [Discussions](https://github.com/shirota773/extention-holodex-chat-background/discussions) を使用
- バグ報告は [Issues](https://github.com/shirota773/extention-holodex-chat-background/issues)
- 迅速な返信を心がけますが、オープンソースプロジェクトのため時間がかかる場合があります

## ライセンス

このプロジェクトに貢献することで、あなたの貢献がMITライセンスの下でライセンスされることに同意したものとみなされます。

---

再度、コントリビューションをありがとうございます！🎉
