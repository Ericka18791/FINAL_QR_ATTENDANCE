import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getAttendanceHistory,
  getEventAttendees,
  type AttendanceRecord,
  type EventAttendee,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { getEventsByTeacher, type CloudEvent } from '@/lib/events';
import { getProfile, type Role } from '@/lib/profiles';

type TeacherEvent = CloudEvent & {
  attendees: EventAttendee[];
};

const BLUE = {
  background: '#B9DDF8',
  navy: '#0A2C5A',
  darkNavy: '#071D3D',
  mediumBlue: '#78B5E9',
  lightBlue: '#EAF5FF',
  paleBlue: '#D5EAFB',
  white: '#FFFFFF',
  text: '#102744',
  muted: '#5E7895',
  border: '#78B5E9',
  green: '#31C48D',
  orange: '#F5B74F',
  red: '#F07878',
};

export default function HistoryScreen() {
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const router = useRouter();

  const load = useCallback(async () => {
    if (!user) {
      setRole(null);
      setStudentRecords([]);
      setTeacherEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher' || currentRole === 'admin') {
        const events = await getEventsByTeacher(user.id);

        const withAttendees = await Promise.all(
          events.map(async (event) => ({
            ...event,
            attendees: await getEventAttendees(event.id),
          }))
        );

        setTeacherEvents(withAttendees);
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id);

        setStudentRecords(records);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isTeacher = role === 'teacher' || role === 'admin';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="time-outline"
            size={30}
            color={BLUE.white}
          />
        </View>

        <ActivityIndicator size="large" color={BLUE.navy} />

        <Text style={styles.loadingTitle}>
          Loading attendance
        </Text>

        <Text style={styles.loadingSubtitle}>
          Please wait while we retrieve your records.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandIcon}>
            <Ionicons
              name="calendar-outline"
              size={29}
              color={BLUE.white}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.brandName}>
              Attendance Records
            </Text>

            <Text style={styles.brandSubtitle}>
              {isTeacher
                ? 'Monitor your event participation'
                : 'Your attendance journey'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={load}
            accessibilityLabel="Refresh attendance records"
            activeOpacity={0.75}
          >
            <Ionicons
              name="refresh-outline"
              size={23}
              color={BLUE.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBottom}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={BLUE.mediumBlue}
          />

          <Text style={styles.headerFooter}>
            Small steps. Big goals.
          </Text>
        </View>
      </View>

      {isTeacher ? (
        <FlatList
          data={teacherEvents}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            teacherEvents.length === 0 && styles.emptyListContent,
          ]}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Your Events
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Attendance collected from your QR codes
                </Text>
              </View>

              <View style={styles.totalBadge}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={BLUE.navy}
                />

                <Text style={styles.totalBadgeText}>
                  {teacherEvents.reduce(
                    (total, event) => total + event.attendees.length,
                    0
                  )}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No events yet"
              description="Create an event from the Teacher tab to start tracking attendance."
              buttonText="Go to Teacher"
              onPress={() => router.navigate('/(tabs)/teacher')}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <View style={styles.eventCardHeader}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="calendar"
                    size={23}
                    color={BLUE.white}
                  />
                </View>

                <View style={styles.eventHeading}>
                  <Text style={styles.eventTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.eventCode}>
                    Event code: {item.event_code}
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Ionicons
                    name="people"
                    size={14}
                    color={BLUE.navy}
                  />

                  <Text style={styles.countBadgeText}>
                    {item.attendees.length}
                  </Text>
                </View>
              </View>

              {item.start_time && (
                <View style={styles.eventMetaRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={BLUE.mediumBlue}
                  />

                  <Text style={styles.eventMeta}>
                    Starts {formatDate(item.start_time)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.attendeeSection}>
                <View style={styles.attendeeHeader}>
                  <Text style={styles.attendeeHeading}>
                    Students
                  </Text>

                  <Text style={styles.attendeeCount}>
                    {item.attendees.length}{' '}
                    {item.attendees.length === 1
                      ? 'student'
                      : 'students'}
                  </Text>
                </View>

                {item.attendees.length === 0 ? (
                  <View style={styles.noAttendeesBox}>
                    <Ionicons
                      name="qr-code-outline"
                      size={22}
                      color={BLUE.mediumBlue}
                    />

                    <Text style={styles.noAttendees}>
                      No students have scanned this QR code yet.
                    </Text>
                  </View>
                ) : (
                  item.attendees.map((attendee) => (
                    <View
                      key={`${attendee.studentId}-${attendee.scannedAt}`}
                      style={styles.attendeeRow}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(attendee.fullName ?? attendee.email)
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.attendeeInfo}>
                        <Text style={styles.studentName}>
                          {attendee.fullName ?? attendee.email}
                        </Text>

                        <Text style={styles.scanTime}>
                          {formatDate(attendee.scannedAt)}
                        </Text>
                      </View>

                      <StatusBadge status={attendee.status} />
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            studentRecords.length === 0 && styles.emptyListContent,
          ]}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  My Attendance
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Review the events you attended
                </Text>
              </View>

              <View style={styles.totalBadge}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color={BLUE.navy}
                />

                <Text style={styles.totalBadgeText}>
                  {studentRecords.length}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No attendance records yet"
              description="Your attendance journey starts here. Join an event and scan its QR code to see your records."
              buttonText="Go to QR Scanner"
              onPress={() => router.navigate('/(tabs)/scan')}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={23}
                    color={BLUE.white}
                  />
                </View>

                <View style={styles.recordInfo}>
                  <Text style={styles.eventTitle}>
                    {item.eventTitle}
                  </Text>

                  <View style={styles.eventMetaRow}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={BLUE.mediumBlue}
                    />

                    <Text style={styles.eventMeta}>
                      {formatDate(item.scannedAt)}
                    </Text>
                  </View>
                </View>

                <StatusBadge status={item.status} />
              </View>

              <View style={styles.divider} />

              <View style={styles.recordFooter}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color={BLUE.mediumBlue}
                />

                <Text style={styles.recordFooterText}>
                  Attendance recorded successfully
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  buttonText: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIllustration}>
        <View style={styles.illustrationCircle}>
          <Ionicons
            name={icon}
            size={54}
            color={BLUE.navy}
          />
        </View>

        <View style={styles.illustrationCheck}>
          <Ionicons
            name="checkmark"
            size={19}
            color={BLUE.white}
          />
        </View>
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyDescription}>
        {description}
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons
          name="qr-code-outline"
          size={21}
          color={BLUE.white}
        />

        <Text style={styles.primaryButtonText}>
          {buttonText}
        </Text>

        <Ionicons
          name="arrow-forward"
          size={19}
          color={BLUE.white}
        />
      </TouchableOpacity>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() ?? 'present';

  const isPresent = normalized === 'present';
  const isLate = normalized === 'late';
  const isExcused = normalized === 'excused';

  const badgeStyle = isPresent
    ? styles.statusPresent
    : isLate
      ? styles.statusLate
      : isExcused
        ? styles.statusExcused
        : styles.statusDefault;

  const textStyle = isPresent
    ? styles.statusTextPresent
    : isLate
      ? styles.statusTextLate
      : isExcused
        ? styles.statusTextExcused
        : styles.statusTextDefault;

  return (
    <View style={[styles.statusBadge, badgeStyle]}>
      <View
        style={[
          styles.statusDot,
          isPresent && styles.dotPresent,
          isLate && styles.dotLate,
          isExcused && styles.dotExcused,
          !isPresent &&
            !isLate &&
            !isExcused &&
            styles.dotDefault,
        ]}
      />

      <Text style={[styles.statusBadgeText, textStyle]}>
        {normalized.toUpperCase()}
      </Text>
    </View>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLUE.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BLUE.background,
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: BLUE.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },

  loadingTitle: {
    color: BLUE.navy,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 15,
  },

  loadingSubtitle: {
    color: BLUE.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
  },

  header: {
    backgroundColor: BLUE.navy,
    paddingTop: 58,
    paddingHorizontal: 22,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE.mediumBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
  },

  brandName: {
    color: BLUE.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  brandSubtitle: {
    color: BLUE.paleBlue,
    fontSize: 12,
    marginTop: 5,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#244A78',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 23,
  },

  headerFooter: {
    color: BLUE.mediumBlue,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  listContent: {
    paddingHorizontal: 19,
    paddingTop: 24,
    paddingBottom: 115,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 19,
  },

  sectionTitle: {
    color: BLUE.navy,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    color: '#365D86',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  totalBadge: {
    minWidth: 49,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: BLUE.lightBlue,
    borderWidth: 1,
    borderColor: BLUE.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  totalBadgeText: {
    color: BLUE.navy,
    fontSize: 15,
    fontWeight: '800',
  },

  eventCard: {
    backgroundColor: BLUE.navy,
    borderRadius: 22,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#244A78',
    shadowColor: BLUE.darkNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 9,
    elevation: 4,
  },

  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  eventIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: BLUE.mediumBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventHeading: {
    flex: 1,
  },

  eventTitle: {
    color: BLUE.white,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },

  eventCode: {
    color: BLUE.paleBlue,
    fontSize: 11,
    marginTop: 4,
  },

  countBadge: {
    minWidth: 38,
    height: 34,
    borderRadius: 12,
    backgroundColor: BLUE.lightBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 7,
  },

  countBadgeText: {
    color: BLUE.navy,
    fontSize: 13,
    fontWeight: '800',
  },

  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },

  eventMeta: {
    flex: 1,
    color: BLUE.paleBlue,
    fontSize: 11,
    lineHeight: 17,
  },

  divider: {
    height: 1,
    backgroundColor: '#365D86',
    marginVertical: 16,
  },

  attendeeSection: {
    gap: 2,
  },

  attendeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  attendeeHeading: {
    color: BLUE.white,
    fontSize: 14,
    fontWeight: '800',
  },

  attendeeCount: {
    color: BLUE.mediumBlue,
    fontSize: 11,
    fontWeight: '600',
  },

  noAttendeesBox: {
    backgroundColor: '#163A66',
    borderRadius: 13,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 7,
  },

  noAttendees: {
    flex: 1,
    color: BLUE.paleBlue,
    fontSize: 12,
    lineHeight: 19,
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#244A78',
  },

  avatar: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: '#244A78',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: BLUE.white,
    fontSize: 14,
    fontWeight: '800',
  },

  attendeeInfo: {
    flex: 1,
  },

  studentName: {
    color: BLUE.white,
    fontSize: 12,
    fontWeight: '700',
  },

  scanTime: {
    color: BLUE.paleBlue,
    fontSize: 10,
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusPresent: {
    backgroundColor: '#D9F8EA',
  },

  statusLate: {
    backgroundColor: '#FFF0CE',
  },

  statusExcused: {
    backgroundColor: '#DDEBFA',
  },

  statusDefault: {
    backgroundColor: '#E8EDF4',
  },

  dotPresent: {
    backgroundColor: '#16885E',
  },

  dotLate: {
    backgroundColor: '#C97A2B',
  },

  dotExcused: {
    backgroundColor: '#5A7898',
  },

  dotDefault: {
    backgroundColor: '#64748B',
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  statusTextPresent: {
    color: '#176A4B',
  },

  statusTextLate: {
    color: '#995817',
  },

  statusTextExcused: {
    color: '#365D86',
  },

  statusTextDefault: {
    color: '#475569',
  },

  recordCard: {
    backgroundColor: BLUE.navy,
    borderRadius: 21,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#244A78',
    shadowColor: BLUE.darkNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  recordInfo: {
    flex: 1,
  },

  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  recordFooterText: {
    color: BLUE.paleBlue,
    fontSize: 11,
    flex: 1,
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: BLUE.lightBlue,
    paddingHorizontal: 22,
    paddingVertical: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BLUE.border,
    marginTop: 8,
  },

  emptyIllustration: {
    width: 112,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  illustrationCircle: {
    width: 92,
    height: 92,
    borderRadius: 30,
    backgroundColor: BLUE.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  illustrationCheck: {
    position: 'absolute',
    right: 1,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: BLUE.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: BLUE.lightBlue,
  },

  emptyTitle: {
    color: BLUE.navy,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 25,
  },

  emptyDescription: {
    color: '#365D86',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 290,
  },

  primaryButton: {
    backgroundColor: BLUE.navy,
    minHeight: 51,
    alignSelf: 'stretch',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 23,
    paddingHorizontal: 12,
  },

  primaryButtonText: {
    color: BLUE.white,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
});
