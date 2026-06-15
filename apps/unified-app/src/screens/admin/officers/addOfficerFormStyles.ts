import { StyleSheet } from 'react-native';

import { ui } from './officersUi';

export const INPUT_H = 52;
export const BTN_H = 50;

export const formStyles = StyleSheet.create({
  fieldWrap: {
    marginBottom: 14,
  },
  halfField: {
    flex: 1,
    marginBottom: 14,
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
  inputError: {
    borderColor: ui.danger,
    borderWidth: 1,
  },
  textArea: {
    height: undefined,
    minHeight: 96,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },
  trigger: {
    minHeight: INPUT_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: ui.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    backgroundColor: ui.searchFill,
    paddingHorizontal: 14,
  },
  triggerText: {
    fontSize: 16,
    fontWeight: '500',
    color: ui.text,
    flex: 1,
  },
});
