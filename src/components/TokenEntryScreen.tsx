import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from './PrimaryButton';

interface TokenEntryScreenProps {
  error: string | null;
  isValidating: boolean;
  onSubmit: (token: string) => void;
}

export function TokenEntryScreen({
  error,
  isValidating,
  onSubmit,
}: TokenEntryScreenProps) {
  const [token, setToken] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit() {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      setLocalError('Enter an API token to continue.');
      return;
    }

    setLocalError(null);
    onSubmit(normalizedToken);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>C</Text>
          </View>
          <Text style={styles.eyebrow}>CASHMINE</Text>
          <Text style={styles.title}>Connect your account</Text>
          <Text style={styles.body}>
            Enter your API token to view balances. The token is verified with
            CashMine before it is saved in this browser.
          </Text>

          <View style={styles.form}>
            <Text style={styles.inputLabel}>API token</Text>
            <TextInput
              accessibilityLabel="CashMine API token"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isValidating}
              onChangeText={setToken}
              onSubmitEditing={handleSubmit}
              placeholder="Paste your token"
              placeholderTextColor="#9A94A7"
              returnKeyType="go"
              secureTextEntry
              style={styles.input}
              value={token}
            />
            {(localError || error) && (
              <Text accessibilityRole="alert" style={styles.error}>
                {localError || error}
              </Text>
            )}
            <PrimaryButton
              label="Verify and continue"
              loading={isValidating}
              onPress={handleSubmit}
            />
          </View>

          <Text style={styles.privacy}>
            Your token is never included in app logs or the application bundle.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F5FB',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E35F2',
    marginBottom: 18,
  },
  brandLetter: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  eyebrow: {
    color: '#5E35F2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: '#1E1830',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 8,
  },
  body: {
    color: '#6F687D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  form: {
    marginTop: 30,
    gap: 12,
  },
  inputLabel: {
    color: '#312A47',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D5E7',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#1E1830',
    fontSize: 16,
  },
  error: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
  },
  privacy: {
    color: '#898292',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 24,
  },
});
