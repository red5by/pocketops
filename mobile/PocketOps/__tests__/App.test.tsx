/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import ContainerScreen from '../src/screens/ContainerScreen';
import PlaybookScreen from '../src/screens/PlaybookScreen';
import {usePolling} from '../src/hooks/usePolling';

jest.mock('../src/api/client', () => ({
  fetchInstances: jest.fn(() => Promise.resolve({instances: []})),
  fetchContainers: jest.fn(() => Promise.resolve({containers: []})),
  fetchPlaybooks: jest.fn(() => Promise.resolve({playbooks: []})),
  toggleInstance: jest.fn(),
  runPlaybook: jest.fn(),
  getPlaybookStatus: jest.fn(),
}));

// ── 既存テスト ──────────────────────────────────────────────────────────────
test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});

// ── usePolling ──────────────────────────────────────────────────────────────
describe('usePolling', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('enabled=false の時に interval が起動しない', () => {
    const fn = jest.fn();
    function Wrapper() {
      usePolling(fn, 1000, false);
      return null;
    }
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Wrapper />);
    });
    jest.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
  });
});

// ── ContainerScreen ─────────────────────────────────────────────────────────
describe('ContainerScreen', () => {
  test('instanceId=null の時に選択促すメッセージが表示される', () => {
    let renderer: ReturnType<typeof ReactTestRenderer.create>;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ContainerScreen instanceId={null} />);
    });
    expect(JSON.stringify(renderer!.toJSON())).toContain(
      'EC2タブでインスタンスを選択してください',
    );
  });
});

// ── PlaybookScreen ──────────────────────────────────────────────────────────
describe('PlaybookScreen', () => {
  test('初期レンダリングがクラッシュしない', async () => {
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<PlaybookScreen />);
    });
  });
});
