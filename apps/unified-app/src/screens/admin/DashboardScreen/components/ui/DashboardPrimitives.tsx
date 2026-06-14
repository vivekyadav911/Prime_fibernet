import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { dash } from '../../dashboardUi';

type DashboardCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
  radius?: number;
};

export function DashboardCard({
  children,
  style,
  padding = dash.cardPad,
  radius = dash.radiusMd,
}: DashboardCardProps) {
  return (
    <View style={[styles.card, { padding, borderRadius: radius }, style]}>{children}</View>
  );
}

export function SectionEyebrow({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.eyebrowRow}>
      <Text style={styles.eyebrow}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

type AccordionRowProps = {
  title: string;
  summary: string;
  children: ReactNode;
  defaultExpanded?: boolean;
};

export function AccordionRow({ title, summary, children, defaultExpanded = false }: AccordionRowProps) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <View style={styles.accordionWrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.accordionCopy}>
          <Text style={styles.accordionTitle}>{title}</Text>
          {!open ? <Text style={styles.accordionSummary} numberOfLines={1}>{summary}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={dash.textSecondary} />
      </Pressable>
      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: dash.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dash.border,
    ...dash.shadow,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: dash.sectionHeaderMb,
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '500',
    color: dash.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    color: dash.textSecondary,
  },
  accordionWrap: {
    backgroundColor: dash.card,
    borderRadius: dash.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dash.border,
    overflow: 'hidden',
    ...dash.shadow,
  },
  accordionHeader: {
    height: dash.accordionH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: dash.compactPad,
    gap: 10,
  },
  accordionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: dash.text,
    lineHeight: 18,
  },
  accordionSummary: {
    fontSize: 13,
    fontWeight: '500',
    color: dash.textSecondary,
    lineHeight: 16,
  },
  accordionBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dash.border,
    padding: dash.compactPad,
  },
  pressed: {
    backgroundColor: dash.pressed,
  },
});
