# PocketOps

スマートフォンから EC2・Docker・Ansible を操作できるインフラ管理モバイルアプリ。

---

## 概要

| 機能 | 説明 |
|---|---|
| EC2 管理 | インスタンス一覧の確認・起動・停止 |
| Docker 監視 | EC2 上のコンテナ状態をリアルタイム表示 |
| Playbook 実行 | 定義済み Ansible Playbook をワンタップで実行 |
| 認証 | 生体認証ロック（Kotlin Native Module） |

---

## 使用技術

| レイヤー | 技術 |
|---|---|
| モバイル | React Native (TypeScript) |
| 認証モジュール | Kotlin (Android Native Module) |
| バックエンド | AWS Lambda + API Gateway (Python 3.12) |
| インフラ操作 | AWS SSM Run Command |
| プロビジョニング | Ansible (roles: common / docker / app) |
| コンテナ | Docker / Docker Compose |
| IaC | AWS SAM (CloudFormation) |
| ストレージ | S3（Ansible 実行ログ） |

---

## 環境構築手順

### 前提条件

- Node.js 18 以上
- Python 3.12
- AWS CLI（`~/.aws/credentials` に認証情報設定済み）
- AWS SAM CLI（`brew install aws-sam-cli`）
- Android Studio（Android エミュレータ用）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd pocketops
```

### 2. バックエンド（Lambda）のデプロイ

```bash
cd infrastructure

# SAM でビルド＆デプロイ（初回は対話形式で設定）
sam build
sam deploy --guided
# → 表示される ApiBaseUrl をメモしておく
```

### 3. EC2 プロビジョニング（Ansible）

```bash
cd ansible

# 接続先 EC2 の IP を inventory に設定
vi inventory/hosts.yml  # ansible_host に EC2 のパブリック IP を記入

# SSH 鍵を配置
cp /path/to/your-key.pem ~/.ssh/pocketops-key.pem
chmod 600 ~/.ssh/pocketops-key.pem

# 実行
ansible-playbook playbooks/provision_ec2.yml
```

### 4. モバイルアプリのセットアップ

```bash
cd mobile/PocketOps

# 依存パッケージのインストール
npm install

# API エンドポイントの設定
# src/api/client.ts の BASE_URL を手順2でメモした ApiBaseUrl に書き換える
```

---

## 起動方法

### バックエンド（Lambda は常時起動、EC2 は必要時のみ）

```bash
# EC2 起動（コスト節約のため普段は停止推奨）
aws ec2 start-instances --instance-ids <your-instance-id>
```

### モバイルアプリ（Android）

```bash
cd mobile/PocketOps

# Android エミュレータを起動した状態で
npx react-native run-android
```

### Docker モニタリングスタックの起動（EC2 上で）

```bash
# Ansible Playbook からワンコマンドでデプロイ可能
ansible-playbook ansible/playbooks/deploy_docker.yml
```

---

## ディレクトリ構成

```
pocketops/
├── ansible/
│   ├── inventory/          # 接続先ホスト定義
│   ├── playbooks/          # provision_ec2 / deploy_docker
│   └── roles/              # common / docker / app
├── lambda/
│   ├── ec2_manager/        # EC2 起動・停止 API
│   ├── docker_status/      # コンテナ状態取得 API
│   └── playbook_runner/    # Playbook 実行トリガー API
├── infrastructure/
│   └── template.yaml       # SAM テンプレート（API GW + Lambda）
└── mobile/
    └── PocketOps/          # React Native プロジェクト
        └── src/
            ├── api/        # Lambda との通信クライアント
            ├── screens/    # 各画面コンポーネント
            ├── components/ # 共通 UI コンポーネント
            └── hooks/      # カスタムフック
```

---

## コスト目安

| リソース | 月額概算 |
|---|---|
| Lambda + API Gateway | ほぼ無料（個人利用レベル） |
| EC2（t3.micro、使用時のみ起動） | $0〜$5 程度 |
| S3（ログ保存） | $1 未満 |
| **合計** | **$0〜$6 / 月** |

> EC2 は使うときだけアプリから起動し、作業後は停止することでコストを最小化できます。
