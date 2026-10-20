import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] =
    useState<Awaited<ReturnType<typeof getProfile>>>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const p = await getProfile(user.id);
      setProfile(p);
      setDraftName(p?.full_name ?? '');
    } catch {
      Alert.alert('Error', 'Unable to load your profile.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: trimmedName,
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((prev) =>
        prev ? { ...prev, full_name: trimmedName } : prev
      );
      setDraftName(trimmedName);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Unable to update your name.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Failed to sign out.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyID = async () => {
    if (!user?.id) return;

    try {
      await Clipboard.setStringAsync(user.id);
      Alert.alert('Copied!', 'Your User ID has been copied.');
    } catch {
      Alert.alert('Error', 'Unable to copy your User ID.');
    }
  };

  const roleLabel =
    profile?.role === 'teacher'
      ? 'Teacher'
      : profile?.role === 'admin'
        ? 'Administrator'
        : 'Student';

  const roleIcon =
    profile?.role === 'admin'
      ? 'shield-checkmark'
      : profile?.role === 'teacher'
        ? 'school'
        : 'person';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PAGE HEADER */}
        <View style={styles.pageHeader}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>
            Manage your account and preferences.
          </Text>
          <View style={styles.titleAccent} />
        </View>

        {user ? (
          <>
            {/* PROFILE BANNER */}
            <LinearGradient
              colors={['#0A2C5A', '#174D91', '#2E64B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileBanner}
            >
              <View style={styles.avatar}>
                <Ionicons
                  name="person"
                  size={46}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.bannerInfo}>
                <Text style={styles.profileName} numberOfLines={2}>
                  {profile?.full_name || 'Your Profile'}
                </Text>

                <Text style={styles.roleText}>
                  {roleLabel}
                </Text>

                <View style={styles.roleBadge}>
                  <Ionicons
                    name={roleIcon as any}
                    size={15}
                    color="#FFFFFF"
                  />
                  <Text style={styles.roleBadgeText}>
                    {roleLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.bannerDecoration} />
            </LinearGradient>

            {/* ACCOUNT DETAILS */}
            <View style={styles.infoCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.sectionHeadingText}>
                  <Text style={styles.sectionTitle}>
                    Account Details
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Your personal information
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* NAME */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="person-outline"
                    size={23}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.label}>Full name</Text>

                  {editing ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.nameInput}
                        value={draftName}
                        onChangeText={setDraftName}
                        placeholder="Enter your full name"
                        placeholderTextColor={COLORS.textSecondary}
                        editable={!saving}
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={handleSaveName}
                      />

                      <View style={styles.editActions}>
                        <Pressable
                          onPress={() => {
                            setDraftName(profile?.full_name ?? '');
                            setEditing(false);
                          }}
                          style={styles.cancelButton}
                          disabled={saving}
                        >
                          <Text style={styles.cancelText}>
                            Cancel
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={handleSaveName}
                          style={styles.saveButton}
                          disabled={saving}
                        >
                          {saving ? (
                            <ActivityIndicator
                              size="small"
                              color="#FFFFFF"
                            />
                          ) : (
                            <Text style={styles.saveText}>
                              Save
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.value}>
                      {profile?.full_name || 'Add your name'}
                    </Text>
                  )}
                </View>

                {!editing && (
                  <Pressable
                    onPress={() => setEditing(true)}
                    style={styles.editButton}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit name"
                  >
                    <Ionicons
                      name="create-outline"
                      size={19}
                      color={COLORS.primary}
                    />
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.divider} />

              {/* EMAIL */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={23}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.label}>Email address</Text>
                  <Text style={styles.value}>
                    {user.email || 'No email available'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* USER ID */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={23}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.detailContent}>
                  <Text style={styles.label}>User ID</Text>
                  <Text style={styles.userId}>
                    {user.id}
                  </Text>
                </View>

                <Pressable
                  onPress={handleCopyID}
                  style={styles.copyButton}
                  accessibilityRole="button"
                  accessibilityLabel="Copy User ID"
                  hitSlop={8}
                >
                  <Ionicons
                    name="copy-outline"
                    size={21}
                    color={COLORS.primary}
                  />
                </Pressable>
              </View>
            </View>

            {/* ACCOUNT SETTINGS */}
            <Pressable
              style={({ pressed }) => [
                styles.settingsCard,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                Alert.alert(
                  'Account Settings',
                  'Additional account settings can be added here.'
                )
              }
              accessibilityRole="button"
            >
              <View style={styles.settingsIcon}>
                <Ionicons
                  name="settings-outline"
                  size={27}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.settingsInfo}>
                <Text style={styles.settingsTitle}>
                  Account Settings
                </Text>
                <Text style={styles.settingsSubtitle}>
                  Security and preferences
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={23}
                color={COLORS.primary}
              />
            </Pressable>

            {/* SIGN OUT */}
            <Pressable
              onPress={handleSignOut}
              disabled={loading}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.pressed,
                loading && styles.disabledButton,
              ]}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator
                  color={COLORS.primary}
                  size="small"
                />
              ) : (
                <>
                  <Ionicons
                    name="log-out-outline"
                    size={25}
                    color={COLORS.primary}
                  />
                  <Text style={styles.signOutText}>
                    Sign Out
                  </Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />
            <Text style={styles.loadingText}>
              Loading your profile...
            </Text>
          </View>
        )}

        <Text style={styles.footerText}>
          QRAttendance
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },

  pageHeader: {
    marginBottom: 24,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
    lineHeight: 21,
  },

  titleAccent: {
    width: 52,
    height: 4,
    borderRadius: 5,
    backgroundColor: '#2E64B8',
    marginTop: 13,
  },

  profileBanner: {
    minHeight: 160,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0A2C5A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerInfo: {
    flex: 1,
    marginLeft: 15,
    zIndex: 1,
  },

  profileName: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },

  roleText: {
    color: '#DCEBFF',
    fontSize: 14,
    marginTop: 4,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
  },

  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  bannerDecoration: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    right: -55,
    top: -60,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5F0FC',
    paddingHorizontal: 17,
    paddingVertical: 17,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#0A2C5A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E5F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeadingText: {
    flex: 1,
    marginLeft: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5EFFA',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 12,
  },

  detailIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#E7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailContent: {
    flex: 1,
    minWidth: 0,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 5,
  },

  value: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  userId: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingLeft: 4,
  },

  editText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#E7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  editContainer: {
    gap: 8,
  },

  nameInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: COLORS.textPrimary,
    fontSize: 14,
  },

  editActions: {
    flexDirection: 'row',
    gap: 8,
  },

  cancelButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 17,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5F0FC',
    elevation: 2,
    shadowColor: '#0A2C5A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
  },

  settingsIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: '#E5F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsInfo: {
    flex: 1,
    marginLeft: 13,
  },

  settingsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  settingsSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  signOutButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: '#2E8BFA',
    borderRadius: 17,
    marginBottom: 12,
  },

  signOutText: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.75,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loadingCard: {
    minHeight: 180,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  footerText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 10,
    marginBottom: 8,
  },
});
