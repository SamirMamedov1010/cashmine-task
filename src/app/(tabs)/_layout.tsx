import { Tabs } from 'expo-router/js-tabs';

import { AuthGate } from '../../components/AuthGate';
import { CustomTabBar } from '../../components/navigation/CustomTabBar';

export default function TabsLayout() {
  return (
    <AuthGate>
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: '#F7F5FB' },
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Balances',
            tabBarAccessibilityLabel: 'Balances tab',
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarAccessibilityLabel: 'Activity tab',
          }}
        />
      </Tabs>
    </AuthGate>
  );
}
