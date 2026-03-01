import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  fetchPlaybooks,
  runPlaybook,
  getPlaybookStatus,
  Playbook,
  PlaybookRun,
  PlaybookStatus,
} from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  InProgress: '#FF6F00',
  Success: '#4CAF50',
  Failed: '#f44336',
  TimedOut: '#9E9E9E',
};

export default function PlaybookScreen() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<PlaybookRun | null>(null);
  const [runStatus, setRunStatus] = useState<PlaybookStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    fetchPlaybooks()
      .then(d => setPlaybooks(d.playbooks))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (commandId: string) => {
    pollCountRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const status = await getPlaybookStatus(commandId);
        setRunStatus(status);
        if (status.status !== 'InProgress' || pollCountRef.current >= 12) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch {
        // ignore polling errors silently
      }
    }, 10_000);
  };

  const handleRun = (pb: Playbook) => {
    Alert.alert(
      'Playbook 実行',
      `「${pb.description}」を実行しますか？`,
      [
        {text: 'キャンセル', style: 'cancel'},
        {
          text: '実行',
          style: 'destructive',
          onPress: async () => {
            setRunning(pb.name);
            setError(null);
            setRunStatus(null);
            try {
              const result = await runPlaybook(pb.name);
              setLastRun(result);
              setRunStatus({commandId: result.commandId, status: 'InProgress'});
              startPolling(result.commandId);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setRunning(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Playbook 実行</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      {lastRun && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>最終実行</Text>
          <View style={styles.resultRow}>
            <Text>{lastRun.playbook}</Text>
            {runStatus && (
              <Text style={[styles.statusBadge, {color: STATUS_COLORS[runStatus.status] ?? '#333'}]}>
                {runStatus.status}
              </Text>
            )}
          </View>
          <Text style={styles.resultMeta}>
            ID: {lastRun.runId} / {new Date(lastRun.startedAt).toLocaleString('ja-JP')}
          </Text>
          {runStatus?.output ? (
            <Text style={styles.output} numberOfLines={4}>
              {runStatus.output}
            </Text>
          ) : null}
        </View>
      )}

      <FlatList
        data={playbooks}
        keyExtractor={item => item.name}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <TouchableOpacity
              style={[styles.button, running === item.name && styles.buttonDisabled]}
              onPress={() => handleRun(item)}
              disabled={running !== null}>
              {running === item.name ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>実行</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Playbook がありません</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f0f2f5', padding: 16},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 12},
  error: {color: 'red', marginBottom: 8},
  result: {backgroundColor: '#e8f5e9', borderRadius: 8, padding: 12, marginBottom: 12},
  resultTitle: {fontWeight: 'bold', marginBottom: 4},
  resultRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  statusBadge: {fontWeight: '700', fontSize: 13},
  resultMeta: {color: '#666', fontSize: 11, marginTop: 2},
  output: {color: '#333', fontSize: 11, marginTop: 6, fontFamily: 'monospace'},
  card: {backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10},
  name: {fontSize: 15, fontWeight: '600'},
  desc: {color: '#555', marginTop: 4, marginBottom: 10},
  button: {backgroundColor: '#FF6F00', borderRadius: 6, padding: 10, alignItems: 'center'},
  buttonDisabled: {backgroundColor: '#ccc'},
  btnText: {color: '#fff', fontWeight: '600'},
  empty: {textAlign: 'center', color: '#888', marginTop: 40},
});
