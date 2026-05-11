import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Smartphone, Eye, EyeOff, Check, Lightbulb } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

// ─── Shared Input ───────────────────────────────────────────────────────────
const Input: React.FC<{
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  keyboardType?: any; autoCapitalize?: any; error?: string; icon?: string;
}> = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'none', error, icon }) => {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrapper, focused && styles.inputFocused, !!error && styles.inputError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#b0bec5"
          secureTextEntry={secureTextEntry && !showPwd}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ padding: 4 }}>
            {showPwd ? <EyeOff size={18} color={COLORS.textMuted} strokeWidth={1.8} /> : <Eye size={18} color={COLORS.textMuted} strokeWidth={1.8} />}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 3 }}>{error}</Text> : null}
    </View>
  );
};

// ─── Auth Header ───────────────────────────────────────────────────────────
const AuthHeader: React.FC<{ title: string; subtitle: string; onBack: () => void }> = ({ title, subtitle, onBack }) => (
  <LinearGradient colors={['#1a237e', '#283593', '#3949ab']} style={styles.authHeader}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
      <ChevronLeft size={24} color="#fff" strokeWidth={2.2} />
    </TouchableOpacity>
    <View style={[styles.logoMini, { backgroundColor: 'rgba(255,255,255,0.95)', padding: 6 }]}>
      <Image source={require('../../assets/images/csninja-logo.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </View>
    <Text style={styles.authTitle}>{title}</Text>
    <Text style={styles.authSubtitle}>{subtitle}</Text>
  </LinearGradient>
);

// ─── Login Screen ───────────────────────────────────────────────────────────
export const LoginScreen: React.FC<{
  onSignup: () => void; onForgotPassword: () => void; onBack: () => void;
}> = ({ onSignup, onForgotPassword, onBack }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try { await login(identifier, password); }
    catch (e: any) { setError(e.message || 'Login failed'); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Welcome Back!" subtitle="Login to continue your CS journey" onBack={onBack} />
        <View style={styles.formCard}>
          {error ? <View style={styles.errorBanner}><Text style={{ color: COLORS.error, fontSize: 13 }}>{error}</Text></View> : null}
          <Input label="Email Address / Mobile no." value={identifier} onChangeText={setIdentifier}
            placeholder="your.email@example.com" keyboardType="email-address" />
          <Input label="Password" value={password} onChangeText={setPassword}
            placeholder="Enter your password" secureTextEntry />
          <TouchableOpacity onPress={onForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 }}>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>{loading ? 'Logging in...' : 'Log In'}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 4 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>New user?</Text>
            <TouchableOpacity onPress={onSignup}>
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' }}>Create account.</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Signup Screen ───────────────────────────────────────────────────────────
export const SignupScreen: React.FC<{ onLogin: () => void; onBack: () => void }> = ({ onLogin, onBack }) => {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.email.includes('@')) e.email = 'Valid email required';
    if (form.phone.length < 10) e.phone = 'Valid phone required';
    if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try { await signup(form.name, form.email, form.phone, form.password); }
    catch (e: any) { setErrors({ general: e.message }); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Create Account" subtitle="Join 50,000+ CS students today" onBack={onBack} />
        <View style={styles.formCard}>
          {errors.general ? <View style={styles.errorBanner}><Text style={{ color: COLORS.error }}>{errors.general}</Text></View> : null}
          <Input label="Full Name" value={form.name} onChangeText={v => setForm({ ...form, name: v })}
            placeholder="Your full name" autoCapitalize="words" error={errors.name} />
          <Input label="Email Address" value={form.email} onChangeText={v => setForm({ ...form, email: v })}
            placeholder="your.email@example.com" keyboardType="email-address" error={errors.email} />
          <Input label="Mobile Number" value={form.phone} onChangeText={v => setForm({ ...form, phone: v })}
            placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" error={errors.phone} />
          <Input label="Password" value={form.password} onChangeText={v => setForm({ ...form, password: v })}
            placeholder="Min 6 characters" secureTextEntry error={errors.password} />
          <Input label="Confirm Password" value={form.confirm} onChangeText={v => setForm({ ...form, confirm: v })}
            placeholder="Re-enter password" secureTextEntry error={errors.confirm} />
          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 4 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Already have an account?</Text>
            <TouchableOpacity onPress={onLogin}>
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' }}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── OTP Screen ───────────────────────────────────────────────────────────
export const OTPScreen: React.FC<{
  phone?: string; email?: string; purpose: 'signup' | 'forgot'; onBack: () => void;
}> = ({ phone, email, purpose, onBack }) => {
  const { verifyOTP, resetPassword } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [timer, setTimer] = useState(30);
  const inputs = useRef<any[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTimer(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      if (purpose === 'forgot') await resetPassword(code, newPassword);
      else await verifyOTP(code);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#1a237e', '#283593', '#3949ab']} style={styles.authHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={[styles.logoMini, { backgroundColor: 'rgba(255,255,255,0.95)', padding: 6 }]}>
            <Image source={require('../../assets/images/csninja-logo.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          <Text style={styles.authTitle}>Verify Your Account</Text>
          <Text style={styles.authSubtitle}>
            Complete verification to secure your account{'\n'}
            <Text style={{ color: '#ffcc02', fontWeight: '700' }}>Demo OTP: 123456</Text>
          </Text>
        </LinearGradient>

        <View style={styles.formCard}>
          {error ? <View style={styles.errorBanner}><Text style={{ color: COLORS.error }}>{error}</Text></View> : null}

          {/* Phone verified banner */}
          <View style={[styles.verifiedBanner]}>
            <Smartphone size={16} color={COLORS.textSecondary} strokeWidth={1.8} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: '700', color: COLORS.textDark }}>Phone Verification</Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{phone || 'your phone'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Check size={14} color={COLORS.success} strokeWidth={2.5} />
              <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '700' }}>Verified</Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'center' }}>
            Enter OTP sent to {email || phone}
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={r => { inputs.current[idx] = r; }}
                value={digit}
                onChangeText={v => handleOtpChange(v, idx)}
                keyboardType="number-pad"
                maxLength={1}
                style={[styles.otpInput, digit ? styles.otpFilled : null]}
              />
            ))}
          </View>

          <Text style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginBottom: 20 }}>
            {timer > 0 ? `Resend OTP in ${timer}s` : ''}
          </Text>

          {purpose === 'forgot' && (
            <Input label="New Password" value={newPassword} onChangeText={setNewPassword}
              placeholder="Enter new password" secureTextEntry />
          )}

          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleVerify} disabled={loading} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
          </TouchableOpacity>

          {timer === 0 && (
            <TouchableOpacity onPress={() => setTimer(30)} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Resend OTP</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            <Lightbulb size={13} color={COLORS.textMuted} strokeWidth={1.8} />
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              Didn't receive the code? Check your spam folder
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Forgot Password Screen ───────────────────────────────────────────────────────────
export const ForgotPasswordScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { forgotPassword } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthHeader title="Forgot Password?" subtitle="We'll send you an OTP to reset" onBack={onBack} />
      <View style={styles.formCard}>
        <Input label="Email Address / Mobile no." value={identifier} onChangeText={setIdentifier}
          placeholder="your.email@example.com" keyboardType="email-address" />
        <TouchableOpacity style={styles.primaryBtn} onPress={async () => {
          if (!identifier) return;
          setLoading(true);
          try { await forgotPassword(identifier); } catch (e) {}
          setLoading(false);
        }} activeOpacity={0.9}>
          <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  authHeader: {
    paddingTop: 64, paddingBottom: 36,
    paddingHorizontal: SPACING.lg, alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 60, left: SPACING.lg, padding: 8 },
  logoMini: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  authTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 6 },
  authSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  formCard: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20, padding: SPACING.lg, paddingTop: SPACING.xl,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f6fa', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 50,
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: '#e8eaf6' },
  inputError: { borderColor: COLORS.error },
  input: { flex: 1, fontSize: 14, color: COLORS.textDark },
  errorBanner: {
    backgroundColor: '#ffebee', borderRadius: RADIUS.sm,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#ef9a9a',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 15, alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  otpRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 10, marginBottom: 8,
  },
  otpInput: {
    width: 46, height: 54, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: '#e0e0e0',
    textAlign: 'center', fontSize: 22,
    fontWeight: '800', color: COLORS.textDark,
    backgroundColor: '#f5f6fa',
  },
  otpFilled: { borderColor: COLORS.primary, backgroundColor: '#e8eaf6', color: COLORS.primary },
  verifiedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e8f5e9', borderRadius: RADIUS.md,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#a5d6a7',
  },
});
