import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/spacing';

const PAGE_BTN_SIZE = 36;
const PAGE_BTN_GAP = 6;

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const scrollRef = useRef<ScrollView>(null);
  const pageStep = PAGE_BTN_SIZE + PAGE_BTN_GAP;

  const allPages = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  useEffect(() => {
    if (totalPages <= 1) return;
    const targetX = Math.max(0, (page - 1) * pageStep - pageStep * 2);
    scrollRef.current?.scrollTo({ x: targetX, animated: true });
  }, [page, pageStep, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <View style={styles.pagination}>
      <Pressable
        style={[styles.pageBtn, styles.pageNavBtn, page <= 1 && styles.pageBtnDisabled]}
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Ionicons name="chevron-back" size={16} color={page <= 1 ? colors.textSecondary : colors.textPrimary} />
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {allPages.map((p) => (
          <Pressable
            key={p}
            style={[styles.pageBtn, page === p && styles.pageBtnActive]}
            onPress={() => onPageChange(p)}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
          >
            <Text style={[styles.pageBtnText, page === p && styles.pageBtnTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.pageBtn, styles.pageNavBtn, page >= totalPages && styles.pageBtnDisabled]}
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Ionicons
          name="chevron-forward"
          size={16}
          color={page >= totalPages ? colors.textSecondary : colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAGE_BTN_GAP,
    width: '100%',
    maxWidth: '100%',
  },
  pageNavBtn: {
    flexShrink: 0,
  },
  pageScroll: {
    flex: 1,
    minWidth: 0,
  },
  pageScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PAGE_BTN_GAP,
    paddingHorizontal: 2,
  },
  pageBtn: {
    width: PAGE_BTN_SIZE,
    height: PAGE_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
    flexShrink: 0,
  },
  pageBtnActive: { backgroundColor: adminColors.primary, borderColor: adminColors.primary },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pageBtnTextActive: { color: colors.surfaceWhite },
});
