import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ui } from '../usersUi';

type AddUserSectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AddUserSectionCard({ title, subtitle, children }: AddUserSectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ui.card,
    borderRadius: ui.radiusHero,
    padding: ui.cardPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    ...ui.shadow,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  body: {
    marginTop: 12,
  },
});
