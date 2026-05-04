import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileSection: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, marginBottom: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarFallbackText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  verifiedBadge: { backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 14, color: '#6B7280' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialtyPill: {
    backgroundColor: '#EFF6FF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
  },
  specialtyText: { fontSize: 13, color: '#2563EB', fontWeight: '500' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22 },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  feeLabel: { fontSize: 14, color: '#6B7280' },
  feeValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  requestBtn: {
    backgroundColor: '#2563EB', marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  requestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rateBtn: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#2563EB',
  },
  rateBtnText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  myRatingBox: {
    backgroundColor: '#EFF6FF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 12,
  },
  myRatingLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  myRatingComment: { fontSize: 13, color: '#374151', marginTop: 4 },
  sectionDivider: { backgroundColor: '#fff', padding: 16, marginBottom: 2 },
  ratingItem: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  ratingItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ratingDate: { fontSize: 12, color: '#9CA3AF' },
  ratingComment: { fontSize: 13, color: '#374151', lineHeight: 20 },
  emptyRatings: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  backdropArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  starsRow: { alignItems: 'center', marginBottom: 8 },
  scoreLabel: { textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
    backgroundColor: '#F9FAFB', marginBottom: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  actionBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginBottom: 10,
  },
  actionBtnDisabled: { backgroundColor: '#93C5FD' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: '#6B7280' },
});
