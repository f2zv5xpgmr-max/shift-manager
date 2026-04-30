# 🐄 牧場シフト管理アプリ — PWA版

スマホのホーム画面に追加してアプリとして使えます。

---

## 📦 ファイル構成

```
shift-manager-pwa/
├── package.json
├── public/
│   ├── index.html
│   ├── manifest.json       ← PWA設定
│   └── service-worker.js   ← オフライン対応
└── src/
    ├── index.js
    └── App.js              ← メインアプリ
```

---

## 🚀 無料デプロイ手順（Vercel）

### 1. 必要なもの
- パソコン（Windows / Mac どちらでも可）
- GitHubアカウント（無料）: https://github.com
- Vercelアカウント（無料）: https://vercel.com

### 2. GitHubにアップロード
1. GitHubで新しいリポジトリを作成（例: `shift-manager`）
2. このフォルダの中身をすべてアップロード
   - GitHubのウェブ画面から「Add file → Upload files」で可能

### 3. Vercelでデプロイ
1. https://vercel.com にログイン
2. 「New Project」をクリック
3. GitHubのリポジトリを選択
4. 設定はそのままで「Deploy」をクリック
5. 数分で `https://shift-manager-xxxx.vercel.app` のようなURLが発行される

### 4. スマホのホーム画面に追加

**iPhoneの場合（Safari）:**
1. SafariでURLを開く
2. 下の「共有」ボタン（□↑）をタップ
3. 「ホーム画面に追加」をタップ
4. 「追加」をタップ

**Androidの場合（Chrome）:**
1. ChromeでURLを開く
2. 右上の「⋮」メニューをタップ
3. 「ホーム画面に追加」または「アプリをインストール」をタップ

---

## ✨ PWAの特徴

- ✅ ホーム画面にアイコンで追加できる
- ✅ アプリのように全画面で起動
- ✅ オフラインでも動作（一度開けばネット不要）
- ✅ データは端末に自動保存（localStorage）
- ✅ 無料で公開・運用できる

---

## 💾 データについて

入力したシフトデータはスマホ本体に保存されます。
ブラウザのキャッシュを消すとデータが消えることがあります。
定期的にスクリーンショットや印刷での保存をおすすめします。

---

## 📞 困ったときは

Vercelの公式ドキュメント: https://vercel.com/docs
