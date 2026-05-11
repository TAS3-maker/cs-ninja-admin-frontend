import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, Send, Paperclip, MoreVertical, Check, CheckCheck, RefreshCw, X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../components/Avatar';
import { COLORS, RADIUS } from '../utils/theme';
import { rs, rf } from '../utils/responsive';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  // Preferred path: pass the doubtId so we can load & post real replies.
  doubtId?: string;
  // Display fallbacks (used when doubtId is not provided — e.g. legacy callers).
  mentorName: string;
  mentorSubject: string;
  doubtContext?: string;
  onBack: () => void;
}

interface UIMessage {
  id: string;
  from: 'me' | 'mentor';
  author: string;
  text: string;
  imageUrl?: string | null;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

const formatTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
};

export const MentorChatScreen: React.FC<Props> = ({
  doubtId, mentorName, mentorSubject, doubtContext, onBack,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [doubt, setDoubt] = useState<any>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const buildMessages = (d: any): UIMessage[] => {
    if (!d) return [];
    const myId = user?.id;
    const out: UIMessage[] = [{
      id: `q_${d.id}`,
      from: 'me',
      author: 'You',
      text: d.question || '',
      time: formatTime(d.createdAt),
      status: 'read',
    }];
    (d.replies || []).forEach((r: any, i: number) => {
      const mine = r.by_id ? r.by_id === myId : r.by_role === 'student';
      out.push({
        id: `r_${i}`,
        from: mine ? 'me' : 'mentor',
        author: r.by || (mine ? 'You' : (r.by_role || 'Mentor')),
        text: r.content || '',
        imageUrl: r.image_url || null,
        time: formatTime(r.at),
        status: mine ? 'read' : undefined,
      });
    });
    return out;
  };

  const load = useCallback(async () => {
    if (!doubtId) return;
    try {
      const r: any = await api.listDoubts();
      const d = (r.doubts || []).find((x: any) => x.id === doubtId);
      if (d) {
        setDoubt(d);
        setMessages(buildMessages(d));
      }
    } catch (e: any) {
      console.warn('[chat] load failed', e?.message);
    }
  }, [doubtId, user?.id]);

  useEffect(() => {
    if (!doubtId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [doubtId, load]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo access to attach an image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingImg(true);
      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      const ct = ext === 'png' ? 'image/png' : 'image/jpeg';
      const filename = `chat_${Date.now()}.${ext}`;
      const uploaded: any = await api.uploadDirect(
        { uri: asset.uri, mimeType: ct, fileName: filename },
        'doubt',
      );
      setPendingImage(uploaded.public_url);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Try again.');
    } finally { setUploadingImg(false); }
  };

  const send = async () => {
    if (!doubtId) {
      Alert.alert('Cannot send', 'Open this chat from the Doubts screen so we can attach the message to the right thread.');
      return;
    }
    const text = input.trim();
    if (!text && !pendingImage) return;
    setSending(true);
    try {
      const updated: any = await api.replyDoubt(doubtId, { content: text, image_url: pendingImage || undefined });
      setDoubt(updated);
      setMessages(buildMessages(updated));
      setInput('');
      setPendingImage(null);
    } catch (e: any) {
      Alert.alert('Send failed', e?.response?.data?.error || e?.message || 'Try again.');
    } finally { setSending(false); }
  };

  const headerName = doubt?.replies?.find((r: any) => r.by_role !== 'student')?.by || mentorName;
  const headerSub = doubt ? (doubt.topic || mentorSubject) : mentorSubject;
  const banner = doubtContext || (doubt && doubt.course_id ? `${doubt.course_id} · ${doubt.topic || ''}` : '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f6fa' }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ position: 'relative' }}>
          <Avatar name={headerName} size={rs(40)} />
          <View style={styles.onlineDot} />
        </View>
        <View style={{ flex: 1, marginLeft: rs(10) }}>
          <Text style={styles.mentorName} numberOfLines={1}>{headerName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4) }}>
            <View style={styles.activeDot} />
            <Text style={styles.mentorStatus} numberOfLines={1}>{headerSub}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color={COLORS.primary} /> : <RefreshCw size={rs(18)} color="#546e7a" strokeWidth={1.8} />}
        </TouchableOpacity>
      </View>

      {/* Context banner */}
      {banner ? (
        <View style={styles.contextBanner}>
          <Text style={styles.contextText}>{banner}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: rs(12), paddingBottom: rs(12) }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >
            {messages.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: rs(60) }}>
                <Text style={{ color: '#90a4ae', fontSize: rf(14) }}>No messages yet — open a thread from the Doubts tab.</Text>
              </View>
            ) : <Text style={styles.dayLabel}>Conversation</Text>}
            {messages.map((m) => {
              const mine = m.from === 'me';
              return (
                <View key={m.id} style={[styles.msgRow, mine ? { justifyContent: 'flex-end' } : null]}>
                  {!mine && <Avatar name={m.author} size={rs(28)} style={{ marginRight: rs(6), alignSelf: 'flex-end' }} />}
                  <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
                    {!!m.imageUrl && (
                      <Image source={{ uri: m.imageUrl }} style={styles.bubbleImg} resizeMode="cover" />
                    )}
                    {!!m.text && (
                      <Text style={[styles.msgText, mine && { color: '#fff' }]}>{m.text}</Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(4), marginTop: rs(4), alignSelf: 'flex-end' }}>
                      <Text style={[styles.msgTime, mine && { color: 'rgba(255,255,255,0.7)' }]}>{m.time}</Text>
                      {mine && m.status === 'sent' && <Check size={rs(13)} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />}
                      {mine && m.status === 'read' && <CheckCheck size={rs(13)} color="#4fc3f7" strokeWidth={2.5} />}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Pending image preview */}
        {pendingImage && (
          <View style={styles.imgPreviewBar}>
            <Image source={{ uri: pendingImage }} style={styles.imgPreview} />
            <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.imgPreviewRm} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <X size={rs(14)} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, rs(10)) }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={uploadingImg}>
            {uploadingImg ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Paperclip size={rs(18)} color="#546e7a" strokeWidth={1.8} />}
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type your message..."
              placeholderTextColor="#90a4ae"
              style={styles.input}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (sending || (!input.trim() && !pendingImage)) && { opacity: 0.4 }]}
            onPress={send}
            disabled={sending || (!input.trim() && !pendingImage)}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={rs(16)} color="#fff" strokeWidth={2} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(12), paddingVertical: rs(10),
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0',
    gap: rs(8),
  },
  iconBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: rs(11), height: rs(11), borderRadius: rs(6), backgroundColor: '#4caf50', borderWidth: 2, borderColor: '#fff' },
  mentorName: { fontSize: rf(15), fontWeight: '800', color: '#0d0d0d' },
  activeDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: '#4caf50' },
  mentorStatus: { fontSize: rf(11), color: '#90a4ae', fontWeight: '600' },

  contextBanner: { backgroundColor: COLORS.primaryBg, paddingHorizontal: rs(14), paddingVertical: rs(8), borderBottomWidth: 1, borderBottomColor: COLORS.primary + '33' },
  contextText: { fontSize: rf(12), color: COLORS.primary, fontWeight: '700', textAlign: 'center' },

  dayLabel: { alignSelf: 'center', fontSize: rf(11), color: '#90a4ae', fontWeight: '700', backgroundColor: '#e0e0e0', paddingHorizontal: rs(10), paddingVertical: rs(3), borderRadius: rs(10), marginVertical: rs(8), textTransform: 'uppercase' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: rs(6) },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: rs(12), paddingVertical: rs(8),
    borderRadius: rs(14),
  },
  mineBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: rs(4) },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: rs(4), borderWidth: 1, borderColor: '#e8e8e8' },
  msgText: { fontSize: rf(14), color: '#0d0d0d', lineHeight: rf(20) },
  msgTime: { fontSize: rf(10), color: '#90a4ae', fontWeight: '600' },
  bubbleImg: { width: rs(220), height: rs(160), borderRadius: rs(8), marginBottom: rs(6), backgroundColor: '#e0e0e0' },

  imgPreviewBar: { flexDirection: 'row', paddingHorizontal: rs(10), paddingTop: rs(8), backgroundColor: '#fff' },
  imgPreview: { width: rs(64), height: rs(64), borderRadius: rs(8), backgroundColor: '#e0e0e0' },
  imgPreviewRm: { position: 'absolute', top: rs(2), left: rs(56), width: rs(20), height: rs(20), borderRadius: rs(10), backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: rs(8),
    paddingHorizontal: rs(10), paddingTop: rs(8),
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0',
  },
  attachBtn: { width: rs(40), height: rs(40), borderRadius: rs(20), alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: rs(22), paddingHorizontal: rs(14), paddingVertical: rs(4), minHeight: rs(40), justifyContent: 'center' },
  input: { fontSize: rf(14), color: '#0d0d0d', maxHeight: rs(120), paddingVertical: rs(6) },
  sendBtn: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
