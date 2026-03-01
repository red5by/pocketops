/**
 * PocketOps API クライアント
 * Lambda + API Gateway と通信する唯一の窓口
 * デプロイ後に BASE_URL を sam deploy の ApiBaseUrl 出力値で置き換える
 */

const BASE_URL =
  process.env.API_BASE_URL ??
  'https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {'Content-Type': 'application/json'},
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({error: res.statusText}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── EC2 ────────────────────────────────────────────────

export type EC2Instance = {
  instanceId: string;
  name: string;
  state: 'running' | 'stopped' | 'pending' | 'stopping';
  type: string;
  publicIp: string;
  launchTime: string;
};

export const fetchInstances = (): Promise<{instances: EC2Instance[]}> =>
  request('/ec2');

export const toggleInstance = (
  instanceId: string,
  action: 'start' | 'stop',
): Promise<{instanceId: string; action: string; status: string}> =>
  request(`/ec2/${instanceId}/${action}`, {method: 'POST'});

// ── Docker ──────────────────────────────────────────────

export type Container = {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
};

export const fetchContainers = (
  instanceId: string,
): Promise<{containers: Container[]}> =>
  request(`/ec2/${instanceId}/containers`);

// ── Playbook ────────────────────────────────────────────

export type Playbook = {
  name: string;
  path: string;
  description: string;
};

export type PlaybookRun = {
  runId: string;
  playbook: string;
  commandId: string;
  status: string;
  startedAt: string;
};

export const fetchPlaybooks = (): Promise<{playbooks: Playbook[]}> =>
  request('/playbooks');

export const runPlaybook = (
  playbook: string,
  targetHost?: string,
  extraVars?: Record<string, string>,
): Promise<PlaybookRun> =>
  request('/playbooks/run', {
    method: 'POST',
    body: JSON.stringify({playbook, targetHost: targetHost ?? 'all', extraVars}),
  });

export type PlaybookStatus = {
  commandId: string;
  status: 'InProgress' | 'Success' | 'Failed' | 'TimedOut';
  output?: string;
};

export const getPlaybookStatus = (commandId: string): Promise<PlaybookStatus> =>
  request(`/playbooks/status/${commandId}`);
