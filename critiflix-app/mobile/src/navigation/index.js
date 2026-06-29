import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

// Auth
import SignIn from '../screens/auth/SignIn';
import RegisterStudio from '../screens/auth/RegisterStudio';
import Plans from '../screens/auth/Plans';
import OtpAuth from '../screens/auth/OtpAuth';
import ConfirmAccount from '../screens/auth/ConfirmAccount';
// Critic
import Browse from '../screens/critic/Browse';
import Notifications from '../screens/critic/Notifications';
import FilmDetail from '../screens/critic/FilmDetail';
import Review from '../screens/critic/Review';
import WatchPlayer from '../screens/critic/WatchPlayer';
import CreatorProfile from '../screens/critic/CreatorProfile';
import CriticProfile from '../screens/critic/CriticProfile';
import Points from '../screens/critic/Points';
import Redeem from '../screens/critic/Redeem';
import Referrals from '../screens/critic/Referrals';
import Profile from '../screens/critic/Profile';
// Creator
import Dashboard from '../screens/creator/Dashboard';
import Submit from '../screens/creator/Submit';
import Titles from '../screens/creator/Titles';
import EditTitle from '../screens/creator/EditTitle';
import Studio from '../screens/creator/Studio';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const noHeader = { headerShown: false };

/* ---- tab icons (stroke = active red / inactive mist) ---- */
const I = {
  browse: (c) => <Path d="M3 5h18v14H3zM3 10h18M9 5v5" stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />,
  points: (c) => <Path d="M4 7a2 2 0 002-2h12a2 2 0 002 2v3a2 2 0 000 4v3a2 2 0 00-2 2H6a2 2 0 00-2-2v-3a2 2 0 000-4zM12 8v8" stroke={c} strokeWidth="1.7" fill="none" strokeLinejoin="round" />,
  refer: (c) => <Path d="M16 8a3 3 0 10-2.8-4M8 13a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 2.7-5 6-5s6 2 6 5M16 14c2.5.3 4 2.2 4 4.5" stroke={c} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  me: (c) => <Path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  home: (c) => <Path d="M4 11l8-7 8 7M6 10v10h12V10" stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />,
  submit: (c) => <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />,
  titles: (c) => <Path d="M4 6h13v12H4zM7 3h13v12" stroke={c} strokeWidth="1.7" fill="none" strokeLinejoin="round" />,
  studio: (c) => <Path d="M12 9a3 3 0 100 6 3 3 0 000-6zM19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 00-1.7 1l-2.3-1-2 3.5L4.1 11a7 7 0 000 2l-2 1.5 2 3.5 2.3-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.3 1 2-3.5-2-1.5c.07-.33.1-.66.1-1z" stroke={c} strokeWidth="1.5" fill="none" strokeLinejoin="round" />,
};

function tabIcon(name) {
  return ({ focused }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={23} height={23} viewBox="0 0 24 24">{I[name](focused ? colors.red : colors.mist2)}</Svg>
    </View>
  );
}

function useTabBarOptions() {
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.red,
    tabBarInactiveTintColor: colors.mist2,
    tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.line, height: 62 + insets.bottom, paddingBottom: 8 + insets.bottom, paddingTop: 8 },
    tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
  };
}

/* ---- critic ---- */
function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="BrowseHome" component={Browse} />
      <Stack.Screen name="FilmDetail" component={FilmDetail} />
      <Stack.Screen name="Review" component={Review} />
      <Stack.Screen name="WatchPlayer" component={WatchPlayer} />
      <Stack.Screen name="CreatorProfile" component={CreatorProfile} />
      <Stack.Screen name="CriticProfile" component={CriticProfile} />
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
}
function PointsStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="PointsHome" component={Points} />
      <Stack.Screen name="Redeem" component={Redeem} />
    </Stack.Navigator>
  );
}
function CriticTabs() {
  const tabBarOptions = useTabBarOptions();
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen name="Browse" component={BrowseStack} options={{ tabBarIcon: tabIcon('browse') }} />
      <Tab.Screen name="Points" component={PointsStack} options={{ tabBarIcon: tabIcon('points') }} />
      <Tab.Screen name="Refer" component={Referrals} options={{ tabBarIcon: tabIcon('refer') }} />
      <Tab.Screen name="Me" component={Profile} options={{ tabBarIcon: tabIcon('me') }} />
    </Tab.Navigator>
  );
}

/* ---- creator ---- */
function TitlesStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="TitlesHome" component={Titles} />
      <Stack.Screen name="EditTitle" component={EditTitle} />
    </Stack.Navigator>
  );
}
function StudioStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="StudioHome" component={Studio} />
      <Stack.Screen name="Plans" component={Plans} />
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
}
function CreatorTabs() {
  const tabBarOptions = useTabBarOptions();
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen name="Home" component={Dashboard} options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Submit" component={Submit} options={{ tabBarIcon: tabIcon('submit') }} />
      <Tab.Screen name="Titles" component={TitlesStack} options={{ tabBarIcon: tabIcon('titles') }} />
      <Tab.Screen name="Studio" component={StudioStack} options={{ tabBarIcon: tabIcon('studio') }} />
    </Tab.Navigator>
  );
}

/* ---- auth ---- */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="OtpAuth" component={OtpAuth} />
      <Stack.Screen name="ConfirmAccount" component={ConfirmAccount} />
      <Stack.Screen name="RegisterStudio" component={RegisterStudio} />
      <Stack.Screen name="Plans" component={Plans} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, pendingOnboard } = useAuth();
  if (!user || pendingOnboard) return <AuthStack />;
  return user.role === 'creator' ? <CreatorTabs /> : <CriticTabs />;
}
