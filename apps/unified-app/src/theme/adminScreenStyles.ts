import { StyleSheet } from 'react-native';

import { adminColors } from '@/theme/admin';
import { adminCardStyle, adminDesign } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

/** Shared screen-level styles — import instead of redefining per screen. */
export const adminScreenStyles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: adminColors.canvasBg,
  },
  listContent: {
    paddingHorizontal: adminDesign.layout.pagePadding,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  listHeader: {
    gap: adminDesign.layout.sectionGap,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  section: {
    gap: adminDesign.layout.sectionGap,
  },
  card: adminCardStyle,
  stateCard: {
    ...adminCardStyle,
    margin: adminDesign.layout.pagePadding,
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
