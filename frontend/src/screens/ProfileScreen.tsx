import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Edit2, Package, CreditCard, MapPin, Bell,
  Info, FileText, Shield, LogOut, ChevronRight,
  User, X, Plus, Check, Calendar, Award, ChevronLeft, Camera,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useCourses } from '../context/CoursesContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import { BottomNav } from '../components/BottomNav';
import { Avatar } from '../components/Avatar';
import { rs, rf } from '../utils/responsive';
import { computeCourseProgress } from '../utils/progress';
import api from '../services/api';

interface Props {
  onBack: () => void;
  onCoursePress: (courseId: string) => void;
  onTabChange?: (tab: string) => void;
}

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
type SubScreen = null | 'orders' | 'subscription' | 'address' | 'notifications' | 'edit' | 'about' | 'terms' | 'privacy' | 'addAddress';

const MOCK_ORDERS = [
  { id: 'ORD000123', course: 'Complete CSEET Package', date: '12 Jan 2026', amount: 14999, status: 'Active', method: 'UPI' },
  { id: 'ORD000087', course: 'CS Executive Module 1', date: '03 Dec 2025', amount: 8499, status: 'Active', method: 'Card' },
  { id: 'ORD000054', course: 'Business Communication Test Series', date: '15 Oct 2025', amount: 1499, status: 'Expired', method: 'NetBanking' },
];

const INITIAL_ADDRESSES = [
  { id: 'a1', name: 'Home', line1: 'Flat 304, Sunshine Apartments', line2: 'Sector 18, Noida, UP 201301', isDefault: true },
];

const MenuRow: React.FC<{
  Icon: LucideIcon; label: string; sub?: string; onPress?: () => void; danger?: boolean;
}> = ({ Icon, label, sub, onPress, danger }) => (
  <TouchableOpacity onPress={onPress} style={styles.menuRow} activeOpacity={0.7}>
    <View style={[styles.menuIcon, danger && { backgroundColor: '#ffebee' }]}>
      <Icon size={18} color={danger ? COLORS.error : '#546e7a'} strokeWidth={1.8} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, danger && { color: COLORS.error }]}>{label}</Text>
      {sub && <Text style={styles.menuSub}>{sub}</Text>}
    </View>
    <ChevronRight size={16} color='#b0bec5' strokeWidth={1.8} />
  </TouchableOpacity>
);

const SubScreenWrap: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
    <View style={styles.subHeader}>
      <TouchableOpacity onPress={onClose} style={styles.subBackBtn}>
        <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
      </TouchableOpacity>
      <Text style={styles.subHeaderTitle}>{title}</Text>
      <View style={{ width: rs(36) }} />
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: rs(16) }}>{children}</ScrollView>
  </SafeAreaView>
);

export const ProfileScreen: React.FC<Props> = ({ onBack, onCoursePress, onTabChange }) => {
  const { courses: COURSES } = useCourses();
  const { user, logout, updateUser } = useAuth() as any;
  const { progress } = useProgress();
  const getCourseProgress = (cid: string) => {
    const c = COURSES.find((x: any) => x.id === cid);
    return computeCourseProgress(c, progress.completedSteps);
  };
  const [activeSub, setActiveSub] = useState<SubScreen>(null);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [newAddr, setNewAddr] = useState({ name: '', line1: '', line2: '' });
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [uploadingDp, setUploadingDp] = useState(false);

  // Load orders + addresses on mount (and when user changes)
  useEffect(() => {
    if (!user) return;
    api.listOrders().then((r: any) => setOrders(r.orders || [])).catch(() => {});
    api.listAddresses().then((r: any) => setAddresses(r.addresses || [])).catch(() => {});
  }, [user?.id]);

  const enrolledCourses = COURSES.filter(c => user?.enrolledCourses.includes(c.id));

  // Pick image from gallery → presign → PUT to S3 → PATCH /me with avatar URL
  const handleChangePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please grant photo library access to change your DP.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingDp(true);

      // Upload via backend proxy (avoids S3 CORS preflight from Expo Web preview).
      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      const ct = ext === 'png' ? 'image/png' : 'image/jpeg';
      const filename = `dp_${Date.now()}.${ext}`;
      const uploaded = await api.uploadDirect(
        { uri: asset.uri, mimeType: ct, fileName: filename },
        'avatar',
      );

      // Tell backend to set avatar URL on the user record.
      const updated = await api.patch('/auth/me', { avatar: uploaded.public_url });
      updateUser?.(updated.user);
      Alert.alert('Updated', 'Profile photo changed.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Try again.');
    } finally {
      setUploadingDp(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const saveProfile = () => {
    if (updateUser) updateUser({ name: editName, email: editEmail });
    setActiveSub(null);
    Alert.alert('Profile Updated', 'Your profile has been saved.');
  };

  // Sub-screens (modal-style)
  if (activeSub === 'orders') {
    return (
      <SubScreenWrap title="My Orders" onClose={() => setActiveSub(null)}>
        {orders.length === 0 && (
          <View style={{ alignItems: 'center', padding: rs(40) }}>
            <Package size={rs(40)} color="#cfd8dc" strokeWidth={1.5} />
            <Text style={{ color: '#90a4ae', marginTop: rs(12), fontSize: rf(14) }}>No orders yet</Text>
          </View>
        )}
        {orders.map(o => {
          const status = o.status === 'paid' ? 'Active' : (o.status || 'Pending');
          const dateStr = o.paidAt || o.createdAt
            ? new Date(o.paidAt || o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
          return (
            <View key={o.id || o.order_id} style={styles.orderCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) }}>
                <Text style={{ fontSize: rf(11), color: '#90a4ae', fontWeight: '700', letterSpacing: 0.5 }}>{(o.order_id || o.id || '').slice(0, 24)}</Text>
                <View style={[styles.orderStatus, status === 'Active' ? styles.statusOk : styles.statusExpired]}>
                  <Text style={{ fontSize: rf(11), fontWeight: '800', color: status === 'Active' ? COLORS.green : '#ff6f00' }}>{status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: rf(14), fontWeight: '800', color: '#0d0d0d', marginBottom: rs(4) }}>{o.course_title || o.course_id || '—'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) }}>
                <Calendar size={rs(12)} color="#90a4ae" strokeWidth={1.8} />
                <Text style={{ fontSize: rf(12), color: '#90a4ae' }}>{dateStr}</Text>
                {o.method && <><Text style={{ fontSize: rf(12), color: '#90a4ae' }}>·</Text>
                  <Text style={{ fontSize: rf(12), color: '#90a4ae' }}>{o.method}</Text></>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: rs(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0f0f0' }}>
                <Text style={{ fontSize: rf(16), fontWeight: '900', color: COLORS.primary }}>₹{Number((o.amount || 0) / 100).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          );
        })}
      </SubScreenWrap>
    );
  }

  if (activeSub === 'subscription') {
    return (
      <SubScreenWrap title="My Subscriptions" onClose={() => setActiveSub(null)}>
        {enrolledCourses.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: rs(60) }}>
            <CreditCard size={rs(48)} color="#e0e0e0" strokeWidth={1.5} />
            <Text style={{ color: '#90a4ae', marginTop: rs(12), fontSize: rf(15) }}>No active subscriptions</Text>
          </View>
        ) : enrolledCourses.map(c => (
          <View key={c.id} style={styles.subscriptionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: rs(12), marginBottom: rs(12) }}>
              <Avatar name={c.faculty.name} size={rs(48)} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(14), fontWeight: '800', color: '#0d0d0d', marginBottom: rs(2) }} numberOfLines={1}>{c.title}</Text>
                <Text style={{ fontSize: rf(12), color: '#90a4ae' }}>{c.faculty.name}</Text>
              </View>
              <View style={[styles.orderStatus, styles.statusOk]}>
                <Text style={{ fontSize: rf(11), fontWeight: '800', color: COLORS.green }}>Active</Text>
              </View>
            </View>
            <View style={styles.subInfoGrid}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subInfoLabel}>Started</Text>
                <Text style={styles.subInfoValue}>{c.startDate}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subInfoLabel}>Expires</Text>
                <Text style={styles.subInfoValue}>{c.expiryDate}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subInfoLabel}>Progress</Text>
                <Text style={styles.subInfoValue}>{getCourseProgress(c.id)}%</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.subActionBtn} onPress={() => { setActiveSub(null); onCoursePress(c.id); }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(13) }}>Continue Learning</Text>
            </TouchableOpacity>
          </View>
        ))}
      </SubScreenWrap>
    );
  }

  if (activeSub === 'address') {
    return (
      <SubScreenWrap title="Address Book" onClose={() => setActiveSub(null)}>
        {addresses.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: rs(40) }}>
            <MapPin size={rs(40)} color="#e0e0e0" strokeWidth={1.5} />
            <Text style={{ color: '#90a4ae', marginTop: rs(12), fontSize: rf(14) }}>No addresses saved</Text>
          </View>
        ) : addresses.map(a => (
          <View key={a.id} style={styles.addressCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(8) }}>
                <MapPin size={rs(16)} color={COLORS.primary} strokeWidth={1.8} />
                <Text style={{ fontSize: rf(14), fontWeight: '800', color: '#0d0d0d' }}>{a.name}</Text>
              </View>
              {a.is_default && (
                <View style={styles.defaultBadge}>
                  <Text style={{ fontSize: rf(10), fontWeight: '800', color: COLORS.primary }}>DEFAULT</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: rf(13), color: '#546e7a', lineHeight: rf(20) }}>{a.line1}</Text>
            <Text style={{ fontSize: rf(13), color: '#546e7a', lineHeight: rf(20) }}>{a.line2}</Text>
            <View style={{ flexDirection: 'row', gap: rs(10), marginTop: rs(12), paddingTop: rs(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f0f0f0' }}>
              <TouchableOpacity style={styles.addressActionBtn} onPress={() => {
                setNewAddr({ name: a.name || '', line1: a.line1 || '', line2: a.line2 || '' });
                setEditingAddrId(a.id);
                setActiveSub('addAddress');
              }}><Edit2 size={rs(13)} color={COLORS.primary} strokeWidth={2} /><Text style={styles.addressActionTxt}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.addressActionBtn}
                onPress={() => {
                  Alert.alert('Remove Address?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: async () => {
                        try { await api.deleteAddress(a.id); } catch {}
                        setAddresses(addresses.filter(x => x.id !== a.id));
                      } },
                  ]);
                }}>
                <X size={rs(13)} color={COLORS.error} strokeWidth={2} /><Text style={[styles.addressActionTxt, { color: COLORS.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addNewBtn} onPress={() => { setNewAddr({ name: '', line1: '', line2: '' }); setEditingAddrId(null); setActiveSub('addAddress'); }}>
          <Plus size={rs(16)} color={COLORS.primary} strokeWidth={2.5} />
          <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: rf(14), marginLeft: rs(6) }}>Add New Address</Text>
        </TouchableOpacity>
      </SubScreenWrap>
    );
  }

  if (activeSub === 'addAddress') {
    const isValid = newAddr.name.trim() && newAddr.line1.trim() && newAddr.line2.trim();
    const isEditing = !!editingAddrId;
    return (
      <SubScreenWrap title={isEditing ? 'Edit Address' : 'Add New Address'} onClose={() => { setEditingAddrId(null); setActiveSub('address'); }}>
        <Text style={styles.fieldLabel}>Label (Home, Office, etc.)</Text>
        <TextInput value={newAddr.name} onChangeText={v => setNewAddr({ ...newAddr, name: v })}
          style={styles.editInput} placeholder="e.g. Home" placeholderTextColor="#b0bec5" />
        <Text style={styles.fieldLabel}>Address Line 1</Text>
        <TextInput value={newAddr.line1} onChangeText={v => setNewAddr({ ...newAddr, line1: v })}
          style={styles.editInput} placeholder="Flat / Street" placeholderTextColor="#b0bec5" />
        <Text style={styles.fieldLabel}>Address Line 2</Text>
        <TextInput value={newAddr.line2} onChangeText={v => setNewAddr({ ...newAddr, line2: v })}
          style={styles.editInput} placeholder="City, State, PIN" placeholderTextColor="#b0bec5" />

        <TouchableOpacity
          style={[styles.saveBtn, !isValid && { opacity: 0.5 }]}
          disabled={!isValid}
          onPress={async () => {
            try {
              const payload = {
                name: newAddr.name.trim(),
                line1: newAddr.line1.trim(),
                line2: newAddr.line2.trim(),
              };
              if (isEditing) {
                const updated: any = await api.updateAddress(editingAddrId!, payload);
                setAddresses(addresses.map(x => x.id === editingAddrId ? { ...x, ...updated } : x));
              } else {
                const created: any = await api.addAddress({ ...payload, is_default: addresses.length === 0 });
                setAddresses([...addresses, created]);
              }
              setEditingAddrId(null);
              setActiveSub('address');
            } catch (e: any) {
              Alert.alert('Failed', e?.message || 'Could not save address.');
            }
          }}>
          <Check size={rs(16)} color="#fff" strokeWidth={2.5} />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(15), marginLeft: rs(6) }}>{isEditing ? 'Update Address' : 'Save Address'}</Text>
        </TouchableOpacity>
      </SubScreenWrap>
    );
  }

  if (activeSub === 'edit') {
    return (
      <SubScreenWrap title="Edit Profile" onClose={() => setActiveSub(null)}>
        <View style={{ alignItems: 'center', marginBottom: rs(24) }}>
          <View>
            <Avatar name={editName || 'User'} uri={user?.avatar} size={rs(96)} borderColor={COLORS.primary} />
            <View style={styles.cameraBadge}>
              {uploadingDp ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={rs(14)} color="#fff" strokeWidth={2.5} />}
            </View>
          </View>
          <TouchableOpacity style={{ marginTop: rs(10) }} onPress={handleChangePhoto} disabled={uploadingDp}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: rf(13) }}>
              {uploadingDp ? 'Uploading…' : 'Change Photo'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.fieldLabel}>Full Name</Text>
        <TextInput value={editName} onChangeText={setEditName} style={styles.editInput} placeholder="Your name" placeholderTextColor="#b0bec5" />
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput value={editEmail} onChangeText={setEditEmail} style={styles.editInput} placeholder="email@example.com" placeholderTextColor="#b0bec5" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.fieldLabel}>Phone</Text>
        <TextInput value={user?.phone || ''} editable={false} style={[styles.editInput, { color: '#90a4ae' }]} />
        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Check size={rs(16)} color="#fff" strokeWidth={2.5} />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(15), marginLeft: rs(6) }}>Save Changes</Text>
        </TouchableOpacity>
      </SubScreenWrap>
    );
  }

  if (activeSub === 'about' || activeSub === 'terms' || activeSub === 'privacy') {
    const titleMap = { about: 'About CS Ninja', terms: 'Terms & Conditions', privacy: 'Privacy Policy' };
    const bodyMap = {
      about: 'CS Ninja is India\'s most trusted platform for Company Secretary exam preparation. Founded by Adv. Mohit Dhiman under the Learnova Institute, we serve over 50,000 students across CSEET, CS Executive and CS Professional levels with expert faculty, structured curriculum, live classes and comprehensive test series.\n\nVisit: csninja.in',
      terms: 'By using CS Ninja, you agree to abide by all terms and conditions. Course access is non-transferable. Content is for personal study only and may not be redistributed. Refunds are governed by our refund policy. We reserve the right to modify these terms with prior notice.',
      privacy: 'We respect your privacy. Personal information is collected only to provide you with our services. We do not sell or share your data with third parties except as required for service delivery (payment, content delivery). All data is stored securely with industry-standard encryption.',
    };
    return (
      <SubScreenWrap title={titleMap[activeSub]} onClose={() => setActiveSub(null)}>
        <Text style={{ fontSize: rf(14), color: '#546e7a', lineHeight: rf(24) }}>{bodyMap[activeSub]}</Text>
      </SubScreenWrap>
    );
  }

  // Main profile screen
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ position: 'relative' }}>
              <Avatar name={user?.name || 'Student'} uri={user?.avatar} size={72} borderColor={COLORS.primary} />
              <View style={styles.progressRing}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>65%</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.cseetBadge}>
                <Award size={11} color={COLORS.primary} strokeWidth={2.2} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary, marginLeft: 4 }}>CSEET</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => setActiveSub('edit')}>
              <Edit2 size={16} color='#546e7a' strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileBio}>
            Studying daily with focus and discipline, turning effort into progress and building a stronger future.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Collection</Text>
          <View style={styles.menuGroup}>
            <MenuRow Icon={Package} label="Orders" sub="Track Purchase" onPress={() => setActiveSub('orders')} />
            <View style={styles.divider} />
            <MenuRow Icon={CreditCard} label="Subscription" sub={`${user?.enrolledCourses.length || 0} Active`} onPress={() => setActiveSub('subscription')} />
          </View>
        </View>

        {enrolledCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Courses</Text>
            {enrolledCourses.map(c => (
              <TouchableOpacity key={c.id} onPress={() => onCoursePress(c.id)} style={styles.courseRow}>
                <Avatar name={c.faculty.name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0d0d0d' }} numberOfLines={1}>{c.title}</Text>
                  <Text style={{ fontSize: 11, color: '#90a4ae', marginTop: 1 }}>{c.faculty.name}</Text>
                  <View style={styles.miniProgress}>
                    <View style={[styles.miniProgressFill, { width: `${getCourseProgress(c.id)}%` as any }]} />
                  </View>
                </View>
                <ChevronRight size={16} color='#b0bec5' strokeWidth={1.8} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuGroup}>
            <MenuRow Icon={MapPin} label="Address Book" sub="Manage Delivery" onPress={() => setActiveSub('address')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuGroup}>
            <MenuRow Icon={Bell} label="Notifications" sub="Manage alert preferences" onPress={() => onTabChange && onTabChange('notifications')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional</Text>
          <View style={styles.menuGroup}>
            <MenuRow Icon={Info} label="About us" onPress={() => setActiveSub('about')} />
            <View style={styles.divider} />
            <MenuRow Icon={FileText} label="Terms & Conditions" onPress={() => setActiveSub('terms')} />
            <View style={styles.divider} />
            <MenuRow Icon={Shield} label="Privacy Policy" onPress={() => setActiveSub('privacy')} />
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 16 }]}>
          <View style={styles.menuGroup}>
            <MenuRow Icon={LogOut} label="Logout" onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>

      <BottomNav active="profile" onChange={(t) => onTabChange && onTabChange(t)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  profileCard: { backgroundColor: '#fff', padding: SPACING.lg, marginBottom: 8 },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: rs(28), height: rs(28), borderRadius: rs(14),
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  progressRing: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 4, paddingVertical: 2,
    borderWidth: 1.5, borderColor: '#fff',
  },
  profileName: { fontSize: 18, fontWeight: '900', color: '#0d0d0d' },
  profileEmail: { fontSize: 13, color: '#546e7a', marginTop: 2 },
  cseetBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', backgroundColor: '#e8eaf6',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6,
    borderWidth: 1, borderColor: '#c5cae9',
  },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center',
  },
  profileBio: {
    fontSize: 13, color: '#546e7a', lineHeight: 20, marginTop: 14,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  section: { paddingHorizontal: SPACING.lg, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0d0d0d', marginBottom: 8 },
  menuGroup: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f5f6fa', alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#0d0d0d' },
  menuSub: { fontSize: 12, color: '#90a4ae', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#f5f6fa', marginLeft: 62 },
  courseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 12, gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm,
  },
  miniProgress: { height: 3, backgroundColor: '#e0e0e0', borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  miniProgressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 2 },

  // Sub-screen
  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(12), backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  subBackBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  subHeaderTitle: { flex: 1, textAlign: 'center', fontSize: rf(17), fontWeight: '800', color: '#0d0d0d' },

  // Orders
  orderCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(12), borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm },
  orderStatus: { borderRadius: RADIUS.full, paddingHorizontal: rs(10), paddingVertical: rs(3), borderWidth: 1 },
  statusOk: { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7' },
  statusExpired: { backgroundColor: '#fff3e0', borderColor: '#ffcc80' },

  // Subscription
  subscriptionCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(12), borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm },
  subInfoGrid: { flexDirection: 'row', backgroundColor: '#f5f6fa', borderRadius: RADIUS.md, padding: rs(12), marginBottom: rs(12) },
  subInfoLabel: { fontSize: rf(11), color: '#90a4ae', fontWeight: '600', marginBottom: rs(2) },
  subInfoValue: { fontSize: rf(13), fontWeight: '800', color: '#0d0d0d' },
  subActionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(11), alignItems: 'center' },

  // Address
  addressCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(12), borderWidth: 1, borderColor: '#f0f0f0', ...SHADOWS.sm },
  defaultBadge: { backgroundColor: '#e8eaf6', borderRadius: RADIUS.full, paddingHorizontal: rs(8), paddingVertical: rs(3), borderWidth: 1, borderColor: '#c5cae9' },
  addressActionBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(4) },
  addressActionTxt: { fontSize: rf(13), color: COLORS.primary, fontWeight: '700' },
  addNewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: rs(13), borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed' },

  // Edit profile
  fieldLabel: { fontSize: rf(13), fontWeight: '700', color: '#546e7a', marginBottom: rs(8), marginTop: rs(4) },
  editInput: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: rs(14), fontSize: rf(14), color: '#0d0d0d', borderWidth: 1.5, borderColor: '#e0e0e0', marginBottom: rs(14) },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: rs(14), marginTop: rs(8) },
});
