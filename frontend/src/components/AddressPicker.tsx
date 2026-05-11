import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { X, MapPin, Plus, Check, Phone } from 'lucide-react-native';
import api from '../services/api';
import { COLORS, RADIUS } from '../utils/theme';
import { rs, rf } from '../utils/responsive';

export interface Address {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  is_default?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (addr: Address) => void;
}

const PIN_REGEX = /^\d{6}$/;
const PHONE_REGEX = /^\d{10}$/;

export const AddressPicker: React.FC<Props> = ({ visible, onClose, onConfirm }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Address>({
    id: '', name: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '', is_default: false,
  });
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await api.listAddresses();
      const list: Address[] = r.addresses || [];
      setAddresses(list);
      // Auto-select default or first
      const def = list.find((a) => a.is_default) || list[0];
      setSelectedId(def?.id || null);
      // If no addresses exist, immediately show the inline form
      if (list.length === 0) setShowForm(true);
    } catch (e: any) {
      setAddresses([]);
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setShowForm(false);
    setErr('');
    setForm({ id: '', name: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '', is_default: false });
    load();
  }, [visible]);

  const validate = (): string => {
    if (!form.name.trim()) return 'Full name is required';
    if (!form.line1.trim()) return 'Address line 1 is required';
    if (!form.city?.trim()) return 'City is required';
    if (!form.state?.trim()) return 'State is required';
    if (!PIN_REGEX.test((form.pincode || '').trim())) return 'PIN code must be 6 digits';
    if (!PHONE_REGEX.test((form.phone || '').trim())) return 'Phone must be 10 digits';
    return '';
  };

  const saveAddress = async () => {
    const v = validate();
    if (v) { setErr(v); return; }
    setSaving(true); setErr('');
    try {
      const isFirst = addresses.length === 0;
      const r: any = await api.addAddress({
        name: form.name.trim(),
        line1: form.line1.trim(),
        line2: (form.line2 || '').trim(),
        city: (form.city || '').trim(),
        state: (form.state || '').trim(),
        pincode: (form.pincode || '').trim(),
        phone: (form.phone || '').trim(),
        is_default: isFirst || !!form.is_default,
      });
      // r is the new address object
      await load();
      setSelectedId(r.id);
      setShowForm(false);
    } catch (e: any) {
      setErr(e?.message || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  const onContinue = () => {
    const sel = addresses.find((a) => a.id === selectedId);
    if (!sel) { Alert.alert('Select address', 'Please select a delivery address to continue.'); return; }
    onConfirm(sel);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Select Address</Text>
                <Text style={styles.sub}>Used for invoice & order confirmation</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={rs(20)} color="#546e7a" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: rs(460) }} contentContainerStyle={{ padding: rs(16), paddingTop: rs(8) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={{ padding: rs(40), alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <>
                  {/* Saved addresses */}
                  {addresses.map((a) => {
                    const sel = a.id === selectedId;
                    return (
                      <TouchableOpacity key={a.id} onPress={() => setSelectedId(a.id)}
                        style={[styles.addrCard, sel && styles.addrCardSel]} activeOpacity={0.85}>
                        <View style={[styles.radio, sel && styles.radioSel]}>
                          {sel ? <Check size={rs(12)} color="#fff" strokeWidth={3} /> : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), flexWrap: 'wrap' }}>
                            <Text style={styles.addrName}>{a.name}</Text>
                            {a.is_default && <View style={styles.defBadge}><Text style={styles.defBadgeTxt}>Default</Text></View>}
                          </View>
                          <Text style={styles.addrLine}>
                            {a.line1}{a.line2 ? `, ${a.line2}` : ''}
                          </Text>
                          <Text style={styles.addrLine}>
                            {a.city}{a.state ? `, ${a.state}` : ''}{a.pincode ? ` - ${a.pincode}` : ''}
                          </Text>
                          {!!a.phone && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: rs(2), gap: rs(4) }}>
                              <Phone size={rs(11)} color="#90a4ae" strokeWidth={2} />
                              <Text style={styles.addrPhone}>{a.phone}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Empty state when there are no addresses and form is collapsed */}
                  {addresses.length === 0 && !showForm && (
                    <View style={styles.emptyState}>
                      <MapPin size={rs(36)} color="#cfd8dc" strokeWidth={1.5} />
                      <Text style={styles.emptyTitle}>No saved addresses</Text>
                      <Text style={styles.emptySub}>Add an address below to continue checkout.</Text>
                    </View>
                  )}

                  {/* Add-new toggle */}
                  {!showForm ? (
                    <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
                      <Plus size={rs(16)} color={COLORS.primary} strokeWidth={2.4} />
                      <Text style={styles.addNewTxt}>Add new address</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.formCard}>
                      <View style={styles.formHeader}>
                        <MapPin size={rs(16)} color={COLORS.primary} strokeWidth={2} />
                        <Text style={styles.formTitle}>Add New Address</Text>
                        {addresses.length > 0 && (
                          <TouchableOpacity onPress={() => { setShowForm(false); setErr(''); }}>
                            <Text style={styles.cancelLink}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="John Doe" />
                      <Field label="Address Line 1" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} placeholder="House / Flat / Building" />
                      <Field label="Address Line 2 (optional)" value={form.line2 || ''} onChange={(v) => setForm({ ...form, line2: v })} placeholder="Street, Locality" />
                      <View style={{ flexDirection: 'row', gap: rs(8) }}>
                        <View style={{ flex: 1 }}><Field label="City" value={form.city || ''} onChange={(v) => setForm({ ...form, city: v })} placeholder="Mumbai" /></View>
                        <View style={{ flex: 1 }}><Field label="State" value={form.state || ''} onChange={(v) => setForm({ ...form, state: v })} placeholder="Maharashtra" /></View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: rs(8) }}>
                        <View style={{ flex: 1 }}><Field label="PIN Code" value={form.pincode || ''} onChange={(v) => setForm({ ...form, pincode: v.replace(/\D/g, '').slice(0, 6) })} placeholder="400001" keyboardType="number-pad" maxLength={6} /></View>
                        <View style={{ flex: 1 }}><Field label="Phone" value={form.phone || ''} onChange={(v) => setForm({ ...form, phone: v.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} /></View>
                      </View>

                      <TouchableOpacity onPress={() => setForm({ ...form, is_default: !form.is_default })} style={styles.defaultRow} activeOpacity={0.85}>
                        <View style={[styles.checkbox, form.is_default && styles.checkboxSel]}>
                          {form.is_default ? <Check size={rs(12)} color="#fff" strokeWidth={3} /> : null}
                        </View>
                        <Text style={styles.defaultRowTxt}>Set as default address</Text>
                      </TouchableOpacity>

                      {!!err && <Text style={styles.errTxt}>{err}</Text>}

                      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={saveAddress} disabled={saving} activeOpacity={0.9}>
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnTxt}>Save Address</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.continueBtn, (!selectedId || showForm) && { opacity: 0.45 }]}
                onPress={onContinue}
                disabled={!selectedId || showForm}
                activeOpacity={0.9}>
                <Text style={styles.continueBtnTxt}>Continue to Payment</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any; maxLength?: number }> = ({ label, value, onChange, placeholder, keyboardType, maxLength }) => (
  <View style={{ marginBottom: rs(10) }}>
    <Text style={styles.lbl}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#b0bec5"
      keyboardType={keyboardType || 'default'}
      maxLength={maxLength}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: rs(20), borderTopRightRadius: rs(20), maxHeight: '92%' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingTop: rs(14), paddingBottom: rs(8), borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: rf(17), fontWeight: '900', color: '#0d0d0d' },
  sub: { fontSize: rf(11), color: '#90a4ae', marginTop: rs(2) },

  emptyState: { alignItems: 'center', paddingVertical: rs(28) },
  emptyTitle: { fontSize: rf(14), fontWeight: '800', color: '#546e7a', marginTop: rs(8) },
  emptySub: { fontSize: rf(12), color: '#90a4ae', marginTop: rs(2), textAlign: 'center' },

  addrCard: { flexDirection: 'row', alignItems: 'flex-start', padding: rs(12), borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: RADIUS.md, marginBottom: rs(10), backgroundColor: '#fff' },
  addrCardSel: { borderColor: COLORS.primary, backgroundColor: '#fafbff' },
  radio: { width: rs(20), height: rs(20), borderRadius: rs(10), borderWidth: 2, borderColor: '#cfd8dc', marginRight: rs(10), alignItems: 'center', justifyContent: 'center', marginTop: rs(2) },
  radioSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  addrName: { fontSize: rf(14), fontWeight: '800', color: '#0d0d0d' },
  addrLine: { fontSize: rf(12.5), color: '#546e7a', marginTop: rs(2), lineHeight: rf(18) },
  addrPhone: { fontSize: rf(11), color: '#90a4ae', fontWeight: '600' },
  defBadge: { backgroundColor: COLORS.primary + '18', borderRadius: rs(4), paddingHorizontal: rs(6), paddingVertical: 1 },
  defBadgeTxt: { fontSize: rf(9), color: COLORS.primary, fontWeight: '900', textTransform: 'uppercase' },

  addNewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), padding: rs(12), borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary, backgroundColor: COLORS.primary + '0d' },
  addNewTxt: { fontSize: rf(13), fontWeight: '800', color: COLORS.primary },

  formCard: { backgroundColor: '#f8f9fb', borderRadius: RADIUS.md, padding: rs(12), marginTop: rs(4) },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(10) },
  formTitle: { flex: 1, fontSize: rf(13), fontWeight: '800', color: '#0d0d0d' },
  cancelLink: { fontSize: rf(12), color: COLORS.primary, fontWeight: '700' },
  lbl: { fontSize: rf(11), fontWeight: '700', color: '#546e7a', marginBottom: rs(4), textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { fontSize: rf(13.5), color: '#0d0d0d', backgroundColor: '#fff', borderRadius: RADIUS.sm, paddingHorizontal: rs(11), paddingVertical: Platform.OS === 'ios' ? rs(11) : rs(8), borderWidth: 1, borderColor: '#e0e0e0' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginTop: rs(4), marginBottom: rs(8) },
  checkbox: { width: rs(18), height: rs(18), borderRadius: rs(4), borderWidth: 2, borderColor: '#cfd8dc', alignItems: 'center', justifyContent: 'center' },
  checkboxSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  defaultRowTxt: { fontSize: rf(12), color: '#546e7a', fontWeight: '600' },
  errTxt: { fontSize: rf(12), color: '#e53935', marginBottom: rs(8) },
  saveBtn: { backgroundColor: COLORS.primary, padding: rs(12), borderRadius: RADIUS.md, alignItems: 'center', marginTop: rs(2) },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: rf(14) },

  footer: { padding: rs(14), borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  continueBtn: { backgroundColor: COLORS.primary, paddingVertical: rs(14), borderRadius: RADIUS.md, alignItems: 'center' },
  continueBtnTxt: { color: '#fff', fontWeight: '900', fontSize: rf(15) },
});
