import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@prime/ui';

import { SyncManager } from '@/services/offline/syncManager';
import { useAppSelector } from '@/store/hooks';

export function OfflineBanner() {
  const visible = useAppSelector((state) => state.ui.offlineBannerVisible);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    void SyncManager.loadQueue().then(() => setQueueCount(SyncManager.getPendingCount()));
  }, [visible]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -80,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const queueLabel =
    queueCount > 0 ? ` · ${queueCount} change${queueCount === 1 ? '' : 's'} queued` : '';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          paddingTop: insets.top + (Platform.OS === 'web' ? 8 : 4),
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.text}>
        You&apos;re offline — changes will sync when connected{queueLabel}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.warning,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  text: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
