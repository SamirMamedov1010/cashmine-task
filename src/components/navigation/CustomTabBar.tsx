import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ACTIVE_COLOR = '#5E35F2';
const INACTIVE_COLOR = '#837C90';

interface TabIconProps {
  color: string;
  name: string;
}

function TabIcon({ color, name }: TabIconProps) {
  if (name === 'activity') {
    return (
      <View style={[styles.activityIcon, { borderColor: color }]}>
        <View style={[styles.activityHandVertical, { backgroundColor: color }]} />
        <View style={[styles.activityHandHorizontal, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[styles.balanceIcon, { borderColor: color }]}>
      <Text style={[styles.balanceIconText, { color }]}>$</Text>
    </View>
  );
}

export function CustomTabBar({
  descriptors,
  emitter,
  insets,
  navigateToTab,
  state,
}: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={styles.items}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
          const label = typeof options.title === 'string' ? options.title : route.name;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              accessibilityLabel={options.tabBarAccessibilityLabel}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              key={route.key}
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <TabIcon color={color} name={route.name} />
              <Text style={[styles.label, { color }, focused && styles.activeLabel]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E7E2EC',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  items: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.62,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeLabel: {
    fontWeight: '800',
  },
  balanceIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1.8,
  },
  balanceIconText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  activityIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
  },
  activityHandVertical: {
    position: 'absolute',
    left: 9,
    top: 4,
    width: 1.7,
    height: 7,
    borderRadius: 1,
  },
  activityHandHorizontal: {
    position: 'absolute',
    left: 9,
    top: 9,
    width: 6,
    height: 1.7,
    borderRadius: 1,
    transform: [{ rotate: '30deg' }],
    transformOrigin: 'left center',
  },
});
