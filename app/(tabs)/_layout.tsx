import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function TabLayout() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setRole(null);
      return;
    }

    getProfile(user.id)
      .then((profile) => {
        if (active) {
          setRole(profile?.role ?? null);
        }
      })
      .catch((error) => {
        console.error('Failed to load user role:', error);

        if (active) {
          setRole(null);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const isTeacher = role === 'teacher' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,

        // Floating, glass-like bottom navigation
        tabBarStyle: {
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 8,

          height: 68,
          paddingTop: 6,
          paddingBottom: 6,

          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 18,

          elevation: 8,
          shadowColor: '#000000',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: {
            width: 0,
            height: 4,
          },
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },

        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home-sharp' : 'home-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* SCAN */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* HISTORY */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* TEACHER — visible only to teachers and admins */}
      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          href: isTeacher ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* ADMIN — visible only to admins */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield' : 'shield-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* GALLERY — accessible from the app, but hidden from bottom tabs */}
      <Tabs.Screen
        name="gallery"
        options={{
          href: null,
        }}
      />

      {/* CALENDAR — hidden from bottom tabs */}
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
