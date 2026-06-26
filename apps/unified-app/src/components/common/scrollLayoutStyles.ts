import { Platform, StyleSheet } from 'react-native';

/** Default flex chain for vertical scroll regions inside navigation shells (especially web). */
export const scrollLayoutStyles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContainer: Platform.select({
    web: { flex: 1, minHeight: 0 },
    default: { flex: 1 },
  }),
});
