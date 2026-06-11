import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import type { PickerAccent } from './pickerTheme';

const ITEM_HEIGHT = 40;
const VISIBLE_HEIGHT = 120;

type YearScrollPickerProps = {
  value: number;
  onChange: (year: number) => void;
  minYear: number;
  maxYear: number;
  accent: PickerAccent;
};

export function YearScrollPicker({
  value,
  onChange,
  minYear,
  maxYear,
  accent,
}: YearScrollPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = minYear; y <= maxYear; y += 1) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  useEffect(() => {
    const index = years.indexOf(value);
    if (index >= 0) {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    }
  }, [value, years]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Year</Text>
      <View style={[styles.list, { height: VISIBLE_HEIGHT }]}>
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
        >
          {years.map((year) => {
            const active = year === value;
            return (
              <Pressable
                key={year}
                style={[styles.item, active && { backgroundColor: accent.accentTint }]}
                onPress={() => onChange(year)}
              >
                <Text style={[styles.itemText, active && { color: accent.accentColor, fontWeight: '700' }]}>
                  {year}
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
