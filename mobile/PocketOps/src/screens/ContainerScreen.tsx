import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {fetchContainers, Container} from '../api/client';

type Props = {
  instanceId: string;
};

export default function ContainerScreen({instanceId}: Props) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await fetchContainers(instanceId);
      setContainers(data.containers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [instanceId]);

  const isUp = (status: string) => status.toLowerCase().startsWith('up');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>コンテナ監視</Text>
      <Text style={styles.sub}>{instanceId}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={containers}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <View
                style={[styles.dot, isUp(item.status) ? styles.dotUp : styles.dotDown]}
              />
            </View>
            <Text style={styles.image}>{item.image}</Text>
            <Text style={styles.status}>{item.status}</Text>
            {item.ports ? <Text style={styles.ports}>{item.ports}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>コンテナが見つかりません</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f0f2f5', padding: 16},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {fontSize: 20, fontWeight: 'bold'},
  sub: {color: '#888', fontSize: 12, marginBottom: 12},
  error: {color: 'red', marginBottom: 8},
  card: {backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  name: {fontSize: 15, fontWeight: '600'},
  image: {color: '#555', fontSize: 12, marginTop: 4},
  status: {color: '#333', marginTop: 2},
  ports: {color: '#2196F3', fontSize: 12, marginTop: 4},
  dot: {width: 10, height: 10, borderRadius: 5},
  dotUp: {backgroundColor: '#4CAF50'},
  dotDown: {backgroundColor: '#f44336'},
  empty: {textAlign: 'center', color: '#888', marginTop: 40},
});
