import { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';

import { useAppDispatch } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { invalidateOfficerCaches } from '@/utils/invalidateOfficerCaches';

type RefreshFn = () => unknown;

export function useOfficerPullToRefresh(extraRefresh?: RefreshFn) {
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      invalidateOfficerCaches(dispatch);
      if (extraRefresh) {
        await Promise.resolve(extraRefresh());
      }
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, extraRefresh]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        tintColor={colors.primaryNavy}
        colors={[colors.primaryNavy]}
      />
    ),
    [onRefresh, refreshing],
  );

  return { refreshing, onRefresh, refreshControl };
}
