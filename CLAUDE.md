# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 構成

- `ansible/` — EC2プロビジョニング・Dockerデプロイ用Playbook（roles: common/docker/app）
- `lambda/` — Python 3.12 Lambda関数 × 3（ec2_manager / docker_status / playbook_runner）
- `infrastructure/template.yaml` — SAM テンプレート（API GW + Lambda まとめて定義）
- `mobile/PocketOps/src/` — React Native 0.84 / TypeScript（api / screens / components / hooks）

## コマンド

```bash
# Lambda ビルド＆デプロイ
cd infrastructure && sam build && sam deploy

# Ansible 実行
ansible-playbook ansible/playbooks/provision_ec2.yml

# RN 起動（Androidエミュレータ要）
cd mobile/PocketOps && npx react-native run-android
```

## コミュニケーションスタイル

実装作業中は、各ステップごとに **【解説】** として中学生向けの説明を100〜200文字程度（日本語）で添えること。
例：「**【解説】** Lambdaというのは、AWSというクラウドサービス上で動く小さなプログラムです。今回はそこにコストを計算するコードを送り込んでいます。」

## 開発方針

- Lambda関数は `_response(status, body)` ヘルパーで統一
- Ansibleは冪等性を必ず担保（`state: present` / `changed_when`）
- APIエンドポイントは `src/api/client.ts` に集約、画面から直接fetchしない
- EC2との通信はすべてSSM経由（SSH不要）
