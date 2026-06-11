import { StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type FormStep = {
  key: number;
  title: string;
  subtitle: string;
};

type FormStepperProps = {
  steps: readonly FormStep[];
  currentStep: number;
};

export function FormStepper({ steps, currentStep }: FormStepperProps) {
  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => {
        const isCompleted = step.key < currentStep;
        const isActive = step.key === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.railCol}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                ]}
              >
                <Text
                  style={[
                    styles.circleText,
                    (isCompleted || isActive) && styles.circleTextActive,
                  ]}
                >
                  {isCompleted ? '✓' : step.key}
                </Text>
              </View>
              {!isLast ? <View style={[styles.line, isCompleted && styles.lineCompleted]} /> : null}
            </View>
            <View style={styles.labelCol}>
              <Text style={[styles.title, isActive && styles.titleActive]}>{step.title}</Text>
              <Text style={styles.subtitle}>{step.subtitle}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.sm },
  stepRow: { flexDirection: 'row', gap: spacing.md, minHeight: 72 },
  railCol: { alignItems: 'center', width: 36 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primary,
  },
  circleCompleted: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primary,
  },
  circleText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  circleTextActive: { color: '#FFFFFF' },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderDefault,
    marginVertical: spacing.xxs,
  },
  lineCompleted: { backgroundColor: adminColors.primary },
  labelCol: { flex: 1, paddingBottom: spacing.md },
  title: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  titleActive: { color: adminColors.primary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
