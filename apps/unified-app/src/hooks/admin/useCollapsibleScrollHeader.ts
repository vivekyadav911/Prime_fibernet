import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

const DEFAULT_LIST_GAP = 8;
const DEFAULT_TUCK = 4;

export function useCollapsibleScrollHeader(opts?: { maxHeight?: number; listGap?: number }) {
  const listGap = opts?.listGap ?? DEFAULT_LIST_GAP;
  const maxHeight = opts?.maxHeight;

  const measuredRef = useRef(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const collapse = useRef(new Animated.Value(0)).current;
  const collapseRef = useRef(0);
  const lastScrollY = useRef(0);

  const insetTop = headerHeight > 0 ? headerHeight + listGap : 0;

  const animatedStyle = useMemo(() => {
    if (headerHeight <= 0) return null;
    const hideDistance = headerHeight + DEFAULT_TUCK;
    return {
      transform: [
        {
          translateY: collapse.interpolate({
            inputRange: [0, headerHeight],
            outputRange: [0, -hideDistance],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  }, [collapse, headerHeight]);

  const onHeaderLayout = useCallback(
    (height: number) => {
      const rounded = Math.round(height);
      const capped = maxHeight ? Math.min(rounded, maxHeight) : rounded;
      if (capped > 0 && measuredRef.current !== capped) {
        measuredRef.current = capped;
        setHeaderHeight(capped);
      }
    },
    [maxHeight],
  );

  const resetCollapse = useCallback(() => {
    collapseRef.current = 0;
    lastScrollY.current = 0;
    collapse.setValue(0);
  }, [collapse]);

  const pinCollapseAtBottom = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const maxHide = measuredRef.current;
      if (maxHide <= 0) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const atBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 8;

      if (atBottom && collapseRef.current > 0) {
        collapseRef.current = maxHide;
        collapse.setValue(maxHide);
      }
    },
    [collapse],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const maxHide = measuredRef.current;
      if (maxHide <= 0) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = Math.max(0, contentOffset.y);
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;

      const atBottom = y + layoutMeasurement.height >= contentSize.height - 8;
      const atTop = y <= 0.5;

      let next = collapseRef.current;

      if (atTop) {
        next = 0;
      } else if (atBottom && dy > 0) {
        next = maxHide;
      } else if (dy > 0) {
        next = Math.min(maxHide, next + dy);
      } else if (dy < 0) {
        next = Math.max(0, next + dy);
      }

      const rounded = Math.round(next);
      if (rounded !== Math.round(collapseRef.current)) {
        collapseRef.current = rounded;
        collapse.setValue(rounded);
      }
    },
    [collapse],
  );

  const scrollHandlers = useMemo(
    () => ({
      onScroll: handleScroll,
      onScrollEndDrag: pinCollapseAtBottom,
      onMomentumScrollEnd: pinCollapseAtBottom,
      scrollEventThrottle: 16 as const,
    }),
    [handleScroll, pinCollapseAtBottom],
  );

  return {
    headerHeight,
    insetTop,
    animatedStyle,
    onHeaderLayout,
    resetCollapse,
    scrollHandlers,
  };
}
