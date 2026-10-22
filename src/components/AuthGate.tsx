import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuthentication } from '../features/auth/useAuthentication';
import { TokenEntryScreen } from './TokenEntryScreen';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { error, status, verifyToken } = useAuthentication();

  if (status === 'checking') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#5E35F2" size="large" />
        <Text style={styles.loadingText}>Opening CashMine…</Text>
      </View>
    );
  }

  if (status === 'authenticated') {
    return children;
  }

  return (
    <TokenEntryScreen
      error={error}
      isValidating={status === 'validating'}
      onSubmit={(token) => void verifyToken(token)}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#F7F5FB',
  },
  loadingText: {
    color: '#6F687D',
    fontSize: 15,
  },
});
