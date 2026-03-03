import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView} from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import ContainerScreen from './src/screens/ContainerScreen';
import PlaybookScreen from './src/screens/PlaybookScreen';
import BiometricAuth from './src/native/BiometricAuth';

type Tab = 'dashboard' | 'containers' | 'playbooks';

function App() {
  const [locked, setLocked] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const authenticate = async () => {
    setAuthError(null);
    try {
      const result = await BiometricAuth.authenticate();
      if (result) {
        setLocked(false);
      }
    } catch (e: any) {
      setAuthError(e?.message ?? '認証に失敗しました');
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  if (locked) {
    return (
      <SafeAreaView style={styles.lockSafe}>
        <View style={styles.lockContainer}>
          <Text style={styles.lockTitle}>PocketOps</Text>
          <Text style={styles.lockSubtitle}>インフラ管理アプリ</Text>
          {authError ? (
            <Text style={styles.lockError}>{authError}</Text>
          ) : null}
          <TouchableOpacity style={styles.lockButton} onPress={authenticate}>
            <Text style={styles.lockButtonText}>認証する 🔒</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSelectInstance = (id: string) => {
    setSelectedInstanceId(id);
    setTab('containers');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        {tab === 'dashboard' && (
          <DashboardScreen onSelectInstance={handleSelectInstance} />
        )}
        {tab === 'containers' && (
          <ContainerScreen instanceId={selectedInstanceId} />
        )}
        {tab === 'playbooks' && <PlaybookScreen />}
      </View>

      <View style={styles.tabBar}>
        {(
          [
            {key: 'dashboard', label: 'EC2'},
            {key: 'containers', label: 'Docker'},
            {key: 'playbooks', label: 'Playbook'},
          ] as {key: Tab; label: string}[]
        ).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  body: {flex: 1},
  tabBar: {flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#ddd'},
  tab: {flex: 1, alignItems: 'center', paddingVertical: 12},
  tabActive: {borderTopWidth: 2, borderTopColor: '#2196F3'},
  tabText: {color: '#888', fontSize: 13},
  tabTextActive: {color: '#2196F3', fontWeight: '600'},
  lockSafe: {flex: 1, backgroundColor: '#fff'},
  lockContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16},
  lockTitle: {fontSize: 28, fontWeight: '700', color: '#1a1a1a'},
  lockSubtitle: {fontSize: 15, color: '#666'},
  lockButton: {
    marginTop: 24,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  lockButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  lockError: {color: '#f44336', fontSize: 13, textAlign: 'center', paddingHorizontal: 24},
});

export default App;
