import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import {
  fetchCosts,
  updateThreshold,
  CostSummary,
  CostEC2Instance,
} from '../api/client';
import {toggleInstance} from '../api/client';

export default function CostScreen() {
  const [data, setData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState('');
  const [savingThreshold, setSavingThreshold] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const result = await fetchCosts();
      setData(result);
      setThresholdInput(result.threshold != null ? String(result.threshold) : '');
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

  const handleSaveThreshold = async () => {
    const val = parseFloat(thresholdInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('エラー', '有効な数値を入力してください');
      return;
    }
    setSavingThreshold(true);
    try {
      await updateThreshold(val);
      await load();
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleStopInstance = async (inst: CostEC2Instance) => {
    try {
      await toggleInstance(inst.instanceId, 'stop');
      await load();
    } catch (e: any) {
      Alert.alert('エラー', e.message);
    }
  };

  const formatChange = (pct: number | null) => {
    if (pct == null) return '';
    const sign = pct >= 0 ? '+' : '';
    return ` (${sign}${pct}%)`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const listData = data?.ec2Instances ?? [];

  return (
    <FlatList
      style={styles.container}
      data={listData}
      keyExtractor={item => item.instanceId}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>コスト監視</Text>
          {error && <Text style={styles.error}>{error}</Text>}

          {/* 閾値超過バナー */}
          {data?.thresholdExceeded && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                コスト超過: ${data.daily.yesterday.toFixed(4)} / 閾値 $
                {data.threshold?.toFixed(2)}
              </Text>
            </View>
          )}

          {/* デイリーコスト */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>デイリーコスト</Text>
            <Text style={styles.costRow}>
              昨日:{' '}
              <Text style={styles.costValue}>
                ${data?.daily.yesterday.toFixed(4)}
                {formatChange(data?.daily.percentChange ?? null)}
              </Text>
            </Text>
            <Text style={styles.costRow}>
              一昨日:{' '}
              <Text style={styles.costValue}>
                ${data?.daily.dayBefore.toFixed(4)}
              </Text>
            </Text>
          </View>

          {/* マンスリーコスト */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>マンスリーコスト</Text>
            <Text style={styles.costRow}>
              今月:{' '}
              <Text style={styles.costValue}>
                ${data?.monthly.thisMonth.toFixed(4)}
                {formatChange(data?.monthly.percentChange ?? null)}
              </Text>
            </Text>
            <Text style={styles.costRow}>
              先月:{' '}
              <Text style={styles.costValue}>
                ${data?.monthly.lastMonth.toFixed(4)}
              </Text>
            </Text>
          </View>

          {/* サービス別 Top5 */}
          {data?.serviceBreakdown && data.serviceBreakdown.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>サービス別 Top5</Text>
              {data.serviceBreakdown.map((svc, idx) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.svcName} numberOfLines={1}>
                    {svc.service}
                  </Text>
                  <Text style={styles.svcCost}>${svc.cost.toFixed(4)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* EC2インスタンス */}
          <Text style={styles.sectionHeader}>EC2 インスタンス</Text>
        </View>
      }
      renderItem={({item}) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.instName} numberOfLines={1}>
              {item.name || item.instanceId}
            </Text>
            <View
              style={[
                styles.badge,
                item.state === 'running' ? styles.running : styles.stopped,
              ]}>
              <Text style={styles.badgeText}>{item.state}</Text>
            </View>
          </View>
          <Text style={styles.instMeta}>{item.type}</Text>
          {item.state === 'running' && (
            <TouchableOpacity
              style={styles.btnStop}
              onPress={() => handleStopInstance(item)}>
              <Text style={styles.btnText}>停止</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>EC2インスタンスが見つかりません</Text>
      }
      ListFooterComponent={
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>閾値設定 (USD/日)</Text>
          <View style={styles.thresholdRow}>
            <TextInput
              style={styles.input}
              value={thresholdInput}
              onChangeText={setThresholdInput}
              keyboardType="decimal-pad"
              placeholder="例: 10.0"
            />
            <TouchableOpacity
              style={[styles.btnSave, savingThreshold && styles.btnDisabled]}
              onPress={handleSaveThreshold}
              disabled={savingThreshold}>
              <Text style={styles.btnText}>
                {savingThreshold ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f0f2f5', padding: 16},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 12},
  error: {color: 'red', marginBottom: 8},
  banner: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  bannerText: {color: '#fff', fontWeight: '600', textAlign: 'center'},
  card: {backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10},
  sectionTitle: {fontSize: 15, fontWeight: '600', marginBottom: 8},
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  costRow: {fontSize: 14, color: '#444', marginBottom: 4},
  costValue: {fontWeight: '600', color: '#1a1a1a'},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  svcName: {flex: 1, fontSize: 13, color: '#444', marginRight: 8},
  svcCost: {fontSize: 13, fontWeight: '600'},
  instName: {flex: 1, fontSize: 15, fontWeight: '600', marginRight: 8},
  instMeta: {color: '#666', marginTop: 4, marginBottom: 8, fontSize: 13},
  badge: {borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2},
  running: {backgroundColor: '#d4f5d4'},
  stopped: {backgroundColor: '#f5d4d4'},
  badgeText: {fontSize: 12, fontWeight: '600'},
  btnStop: {
    backgroundColor: '#f44336',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  btnSave: {
    backgroundColor: '#2196F3',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 64,
  },
  btnDisabled: {opacity: 0.6},
  btnText: {color: '#fff', fontWeight: '600'},
  thresholdRow: {flexDirection: 'row', alignItems: 'center'},
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 15,
  },
  empty: {textAlign: 'center', color: '#888', marginTop: 20},
});
