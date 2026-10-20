import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { COLORS } from '@/constants/colors';
import {
  getAttendanceHistory,
  type AttendanceRecord,
} from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import {
  getOpenEvents,
  type CloudEvent,
} from '@/lib/events';


const NAVY = COLORS.primary;
const BLUE = '#77B5EC';
const PALE_BLUE = COLORS.surface;
const MUTED = COLORS.textSecondary;
const GREEN = COLORS.success;

const CAMPUS_BACKGROUND = require('@/assets/images/cctc-background.jpg');
const CAMPUS_LOGO = require('@/assets/images/icon.png');

function formatDate(value?: string | null) {
  if (!value) return 'Date to be announced';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date to be announced';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value?: string | null) {
  if (!value) return 'Time to be announced';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Time to be announced';
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';

  return 'Good evening';
}

function getStudentName(
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null
) {
  const metadata = user?.user_metadata;

  const possibleName =
    metadata?.full_name ??
    metadata?.fullName ??
    metadata?.name;

  if (
    typeof possibleName === 'string' &&
    possibleName.trim()
  ) {
    return possibleName.trim().split(' ')[0];
  }

  return user?.email?.split('@')[0] || 'Student';
}

function AttendanceRing({
  count,
}: {
  count: number;
}) {
  const size = 138;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Decorative progress only.
  // A real attendance percentage needs a database denominator.
  const progress = count > 0 ? 0.72 : 0.08;

  return (
    <View style={styles.ringWrap}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#DCEAF8"
          strokeWidth={stroke}
          fill="none"
        />

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={BLUE}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          fill="none"
        />
      </Svg>

      <View style={styles.ringCenter}>
        <Text style={styles.ringNumber}>{count}</Text>
        <Text style={styles.ringCaption}>Check-ins</Text>
        <Text style={styles.ringSmall}>recorded</Text>
      </View>
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {subtitle ? (
          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.textAction}
        >
          <Text style={styles.textActionLabel}>
            {action}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color={BLUE}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
  featured = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  featured?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        featured && styles.quickActionFeatured,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.quickIcon,
          featured && styles.quickIconFeatured,
        ]}
      >
        <Ionicons
          name={icon}
          size={featured ? 27 : 24}
          color={featured ? '#FFFFFF' : BLUE}
        />
      </View>

      <Text
        style={[
          styles.quickTitle,
          featured && styles.quickTitleFeatured,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.quickSubtitle,
          featured && styles.quickSubtitleFeatured,
        ]}
      >
        {subtitle}
      </Text>

      {featured ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#FFFFFF"
          style={styles.featuredArrow}
        />
      ) : null}
    </Pressable>
  );
}

export default function Index() {
  const { user } = useAuth();

  const scrollRef = useRef<ScrollView>(null);

  const [previewY, setPreviewY] = useState(0);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const studentName = getStudentName(user);

  // Calendar and Gallery are previews on this Home screen.
  // They do not create or navigate to new routes.
  const scrollToPreviews = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, previewY - 12),
      animated: true,
    });
  }, [previewY]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadHomeData() {
        setLoading(true);

        try {
          const [openEvents, history] = await Promise.all([
            getOpenEvents(),
            user?.id
              ? getAttendanceHistory(user.id)
              : Promise.resolve([] as AttendanceRecord[]),
          ]);

          if (!active) return;

          setEvents(openEvents);
          setRecords(history);
        } catch (error) {
          console.error('Unable to load Home data:', error);

          if (active) {
            setEvents([]);
            setRecords([]);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadHomeData();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  const recentRecords = useMemo(
    () => records.slice(0, 4),
    [records]
  );

  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const attendedDays = new Set(
      records.map((record) => {
        const date = new Date(record.scannedAt);

        return (
          date.getFullYear() === year &&
          date.getMonth() === month
        )
          ? date.getDate()
          : -1;
      })
    );

    const eventDays = new Set(
      events
        .filter((event) => event.start_time)
        .map((event) => {
          const date = new Date(
            event.start_time as string
          );

          return (
            date.getFullYear() === year &&
            date.getMonth() === month
          )
            ? date.getDate()
            : -1;
        })
    );

    return {
      monthLabel: now.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
      firstDay,
      daysInMonth,
      today: now.getDate(),
      attendedDays,
      eventDays,
    };
  }, [records, events]);

  const upcomingEvent = useMemo(() => {
    const now = Date.now();

    return [...events]
      .filter((event) => {
        if (!event.start_time) return true;

        return (
          new Date(event.start_time).getTime() >= now
        );
      })
      .sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;

        return (
          new Date(a.start_time).getTime() -
          new Date(b.start_time).getTime()
        );
      })[0];
  }, [events]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* CAMPUS HEADER */}
        <ImageBackground
          source={CAMPUS_BACKGROUND}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View
            pointerEvents="none"
            style={styles.heroTint}
          />

          <View style={styles.topBar}>
            <View style={styles.brand}>
              <View style={styles.logoFrame}>
                <Image
                  source={CAMPUS_LOGO}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.brandText}>
                <Text style={styles.brandTitle}>
                  CCTC QR Attend
                </Text>

                <Text style={styles.brandSubtitle}>
                  SCHOOL EVENT ATTENDANCE
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.profileButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>
              {getGreeting()}, {studentName}! 👋
            </Text>

            <Text style={styles.greetingSubtitle}>
              Your campus. Your presence. Your progress.
            </Text>
          </View>
        </ImageBackground>

        {/* PRESENCE PULSE */}
        <View style={styles.pulseCard}>
          <View style={styles.cardHeading}>
            <View style={styles.headingIcon}>
              <Ionicons
                name="pulse"
                size={20}
                color={BLUE}
              />
            </View>

            <Text style={styles.cardTitle}>
              Presence Pulse
            </Text>
          </View>

          <View style={styles.pulseContent}>
            <AttendanceRing count={records.length} />

            <View style={styles.pulseStats}>
              <View style={styles.statRow}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="calendar"
                    size={19}
                    color={BLUE}
                  />
                </View>

                <View style={styles.statText}>
                  <Text style={styles.statLabel}>
                    Recorded check-ins
                  </Text>

                  <Text style={styles.statValue}>
                    {records.length}
                  </Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="time-outline"
                    size={19}
                    color={BLUE}
                  />
                </View>

                <View style={styles.statText}>
                  <Text style={styles.statLabel}>
                    Open events
                  </Text>

                  <Text style={styles.statValue}>
                    {events.length}
                  </Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="trending-up"
                    size={19}
                    color={GREEN}
                  />
                </View>

                <View style={styles.statText}>
                  <Text style={styles.statLabel}>
                    Attendance overview
                  </Text>

                  <Text style={styles.statNote}>
                    Based on your saved records
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingLine}>
              <ActivityIndicator
                size="small"
                color={BLUE}
              />

              <Text style={styles.loadingText}>
                Updating your records…
              </Text>
            </View>
          ) : null}
        </View>

        {/* QUICK ACTIONS */}
        <SectionHeading
          title="Quick Actions"
          subtitle="Everything you need, in one place."
        />

        <View style={styles.quickGrid}>
          <QuickAction
            icon="qr-code-outline"
            title="Scan QR"
            subtitle="Check in to events"
            featured
            onPress={() => router.push('/scan')}
          />

         <QuickAction
         icon="calendar-outline"
         title="Calendar"
         subtitle="View schedule"
        onPress={() => router.push('/calendar' as any)}
          />

          <QuickAction
            icon="images-outline"
            title="Gallery"
            subtitle="Event memories"
             onPress={() => router.push('/gallery')}
            />

          <QuickAction
            icon="time-outline"
            title="History"
            subtitle="Past records"
            onPress={() => router.push('/history')}
          />
        </View>

        {/* UPCOMING EVENT */}
        <SectionHeading
          title="Upcoming Event"
          subtitle="Your next campus activity."
        />

        {loading ? (
          <View style={styles.eventCard}>
            <ActivityIndicator color={BLUE} />

            <Text style={styles.eventEmptyText}>
              Loading events…
            </Text>
          </View>
        ) : upcomingEvent ? (
          <View style={styles.eventCard}>
            <View style={styles.eventPhotoPlaceholder}>
              <Image
                source={CAMPUS_BACKGROUND}
                style={styles.eventPhoto}
                resizeMode="cover"
              />
            </View>

            <View style={styles.eventInfo}>
              <Text style={styles.eventEyebrow}>
                OPEN FOR ATTENDANCE
              </Text>

              <Text
                style={styles.eventTitle}
                numberOfLines={2}
              >
                {upcomingEvent.title}
              </Text>

              <View style={styles.eventMeta}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={BLUE}
                />

                <Text style={styles.eventMetaText}>
                  {formatDate(upcomingEvent.start_time)}
                </Text>
              </View>

              <View style={styles.eventMeta}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={BLUE}
                />

                <Text style={styles.eventMetaText}>
                  {formatTime(upcomingEvent.start_time)}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/scan')}
                style={({ pressed }) => [
                  styles.checkInButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.checkInButtonText}>
                  Scan to check in
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={28}
                color={BLUE}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No upcoming open events
            </Text>

            <Text style={styles.emptyDescription}>
              When a school event is opened for attendance,
              it will appear here.
            </Text>
          </View>
        )}

        {/* CALENDAR AND GALLERY PREVIEWS */}
        <View
          onLayout={(event) => {
            setPreviewY(event.nativeEvent.layout.y);
          }}
          style={styles.previewSection}
        >
          <View style={styles.twoColumnHeading}>
            <Text style={styles.sectionTitle}>
              Your Campus
            </Text>

            <Text style={styles.sectionSubtitle}>
              Keep track of activities and memories.
            </Text>
          </View>

          <View style={styles.previewGrid}>
            {/* MINI CALENDAR */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeading}>
                <Ionicons
                  name="calendar"
                  size={19}
                  color={BLUE}
                />

                <Text style={styles.previewTitle}>
                  My Calendar
                </Text>
              </View>

              <Text style={styles.monthLabel}>
                {calendarData.monthLabel}
              </Text>

              <View style={styles.weekHeader}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
                  (day, index) => (
                    <Text
                      key={`${day}-${index}`}
                      style={styles.weekDay}
                    >
                      {day}
                    </Text>
                  )
                )}
              </View>

              <View style={styles.calendarGrid}>
                {Array.from({
                  length: calendarData.firstDay,
                }).map((_, index) => (
                  <View
                    key={`blank-${index}`}
                    style={styles.calendarDayCell}
                  />
                ))}

                {Array.from({
                  length: calendarData.daysInMonth,
                }).map((_, index) => {
                  const day = index + 1;

                  const hasAttendance =
                    calendarData.attendedDays.has(day);

                  const hasEvent =
                    calendarData.eventDays.has(day);

                  const isToday =
                    calendarData.today === day;

                  return (
                    <View
                      key={day}
                      style={styles.calendarDayCell}
                    >
                      <View
                        style={[
                          styles.calendarDayCircle,
                          isToday && styles.calendarToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isToday &&
                              styles.calendarTodayText,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>

                      {hasAttendance || hasEvent ? (
                        <View
                          style={[
                            styles.calendarDot,
                            hasAttendance
                              ? styles.attendanceDot
                              : styles.eventDot,
                          ]}
                        />
                      ) : (
                        <View
                          style={styles.calendarDotSpacer}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={styles.calendarLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      styles.attendanceDot,
                    ]}
                  />

                  <Text style={styles.legendText}>
                    Attended
                  </Text>
                </View>

                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      styles.eventDot,
                    ]}
                  />

                  <Text style={styles.legendText}>
                    Event
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={scrollToPreviews}
                style={({ pressed }) => [
                  styles.previewButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.previewButtonText}>
                  View calendar
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={BLUE}
                />
              </Pressable>
            </View>

            {/* GALLERY PREVIEW */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeading}>
                <Ionicons
                  name="images"
                  size={19}
                  color={BLUE}
                />

                <Text style={styles.previewTitle}>
                  Event Gallery
                </Text>
              </View>

              <View style={styles.galleryEmptyVisual}>
                <Image
                  source={CAMPUS_BACKGROUND}
                  style={styles.galleryPlaceholderImage}
                  resizeMode="cover"
                />

                <View style={styles.galleryImageOverlay}>
                  <Ionicons
                    name="camera-outline"
                    size={26}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <Text style={styles.galleryEmptyTitle}>
                Your event memories
              </Text>

              <Text style={styles.galleryEmptyText}>
                Photos from school activities will be
                organized here.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/gallery' as any)}
                style={({ pressed }) => [
                  styles.previewButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.previewButtonText}>
                  View gallery
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={BLUE}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <SectionHeading
          title="Recent Activity"
          subtitle="Your latest attendance records."
          action="View all"
          onAction={() => router.push('/history')}
        />

        <View style={styles.activityCard}>
          {loading ? (
            <ActivityIndicator color={BLUE} />
          ) : recentRecords.length === 0 ? (
            <View style={styles.activityEmpty}>
              <Ionicons
                name="receipt-outline"
                size={28}
                color={BLUE}
              />

              <Text style={styles.activityEmptyTitle}>
                No attendance records yet
              </Text>

              <Text style={styles.activityEmptyText}>
                Your successful check-ins will appear here.
              </Text>
            </View>
          ) : (
            recentRecords.map((record, index) => {
              const isLate =
                (record.status || '').toLowerCase() === 'late';

              return (
                <View
                  key={record.id}
                  style={[
                    styles.activityRow,
                    index === recentRecords.length - 1 &&
                      styles.activityRowLast,
                  ]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      isLate
                        ? styles.activityIconLate
                        : styles.activityIconPresent,
                    ]}
                  >
                    <Ionicons
                      name={
                        isLate ? 'time-outline' : 'checkmark'
                      }
                      size={19}
                      color={isLate ? '#B96D00' : GREEN}
                    />
                  </View>

                  <View style={styles.activityInfo}>
                    <Text
                      style={styles.activityTitle}
                      numberOfLines={1}
                    >
                      {record.eventTitle}
                    </Text>

                    <Text style={styles.activityDate}>
                      {formatDate(record.scannedAt)} ·{' '}
                      {formatTime(record.scannedAt)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isLate
                        ? styles.statusLate
                        : styles.statusPresent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isLate
                          ? styles.statusTextLate
                          : styles.statusTextPresent,
                      ]}
                    >
                      {record.status || 'Present'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* MILESTONES */}
        <SectionHeading
          title="Your Milestones"
          subtitle="Every check-in is progress."
        />

        <View style={styles.milestoneCard}>
          <View style={styles.milestoneIcon}>
            <Ionicons
              name="trophy"
              size={29}
              color="#E9A52C"
            />
          </View>

          <View style={styles.milestoneInfo}>
            <Text style={styles.milestoneTitle}>
              {records.length === 0
                ? 'Your first check-in'
                : `${records.length} check-in${
                    records.length === 1 ? '' : 's'
                  } recorded`}
            </Text>

            <Text style={styles.milestoneSubtitle}>
              Keep participating in school events.
            </Text>
          </View>
        </View>

        {/* DIGITAL CAMPUS ID */}
        <View style={styles.campusIdCard}>
          <View style={styles.campusIdTop}>
            <View style={styles.campusIdTextBlock}>
              <Text style={styles.campusIdEyebrow}>
                DIGITAL CAMPUS ID
              </Text>

              <Text style={styles.campusIdName}>
                {studentName}
              </Text>

              <Text
                style={styles.campusIdEmail}
                numberOfLines={1}
              >
                {user?.email ?? 'Signed-in student'}
              </Text>

              <Text style={styles.campusIdCaption}>
                CCTC · SCHOOL EVENT ATTENDANCE
              </Text>
            </View>

            <View style={styles.campusIdLogoFrame}>
              <Image
                source={CAMPUS_LOGO}
                style={styles.campusIdLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.campusIdBottom}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color="#BDEAFF"
            />

            <Text style={styles.campusIdBottomText}>
              Your school. Your identity. Your future.
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Image
            source={CAMPUS_LOGO}
            style={styles.footerLogo}
            resizeMode="contain"
          />

          <Text style={styles.footerText}>
            CCTC QR ATTEND · SCAN. ATTEND. SUCCEED.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },

  

hero: {
  height: 210,
  borderRadius: 24,
  overflow: 'hidden',
  justifyContent: 'space-between',
  padding: 16,
  marginBottom: 16,
  backgroundColor: NAVY,
},

  heroImage: {
    borderRadius: 24,
  },

  heroTint: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(7, 29, 61, 0.58)',
},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logoFrame: {
    width: 51,
    height: 51,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  brandText: {
    flex: 1,
  },

  brandTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  brandSubtitle: {
    color: '#DCEBFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 4,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  greetingBlock: {
    marginTop: 29,
  },

  greeting: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },

  greetingSubtitle: {
    color: '#E3F0FF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  
pulseCard: {
  backgroundColor: COLORS.card,
  borderRadius: 23,
  padding: 16,
  marginBottom: 25,
  borderWidth: 1,
  borderColor: COLORS.border,
  shadowColor: COLORS.shadow,
  shadowOpacity: 0.07,
  shadowRadius: 13,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
},
cardHeading: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
  marginBottom: 12,
},


  headingIcon: {
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: PALE_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '900',
  },

  pulseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  ringWrap: {
    width: 138,
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringNumber: {
    color: NAVY,
    fontSize: 31,
    fontWeight: '900',
  },

  ringCaption: {
    color: NAVY,
    fontSize: 11,
    fontWeight: '800',
  },

  ringSmall: {
    color: MUTED,
    fontSize: 9,
    marginTop: 2,
  },

  pulseStats: {
    flex: 1,
    gap: 10,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: PALE_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statText: {
    flex: 1,
  },

  statLabel: {
    fontSize: 10,
    color: MUTED,
  },

  statValue: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 1,
  },

  statNote: {
    color: NAVY,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },

  loadingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
  },

  loadingText: {
    color: MUTED,
    fontSize: 11,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingVertical: 6,
  },

  textActionLabel: {
    color: BLUE,
    fontSize: 11,
    fontWeight: '700',
  },

 
quickGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  rowGap: 10,
  marginBottom: 26,
},




quickAction: {
  width: '48%',
  minHeight: 127,
  borderRadius: 20,
  padding: 14,
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: COLORS.border,
},



  quickActionFeatured: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },

  quickIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: PALE_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  quickIconFeatured: {
    backgroundColor: 'rgba(255,255,255,0.17)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },

  quickTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '900',
  },

  quickTitleFeatured: {
    color: '#FFFFFF',
  },

  quickSubtitle: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  quickSubtitleFeatured: {
    color: '#DCEBFF',
  },

  featuredArrow: {
    position: 'absolute',
    right: 12,
    top: 19,
  },

  eventCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E1EAF4',
  },

  eventPhotoPlaceholder: {
    width: 105,
    minHeight: 145,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: PALE_BLUE,
  },

  eventPhoto: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  eventInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  eventEyebrow: {
    color: BLUE,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  eventTitle: {
    color: NAVY,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    marginBottom: 8,
  },

  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },

  eventMetaText: {
    color: MUTED,
    fontSize: 10,
    flex: 1,
  },

  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: NAVY,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 11,
    marginTop: 5,
  },

  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  eventEmptyText: {
    color: MUTED,
    fontSize: 12,
    marginLeft: 10,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E1EAF4',
    padding: 22,
    alignItems: 'center',
    marginBottom: 25,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: PALE_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  emptyTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
  },

  previewSection: {
    marginBottom: 26,
  },

  twoColumnHeading: {
    marginBottom: 12,
  },

  previewGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },

  previewCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1EAF4',
    padding: 11,
  },

  previewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  previewTitle: {
    color: NAVY,
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },

  monthLabel: {
    color: NAVY,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
  },

  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },

  weekDay: {
    width: '14.28%',
    textAlign: 'center',
    color: MUTED,
    fontSize: 9,
    fontWeight: '700',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarDayCell: {
    width: '14.28%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarDayCircle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarToday: {
    backgroundColor: BLUE,
  },

  calendarDayText: {
    color: NAVY,
    fontSize: 9,
  },

  calendarTodayText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  calendarDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    bottom: 0,
  },

  calendarDotSpacer: {
    position: 'absolute',
    width: 4,
    height: 4,
    bottom: 0,
  },

  attendanceDot: {
    backgroundColor: GREEN,
  },

  eventDot: {
    backgroundColor: BLUE,
  },

  calendarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  legendText: {
    color: MUTED,
    fontSize: 8,
  },

  previewButton: {
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: PALE_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 5,
    marginTop: 'auto',
  },

  previewButtonText: {
    color: BLUE,
    fontSize: 9,
    fontWeight: '800',
  },

  galleryEmptyVisual: {
    height: 100,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: PALE_BLUE,
    marginBottom: 12,
  },

  galleryPlaceholderImage: {
    width: '100%',
    height: '100%',
  },

  galleryImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,39,82,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  galleryEmptyTitle: {
    color: NAVY,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
  },

  galleryEmptyText: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 12,
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E1EAF4',
    marginBottom: 26,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F8',
  },

  activityRowLast: {
    borderBottomWidth: 0,
  },

  activityIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityIconPresent: {
    backgroundColor: '#D9F5EC',
  },

  activityIconLate: {
    backgroundColor: '#FFF0D8',
  },

  activityInfo: {
    flex: 1,
  },

  activityTitle: {
    color: NAVY,
    fontSize: 11,
    fontWeight: '800',
  },

  activityDate: {
    color: MUTED,
    fontSize: 9,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusPresent: {
    backgroundColor: '#D9F5EC',
  },

  statusLate: {
    backgroundColor: '#FFF0D8',
  },

  statusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  statusTextPresent: {
    color: '#08775C',
  },

  statusTextLate: {
    color: '#A65E00',
  },

  activityEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  activityEmptyTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 9,
  },

  activityEmptyText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },

  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAF4',
    marginBottom: 25,
  },

  milestoneIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: '#FFF4D9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  milestoneInfo: {
    flex: 1,
  },

  milestoneTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
  },

  milestoneSubtitle: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  campusIdCard: {
    overflow: 'hidden',
    borderRadius: 21,
    padding: 16,
    backgroundColor: NAVY,
    marginBottom: 22,
  },

  campusIdTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  campusIdTextBlock: {
    flex: 1,
  },

  campusIdEyebrow: {
    color: '#BDEAFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 9,
  },

  campusIdName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  campusIdEmail: {
    color: '#DCEBFF',
    fontSize: 10,
    marginTop: 5,
  },

  campusIdCaption: {
    color: '#BDEAFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 10,
  },

  campusIdLogoFrame: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  campusIdLogo: {
    width: '100%',
    height: '100%',
  },

  campusIdBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 15,
    paddingTop: 12,
  },

  campusIdBottomText: {
    color: '#DCEBFF',
    fontSize: 10,
  },

  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
  },

  footerLogo: {
    width: 25,
    height: 25,
  },

  footerText: {
    color: MUTED,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.78,
  },
});