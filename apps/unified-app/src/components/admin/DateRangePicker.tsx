import { DateRangePicker as CommonDateRangePicker, type DateRangePickerProps } from '@/components/common/pickers';
import { adminColors } from '@/theme/admin';

const ADMIN_ACCENT_TINT = 'rgba(91, 79, 207, 0.08)';

export function DateRangePicker(props: DateRangePickerProps) {
  return (
    <CommonDateRangePicker
      {...props}
      accentColor={props.accentColor ?? adminColors.primary}
      accentTint={props.accentTint ?? ADMIN_ACCENT_TINT}
    />
  );
}
