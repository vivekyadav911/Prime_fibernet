import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import type { PickerAccent } from './pickerTheme';

const ITEM_HEIGHT = 40;
const VISIBLE_HEIGHT = 160;

type HourScrollPickerProps = {
  value: number;
  onChange: (hour: number) => void;
  accent: PickerAccent;
};

export function HourScrollPicker({ value, onChange, accent }: HourScrollPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: value * ITEM_HEIGHT, animated: false });
  }, [value]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Hour (24h)</Text>
      <View style={[styles.list, { height: VISIBLE_HEIGHT }]}>
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
        >
          {hours.map((hour) => {
            const active = hour === value;
            return (
              <Pressable
                key={hour}
                style={[styles.item, active && { backgroundColor: accent.accentTint }]}
                onPress={() => onChange(hour)}
              >
                <Text style={[styles.itemText, active && { color: accent.accentColor, fontWeight: '700' }]}>
                  {String(hour).padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
  },
  list: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceWhite,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
});
