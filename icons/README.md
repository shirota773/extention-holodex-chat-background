# アイコンディレクトリ

このディレクトリには、Chrome拡張機能のアイコン画像を配置します。

## 必要なアイコン

以下のサイズのPNG画像を用意してください:

- `icon16.png` - 16x16ピクセル（ツールバーアイコン）
- `icon48.png` - 48x48ピクセル（拡張機能管理ページ）
- `icon128.png` - 128x128ピクセル（Chromeウェブストア、インストール時）

## アイコン作成のヒント

1. シンプルで認識しやすいデザイン
2. 背景は透過推奨
3. ブランドカラーを使用（Holodexのテーマカラーなど）
4. チャットや吹き出しのアイコンが適切

## オンラインツール

アイコンを作成するのに便利なツール:
- [Canva](https://www.canva.com/) - グラフィックデザインツール
- [Figma](https://www.figma.com/) - UIデザインツール
- [GIMP](https://www.gimp.org/) - 無料の画像編集ソフト

## 一時的な対処

アイコンがない場合は、manifest.jsonから一時的にiconsセクションを削除してください:

```json
{
  "manifest_version": 3,
  "name": "Holodex Chat Background",
  ...
  // この部分を削除
  // "icons": {
  //   "16": "icons/icon16.png",
  //   "48": "icons/icon48.png",
  //   "128": "icons/icon128.png"
  // }
}
```
