import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Pressable, Animated, Dimensions, Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Play, Pause, RotateCcw, RotateCw, Maximize2, Minimize2,
  Volume2, VolumeX, Settings, Check, X, Gauge, Sparkles,
} from 'lucide-react-native';
import { COLORS, RADIUS } from '../utils/theme';
import { rs, rf } from '../utils/responsive';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITIES = ['Auto', '1080p', '720p', '480p', '360p'];

interface Props {
  source: string;
  captionText?: string;
  captionTopic?: string;
  showCaptions?: boolean;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  previewSeconds?: number;       // If set, stop after this many seconds and fire onPreviewEnd
  onPreviewEnd?: () => void;
  externalPaused?: boolean;       // When true, force pause (e.g. settings open)
  autoPlay?: boolean;
  seekTo?: number;                // external seek trigger
  // External playback rate control. When provided, the player's speed follows
  // this prop and emits onPlaybackRateChange whenever the user changes it
  // from the in-player gear menu.
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  style?: any;
}

export const VideoPlayer: React.FC<Props> = ({
  source,
  captionText,
  captionTopic,
  showCaptions = true,
  onTimeUpdate,
  onEnded,
  previewSeconds,
  onPreviewEnd,
  autoPlay = true,
  seekTo,
  externalPaused,
  playbackRate,
  onPlaybackRateChange,
  style,
}) => {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    // Audio configuration — without these, iOS silent-mode mutes playback and
    // the player can pick up an ambient audio session that produces no sound.
    p.audioMixingMode = 'auto';
    p.volume = 1.0;
    p.muted = false;
    // Browsers (Chrome / Safari) block autoplay with sound. On web we let the
    // user press the centre play button which counts as a gesture and unlocks
    // audio. On native we autoplay normally.
    if (autoPlay && Platform.OS !== 'web') p.play();
  });

  const [isPlaying, setIsPlaying] = useState(autoPlay && Platform.OS !== 'web');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState<string>('Auto');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState<'none' | 'speed' | 'quality'>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewExpired, setPreviewExpired] = useState(false);

  const hideTimer = useRef<any>(null);
  const seekBarWidth = useRef<number>(0);
  const insets = useSafeAreaInsets();

  // Orientation lock — apply when fullscreen state changes. We deliberately
  // do NOT include cleanup logic here because the cleanup runs *between*
  // toggles and was firing PORTRAIT_UP a second time, producing the visible
  // double-shake. Mount-time cleanup is handled in the effect below.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(
      isFullscreen
        ? ScreenOrientation.OrientationLock.LANDSCAPE
        : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {});
  }, [isFullscreen]);

  // Restore portrait once when the player unmounts (and only then).
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web') {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
  }, []);

  // Poll time
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const t = player.currentTime || 0;
        const d = player.duration || 0;
        setCurrentTime(t);
        setDuration(d);
        if (onTimeUpdate) onTimeUpdate(t);
        if (previewSeconds && t >= previewSeconds && !previewExpired) {
          player.pause();
          setIsPlaying(false);
          setPreviewExpired(true);
          onPreviewEnd && onPreviewEnd();
        }
        if (d > 0 && t >= d - 0.2 && onEnded) onEnded();
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [player, previewSeconds, previewExpired]);

  // External seek
  useEffect(() => {
    if (seekTo !== undefined && player) {
      try {
        const d = player.duration || 0;
        // Clamp to video duration so seeks past the end don't reset to 0
        const target = d > 0 ? Math.min(Math.max(0, seekTo), Math.max(0, d - 1)) : seekTo;
        player.currentTime = target;
        setCurrentTime(target);
        player.play();
        setIsPlaying(true);
        setPreviewExpired(false);
      } catch {}
    }
  }, [seekTo]);

  // Auto-hide controls
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying && showSettings === 'none') setControlsVisible(false);
    }, 3000);
  }, [isPlaying, showSettings]);

  useEffect(() => { scheduleHide(); return () => hideTimer.current && clearTimeout(hideTimer.current); }, [isPlaying, scheduleHide]);

  const togglePlay = () => {
    if (previewExpired) return;
    if (isPlaying) { player.pause(); setIsPlaying(false); }
    else { player.play(); setIsPlaying(true); }
  };
  const skip = (sec: number) => {
    try {
      const t = Math.max(0, Math.min(duration, (player.currentTime || 0) + sec));
      player.currentTime = t;
      setCurrentTime(t);
    } catch {}
  };
  const toggleMute = () => { try { player.muted = !isMuted; setIsMuted(!isMuted); } catch {} };
  const applySpeed = (s: number) => { try { player.playbackRate = s; setSpeed(s); setShowSettings('none'); onPlaybackRateChange?.(s); } catch {} };

  // Sync external playbackRate prop changes (from LearningScreen settings sheet)
  useEffect(() => {
    if (typeof playbackRate === 'number' && playbackRate !== speed) {
      try { player.playbackRate = playbackRate; setSpeed(playbackRate); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackRate]);

  // External pause-control: when settings sheet (or any other UI) opens, force
  // pause; resume previous play state when it closes. We remember whether the
  // player was playing at the moment of pausing so we can resume only then.
  const wasPlayingBeforePause = useRef(false);
  useEffect(() => {
    if (externalPaused) {
      wasPlayingBeforePause.current = isPlaying;
      try { player.pause(); setIsPlaying(false); } catch {}
    } else if (wasPlayingBeforePause.current) {
      try { player.play(); setIsPlaying(true); } catch {}
      wasPlayingBeforePause.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPaused]);
  const applyQuality = (q: string) => { setQuality(q); setShowSettings('none'); };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '00:00';
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekBarPress = (e: any) => {
    if (!seekBarWidth.current || duration <= 0) return;
    const x = e.nativeEvent.locationX;
    const t = Math.max(0, Math.min(duration, (x / seekBarWidth.current) * duration));
    try { player.currentTime = t; setCurrentTime(t); } catch {}
  };

  const showControls = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  const renderPlayer = (wrapStyle?: any) => (
    <View style={[styles.videoWrap, wrapStyle]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Tap layer to toggle controls */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={() => controlsVisible ? setControlsVisible(false) : showControls()}>
        <View style={{ flex: 1 }} />
      </Pressable>

      {/* Captions overlay */}
      {showCaptions && captionText && !previewExpired && (
        <View style={styles.captionWrap} pointerEvents="none">
          <View style={styles.captionBox}>
            {captionTopic ? <Text style={styles.captionTopic}>{captionTopic}</Text> : null}
            <Text style={styles.captionText} numberOfLines={2}>{captionText}</Text>
          </View>
        </View>
      )}

      {/* Controls overlay */}
      {controlsVisible && !previewExpired && (
        <View style={styles.controlsLayer} pointerEvents="box-none">
          {/* Top bar — mute + fullscreen only */}
          <View style={styles.topBar} pointerEvents="auto">
            <TouchableOpacity style={styles.topIconBtn} onPress={toggleMute}>
              {isMuted ? <VolumeX size={rs(18)} color="#fff" strokeWidth={2} /> : <Volume2 size={rs(18)} color="#fff" strokeWidth={2} />}
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {speed !== 1 && (
              <View style={styles.speedBadge}>
                <Text style={styles.speedBadgeTxt}>{speed}x</Text>
              </View>
            )}
            {!isFullscreen && (
              <TouchableOpacity style={styles.topIconBtn} onPress={() => setIsFullscreen(true)}>
                <Maximize2 size={rs(18)} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Center play controls */}
          <View style={styles.centerRow} pointerEvents="auto">
            <TouchableOpacity style={styles.centerBtn} onPress={() => skip(-10)}>
              <RotateCcw size={rs(22)} color="#fff" strokeWidth={2} />
              <Text style={styles.centerLabel}>10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
              {isPlaying ? <Pause size={rs(26)} color="#fff" strokeWidth={2} fill="#fff" /> : <Play size={rs(26)} color="#fff" strokeWidth={2} fill="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.centerBtn} onPress={() => skip(10)}>
              <RotateCw size={rs(22)} color="#fff" strokeWidth={2} />
              <Text style={styles.centerLabel}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom seek */}
          <View style={styles.bottomBar} pointerEvents="auto">
            <Text style={styles.timeTxt}>{fmt(currentTime)} / {fmt(duration)}</Text>
            <Pressable
              onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width; }}
              onPress={handleSeekBarPress}
              style={styles.seekRow}>
              <View style={styles.seekBg}>
                <View style={[styles.seekFill, { width: `${pct}%` as any }]} />
                <View style={[styles.seekThumb, { left: `${pct}%` as any }]} />
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {/* Settings menus */}
      {showSettings === 'speed' && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSettings('none')}>
          <View style={styles.settingsSheet} pointerEvents="box-none">
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeader}>
                <Gauge size={rs(16)} color="#fff" strokeWidth={2} />
                <Text style={styles.settingsTitle}>Playback Speed</Text>
              </View>
              {SPEEDS.map(s => (
                <TouchableOpacity key={s} onPress={() => applySpeed(s)} style={styles.settingsRow}>
                  <Text style={[styles.settingsRowTxt, speed === s && { color: '#4fc3f7', fontWeight: '900' }]}>
                    {s === 1 ? 'Normal' : `${s}x`}
                  </Text>
                  {speed === s && <Check size={rs(16)} color="#4fc3f7" strokeWidth={2.5} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      )}
      {showSettings === 'quality' && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSettings('none')}>
          <View style={styles.settingsSheet} pointerEvents="box-none">
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeader}>
                <Sparkles size={rs(16)} color="#fff" strokeWidth={2} />
                <Text style={styles.settingsTitle}>Video Quality</Text>
              </View>
              {QUALITIES.map(q => (
                <TouchableOpacity key={q} onPress={() => applyQuality(q)} style={styles.settingsRow}>
                  <Text style={[styles.settingsRowTxt, quality === q && { color: '#4fc3f7', fontWeight: '900' }]}>{q}</Text>
                  {quality === q && <Check size={rs(16)} color="#4fc3f7" strokeWidth={2.5} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      )}

      {/* Preview expired overlay */}
      {previewExpired && (
        <View style={styles.previewOverlay}>
          <Text style={styles.previewTitle}>Preview Ended</Text>
          <Text style={styles.previewSub}>Enroll to watch full lecture</Text>
        </View>
      )}
    </View>
  );

  // Single-view fullscreen: when isFullscreen is true, the same VideoView is
  // rendered into a full-screen absolutely-positioned container (no Modal,
  // no second VideoView, no display:none toggle) — this is what eliminates
  // the visible double-shake on enter / exit. App.json has `orientation: "default"`
  // so combined with `ScreenOrientation.lockAsync` the device rotates correctly.
  if (isFullscreen) {
    return (
      <View style={styles.fullscreenContainer} pointerEvents="auto">
        {renderPlayer({ flex: 1, aspectRatio: undefined })}
        <TouchableOpacity
          style={[
            styles.exitFullscreenFab,
            {
              top: Math.max(insets.top, rs(14)) + rs(6),
              right: Math.max(insets.right, insets.left, rs(20)),
            },
          ]}
          onPress={() => setIsFullscreen(false)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={rs(20)} color="#fff" strokeWidth={2.5} />
          <Text style={styles.exitFullscreenLabel}>EXIT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return renderPlayer(style);
};

const styles = StyleSheet.create({
  videoWrap: { backgroundColor: '#0d1117', aspectRatio: 16 / 9, position: 'relative', overflow: 'hidden' },
  fullscreenContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999, elevation: 9999,
  },

  captionWrap: { position: 'absolute', bottom: rs(60), left: 0, right: 0, alignItems: 'center', paddingHorizontal: rs(12) },
  captionBox: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: rs(8), paddingHorizontal: rs(12), paddingVertical: rs(6), maxWidth: '95%' },
  captionTopic: { fontSize: rf(9), color: '#7eb8ff', fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  captionText: { fontSize: rf(13), color: '#fff', textAlign: 'center', lineHeight: rf(18) },

  controlsLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.28)' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: rs(8), padding: rs(10) },
  topIconBtn: { width: rs(32), height: rs(32), borderRadius: rs(16), backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  speedIndicator: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#ff6f00', color: '#fff', fontSize: rf(8), fontWeight: '900', paddingHorizontal: 3, borderRadius: 4 },
  qualityBadge: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: rs(4), paddingHorizontal: rs(6), paddingVertical: rs(3) },
  qualityBadgeTxt: { color: '#fff', fontSize: rf(9), fontWeight: '900', letterSpacing: 0.5 },

  speedBadge: { backgroundColor: '#ff6f00', borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(4), marginRight: rs(6) },
  speedBadgeTxt: { color: '#fff', fontSize: rf(11), fontWeight: '900' },

  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(32) },
  centerBtn: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  centerLabel: { position: 'absolute', bottom: rs(4), fontSize: rf(9), color: '#fff', fontWeight: '800' },
  playBtn: { width: rs(56), height: rs(56), borderRadius: rs(28), backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },

  bottomBar: { padding: rs(10) },
  timeTxt: { color: '#fff', fontSize: rf(11), fontWeight: '600', marginBottom: rs(4) },
  seekRow: { paddingVertical: rs(6) },
  seekBg: { height: rs(4), backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: rs(2), position: 'relative' },
  seekFill: { height: '100%', backgroundColor: '#e53935', borderRadius: rs(2) },
  seekThumb: { position: 'absolute', width: rs(12), height: rs(12), borderRadius: rs(6), backgroundColor: '#e53935', top: rs(-4) },

  settingsSheet: { position: 'absolute', top: rs(50), right: rs(8) },
  settingsCard: { backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: rs(12), padding: rs(6), minWidth: rs(140) },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), paddingHorizontal: rs(10), paddingVertical: rs(8), borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  settingsTitle: { color: '#fff', fontSize: rf(12), fontWeight: '800' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: rs(10), paddingVertical: rs(8), gap: rs(16) },
  settingsRowTxt: { color: '#fff', fontSize: rf(13), fontWeight: '600' },

  previewOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  previewTitle: { color: '#fff', fontSize: rf(20), fontWeight: '900', marginBottom: rs(6) },
  previewSub: { color: 'rgba(255,255,255,0.75)', fontSize: rf(13) },
  exitFullscreenFab: { position: 'absolute', top: rs(20), right: rs(20), flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: '#e53935', paddingHorizontal: rs(14), paddingVertical: rs(10), borderRadius: rs(22) },
  exitFullscreenLabel: { color: '#fff', fontSize: rf(12), fontWeight: '900', letterSpacing: 1 },
});
