import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },

  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  stepDotDone: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepDotTextDone: {
    color: '#1D4ED8',
  },

  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },

  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  selector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
  },
  selectorError: {
    borderColor: '#EF4444',
  },
  selectorText: {
    fontSize: 15,
    color: '#111827',
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  optionList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  optionScroll: {
    maxHeight: 200,
  },
  optionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 15,
    color: '#111827',
  },
  optionLoader: {
    padding: 12,
  },
  configLoader: {
    marginTop: 8,
  },

  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#fff',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  toggleHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  attachmentButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  attachmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  attachmentBtnText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginBottom: 8,
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginRight: 12,
  },
  removeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },

  stepHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  pinAddressHint: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 8,
    lineHeight: 18,
  },
  locationCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  locationCardText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  locationCardEmpty: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  locationCardBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  locationCardBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mapModalBack: {
    fontSize: 18,
    color: '#6B7280',
    minWidth: 32,
  },
  mapModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mapModalDone: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
    minWidth: 42,
    textAlign: 'right',
  },
  mapModalDoneDisabled: {
    color: '#93C5FD',
  },
  confirmNote: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },

  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  captchaRow: {
    marginBottom: 16,
  },
  captchaButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  captchaButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  captchaVerified: {
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  captchaVerifiedText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
});
