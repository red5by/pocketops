"""
PocketOps - Docker Status Lambda
EC2上のコンテナ状態をSSM経由で取得するAPI
"""

import json
import os
import boto3
from botocore.exceptions import ClientError

ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "ap-northeast-1"))


def handler(event, context):
    instance_id = (event.get("pathParameters") or {}).get("instanceId")

    if not instance_id:
        return _response(400, {"error": "instanceId path parameter is required"})

    try:
        containers = get_docker_containers(instance_id)
        return _response(200, {"instanceId": instance_id, "containers": containers})

    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "InvalidInstanceId":
            return _response(404, {"error": f"Instance not found: {instance_id}"})
        return _response(500, {"error": f"{code}: {e.response['Error']['Message']}"})


def get_docker_containers(instance_id: str) -> list:
    """SSM Run Commandで `docker ps` を実行してコンテナ情報を取得"""
    command = (
        "docker ps --all --format "
        "'{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'"
    )

    resp = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": [command]},
    )
    command_id = resp["Command"]["CommandId"]

    # コマンド完了待機（簡易ポーリング）
    import time

    for _ in range(10):
        time.sleep(1)
        result = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=instance_id,
        )
        status = result["Status"]
        if status in ("Success", "Failed", "Cancelled", "TimedOut"):
            break

    if result["Status"] != "Success":
        raise RuntimeError(f"SSM command failed: {result['Status']}")

    output = result.get("StandardOutputContent", "").strip()
    if not output:
        return []

    containers = []
    for line in output.splitlines():
        parts = line.split("|")
        if len(parts) == 5:
            containers.append(
                {
                    "id": parts[0][:12],
                    "name": parts[1],
                    "image": parts[2],
                    "status": parts[3],
                    "ports": parts[4],
                }
            )
    return containers


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }
