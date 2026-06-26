import { StyleSheet } from 'react-native';

import { adminColors } from '@/theme/admin';
import { adminCardStyle, adminDesign } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { pageLayout, pageLayoutStyles } from '@/theme/pageLayout';
import { spacing } from '@/theme/spacing';

/** Shared screen-level styles — import instead of redefining per screen. */
export const adminScreenStyles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: adminColors.canvasBg,
  },
  /** FlatList / ScrollView content under nav header — use instead of one-off padding. */
  listContent: pageLayoutStyles.scrollContent,
  /** ListHeaderComponent block — top spacing comes from listContent, not here. */
  listHeader: pageLayoutStyles.listHeader,
  section: {
    gap: pageLayout.sectionGap,
  },
  card: adminCardStyle,
  stateCard: {
    ...adminCardStyle,
    marginHorizontal: pageLayout.pagePadding,
    marginTop: pageLayout.contentTop,
    justifyContent: 'center',
  },
  emptyCard: {
    ...adminCardStyle,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  sectionTitle: adminDesign.typography.sectionTitle,
  sectionMeta: adminDesign.typography.meta,
});
