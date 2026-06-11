import { DateField as CommonDateField, type DateFieldProps } from '@/components/common/pickers';
import { adminColors } from '@/theme/admin';

const ADMIN_ACCENT_TINT = 'rgba(91, 79, 207, 0.08)';

export function DateField(props: DateFieldProps) {
  return (
    <CommonDateField
      {...props}
      accentColor={props.accentColor ?? adminColors.primary}
      accentTint={props.accentTint ?? ADMIN_ACCENT_TINT}
    />
  );
}
