import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import { getOpenEvents, type CloudEvent } from '@/lib/events';

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = new Date();

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadEvents() {
        setLoading(true);

        try {
          const result = await getOpenEvents();

          if (active) {
            setEvents(result);
          }
        } catch (error) {
          console.error('Failed to load calendar events:', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadEvents();

      return () => {
        active = false;
      };
    }, [])
  );

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [year, month]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();

    return events
      .filter((event) => {
        if (!event.start_time) return false;

        return new Date(event.start_time).getTime() >= now.getTime();
      })
      .sort(
        (a, b) =>
          new Date(a.start_time!).getTime() -
          new Date(b.start_time!).getTime()
      )
      .slice(0, 5);
  }, [events]);

  const changeMonth = (amount: number) => {
    setCurrentDate(new Date(year, month + amount, 1));
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEventTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.textPrimary}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Calendar</Text>
            <Text style={styles.subtitle}>
              Your school event schedule
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>
        </View>

        {/* TODAY'S DATE */}
        <View style={styles.todayCard}>
          <View style={styles.todayIcon}>
            <Ionicons
              name="today-outline"
              size={24}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.todayTextContainer}>
            <Text style={styles.todayLabel}>TODAY</Text>
            <Text style={styles.todayDate}>
              {today.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.todayYear}>
              {today.getFullYear()}
            </Text>
          </View>
        </View>

        {/* MONTHLY CALENDAR */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Text style={styles.sectionTitle}>Monthly Calendar</Text>

            <View style={styles.monthControls}>
              <Pressable
                onPress={() => changeMonth(-1)}
                accessibilityLabel="Previous month"
                style={styles.monthButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={COLORS.textPrimary}
                />
              </Pressable>

              <Pressable
                onPress={() => changeMonth(1)}
                accessibilityLabel="Next month"
                style={styles.monthButton}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textPrimary}
                />
              </Pressable>
            </View>
          </View>

          <Text style={styles.monthTitle}>{monthName}</Text>

          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
              (day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekDay}>
                  {day}
                </Text>
              )
            )}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isToday =
                day !== null &&
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();

              return (
                <View key={index} style={styles.dayCell}>
                  {day !== null && (
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && styles.todayCircle,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.todayText,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>

        {/* UPCOMING EVENTS */}
        <View style={styles.eventsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Text style={styles.eventsSubtitle}>
              Your next school activities
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {upcomingEvents.length}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />
            <Text style={styles.emptyText}>
              Loading school events...
            </Text>
          </View>
        ) : upcomingEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={28}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No upcoming events</Text>
            <Text style={styles.emptyText}>
              Open school events with a future start time will appear
              here.
            </Text>
          </View>
        ) : (
          <View style={styles.eventList}>
            {upcomingEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventAccent} />

                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>
                    {event.title}
                  </Text>

                  <View style={styles.eventMeta}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.eventMetaText}>
                      {formatEventDate(event.start_time!)}
                    </Text>
                  </View>

                  <View style={styles.eventMeta}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.eventMetaText}>
                      {formatEventTime(event.start_time!)}
                    </Text>
                  </View>
                </View>

                <View style={styles.openBadge}>
                  <Text style={styles.openText}>Open</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footerText}>
          School events · QR Attendance
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 20,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    gap: 14,
  },
  todayIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTextContainer: {
    flex: 1,
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
  },
  todayDate: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  todayYear: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.textOnPrimary,
    opacity: 0.85,
  },
  calendarCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  monthControls: {
    flexDirection: 'row',
    gap: 8,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 18,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    width: `${100 / 7}%` as `${number}%`,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%` as `${number}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  todayText: {
    color: COLORS.textOnPrimary,
    fontWeight: '800',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eventsSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  eventList: {
    gap: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    gap: 12,
  },
  eventAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  eventDetails: {
    flex: 1,
    gap: 7,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  openBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
  },
  openText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
