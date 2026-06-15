import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { FormStep } from '@/components/admin/FormStepper';

import { ui } from '../officersUi';

const SHORT_LABELS: Record<number, string> = {
  1: 'Personal',
  2: 'Contact',
  3: 'Role',
  4: 'Docs',
};

type AddOfficerHorizontalStepperProps = {
  steps: readonly FormStep[];
  currentStep: number;
};

export function AddOfficerHorizontalStepper({ steps, currentStep }: AddOfficerHorizontalStepperProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {steps.map((step, index) => {
          const isCompleted = step.key < currentStep;
          const isActive = step.key === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <View key={step.key} style={styles.stepCol}>
              <View style={styles.stepTop}>
                {index > 0 ? (
                  <View
                    style={[
                      styles.connector,
                      styles.connectorLeft,
                      (isCompleted || isActive) && styles.connectorDone,
                    ]}
                  />
                ) : null}
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleDone,
                    isActive && styles.circleActive,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.circleText, isActive && styles.circleTextActive]}>
                      {step.key}
                    </Text>
                  )}
                </View>
                {!isLast ? (
                  <View
                    style={[styles.connector, styles.connectorRight, isCompleted && styles.connectorDone]}
                  />
                ) : null}
              </View>
              <Text
                style={[styles.label, isActive && styles.labelActive, isCompleted && styles.labelDone]}
                numberOfLines={1}
              >
                {SHORT_LABELS[step.key] ?? step.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CIRCLE = 26;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    height: CIRCLE,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: ui.border,
    maxHeight: 2,
  },
  connectorLeft: {
    marginRight: 4,
  },
  connectorRight: {
    marginLeft: 4,
  },
  connectorDone: {
    backgroundColor: ui.success,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 1.5,
    borderColor: ui.border,
    backgroundColor: ui.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    borderColor: ui.brand,
    backgroundColor: ui.brand,
  },
  circleDone: {
    borderColor: ui.success,
    backgroundColor: ui.success,
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.textSecondary,
  },
  circleTextActive: {
    color: '#FFFFFF',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: ui.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: ui.brand,
  },
  labelDone: {
    color: ui.text,
  },
});
