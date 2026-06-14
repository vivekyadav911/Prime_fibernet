import { StyleSheet, View } from 'react-native';

import { KpiMetricTile } from './KpiMetricTile';
import type { KpiStatus, KpiSurfaceKey } from './KpiMetricTile';

type KPICardProps = {
  label: string;
  value: string | number;
  icon?: string;
  trend?: number;
  surface?: KpiSurfaceKey;
  status?: KpiStatus;
};

export function AdminKPICard({
  label,
  value,
  icon,
  trend,
  surface = 'purple',
  status = 'neutral',
}: KPICardProps) {
  return (
    <View style={styles.wrap}>
      <KpiMetricTile
        label={label}
        value={value}
        icon={icon}
        surface={surface}
        status={status}
        trend={trend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 148,
  },
});
