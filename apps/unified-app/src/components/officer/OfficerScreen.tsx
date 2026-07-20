import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Screen } from '@prime/ui';

import { DismissKeyboardScrollView } from '@/components/common';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';
import { spacing } from '@/theme/spacing';

type ScreenProps = ComponentProps<typeof Screen>;

type OfficerScreenProps = Omit<ScreenProps, 'children'> & {
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => unknown;
};

/** Officer screen shell with optional pull-to-refresh scroll body. */
export function OfficerScreen({
  children,
  padded = true,
  scrollable = true,
  onRefresh: extraRefresh,
  style,
  ...props
}: OfficerScreenProps) {
  const { refreshControl } = useOfficerPullToRefresh(extraRefresh);

  if (!scrollable) {
    return (
      <Screen padded={padded} style={style} {...props}>
        {children as ScreenProps['children']}
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={style} {...props}>
      <DismissKeyboardScrollView
        refreshControl={refreshControl}
        contentContainerStyle={padded ? styles.paddedContent : styles.content}
      >
        {children as ScreenProps['children']}
      </DismissKeyboardScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  paddedContent: { padding: spacing.md, paddingBottom: spacing.xxl },
});
