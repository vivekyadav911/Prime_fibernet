import { StyleSheet } from 'react-native';

import { ui } from './adminAccountUi';

export const INPUT_H = 52;
export const BTN_H = 50;

export const formStyles = StyleSheet.create({
  fieldWrap: {
    marginBottom: 0,
  },
  input: {
    height: INPUT_H,
    fontSize: 16,
    fontWeight: '500',
    color: ui.text,
    borderRadius: ui.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    backgroundColor: ui.searchFill,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  inputFocused: {
    borderColor: ui.brand,
    borderWidth: 1.5,
    backgroundColor: ui.card,
    shadowColor: ui.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  inputReadOnly: {
    backgroundColor: '#F3F4F6',
    borderColor: ui.border,
    color: ui.textSecondary,
  },
});
