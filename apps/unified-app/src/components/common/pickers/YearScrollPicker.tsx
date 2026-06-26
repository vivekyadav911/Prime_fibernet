import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import type { PickerAccent } from './pickerTheme';

const ITEM_HEIGHT = 36;
const VISIBLE_HEIGHT = 216;

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
  const edgePadding = (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2;

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
      scrollRef.current?.scrollTo({ y: edgePadding + index * ITEM_HEIGHT, animated: false });
    }
  }, [value, years, edgePadding]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Year</Text>
      <View style={[styles.listShell, { height: VISIBLE_HEIGHT }]}>
        <View
          pointerEvents="none"
          style={[styles.selectionBand, { backgroundColor: accent.accentTint }]}
        />
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: edgePadding }}
        >
          {years.map((year) => {
            const active = year === value;
            return (
              <Pressable
                key={year}
                style={styles.item}
                onPress={() => onChange(year)}
              >
                <Text
                  style={[
                    styles.itemText,
                    active && { color: accent.accentColor, fontWeight: '700' },
                  ]}
                >
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
  wrap: {
    width: 72,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  listShell: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  selectionBand: {
    position: 'absolute',
    left: spacing.xxs,
    right: spacing.xxs,
    top: '50%',
    marginTop: -(ITEM_HEIGHT / 2),
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  itemText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
