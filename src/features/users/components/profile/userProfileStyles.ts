import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editButton: {
    backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 2 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  roleBadge: { backgroundColor: '#EFF6FF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 16, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statLabelTap: { color: '#2563EB' },
  statDivider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  infoSection: {
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16,
    marginBottom: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoRowText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  infoRowArrow: { fontSize: 18, color: '#9CA3AF' },
  infoRowDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 8 },
  emptySection: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 32, maxHeight: '60%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  close: { fontSize: 18, color: '#6B7280' },
  empty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 24 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  personAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  personInitial: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  personName: { fontSize: 15, color: '#111827' },
});

export const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  avatarContainer: { alignSelf: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  avatarOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    paddingVertical: 4, alignItems: 'center',
  },
  avatarOverlayText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
    backgroundColor: '#F9FAFB', marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginTop: 4, marginBottom: 10,
  },
  saveBtnDisabled: { backgroundColor: '#93C5FD' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});

export const deleteStyles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#991B1B', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 20 },
  emailHighlight: { fontWeight: '700', color: '#111827' },
  bullet: { fontSize: 12, color: '#6B7280', marginBottom: 3, lineHeight: 18 },
  deleteBtn: {
    backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginTop: 4, marginBottom: 10,
  },
  deleteBtnDisabled: { backgroundColor: '#FCA5A5' },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export const webViewStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: '#6B7280' },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#111827' },
  closePlaceholder: { width: 26 },
});
