import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

type RoleFilter = 'all' | Role;

// BLUE AND NAVY THEME
const NAVY = '#071D3D';
const NAVY_LIGHT = '#0A2C5A';
const BLUE = '#2E64B8';
const SKY_BLUE = '#78B6EC';
const PAGE_BACKGROUND = '#DCEBF8';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#B7D8F4';
const PAGE_TEXT = '#0B2545';
const PAGE_TEXT_MUTED = '#4A6B8A';
const BORDER = '#244873';

const FILTERS: { label: string; value: RoleFilter }[] = [
  { label: 'All users', value: 'all' },
  { label: 'Students', value: 'student' },
  { label: 'Teachers', value: 'teacher' },
  { label: 'Admins', value: 'admin' },
];

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);

    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return name.trim().slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

function getAvatarColor(value: string) {
  const colors = [
    '#2878E8',
    '#7856D9',
    '#2E9D65',
    '#E99A28',
    '#D94D8C',
    '#4F779F',
  ];

  const index = value
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return colors[index % colors.length];
}

function getRoleColors(role: Role) {
  switch (role) {
    case 'student':
      return { background: '#DDF5E7', text: '#24764A' };
    case 'teacher':
      return { background: '#DCEBFF', text: '#2458A6' };
    case 'admin':
      return { background: '#EEE5FF', text: '#7044B8' };
    default:
      return { background: '#E5EDF5', text: '#526579' };
  }
}

export default function AdminScreen() {
  const { user } = useAuth();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('all');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      if (!user?.id) {
        if (active) {
          setAllowed(false);
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await getProfile(user.id);

        if (!active) return;

        if (profile?.role !== 'admin') {
          setAllowed(false);
          setLoading(false);
          return;
        }

        setAllowed(true);

        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .order('email');

        if (!active) return;

        if (error) {
          console.error('Unable to load system users:', error.message);
          setUsers([]);
        } else {
          setUsers((data as UserRow[]) ?? []);
        }
      } catch (error) {
        if (active) {
          console.error('Unable to load admin screen:', error);
          setAllowed(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const counts = useMemo(
    () => ({
      total: users.length,
      students: users.filter((u) => u.role === 'student').length,
      staff: users.filter(
        (u) => u.role === 'teacher' || u.role === 'admin'
      ).length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        !query ||
        (u.full_name ?? '').toLowerCase().includes(query) ||
        (u.email ?? '').toLowerCase().includes(query);

      const matchesRole = selectedRole === 'all' || u.role === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [users, search, selectedRole]);

  const handleChangeRole = async (targetId: string, newRole: Role) => {
    setActionMessage(null);
    setMessageIsError(false);
    setSavingUserId(targetId);

    const { data, error } = await supabase.rpc('admin_set_role', {
      p_user_id: targetId,
      p_role: newRole,
    });

    console.log('RAW RPC data:', JSON.stringify(data));
    console.log('RAW RPC error:', JSON.stringify(error));

    setSavingUserId(null);

    if (error) {
      setMessageIsError(true);
      setActionMessage(error.message);
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, role: newRole } : u))
    );

    setEditingUserId(null);
    setActionMessage('Role updated successfully.');
  };


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={styles.loadingText}>Loading system users...</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.center}>
        <View style={styles.accessIcon}>
          <Text style={styles.accessIconText}>!</Text>
        </View>

        <Text style={styles.deniedTitle}>Access denied</Text>

        <Text style={styles.deniedMessage}>
          This area is for administrators only.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* NAVY HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brand}>
            <Text style={styles.brandText}>QR ATTENDANCE</Text>
            <View style={styles.brandLine} />
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>♙</Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>ADMINISTRATION</Text>
        <Text style={styles.heading}>System Users</Text>

        <Text style={styles.headerSubtitle}>Manage accounts and access</Text>

        <View style={styles.headerBottom}>
          <View style={styles.headerStatusDot} />
          <Text style={styles.headerStatus}>User directory</Text>

          <View style={styles.headerCount}>
            <Text style={styles.headerCountText}>
              {users.length} accounts
            </Text>
          </View>
        </View>

        <View style={styles.decorCircleLarge} />
        <View style={styles.decorCircleSmall} />
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.contentPanel}>
        {/* STATISTICS */}
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.sectionSubtitle}>Account distribution</Text>
          </View>

          <View style={styles.overviewIcon}>
            <Text style={styles.overviewIconText}>▥</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.statIconBlueBg]}>
              <Text style={styles.statIconBlue}>♙</Text>
            </View>
            <Text style={styles.statNumber}>{counts.total}</Text>
            <Text style={styles.statLabel}>Total users</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.statIconGreenBg]}>
              <Text style={styles.statIconGreen}>✓</Text>
            </View>
            <Text style={styles.statNumber}>{counts.students}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.statIconPurpleBg]}>
              <Text style={styles.statIconPurple}>◆</Text>
            </View>
            <Text style={styles.statNumber}>{counts.staff}</Text>
            <Text style={styles.statLabel}>Staff</Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.directoryHeading}>
          <View>
            <Text style={styles.sectionTitle}>Account directory</Text>
            <Text style={styles.sectionSubtitle}>
              Find and review registered users
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or email..."
            placeholderTextColor="#829DBA"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search users by name or email"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ROLE FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active = selectedRole === filter.value;

            const count =
              filter.value === 'all'
                ? users.length
                : users.filter((u) => u.role === filter.value).length;

            return (
              <TouchableOpacity
                key={filter.value}
                onPress={() => setSelectedRole(filter.value)}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>

                <Text
                  style={[
                    styles.filterCount,
                    active && styles.filterCountActive,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {actionMessage && (
          <View
            style={[
              styles.messageBox,
              messageIsError && styles.messageBoxError,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                messageIsError && styles.messageTextError,
              ]}
            >
              {actionMessage}
            </Text>
          </View>
        )}

        {/* USER LIST */}
        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>
            {selectedRole === 'all'
              ? 'All accounts'
              : FILTERS.find((f) => f.value === selectedRole)?.label}
          </Text>

          <Text style={styles.resultCount}>
            {filteredUsers.length}{' '}
            {filteredUsers.length === 1 ? 'user' : 'users'}
          </Text>
        </View>

        {filteredUsers.map((u) => {
          const roleColors = getRoleColors(u.role);
          const isSelf = u.id === user?.id;

          return (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userRowTop}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(u.id) },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {getInitials(u.full_name, u.email ?? '')}
                  </Text>
                </View>

                <View style={styles.userDetails}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {u.full_name?.trim() || 'Unnamed user'}
                  </Text>

                  <Text style={styles.userEmail} numberOfLines={2}>
                    {u.email}
                  </Text>

                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: roleColors.background },
                    ]}
                  >
                    <Text
                      style={[styles.roleText, { color: roleColors.text }]}
                    >
                      {String(u.role).toUpperCase()}
                      {isSelf ? ' (YOU)' : ''}
                    </Text>
                  </View>
                </View>

                {isSelf ? (
                  <View style={[styles.userIndicator, styles.userIndicatorOff]}>
                    <Text style={styles.userIndicatorOffText}>—</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() =>
                      setEditingUserId(editingUserId === u.id ? null : u.id)
                    }
                    style={styles.userIndicator}
                    accessibilityRole="button"
                    accessibilityLabel={`Change role for ${u.email}`}
                    accessibilityState={{ expanded: editingUserId === u.id }}
                  >
                    <Text style={styles.userIndicatorText}>
                      {editingUserId === u.id ? '×' : '›'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {editingUserId === u.id && (
                <View style={styles.rolePickerWrap}>
                  {savingUserId === u.id ? (
                    <ActivityIndicator size="small" color={SKY_BLUE} />
                  ) : (
                    <>
                      <Text style={styles.rolePickerLabel}>
                        Set role for {u.email}
                      </Text>

                      <View style={styles.rolePickerRow}>
                        {(['student', 'teacher', 'admin'] as Role[]).map(
                          (r) => (
                            <TouchableOpacity
                              key={r}
                              onPress={() => handleChangeRole(u.id, r)}
                              style={[
                                styles.roleOption,
                                u.role === r && styles.roleOptionActive,
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: u.role === r }}
                            >
                              <Text
                                style={[
                                  styles.roleOptionText,
                                  u.role === r &&
                                    styles.roleOptionTextActive,
                                ]}
                              >
                                {r === 'student'
                                  ? 'Student'
                                  : r === 'teacher'
                                    ? 'Teacher'
                                    : 'Admin'}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>⌕</Text>
            </View>

            <Text style={styles.emptyTitle}>No users found</Text>

            <Text style={styles.emptyMessage}>
              Try another search or choose a different role filter.
            </Text>

            {(search.length > 0 || selectedRole !== 'all') && (
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setSelectedRole('all');
                }}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.footerText}>
          QR ATTENDANCE  •  USER MANAGEMENT
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  center: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: PAGE_TEXT_MUTED,
    fontSize: 14,
  },

  deniedTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: PAGE_TEXT,
    marginBottom: 8,
  },

  deniedMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: PAGE_TEXT_MUTED,
    textAlign: 'center',
  },

  accessIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#FCE8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  accessIconText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#C62828',
  },

  /* HEADER */

  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 27,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  brandText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: TEXT_PRIMARY,
  },

  brandLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: SKY_BLUE,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: NAVY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    fontSize: 20,
    color: SKY_BLUE,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: SKY_BLUE,
    marginBottom: 8,
  },

  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.6,
  },

  headerSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 7,
  },

  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },

  headerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },

  headerStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },

  headerCount: {
    marginLeft: 'auto',
    borderRadius: 999,
    backgroundColor: NAVY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  headerCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: SKY_BLUE,
  },

  decorCircleLarge: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(120, 182, 236, 0.09)',
  },

  decorCircleSmall: {
    position: 'absolute',
    right: 40,
    top: 70,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(120, 182, 236, 0.07)',
  },

  /* CONTENT */

  contentPanel: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: PAGE_TEXT,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: PAGE_TEXT_MUTED,
    marginTop: 3,
  },

  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overviewIconText: {
    fontSize: 17,
    color: SKY_BLUE,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
  },

  statCard: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  statIconBlueBg: { backgroundColor: 'rgba(120, 182, 236, 0.18)' },
  statIconGreenBg: { backgroundColor: 'rgba(74, 222, 128, 0.16)' },
  statIconPurpleBg: { backgroundColor: 'rgba(167, 139, 250, 0.18)' },

  statIconBlue: { fontSize: 17, color: SKY_BLUE },
  statIconGreen: { fontSize: 17, color: '#4ADE80' },
  statIconPurple: { fontSize: 17, color: '#A78BFA' },

  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },

  statLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 3,
    textAlign: 'center',
  },

  directoryHeading: {
    marginBottom: 12,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 50,
    marginBottom: 14,
  },

  searchIcon: {
    fontSize: 20,
    color: PAGE_TEXT_MUTED,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: PAGE_TEXT,
    paddingVertical: 10,
  },

  clearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCEBF8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: PAGE_TEXT_MUTED,
    lineHeight: 20,
  },

  filterRow: {
    gap: 8,
    paddingBottom: 4,
    paddingRight: 8,
    marginBottom: 14,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C3D8EA',
  },

  filterChipActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },

  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: PAGE_TEXT_MUTED,
  },

  filterTextActive: {
    color: TEXT_PRIMARY,
    fontWeight: '800',
  },

  filterCount: {
    fontSize: 11,
    fontWeight: '700',
    color: PAGE_TEXT_MUTED,
  },

  filterCountActive: {
    color: SKY_BLUE,
  },

  messageBox: {
    backgroundColor: '#E6F4EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#B7E0C4',
  },

  messageBoxError: {
    backgroundColor: '#FCE8E8',
    borderColor: '#E7B9B3',
  },

  messageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#24764A',
    textAlign: 'center',
  },

  messageTextError: {
    color: '#9F2822',
  },

  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  listTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PAGE_TEXT,
  },

  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: PAGE_TEXT_MUTED,
  },

  userCard: {
    backgroundColor: NAVY_LIGHT,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  userRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  userDetails: {
    flex: 1,
    marginLeft: 13,
  },

  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },

  userEmail: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 3,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },

  roleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  userIndicator: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  userIndicatorText: {
    fontSize: 21,
    fontWeight: '700',
    color: SKY_BLUE,
    lineHeight: 25,
  },

  userIndicatorOff: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
  },

  userIndicatorOffText: {
    fontSize: 17,
    fontWeight: '700',
    color: BORDER,
  },

  rolePickerWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  rolePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 10,
  },

  rolePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: NAVY,
  },

  roleOptionActive: {
    backgroundColor: SKY_BLUE,
    borderColor: SKY_BLUE,
  },

  roleOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },

  roleOptionTextActive: {
    color: NAVY,
    fontWeight: '800',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyIconText: {
    fontSize: 24,
    color: SKY_BLUE,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PAGE_TEXT,
    marginBottom: 6,
  },

  emptyMessage: {
    fontSize: 13,
    color: PAGE_TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },

  resetButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: PAGE_TEXT_MUTED,
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 1,
  },
});
