import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { adminCardStyle, adminDesign } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type SectionCardProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

export function SectionCard({ title, actionLabel, onAction, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && onAction ? (
          <Button label={actionLabel} variant="ghost" onPress={onAction} />
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...adminCardStyle,
    marginBottom: adminDesign.layout.sectionGap,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: adminDesign.typography.cardTitle,
});
