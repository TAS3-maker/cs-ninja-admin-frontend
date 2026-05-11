import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, BookOpen, Tag, AlertCircle, CheckCircle, Clock, X, MessageCircle } from 'lucide-react-native';
import { COLORS, RADIUS } from '../utils/theme';
import { rs, rf, contentPadH, isTablet, contentMaxWidth } from '../utils/responsive';
import api from '../services/api';

interface Props { onBack: () => void; }

interface Notif {
  id: string;
  type: 'order' | 'doubt' | 'course' | string;
  title: string;
  body: string;
  timestamp?: string;
  read?: boolean;
  course_id?: string;
  doubt_id?: string;
}

const ICON_FOR: Record<string, { Icon: any; color: string }> = {
  order:  { Icon: CheckCircle,   color: COLORS.green },
  doubt:  { Icon: MessageCircle, color: COLORS.primary },
  course: { Icon: BookOpen,      color: '#ff6f00' },
};

const PREFS = [
  { id: 'classes', label: 'Live Class Reminders', sub: 'Get notified before live classes' },
  { id: 'doubts', label: 'Doubt Replies', sub: 'When mentors answer your questions' },
  { id: 'offers', label: 'Offers & Discounts', sub: 'Promotional notifications' },
  { id: 'reminders', label: 'Study Reminders', sub: 'Daily learning reminders' },
  { id: 'updates', label: 'Course Updates', sub: 'New lectures and content' },
];

const fmtRelative = (iso?: string): string => {
  if (!iso) return '';
  let date: Date;
  try { date = new Date(iso); } catch { return ''; }
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 86400 * 2) return 'Yesterday';
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} days ago`;
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

export const NotificationScreen: React.FC<Props> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ classes: true, doubts: true, offers: false, reminders: true, updates: true });

  const load = useCallback(async () => {
    try {
      const r: any = await api.listNotifications();
      setNotifications(r.notifications || []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.markNotificationsRead(unread); } catch {}
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.markNotificationsRead([id]); } catch {}
  };

  const dismiss = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try { await api.dismissNotification(id); } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = activeTab === 'unread' ? notifications.filter(n => !n.read) : notifications;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ maxWidth: isTablet ? contentMaxWidth : undefined, alignSelf: 'center', width: '100%', flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={rs(20)} color="#0d0d0d" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && activeTab !== 'settings' ? (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllTxt}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: rs(80) }} />
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            { id: 'settings', label: 'Settings' },
          ].map(t => (
            <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id as any)}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}>
              <Text style={[styles.tabTxt, activeTab === t.id && styles.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          refreshControl={activeTab !== 'settings' ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} /> : undefined}
        >
          {activeTab !== 'settings' && (
            <View style={{ padding: contentPadH }}>
              {loading ? (
                <View style={{ padding: rs(40), alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : displayed.length === 0 ? (
                <View style={styles.emptyState}>
                  <Bell size={rs(48)} color="#e0e0e0" strokeWidth={1.5} />
                  <Text style={styles.emptyTitle}>{activeTab === 'unread' ? 'All caught up' : 'No notifications yet'}</Text>
                  <Text style={styles.emptySub}>{activeTab === 'unread' ? 'You have no unread notifications.' : 'You\'ll see updates here as you progress.'}</Text>
                </View>
              ) : displayed.map(n => {
                const meta = ICON_FOR[n.type] || { Icon: Bell, color: '#90a4ae' };
                return (
                  <TouchableOpacity key={n.id} onPress={() => markRead(n.id)}
                    style={[styles.notifCard, !n.read && styles.notifCardUnread]} activeOpacity={0.8}>
                    <View style={[styles.notifIcon, { backgroundColor: meta.color + '18' }]}>
                      <meta.Icon size={rs(20)} color={meta.color} strokeWidth={1.8} />
                    </View>
                    <View style={{ flex: 1, marginLeft: rs(12) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rs(3) }}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                        {!n.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                      <Text style={styles.notifTime}>{fmtRelative(n.timestamp)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => dismiss(n.id)} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={rs(14)} color="#b0bec5" strokeWidth={2} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTab === 'settings' && (
            <View style={{ padding: contentPadH }}>
              <Text style={styles.settingsTitle}>Notification Preferences</Text>
              <Text style={styles.settingsSub}>Choose which notifications you want to receive</Text>
              <View style={styles.prefsCard}>
                {PREFS.map((pref, i) => (
                  <View key={pref.id}>
                    <View style={styles.prefRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prefLabel}>{pref.label}</Text>
                        <Text style={styles.prefSub}>{pref.sub}</Text>
                      </View>
                      <Switch
                        value={prefs[pref.id]}
                        onValueChange={v => setPrefs(p => ({ ...p, [pref.id]: v }))}
                        trackColor={{ false: '#e0e0e0', true: COLORS.primaryBg }}
                        thumbColor={prefs[pref.id] ? COLORS.primary : '#f5f5f5'}
                      />
                    </View>
                    {i < PREFS.length - 1 && <View style={styles.prefDivider} />}
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={{ height: rs(32) }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: contentPadH, paddingVertical: rs(12), backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  backBtn: { width: rs(36), height: rs(36), borderRadius: rs(18), backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: rf(17), fontWeight: '800', color: '#0d0d0d' },
  markAllBtn: { paddingHorizontal: rs(8), paddingVertical: rs(6) },
  markAllTxt: { fontSize: rf(13), color: COLORS.primary, fontWeight: '700' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, paddingVertical: rs(12), alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabTxt: { fontSize: rf(13), fontWeight: '600', color: '#90a4ae' },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: rs(60) },
  emptyTitle: { fontSize: rf(18), fontWeight: '800', color: '#0d0d0d', marginTop: rs(16) },
  emptySub: { fontSize: rf(14), color: '#90a4ae', marginTop: rs(6), textAlign: 'center', paddingHorizontal: rs(40) },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: rs(14), marginBottom: rs(10), borderWidth: 1, borderColor: '#f0f0f0' },
  notifCardUnread: { borderColor: COLORS.primaryBg, backgroundColor: '#fafbff' },
  notifIcon: { width: rs(44), height: rs(44), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center' },
  notifTitle: { flex: 1, fontSize: rf(14), fontWeight: '800', color: '#0d0d0d', marginRight: rs(4) },
  unreadDot: { width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: COLORS.primary, marginLeft: rs(4) },
  notifBody: { fontSize: rf(13), color: '#546e7a', lineHeight: rf(19), marginBottom: rs(4) },
  notifTime: { fontSize: rf(11), color: '#b0bec5', fontWeight: '600' },
  dismissBtn: { padding: rs(4), marginLeft: rs(8) },
  settingsTitle: { fontSize: rf(17), fontWeight: '900', color: '#0d0d0d', marginBottom: rs(4) },
  settingsSub: { fontSize: rf(13), color: '#90a4ae', marginBottom: rs(20) },
  prefsCard: { backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(14) },
  prefLabel: { fontSize: rf(14), fontWeight: '700', color: '#0d0d0d', marginBottom: rs(2) },
  prefSub: { fontSize: rf(12), color: '#90a4ae' },
  prefDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#f0f0f0', marginLeft: rs(16) },
});
