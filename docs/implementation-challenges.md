# PocketOps 実装で直面した課題ランキング

開発中に起きた「詰まりポイント」を、難しかった順にまとめました。
それぞれ「問題 → 工夫 → 解決」の流れで説明します。

---

## 🥇 1位：スマホの指紋センサーを JavaScript から呼ぶ方法がわからなかった

### 問題
React Native（JavaScript）からは、Android の指紋認証センサーに直接アクセスできません。
JavaScript と Android のネイティブコード（Kotlin）は「別の言語」で動いているため、
橋渡しをする仕組みが必要です。

### 工夫
React Native には「ネイティブモジュール」という仕組みがあります。
Kotlin でセンサーを操作するコードを書いて、それを JavaScript から呼べるようにする「橋」を自分で作りました。

具体的には：
- `BiometricModule.kt` → 指紋/PIN認証を実際に動かす Kotlin のコード
- `BiometricPackage.kt` → 「このモジュールを使えるようにする」登録票
- `MainApplication.kt` → アプリ起動時に登録票を読み込む
- `src/native/BiometricAuth.ts` → JavaScript 側から「authenticate()」と呼べるようにする橋

### 解決
```
JavaScript の authenticate()
       ↓（橋）
Kotlin の BiometricModule
       ↓
Android の指紋センサー API
```
という流れで、アプリ起動時に自動で認証画面が出るようになりました。

---

## 🥈 2位：Playbook を実行した「結果」をどうやってアプリに返すか

### 問題
Ansible の Playbook 実行は「時間がかかる」処理です（数十秒〜数分）。
Lambda に「実行して！」と送っても、すぐには終わりません。
ずっと待ち続けると通信がタイムアウトしてしまいます。

### 工夫
「非同期ポーリング」という方法を使いました。
宅配便の「追跡番号」と同じ考え方です：
1. 「実行開始！」→ 追跡番号（`commandId`）をもらう
2. 10秒おきに「今どうなってる？」と確認しに行く
3. 「Success」か「Failed」が返ってきたら終了

### 解決
- Lambda に `GET /playbooks/status/{commandId}` エンドポイントを新設
- アプリ側は `PlaybookScreen.tsx` で 10秒ごとに状態を確認（最大120秒）
- 画面にリアルタイムで `InProgress → Success / Failed` と表示

---

## 🥉 3位：GitHub にプッシュできなかった

### 問題
`git push` しようとしたら「リモートが設定されていない」エラーが出ました。
さらに HTTPS で試したら「パスワード認証はサポートされていません」と拒否されました。

### 工夫
GitHub は2021年からパスワード認証を廃止しています。
代わりに「SSH 認証」を使う必要があります。
すでに SSH キーが設定されていたので、リモートの URL を HTTPS から SSH 形式に変更しました。

```
× https://github.com/red5by/pocketops.git
○ git@github.com:red5by/pocketops.git
```

### 解決
```bash
git remote add origin git@github.com:red5by/pocketops.git
git push -u origin main
```
で無事にプッシュ成功。

---

## 4位：EC2 インスタンスの選択がアプリ内で伝わっていなかった

### 問題
最初の実装では、Docker コンテナ画面（ContainerScreen）に表示するインスタンス ID が
`'i-xxxxxxxxxxxxxxxxx'` というダミー値でハードコードされていました。
ダッシュボードでインスタンスを選んでも、コンテナ画面には反映されない状態でした。

### 工夫
React の「コールバック」という仕組みを使います。
親（App.tsx）が子（DashboardScreen）に「インスタンスが選ばれたら教えてね」という関数を渡します。

```
App.tsx（管理者）
 ├─ DashboardScreen に「選ばれたら教えて」関数を渡す
 └─ 選ばれたら ContainerScreen に instanceId を渡す
```

### 解決
- `DashboardScreen` に「Docker確認」ボタンを追加
- ボタンを押すと親に `instanceId` が伝わり、コンテナ画面に自動で切り替わる
- `instanceId` が未選択のときは「EC2タブでインスタンスを選択してください」と表示

---

## 5位：Android Studio のインストール環境が何もなかった

### 問題
ビルド確認のために `adb devices` を実行したら「コマンドが見つからない」エラー。
調べると Java・Android SDK・`ANDROID_HOME` 環境変数がすべて未設定でした。

### 工夫
Android Studio（約1.4GB）を公式サイトから直接ダウンロードしてインストール。
Homebrew も未インストールだったため、`curl` で DMG ファイルを取得し、
`hdiutil` でマウントして `/Applications` にコピーする手順を自動化しました。

### 解決
```bash
curl -L -o /tmp/android-studio.dmg <公式URL>
hdiutil attach /tmp/android-studio.dmg
cp -R "/Volumes/Android Studio.app" /Applications/
```
インストール後は Android Studio の初回起動ウィザードで SDK を取得する段階まで到達。

---

## まとめ

| 順位 | 課題 | キーワード |
|---|---|---|
| 🥇1位 | JS から指紋センサーを操作 | Native Module・ブリッジ |
| 🥈2位 | Playbook 実行結果の非同期取得 | ポーリング・追跡番号 |
| 🥉3位 | GitHub SSH 認証 | SSH・HTTPS廃止 |
| 4位 | インスタンス選択の画面間共有 | コールバック・Props |
| 5位 | Android 開発環境ゼロからセットアップ | SDK・DMG・adb |

どの問題も「なぜ動かないか」を正確に理解して、適切な代替手段を選ぶことで解決できました。
