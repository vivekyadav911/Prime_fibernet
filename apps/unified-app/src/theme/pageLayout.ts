import { StyleSheet } from 'react-native';

import { adminDesign } from '@/theme/adminDesign';
import { spacing } from '@/theme/spacing';

/**
 * Shared page layout tokens — single source for top spacing below navigation headers.
 * Headers (AdminAppBar, React Navigation) already apply the top safe-area inset.
 */
export const pageLayout = {
  /** Horizontal page gutter (20px). */
  pagePadding: adminDesign.layout.pagePadding,
  /** Intentional gap between nav header and first content block (16px). */
  contentTop: spacing.md,
  /** Gap between major sections on a page. */
  sectionGap: adminDesign.layout.sectionGap,
  /** Bottom padding for scroll/list content. */
  contentBottom: spacing.xl,
} as const;

export const pageLayoutStyles = StyleSheet.create({
  /** FlatList / ScrollView contentContainerStyle for pages under a nav header. */
  scrollContent: {
    paddingHorizontal: pageLayout.pagePadding,
    paddingTop: pageLayout.contentTop,
    paddingBottom: pageLayout.contentBottom,
  },
  /** ListHeaderComponent wrapper — no extra top padding (scrollContent owns it). */
  listHeader: {
    gap: pageLayout.sectionGap,
    paddingBottom: spacing.sm,
  },
  /** Static page body with standard gutters. */
  body: {
    flex: 1,
    paddingHorizontal: pageLayout.pagePadding,
    paddingTop: pageLayout.contentTop,
  },
  fill: {
    flex: 1,
  },
});
