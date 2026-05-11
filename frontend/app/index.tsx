import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { LandingScreen } from '../src/screens/LandingScreen';
import { LoginScreen, SignupScreen, OTPScreen, ForgotPasswordScreen } from '../src/screens/AuthScreens';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { AllCoursesScreen } from '../src/screens/AllCoursesScreen';
import { FreeDemoScreen } from '../src/screens/FreeDemoScreen';
import { CourseDetailScreen } from '../src/screens/CourseDetailScreen';
import { LearningScreen } from '../src/screens/LearningScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { StudyScreen } from '../src/screens/StudyScreen';
import { MyNotesScreen } from '../src/screens/MyNotesScreen';
import { TestScreen } from '../src/screens/TestScreen';
import { DoubtScreen } from '../src/screens/DoubtScreen';
import { NotificationScreen } from '../src/screens/NotificationScreen';
import { CartScreen } from '../src/screens/CartScreen';
import { MentorChatScreen } from '../src/screens/MentorChatScreen';
import { SplashView } from '../src/components/SplashView';
import { COLORS } from '../src/utils/theme';

type AuthScreen = 'landing' | 'login' | 'signup' | 'otp' | 'forgot';
type AppScreen =
  | { name: 'home' } | { name: 'allCourses' } | { name: 'freeDemo' }
  | { name: 'study' } | { name: 'notes' } | { name: 'test' } | { name: 'doubt' }
  | { name: 'profile' } | { name: 'notifications' } | { name: 'cart' }
  | { name: 'courseDetail'; courseId: string }
  | { name: 'learning'; courseId: string; chapterId: string; stepId: string }
  | { name: 'mentorChat'; mentorName: string; subject: string; context?: string; doubtId?: string; backTo?: AppScreen };

export default function Index() {
  const { isAuthenticated, isLoading, pendingOTP } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('landing');
  const [appScreen, setAppScreen] = useState<AppScreen>({ name: 'home' });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <SplashView />;

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  // OTP flow is disabled now (backend does direct signup)
  // Keeping conditional for backwards compat but pendingOTP is always null
  // (see AuthContext).

  if (!isAuthenticated) {
    switch (authScreen) {
      case 'landing': return <LandingScreen onGetStarted={() => setAuthScreen('signup')} onLogin={() => setAuthScreen('login')} />;
      case 'login': return <LoginScreen onSignup={() => setAuthScreen('signup')} onForgotPassword={() => setAuthScreen('forgot')} onBack={() => setAuthScreen('landing')} />;
      case 'signup': return <SignupScreen onLogin={() => setAuthScreen('login')} onBack={() => setAuthScreen('landing')} />;
      case 'forgot': return <ForgotPasswordScreen onBack={() => setAuthScreen('login')} />;
      default: return null;
    }
  }

  const go = (s: AppScreen) => setAppScreen(s);
  const goHome = () => go({ name: 'home' });
  const tabChange = (tab: string) => go({ name: tab as any });

  switch (appScreen.name) {
    case 'home': return <DashboardScreen onCoursePress={id => go({ name: 'courseDetail', courseId: id })} onTabChange={tabChange} onViewAllCourses={() => go({ name: 'allCourses' })} onWatchDemo={() => go({ name: 'freeDemo' })} onNotifications={() => go({ name: 'notifications' })} onCart={() => go({ name: 'cart' })} />;
    case 'allCourses': return <AllCoursesScreen onBack={goHome} onCoursePress={id => go({ name: 'courseDetail', courseId: id })} onWatchDemo={() => go({ name: 'freeDemo' })} />;
    case 'freeDemo': return <FreeDemoScreen onBack={goHome} onCoursePress={id => go({ name: 'courseDetail', courseId: id })} />;
    case 'study': return <StudyScreen onCoursePress={id => go({ name: 'courseDetail', courseId: id })} onTabChange={tabChange} />;
    case 'notes': return <MyNotesScreen onTabChange={tabChange} onCoursePress={id => go({ name: 'courseDetail', courseId: id })} />;
    case 'test': return <TestScreen onTabChange={tabChange} />;
    case 'doubt': return <DoubtScreen onTabChange={tabChange} onOpenChat={(mentorName, subject, ctx, doubtId) => go({ name: 'mentorChat', mentorName, subject, context: ctx, doubtId, backTo: { name: 'doubt' } })} />;
    case 'mentorChat': return <MentorChatScreen doubtId={appScreen.doubtId} mentorName={appScreen.mentorName} mentorSubject={appScreen.subject} doubtContext={appScreen.context} onBack={() => go(appScreen.backTo || { name: 'doubt' })} />;
    case 'profile': return <ProfileScreen onBack={goHome} onCoursePress={id => go({ name: 'courseDetail', courseId: id })} onTabChange={tabChange} />;
    case 'notifications': return <NotificationScreen onBack={goHome} />;
    case 'cart': return <CartScreen onBack={goHome} onCoursePress={id => go({ name: 'courseDetail', courseId: id })} />;
    case 'courseDetail': return <CourseDetailScreen courseId={appScreen.courseId} onBack={goHome} onStartLearning={(cId, chId, sId) => go({ name: 'learning', courseId: cId, chapterId: chId, stepId: sId })} onCart={() => go({ name: 'cart' })} />;
    case 'learning': return <LearningScreen courseId={appScreen.courseId} chapterId={appScreen.chapterId} stepId={appScreen.stepId} onBack={() => go({ name: 'courseDetail', courseId: appScreen.courseId })} onOpenDoubtChat={(mentorName, subject, ctx, doubtId) => go({ name: 'mentorChat', mentorName, subject, context: ctx, doubtId, backTo: appScreen })} />;
    default: return null;
  }
}
