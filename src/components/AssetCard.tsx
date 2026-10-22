import { StyleSheet, Text, View } from 'react-native';

import type { BalanceItem } from '../types/api';
import { formatDecimalString } from '../utils/money';

interface AssetCardProps {
  item: BalanceItem;
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} selectable style={styles.secondaryAmount}>
        {formatDecimalString(value)}
      </Text>
    </View>
  );
}

export function AssetCard({ item }: AssetCardProps) {
  const initials = item.asset.slice(0, 2).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.assetIcon}>
          <Text style={styles.assetInitials}>{initials}</Text>
        </View>
        <View style={styles.assetHeadingText}>
          <Text style={styles.asset}>{item.asset}</Text>
          <Text style={styles.caption}>Available</Text>
        </View>
      </View>

      <Text adjustsFontSizeToFit numberOfLines={1} selectable style={styles.amount}>
        {formatDecimalString(item.available)}
      </Text>

      <View style={styles.divider} />
      <AmountRow label="Pending" value={item.pending} />
      <AmountRow label="Claiming" value={item.claiming} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E4F0',
    shadowColor: '#2D2442',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    gap: 12,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#EEEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetInitials: {
    color: '#5E35F2',
    fontWeight: '800',
    fontSize: 14,
  },
  assetHeadingText: {
    marginLeft: 12,
  },
  asset: {
    color: '#1E1830',
    fontSize: 18,
    fontWeight: '800',
  },
  caption: {
    color: '#787187',
    fontSize: 13,
    marginTop: 2,
  },
  amount: {
    color: '#1E1830',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEAF3',
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  label: {
    color: '#787187',
    fontSize: 14,
  },
  secondaryAmount: {
    color: '#3A334A',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
});
