import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import Toast from 'react-native-toast-message';

import { ClaimLifecycleTracker } from '../components/ClaimLifecycleTracker';
import { cashMineToastConfig } from '../notifications/ToastHost';
import { store } from '../store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }} />
      <ClaimLifecycleTracker />
      <Toast config={cashMineToastConfig} />
    </Provider>
  );
}
