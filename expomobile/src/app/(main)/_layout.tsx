import React from 'react';
import { Tabs } from 'expo-router';
import { MapIcon, TeamIcon, ChatIcon, DownloadIcon, BellIcon, GearIcon } from '../../src/components/CustomIcons';
import { useLanguageStore } from '../../src/i18n';

export default function MainLayout() {
  const t = useLanguageStore((s) => s.t);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#F4F5F7',
          borderTopColor: '#E4E4E7',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarActiveTintColor: '#18181B',
        tabBarInactiveTintColor: '#71717A',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700'
        }
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: t('map'),
          tabBarIcon: ({ color }) => <MapIcon color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: t('team'),
          tabBarIcon: ({ color }) => <TeamIcon color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('chat'),
          tabBarIcon: ({ color }) => <ChatIcon color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="offline-maps"
        options={{
          title: t('offline_maps'),
          tabBarIcon: ({ color }) => <DownloadIcon color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications'),
          tabBarIcon: ({ color }) => <BellIcon color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <GearIcon color={color} size={22} />
        }}
      />
    </Tabs>
  );
}
