import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type CollapsibleFormSectionProps = {
  title: string;
  icon?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

export function CollapsibleFormSection({
  title,
  icon,
  defaultExpanded = false,
  children,
}: CollapsibleFormSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerLeft}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: adminColors.cardBg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  icon: { fontSize: 16 },
  title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  chevron: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
    gap: spacing.sm,
  },
});
