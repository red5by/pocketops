# トラブルシューティング記録

開発中に発生した問題と解決策。中学生でも理解できるように解説。

---

## 問題1: ビルドできない（JDKバージョン問題）

**問題**
「React Native はバージョン 17〜20 の Java しか使えない」と言われていたが、実際は Java 21 が入っていた。

**工夫**
Gradle（ビルドツール）のバージョンを確認したら「8.13」だった。このバージョンは Java 21 に対応済みと分かった。

**解決**
JDK の入れ替えをせず、そのまま進めた。
→ **古い情報を鵜呑みにせず、現物（バージョン）を確認することが大事。**

---

## 問題2: AndroidManifest でビルドエラー

**問題**
`Manifest merger failed` というエラー。通知チャンネルの設定が「アプリ側」と「Firebase ライブラリ側」の 2 か所に書かれていて衝突した。

**例え**
同じ名前のファイルが 2 つあって、どちらを使えばいいか分からずパソコンが固まった状態。

**工夫**
エラーメッセージに「`tools:replace="android:value"` を追加して」と具体的な解決策が書かれていた。

**解決**
`AndroidManifest.xml` に 1 行追加して「自分の設定を優先して！」と指示した。

```xml
<!-- 修正前 -->
<meta-data
  android:name="com.google.firebase.messaging.default_notification_channel_id"
  android:value="cost_alerts" />

<!-- 修正後 -->
<meta-data
  android:name="com.google.firebase.messaging.default_notification_channel_id"
  android:value="cost_alerts"
  tools:replace="android:value" />
```

---

## 問題3: API が認証なしで誰でも叩ける

**問題**
API の URL を知っていれば誰でも EC2 を停止できる状態だった。URL は GitHub のコードにもそのまま書かれていた。

**例え**
家の鍵を玄関の外に張り紙で貼っておくようなもの。

**工夫**
API Gateway に「合言葉（API キー）を持っている人しか通れない」仕組みを追加。
実際のキーと URL はコードから分離して、GitHub には上がらないファイル（`config.ts`）に移した。

**解決**
- キーなし → `403 Forbidden`（拒否）
- キーあり → `200 OK`（成功）

URL が GitHub に出ても、キーがなければ操作不可になった。

```
# 設定ファイルの構成
config.ts          ← 実際の値（.gitignore 対象、コミット禁止）
config.example.ts  ← テンプレート（GitHub に公開）
```

---

## 問題4: SAM ビルドが Python バージョン不一致で失敗

**問題**
`sam build` が Python 3.12 を要求するが、Mac には 3.9 しか入っていなかった。

**工夫**
Lambda コード自体は変更がないことに着目。SAM を使わず AWS CLI で直接 API Gateway の設定だけを変更した。

**解決**
コード変更なしで認証設定だけを AWS に反映できた。
→ **道具が壊れたら別の道を探す。目的（設定の反映）と手段（SAM）を切り分ける。**

---

## 教訓まとめ

| # | 教訓 |
|---|---|
| 1 | バージョン制約は「公式ドキュメント」ではなく「実際のバージョン」で確認する |
| 2 | エラーメッセージには解決策が書いてあることが多い。よく読む |
| 3 | URL・APIキーはコードに直書きしない。設定ファイルに分離して gitignore する |
| 4 | ツールが使えないときは、同じ目的を達成できる別の手段を探す |
