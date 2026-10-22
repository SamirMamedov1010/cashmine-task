import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ActivityScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.content}>
        <View>
          <Text style={styles.eyebrow}>CASHMINE</Text>
          <Text style={styles.title}>Activity</Text>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.icon}>
            <View style={styles.clockHandVertical} />
            <View style={styles.clockHandHorizontal} />
          </View>
          <Text style={styles.emptyTitle}>No activity to show yet</Text>
          <Text style={styles.emptyBody}>
            Your transaction history will appear here when activity integration is available.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F5FB',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  eyebrow: {
    color: '#5E35F2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    color: '#1E1830',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 3,
  },
  emptyCard: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E3F0',
    borderWidth: 1,
    borderRadius: 24,
    padding: 30,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#8A78F4',
    marginBottom: 18,
  },
  clockHandVertical: {
    position: 'absolute',
    left: 22,
    top: 10,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: '#5E35F2',
  },
  clockHandHorizontal: {
    position: 'absolute',
    left: 22,
    top: 22,
    width: 11,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#5E35F2',
    transform: [{ rotate: '28deg' }],
    transformOrigin: 'left center',
  },
  emptyTitle: {
    color: '#2B2440',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    maxWidth: 290,
    color: '#756D84',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});
