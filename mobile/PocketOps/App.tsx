import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView} from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import ContainerScreen from './src/screens/ContainerScreen';
import PlaybookScreen from './src/screens/PlaybookScreen';

type Tab = 'dashboard' | 'containers' | 'playbooks';

// TODO: DashboardScreen でインスタンスを選択したら渡す
const DEMO_INSTANCE_ID = 'i-xxxxxxxxxxxxxxxxx';

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'containers' && <ContainerScreen instanceId={DEMO_INSTANCE_ID} />}
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
});

export default App;
