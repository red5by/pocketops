import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {fetchInstances, toggleInstance, EC2Instance} from '../api/client';

type Props = {
  onSelectInstance?: (instanceId: string) => void;
};

export default function DashboardScreen({onSelectInstance}: Props) {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await fetchInstances();
      setInstances(data.instances);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (inst: EC2Instance) => {
    const action = inst.state === 'running' ? 'stop' : 'start';
    try {
      await toggleInstance(inst.instanceId, action);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
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
      <Text style={styles.title}>EC2 ダッシュボード</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={instances}
        keyExtractor={item => item.instanceId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <View
                style={[
                  styles.badge,
                  item.state === 'running' ? styles.running : styles.stopped,
                ]}>
                <Text style={styles.badgeText}>{item.state}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.type} {item.publicIp ? `• ${item.publicIp}` : ''}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.button,
                  item.state === 'running' ? styles.btnStop : styles.btnStart,
                ]}
                onPress={() => handleToggle(item)}
                disabled={['pending', 'stopping'].includes(item.state)}>
                <Text style={styles.btnText}>
                  {item.state === 'running' ? '停止' : '起動'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDocker}
                onPress={() => onSelectInstance?.(item.instanceId)}>
                <Text style={styles.btnText}>Docker確認</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>インスタンスが見つかりません</Text>
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
  card: {backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  name: {fontSize: 16, fontWeight: '600'},
  meta: {color: '#666', marginTop: 4, marginBottom: 10},
  badge: {borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2},
  running: {backgroundColor: '#d4f5d4'},
  stopped: {backgroundColor: '#f5d4d4'},
  badgeText: {fontSize: 12, fontWeight: '600'},
  actions: {flexDirection: 'row', gap: 8},
  button: {flex: 1, borderRadius: 6, padding: 8, alignItems: 'center'},
  btnStart: {backgroundColor: '#2196F3'},
  btnStop: {backgroundColor: '#f44336'},
  btnDocker: {flex: 1, borderRadius: 6, padding: 8, alignItems: 'center', backgroundColor: '#607D8B'},
  btnText: {color: '#fff', fontWeight: '600'},
  empty: {textAlign: 'center', color: '#888', marginTop: 40},
});
