import json
import os
from datetime import date, timedelta

import boto3

# ── Helpers ────────────────────────────────────────────────────────────────

def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }


def _get_ssm_client():
    return boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "ap-northeast-1"))


def _get_threshold():
    ssm = _get_ssm_client()
    try:
        param = ssm.get_parameter(Name="/pocketops/costs/threshold")
        return float(param["Parameter"]["Value"])
    except Exception:
        return None


# ── Cost Explorer ──────────────────────────────────────────────────────────

def _fetch_costs():
    ce = boto3.client("ce", region_name="us-east-1")
    today = date.today()
    yesterday = today - timedelta(days=1)
    day_before = today - timedelta(days=2)

    # First day of last month
    first_this_month = today.replace(day=1)
    if first_this_month.month == 1:
        first_last_month = first_this_month.replace(year=first_this_month.year - 1, month=12)
    else:
        first_last_month = first_this_month.replace(month=first_this_month.month - 1)

    # Daily: yesterday vs day before
    daily_resp = ce.get_cost_and_usage(
        TimePeriod={"Start": str(day_before), "End": str(today)},
        Granularity="DAILY",
        Metrics=["BlendedCost"],
    )
    daily_results = daily_resp["ResultsByTime"]
    cost_day_before = float(daily_results[0]["Total"]["BlendedCost"]["Amount"]) if daily_results else 0.0
    cost_yesterday = float(daily_results[1]["Total"]["BlendedCost"]["Amount"]) if len(daily_results) > 1 else 0.0
    currency = daily_results[0]["Total"]["BlendedCost"]["Unit"] if daily_results else "USD"

    daily_change = None
    if cost_day_before > 0:
        daily_change = round((cost_yesterday - cost_day_before) / cost_day_before * 100, 1)

    # Service breakdown Top5 (yesterday)
    svc_resp = ce.get_cost_and_usage(
        TimePeriod={"Start": str(yesterday), "End": str(today)},
        Granularity="DAILY",
        Metrics=["BlendedCost"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
    )
    service_costs = []
    if svc_resp["ResultsByTime"]:
        groups = svc_resp["ResultsByTime"][0].get("Groups", [])
        service_costs = sorted(
            [{"service": g["Keys"][0], "cost": float(g["Metrics"]["BlendedCost"]["Amount"])} for g in groups],
            key=lambda x: x["cost"],
            reverse=True,
        )[:5]

    # Monthly: this month vs last month
    monthly_resp = ce.get_cost_and_usage(
        TimePeriod={"Start": str(first_last_month), "End": str(today)},
        Granularity="MONTHLY",
        Metrics=["BlendedCost"],
    )
    monthly_results = monthly_resp["ResultsByTime"]
    cost_last_month = float(monthly_results[0]["Total"]["BlendedCost"]["Amount"]) if monthly_results else 0.0
    cost_this_month = float(monthly_results[1]["Total"]["BlendedCost"]["Amount"]) if len(monthly_results) > 1 else 0.0

    monthly_change = None
    if cost_last_month > 0:
        monthly_change = round((cost_this_month - cost_last_month) / cost_last_month * 100, 1)

    return {
        "daily": {
            "yesterday": round(cost_yesterday, 4),
            "dayBefore": round(cost_day_before, 4),
            "percentChange": daily_change,
            "currency": currency,
        },
        "monthly": {
            "thisMonth": round(cost_this_month, 4),
            "lastMonth": round(cost_last_month, 4),
            "percentChange": monthly_change,
            "currency": currency,
        },
        "serviceBreakdown": service_costs,
    }


def _fetch_ec2_instances():
    ec2 = boto3.client("ec2", region_name=os.environ.get("AWS_REGION", "ap-northeast-1"))
    resp = ec2.describe_instances()
    instances = []
    for reservation in resp["Reservations"]:
        for inst in reservation["Instances"]:
            name = ""
            for tag in inst.get("Tags", []):
                if tag["Key"] == "Name":
                    name = tag["Value"]
                    break
            instances.append({
                "instanceId": inst["InstanceId"],
                "name": name,
                "state": inst["State"]["Name"],
                "type": inst["InstanceType"],
            })
    return instances


# ── Route Handlers ─────────────────────────────────────────────────────────

def handle_get_costs():
    try:
        costs = _fetch_costs()
        ec2_instances = _fetch_ec2_instances()
        threshold = _get_threshold()
        exceeded = False
        if threshold is not None:
            exceeded = costs["daily"]["yesterday"] > threshold
        return _response(200, {
            **costs,
            "ec2Instances": ec2_instances,
            "threshold": threshold,
            "thresholdExceeded": exceeded,
        })
    except Exception as e:
        return _response(500, {"error": str(e)})


def handle_get_threshold():
    threshold = _get_threshold()
    return _response(200, {"threshold": threshold, "currency": "USD"})


def handle_set_threshold(body_str):
    try:
        body = json.loads(body_str or "{}")
        threshold = body.get("threshold")
        if threshold is None:
            return _response(400, {"error": "threshold is required"})
        threshold = float(threshold)
        ssm = _get_ssm_client()
        ssm.put_parameter(
            Name="/pocketops/costs/threshold",
            Value=str(threshold),
            Type="String",
            Overwrite=True,
        )
        return _response(200, {"threshold": threshold, "currency": "USD"})
    except Exception as e:
        return _response(500, {"error": str(e)})


# ── EventBridge Handler ────────────────────────────────────────────────────

def handle_scheduled():
    try:
        costs = _fetch_costs()
        cost = costs["daily"]["yesterday"]
        threshold = _get_threshold()
        exceeded = threshold is not None and cost > threshold
        return {"status": "ok", "cost": cost, "threshold": threshold, "exceeded": exceeded, "notified": False}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ── Main Handler ───────────────────────────────────────────────────────────

def handler(event, context):
    # EventBridge trigger
    if "httpMethod" not in event:
        return handle_scheduled()

    method = event.get("httpMethod", "GET")
    path = event.get("path", "")
    body = event.get("body") or ""

    if path == "/costs" and method == "GET":
        return handle_get_costs()
    elif path == "/costs/threshold" and method == "GET":
        return handle_get_threshold()
    elif path == "/costs/threshold" and method == "POST":
        return handle_set_threshold(body)
    else:
        return _response(404, {"error": "Not Found"})
