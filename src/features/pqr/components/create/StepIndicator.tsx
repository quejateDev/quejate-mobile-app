import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './createPQRStyles';

interface Props {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: Props) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            currentStep === step && styles.stepDotActive,
            currentStep > step && styles.stepDotDone,
          ]}
        >
          <Text
            style={[
              styles.stepDotText,
              currentStep === step && styles.stepDotTextActive,
              currentStep > step && styles.stepDotTextDone,
            ]}
          >
            {step}
          </Text>
        </View>
      ))}
    </View>
  );
}
