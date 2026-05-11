import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ShoppingCart, Trash2, Tag, ChevronRight, Shield, Package, CheckCircle, Check, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useCourses } from '../context/CoursesContext';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import api from '../services/api';
import { COLORS, RADIUS, SPACING } from '../utils/theme';
import { rs, rf, contentPadH, isTablet, contentMaxWidth } from '../utils/responsive';
import { AddressPicker, Address } from '../components/AddressPicker';

interface Props { onBack: () => void; onCoursePress: (id: string) => void; }

export const CartScreen: React.FC<Props> = ({ onBack, onCoursePress }) => {
  const { courses: COURSES, refresh: refreshCourses } = useCourses();
  const { user, refresh: refreshUser } = useAuth();
  const { refresh: refreshProgress } = useProgress();
  const insets = useSafeAreaInsets();

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [paying, setPaying] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_pct: number; description?: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // ── Load cart from backend on mount ──
  useEffect(() => {
    if (!user) return;
    setLoadingCart(true);
    api.getCart()
      .then((r: any) => setCartItems(r.items || []))
      .catch(() => setCartItems([]))
      .finally(() => setLoadingCart(false));
  }, [user?.id]);

  const removeItem = async (course_id: string) => {
    try {
      const r: any = await api.removeFromCart(course_id);
      setCartItems(r.items || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not remove');
    }
  };

  const subtotal = cartItems.reduce((s, c) => s + (c?.price || 0), 0);
  const discount = appliedCoupon ? Math.round(subtotal * (appliedCoupon.discount_pct / 100)) : 0;
  const total = subtotal - discount;
  const couponApplied = !!appliedCoupon;

  const applyCoupon = async () => {
    setCouponError('');
    if (!coupon.trim()) { setCouponError('Enter a code'); return; }
    if (cartItems.length === 0) { setCouponError('Cart is empty'); return; }
    setCouponLoading(true);
    try {
      // Validate against the first cart item (single-course checkout)
      const r: any = await api.validateCoupon(coupon.trim().toUpperCase(), cartItems[0].id);
      setAppliedCoupon(r);
      setCouponError('');
    } catch (e: any) {
      setAppliedCoupon(null);
      setCouponError(e?.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCoupon(''); setCouponError(''); };

  // Open the hosted checkout in an in-app browser (App Store / Play Store
  // compliant: external payment processor for educational content).
  // Step 1: open the AddressPicker. Step 2: continue with WebBrowser flow.
  const proceedToPay = async () => {
    if (cartItems.length === 0) return;
    if (!user) { Alert.alert('Login required', 'Please log in to continue.'); return; }
    setAddressPickerVisible(true);
  };

  const continueToPayment = async (addr: Address) => {
    setSelectedAddress(addr);
    setAddressPickerVisible(false);
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const token = await AsyncStorage.getItem('csninja_access_token');
    if (!token) { Alert.alert('Session expired', 'Please log in again.'); return; }

    setPaying(true);
    try {
      const course = cartItems[0];
      const couponPct = appliedCoupon ? appliedCoupon.discount_pct : 0;
      const couponCode = appliedCoupon ? appliedCoupon.code : '';
      const returnUrl = Linking.createURL('payment');
      const checkoutUrl =
        `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api/pay-ui/checkout` +
        `?course_id=${encodeURIComponent(course.id)}` +
        `&token=${encodeURIComponent(token)}` +
        `&coupon_pct=${couponPct}` +
        `&coupon_code=${encodeURIComponent(couponCode)}` +
        `&address_id=${encodeURIComponent(addr.id)}` +
        `&return_url=${encodeURIComponent(returnUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
      if (result.type === 'success' && result.url?.includes('status=success')) {
        // Refresh ALL relevant contexts so the rest of the app shows the new
        // enrollment immediately (Home / Study / Courses screens).
        await Promise.all([
          refreshUser?.(),
          refreshCourses?.(),
          refreshProgress?.(),
        ]);
        const r: any = await api.getCart();
        setCartItems(r.items || []);
        setOrderPlaced(true);
      } else {
        await Promise.all([refreshUser?.(), refreshCourses?.()]);
        const r: any = await api.getCart();
        setCartItems(r.items || []);
      }
    } catch (e: any) {
      Alert.alert('Checkout error', e?.message || 'Could not open the checkout page.');
    } finally {
      setPaying(false);
    }
  };


  if (orderPlaced) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successScreen}>
          <LinearGradient colors={['#e8f5e9', '#fff']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32) }}>
            <View style={styles.successIconWrap}>
              <CheckCircle size={rs(64)} color={COLORS.green} strokeWidth={1.5} />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSub}>Your courses have been activated. Start learning now!</Text>
            <View style={styles.receiptCard}>
              {[{ l: 'Ref Number', v: '000085752257' }, { l: 'Amount Paid', v: `₹${total.toLocaleString()}` }, { l: 'Payment Method', v: 'UPI Transfer' }, { l: 'Date', v: new Date().toLocaleDateString('en-IN') }].map((r, i) => (
                <View key={i} style={[styles.receiptRow, i < 3 && styles.receiptDivider]}>
                  <Text style={styles.receiptLabel}>{r.l}</Text>
                  <Text style={styles.receiptValue}>{r.v}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.goHomeBtn} onPress={onBack}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ChevronLeft size={16} color={COLORS.primary} strokeWidth={2.5} />
                <Text style={styles.goHomeBtnTxt}>Return to Home</Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ maxWidth: isTablet ? contentMaxWidth : undefined, alignSelf: 'center', width: '100%', flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={styles.cartCountWrap}>
            <ShoppingCart size={rs(20)} color={COLORS.primary} strokeWidth={1.8} />
            {cartItems.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={{ color: '#fff', fontSize: rf(10), fontWeight: '900' }}>{cartItems.length}</Text>
              </View>
            )}
          </View>
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingCart size={rs(64)} color="#e0e0e0" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Browse courses and add them to your cart</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={onBack}>
              <Text style={styles.browseBtnTxt}>Browse Courses</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ padding: contentPadH }}>

                {/* Cart Items */}
                <Text style={styles.sectionLabel}>{cartItems.length} Course{cartItems.length > 1 ? 's' : ''} in Cart</Text>
                {cartItems.map(course => {
                  const cat = String(course?.category || 'CR');
                  const price = Number(course?.price) || 0;
                  const orig = Number(course?.originalPrice) || price;
                  const facultyName = (course?.faculty?.name) || course?.faculty_name || (Array.isArray(course?.faculty_ids) && course.faculty_ids.length ? `${course.faculty_ids.length} faculty` : '');
                  const lang = course?.language || '';
                  const lvl = course?.level || '';
                  const discountPct = orig > 0 ? Math.max(0, Math.round((1 - price / orig) * 100)) : 0;
                  return (
                    <View key={course.id} style={styles.cartItem}>
                      <LinearGradient colors={['#1a237e', '#283593']} style={styles.cartItemThumb}>
                        <Text style={{ color: '#fff', fontSize: rf(16), fontWeight: '900', letterSpacing: 1 }}>{cat.toUpperCase().slice(0, 2)}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemTitle} numberOfLines={2}>{course?.title || 'Course'}</Text>
                        {!!facultyName && <Text style={styles.cartItemFaculty}>{facultyName}</Text>}
                        {(lang || lvl) ? <Text style={styles.cartItemMeta}>{[lang, lvl].filter(Boolean).join(' · ')}</Text> : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(8), marginTop: rs(6), flexWrap: 'wrap' }}>
                          <Text style={styles.cartItemPrice}>₹{price.toLocaleString()}</Text>
                          {orig > price && <Text style={styles.cartItemStrike}>₹{orig.toLocaleString()}</Text>}
                          {discountPct > 0 && (
                            <View style={styles.discountBadge}>
                              <Text style={{ color: COLORS.green, fontSize: rf(11), fontWeight: '800' }}>{discountPct}% OFF</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => removeItem(course.id)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Trash2 size={rs(18)} color={COLORS.error} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Coupon */}
                <View style={styles.couponBox}>
                  <Tag size={rs(18)} color={COLORS.primary} strokeWidth={1.8} />
                  <TextInput
                    value={coupon} onChangeText={v => { setCoupon(v); setCouponError(''); }}
                    placeholder="Enter coupon code (try NINJA10)"
                    placeholderTextColor="#b0bec5"
                    style={styles.couponInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity style={[styles.applyBtn, couponApplied && { backgroundColor: COLORS.green }]} onPress={applyCoupon}>
                    {couponApplied ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Check size={13} color="#fff" strokeWidth={2.5} />
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(13) }}>Applied</Text>
                      </View>
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: rf(13) }}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
                {couponApplied ? <Text style={styles.couponSuccess}>Coupon applied! 10% off</Text> : null}

                {/* Price Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Price Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} courses)</Text>
                    <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.green }]}>- ₹{(subtotal - cartItems.reduce((s, c) => s + c.price, 0) + discount).toLocaleString() === '0' ? subtotal - total : discount}</Text>
                  </View>
                  {couponApplied && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: COLORS.green }]}>Coupon (NINJA10)</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.green }]}>- ₹{discount.toLocaleString()}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Trust badges */}
                <View style={styles.trustRow}>
                  {[
                    { Icon: Shield, label: 'Secure Payment' },
                    { Icon: Package, label: 'Instant Access' },
                    { Icon: CheckCircle, label: 'Money Back' },
                  ].map(({ Icon, label }, i) => (
                    <View key={i} style={styles.trustItem}>
                      <Icon size={rs(20)} color={COLORS.green} strokeWidth={1.8} />
                      <Text style={styles.trustLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ height: rs(120) }} />
            </ScrollView>

            {/* Checkout bar */}
            <View style={[styles.checkoutBar, { paddingBottom: Math.max(insets.bottom, rs(16)) }]}>
              <View>
                <Text style={styles.checkoutTotal}>₹{total.toLocaleString()}</Text>
                <Text style={styles.checkoutSavings}>You save ₹{(subtotal - total + discount).toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={[styles.checkoutBtn, paying && { opacity: 0.7 }]} onPress={proceedToPay} activeOpacity={0.9} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnTxt}>Proceed to Pay</Text>}
                <ChevronRight size={rs(18)} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Address selection modal — shown when user taps Proceed to Pay */}
      <AddressPicker
        visible={addressPickerVisible}
        onClose={() => setAddressPickerVisible(false)}
        onConfirm={continueToPayment}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  successScreen: { flex: 1 },
  successIconWrap: { width: rs(120), height: rs(120), borderRadius: rs(60), backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center', marginBottom: rs(24) },
  successTitle: { fontSize: rf(24), fontWeight: '900', color: '#0d0d0d', marginBottom: rs(8) },
  successSub: { fontSize: rf(14), color: '#546e7a', textAlign: 'center', marginBottom: rs(32) },
  receiptCard: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: rs(20), width: '100%', marginBottom: rs(32) },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(12) },
  receiptDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  receiptLabel: { fontSize: rf(13), color: '#90a4ae' },
  receiptValue: { fontSize: rf(13), fontWeight: '800', color: '#0d0d0d' },
  goHomeBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: rs(32), paddingVertical: rs(13) },
  goHomeBtnTxt: { color: COLORS.primary, fontWeight: '800', fontSize: rf(15) },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: contentPadH, paddingVertical: rs(12), backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  backBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: rf(17), fontWeight: '800', color: '#0d0d0d' },
  cartCountWrap: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cartBadge: { position: 'absolute', top: 0, right: 0, width: rs(16), height: rs(16), borderRadius: rs(8), backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32) },
  emptyTitle: { fontSize: rf(20), fontWeight: '800', color: '#0d0d0d', marginTop: rs(20), marginBottom: rs(8) },
  emptySub: { fontSize: rf(14), color: '#90a4ae', textAlign: 'center', marginBottom: rs(32) },
  browseBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: rs(32), paddingVertical: rs(13) },
  browseBtnTxt: { color: '#fff', fontWeight: '800', fontSize: rf(15) },
  sectionLabel: { fontSize: rf(15), fontWeight: '800', color: '#0d0d0d', marginBottom: rs(12) },
  cartItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(12), gap: rs(12), borderWidth: 1, borderColor: '#f0f0f0' },
  cartItemThumb: { width: rs(60), height: rs(60), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center' },
  cartItemTitle: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d', lineHeight: rf(19), marginBottom: rs(3) },
  cartItemFaculty: { fontSize: rf(12), color: '#546e7a' },
  cartItemMeta: { fontSize: rf(11), color: '#90a4ae', marginTop: rs(2) },
  cartItemPrice: { fontSize: rf(16), fontWeight: '900', color: COLORS.primary },
  cartItemStrike: { fontSize: rf(12), color: '#90a4ae', textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: '#e8f5e9', borderRadius: RADIUS.full, paddingHorizontal: rs(8), paddingVertical: rs(2) },
  removeBtn: { padding: rs(4) },
  couponBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: RADIUS.md, padding: rs(12), marginBottom: rs(6), gap: rs(10), borderWidth: 1.5, borderColor: '#e0e0e0' },
  couponInput: { flex: 1, fontSize: rf(14), color: '#0d0d0d' },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: rs(16), paddingVertical: rs(8) },
  couponError: { fontSize: rf(12), color: COLORS.error, marginBottom: rs(12), marginLeft: rs(4) },
  couponSuccess: { fontSize: rf(12), color: COLORS.green, fontWeight: '700', marginBottom: rs(12), marginLeft: rs(4) },
  summaryCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(16), marginBottom: rs(16), borderWidth: 1, borderColor: '#f0f0f0' },
  summaryTitle: { fontSize: rf(15), fontWeight: '800', color: '#0d0d0d', marginBottom: rs(12) },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: rs(8) },
  summaryLabel: { fontSize: rf(13), color: '#546e7a' },
  summaryValue: { fontSize: rf(13), fontWeight: '700', color: '#0d0d0d' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: rs(4) },
  totalLabel: { fontSize: rf(15), fontWeight: '900', color: '#0d0d0d' },
  totalValue: { fontSize: rf(18), fontWeight: '900', color: COLORS.primary },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(16), borderWidth: 1, borderColor: '#f0f0f0' },
  trustItem: { alignItems: 'center', gap: rs(6) },
  trustLabel: { fontSize: rf(11), color: '#546e7a', fontWeight: '600' },
  checkoutBar: { backgroundColor: '#fff', paddingHorizontal: contentPadH, paddingTop: rs(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkoutTotal: { fontSize: rf(22), fontWeight: '900', color: COLORS.primary },
  checkoutSavings: { fontSize: rf(12), color: COLORS.green, fontWeight: '600' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: rs(24), paddingVertical: rs(14), gap: rs(6) },
  checkoutBtnTxt: { color: '#fff', fontWeight: '800', fontSize: rf(15) },
});
