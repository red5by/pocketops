"""
PocketOps - EC2 Manager Lambda
EC2インスタンスの状態取得・起動・停止を行うAPI
"""

import json
import os
import boto3
from botocore.exceptions import ClientError

ec2 = boto3.client("ec2", region_name=os.environ.get("AWS_REGION", "ap-northeast-1"))

# 管理対象タグ（環境変数で上書き可）
TARGET_TAG_KEY = "Project"
TARGET_TAG_VALUE = os.environ.get("TARGET_TAG_VALUE", "PocketOps")


def handler(event, context):
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    path_params = event.get("pathParameters") or {}

    try:
        if method == "GET" and path == "/ec2":
            return get_instances()

        if method == "POST" and path_params.get("action") in ("start", "stop"):
            instance_id = path_params.get("instanceId")
            action = path_params.get("action")
            return toggle_instance(instance_id, action)

        return _response(404, {"error": "Not Found"})

    except ClientError as e:
        code = e.response["Error"]["Code"]
        msg = e.response["Error"]["Message"]
        return _response(500, {"error": f"{code}: {msg}"})


def get_instances():
    """PocketOpsタグ付きEC2インスタンス一覧を返す"""
    resp = ec2.describe_instances(
        Filters=[{"Name": f"tag:{TARGET_TAG_KEY}", "Values": [TARGET_TAG_VALUE]}]
    )

    instances = []
    for reservation in resp["Reservations"]:
        for inst in reservation["Instances"]:
            name = _get_tag(inst.get("Tags", []), "Name") or inst["InstanceId"]
            instances.append(
                {
                    "instanceId": inst["InstanceId"],
                    "name": name,
                    "state": inst["State"]["Name"],
                    "type": inst["InstanceType"],
                    "publicIp": inst.get("PublicIpAddress", ""),
                    "launchTime": inst["LaunchTime"].isoformat(),
                }
            )

    return _response(200, {"instances": instances})


def toggle_instance(instance_id: str, action: str):
    """EC2インスタンスを起動または停止する"""
    if not instance_id:
        return _response(400, {"error": "instanceId is required"})

    if action == "start":
        ec2.start_instances(InstanceIds=[instance_id])
        return _response(200, {"instanceId": instance_id, "action": "start", "status": "initiating"})

    if action == "stop":
        ec2.stop_instances(InstanceIds=[instance_id])
        return _response(200, {"instanceId": instance_id, "action": "stop", "status": "initiating"})

    return _response(400, {"error": f"Unknown action: {action}"})


def _get_tag(tags: list, key: str) -> str | None:
    for tag in tags:
        if tag["Key"] == key:
            return tag["Value"]
    return None


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, ensure_ascii=False),
    }
