# CSninja Mobile App — PRD

## Overview
React Native + Expo SDK 54 app for Company Secretary exam prep (CSEET, CS Executive, CS Professional). Frontend-only with mock data + AsyncStorage. Mock OTP `123456`.

## Architecture
- Entry: `app/_layout.tsx` (providers) + `app/index.tsx` (custom state-based navigator).
- Navigation kept as the original CSninja switch flow (no expo-router screens beyond index).
- Providers: `AuthProvider`, `ProgressProvider`, `SafeAreaProvider`.
- Storage: AsyncStorage for user, progress, notes.

## Screens (all complete)
- **LandingScreen** — Hero with Scale icon, stats, login/signup CTAs.
- **AuthScreens** — Login / Signup / OTP / Forgot Password (mock OTP `123456`).
- **DashboardScreen** — Hero, category chips, courses carousel, resume cards, faculty grid (Avatar component with initials).
- **AllCoursesScreen** — Search, level/language/sort filters in modal, responsive grid.
- **FreeDemoScreen** — Hero, category filter, featured + list of demo videos with Play icons.
- **CourseDetailScreen** — Banner, package card, About/Structure/Batch/Faculty tabs, buy bar.
- **LearningScreen** (the main video page) —
  - Mock video player with controls (play/pause, seek ±10s, fullscreen, captions toggle).
  - **Live caption overlay** synced to current playhead with topic name.
  - **Transcript** — segregated by topics (Introduction / Formal Communication / Informal Communication) with timestamps; current line highlighted.
  - **Notes** — add note WITH timestamp (tap any transcript line) OR WITHOUT timestamp (Quick note). **Swipe RIGHT to delete.**
  - **PDF** — chapter pages list, opens modal with reader + page nav + "Back to Video" button.
  - **Doubt** — list of doubts with mentor replies, opens modal to ask new doubt with subject/topic chips + "Back to Video" button.
- **StudyScreen** — Schedule timeline, my courses list (Avatar component).
- **TestScreen** — Papers / Sample Tests with stats.
- **DoubtScreen** — Filter chips, doubt list with replies, ask modal, filter modal.
- **ProfileScreen** — Profile card + complete sub-screens for: **Edit Profile**, **Orders** (mock receipts), **Subscriptions**, **Address Book**, **About / Terms / Privacy**.
- **NotificationScreen** — Tabbed alerts.
- **CartScreen** — Cart items, coupon, summary, secure checkout.

## Design system
- **Reusable Avatar component** (`src/components/Avatar.tsx`) — renders initials in a colored circle (deterministic palette from name). Used everywhere instead of emoji avatars.
- **Lucide icons everywhere** — no emojis used for UI elements (only kept in alert/text strings where needed).
- Theme: COLORS / SPACING / RADIUS / SHADOWS in `src/utils/theme.ts`.
- Responsive helpers `rs()`, `rf()`, `isTablet`, `contentMaxWidth`, `gridCols` in `src/utils/responsive.ts`.

## Key dependencies (Expo SDK 54)
- `expo-router`, `expo-linear-gradient@15.0.8`, `lucide-react-native`, `@react-native-async-storage/async-storage@2.2.0`, `react-native-svg@15.12.1`, `react-native-reanimated`, `react-native-gesture-handler`.

## Mock credentials
Any email/password works for login. Mock OTP: `123456`.
