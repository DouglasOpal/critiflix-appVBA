import React, { useCallback, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { api } from '../api';

// Bell button with an unread badge. Navigates to the Notifications screen.
export default function NotificationBell({ color = '#fff' }) {
  const navigation = useNavigation();
  const [unread, setUnread] = useState(0);

  useFocusEffect(useCallback(() => {
    let alive = true;
    api.notificationsUnread().then((r) => alive && setUnread(r.unread || 0)).catch(() => {});
    return () => { alive = false; };
  }, []));

  return (
    <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={10} style={{ padding: 4 }}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {unread > 0 ? (
        <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#E50914', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
