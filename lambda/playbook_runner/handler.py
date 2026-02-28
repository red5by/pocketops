"""
PocketOps - Playbook Runner Lambda
定義済みAnsible Playbookを非同期でトリガーするAPI
SSM Run CommandでAnsible Controllerとして動くEC2上のplaybookを実行する
"""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "ap-northeast-1"))

# 許可するPlaybook名のホワイトリスト
ALLOWED_PLAYBOOKS = {
    "provision_ec2": "ansible/playbooks/provision_ec2.yml",
    "deploy_docker": "ansible/playbooks/deploy_docker.yml",
}

ANSIBLE_CONTROLLER_ID = os.environ.get("ANSIBLE_CONTROLLER_INSTANCE_ID", "")


def handler(event, context):
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    try:
        if method == "GET" and path == "/playbooks":
            return list_playbooks()

        if method == "POST" and path == "/playbooks/run":
            body = json.loads(event.get("body") or "{}")
            return run_playbook(body)

        return _response(404, {"error": "Not Found"})

    except (ClientError, json.JSONDecodeError, RuntimeError) as e:
        return _response(500, {"error": str(e)})


def list_playbooks():
    """利用可能なPlaybook一覧を返す"""
    playbooks = [
        {"name": name, "path": path, "description": _describe(name)}
        for name, path in ALLOWED_PLAYBOOKS.items()
    ]
    return _response(200, {"playbooks": playbooks})


def run_playbook(body: dict):
    """SSM経由でAnsible Controllerにplaybookを実行させる"""
    playbook_name = body.get("playbook")
    target_host = body.get("targetHost", "all")
    extra_vars = body.get("extraVars", {})

    if not playbook_name:
        return _response(400, {"error": "playbook is required"})

    if playbook_name not in ALLOWED_PLAYBOOKS:
        return _response(
            400,
            {"error": f"Unknown playbook. Allowed: {list(ALLOWED_PLAYBOOKS.keys())}"},
        )

    if not ANSIBLE_CONTROLLER_ID:
        return _response(
            500, {"error": "ANSIBLE_CONTROLLER_INSTANCE_ID is not configured"}
        )

    playbook_path = ALLOWED_PLAYBOOKS[playbook_name]
    extra_vars_str = (
        "--extra-vars '" + json.dumps(extra_vars) + "'" if extra_vars else ""
    )
    log_file = f"/opt/pocketops/logs/ansible-$(date +%Y%m%d-%H%M%S).log"
    command = (
        f"cd /opt/pocketops && "
        f"ansible-playbook {playbook_path} "
        f"-i ansible/inventory/hosts.yml "
        f"-l {target_host} "
        f"{extra_vars_str} "
        f"2>&1 | tee {log_file}"
    )

    resp = ssm.send_command(
        InstanceIds=[ANSIBLE_CONTROLLER_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": [command]},
        TimeoutSeconds=600,
    )

    return _response(
        202,
        {
            "runId": str(uuid.uuid4())[:8],
            "playbook": playbook_name,
            "commandId": resp["Command"]["CommandId"],
            "status": "running",
            "startedAt": datetime.now(timezone.utc).isoformat(),
        },
    )


def _describe(name: str) -> str:
    descriptions = {
        "provision_ec2": "EC2に必須パッケージ・Dockerをインストールする",
        "deploy_docker": "モニタリングスタック（cAdvisor/Node Exporter）をデプロイする",
    }
    return descriptions.get(name, "")


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }
