import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { getEventAttendees, type EventAttendee } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import {
  closeEvent,
  createEvent,
  getEventsByTeacher,
  reopenEvent,
  updateEvent,
  type CloudEvent,
} from '@/lib/events';
import { getProfile, type Role } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  const month = date.toLocaleString('en-US', { month: 'short' });

  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');

  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  const [cloudEvents, setCloudEvents] = useState<CloudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Record<string, EventAttendee[]>>(
    {}
  );
  const [attendeesLoading, setAttendeesLoading] = useState<string | null>(null);

  // EDIT MODE
  const [editingEvent, setEditingEvent] = useState<CloudEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStart, setEditStart] = useState(() => new Date());
  const [editEnd, setEditEnd] = useState(() => new Date());
  const [editTarget2, setEditTarget2] = useState<EditTarget | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const isAndroid = Platform.OS === 'android';
    const canManage = role === 'teacher';


  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRoleLoading(false);
        return () => {
          active = false;
        };
      }

      (async () => {
        const profile = await getProfile(user.id);
        if (!active) return;

        setRole(profile?.role ?? 'student');
        setRoleLoading(false);

        const r = profile?.role;
        if (r !== 'teacher' && r !== 'admin') return;

        setEventsLoading(true);
        const list = await getEventsByTeacher(user.id);
        if (!active) return;

        setCloudEvents(list);
        setEventsLoading(false);
      })();

      return () => {
        active = false;
      };
    }, [user])
  );

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const onEditPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget2) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget2(null);
      return;
    }

    const current = editTarget2 === 'start' ? editStart : editEnd;
    const next = new Date(current);

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget2 === 'start') {
      setEditStart(next);
    } else {
      setEditEnd(next);
    }

    setEditTarget2(null);
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const reloadEvents = async () => {
    if (!user?.id) return;
    const list = await getEventsByTeacher(user.id);
    setCloudEvents(list);
  };

  const handleCreateEvent = async () => {
    const trimmedTitle = title.trim();
    const trimmedCode = eventId.trim();

    if (!trimmedTitle || !trimmedCode) {
      setMessageIsError(true);
      setMessage('Event title and code are required.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessageIsError(true);
      setMessage('End time must be after start time.');
      return;
    }

    const event = {
      eventId: trimmedCode,
      title: trimmedTitle,
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    const { error } = await createEvent(event);

    if (error) {
      setMessageIsError(true);
      setMessage('Could not save the event. Please try again.');
      return;
    }

    setMessageIsError(false);
    setMessage('Event saved! Scan the QR with the Scan tab to test it.');
    setPayload(buildQRPayload(event));

    setTitle('');
    setEventId('');
    setVenue('');
    setDescription('');

    await reloadEvents();
  };

  const handleToggleStatus = async (ev: CloudEvent) => {
    setMessage(null);

    const { error } =
      ev.status === 'open' ? await closeEvent(ev.id) : await reopenEvent(ev.id);

    if (error) {
      setMessageIsError(true);
      setMessage('Could not update the event. Please try again.');
      return;
    }

    setMessageIsError(false);
    setMessage(
      ev.status === 'open'
        ? `"${ev.title}" is now closed. Students can no longer scan in.`
        : `"${ev.title}" is open again.`
    );

    await reloadEvents();
  };

  const handleViewAttendees = async (ev: CloudEvent) => {
    if (openEventId === ev.id) {
      setOpenEventId(null);
      return;
    }

    setOpenEventId(ev.id);

    if (attendees[ev.id]) return;

    setAttendeesLoading(ev.id);
    const rows = await getEventAttendees(ev.id);
    setAttendees((prev) => ({ ...prev, [ev.id]: rows }));
    setAttendeesLoading(null);
  };

  const startEditing = (ev: CloudEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditCode(ev.event_code);
    setEditVenue(ev.venue ?? '');
    setEditDescription(ev.description ?? '');
    setEditStart(ev.start_time ? new Date(ev.start_time) : new Date());
    setEditEnd(
      ev.end_time
        ? new Date(ev.end_time)
        : new Date(Date.now() + 60 * 60 * 1000)
    );
    setEditTarget2(null);
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingEvent(null);
    setEditTarget2(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;

    const trimmedTitle = editTitle.trim();
    const trimmedCode = editCode.trim();

    if (!trimmedTitle || !trimmedCode) {
      setMessageIsError(true);
      setMessage('Event title and code are required.');
      return;
    }

    if (editEnd.getTime() <= editStart.getTime()) {
      setMessageIsError(true);
      setMessage('End time must be after start time.');
      return;
    }

    setEditSaving(true);

    const { error } = await updateEvent({
      eventId: editingEvent.id,
      title: trimmedTitle,
      eventCode: trimmedCode,
      start: editStart.toISOString(),
      end: editEnd.toISOString(),
      venue: editVenue.trim() || null,
      description: editDescription.trim() || null,
    });

    setEditSaving(false);

    if (error) {
      setMessageIsError(true);
      setMessage(error);
      return;
    }

    setMessageIsError(false);
    setMessage(`"${trimmedTitle}" was updated.`);
    setEditingEvent(null);

    await reloadEvents();
  };

  if (roleLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Checking your account...</Text>
        </View>
      </View>
    );
  }

  if (!canManage) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.lockContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color={COLORS.textSecondary}
            />

            <Text style={styles.title}>Teachers Only</Text>

            <Text style={styles.subtitle}>
              Only teacher accounts can manage events.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        {editingEvent ? 'Edit Event' : 'Create Event QR'}
      </Text>

      <Text style={styles.subtitle}>
        {editingEvent
          ? 'Change the details below, then save.'
          : 'Fill in the event details, then scan the generated QR with the Scan tab.'}
      </Text>

      <Text style={styles.label}>Event Title</Text>

      <TextInput
        style={styles.input}
        value={editingEvent ? editTitle : title}
        onChangeText={editingEvent ? setEditTitle : setTitle}
        placeholder="e.g. Founders Day Assembly"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Event Code</Text>

      <TextInput
        style={styles.input}
        value={editingEvent ? editCode : eventId}
        onChangeText={editingEvent ? setEditCode : setEventId}
        placeholder="e.g. EVT-2026-0002"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Venue</Text>

      <TextInput
        style={styles.input}
        value={editingEvent ? editVenue : venue}
        onChangeText={editingEvent ? setEditVenue : setVenue}
        placeholder="e.g. Gymnasium"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Description</Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        value={editingEvent ? editDescription : description}
        onChangeText={editingEvent ? setEditDescription : setDescription}
        placeholder="Short description of the event"
        placeholderTextColor={COLORS.textSecondary}
        multiline
      />

      <Text style={styles.label}>Starts</Text>

      <PickerField
        value={formatDateTime(editingEvent ? editStart : startDate)}
        icon="sunny-outline"
        onPress={() => {
          if (editingEvent) {
            setEditTarget2('start');
          } else {
            openPicker('start');
          }
        }}
      />

      <Text style={styles.label}>Ends</Text>

      <PickerField
        value={formatDateTime(editingEvent ? editEnd : endDate)}
        icon="moon-outline"
        onPress={() => {
          if (editingEvent) {
            setEditTarget2('end');
          } else {
            openPicker('end');
          }
        }}
      />

      {!editingEvent && (
        <>
          <View style={styles.chipRow}>
            {QUICK_END_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={styles.chip}
                onPress={() => handleQuickEnd(option.ms)}
              >
                <Text style={styles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.hint}>
            Tap a chip to set the end time from start.
          </Text>
        </>
      )}

      {message && (
        <Text
          style={[
            styles.message,
            messageIsError && styles.messageError,
          ]}
        >
          {message}
        </Text>
      )}

      {editingEvent ? (
        <View style={styles.editActions}>
          <Pressable
            style={styles.cancelButton}
            onPress={cancelEditing}
            disabled={editSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.saveButton, editSaving && styles.disabledButton]}
            onPress={handleSaveEdit}
            disabled={editSaving}
          >
            <Text style={styles.saveButtonText}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <AppButton
          theme="primary"
          title="Create Event"
          icon="add-circle-outline"
          onPress={handleCreateEvent}
        />
      )}

      {editTarget && !editingEvent && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onPickerChange}
          />
        </View>
      )}

      {editTarget2 && editingEvent && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={editTarget2 === 'start' ? editStart : editEnd}
            mode={isAndroid ? 'date' : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onEditPickerChange}
          />
        </View>
      )}

      {payload && !editingEvent && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>
            Scan this QR code with the Scan tab:
          </Text>

          <View style={styles.qrBox}>
            <QRCode value={payload} size={200} />
          </View>

          <Text style={styles.payloadText}>{payload}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Your Events</Text>

      {eventsLoading && <Text style={styles.hint}>Loading events…</Text>}

      {!eventsLoading && cloudEvents.length === 0 && (
        <Text style={styles.hint}>
          You haven&apos;t created any events yet.
        </Text>
      )}

      {cloudEvents.map((ev) => (
        <View key={ev.id} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{ev.title}</Text>

            <View
              style={[
                styles.badge,
                ev.status === 'open' ? styles.badgeOpen : styles.badgeClosed,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  ev.status === 'open'
                    ? styles.badgeTextOpen
                    : styles.badgeTextClosed,
                ]}
              >
                {ev.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.eventMeta}>Code: {ev.event_code}</Text>

          {ev.venue && (
            <Text style={styles.eventMeta}>Venue: {ev.venue}</Text>
          )}

          {ev.description && (
            <Text style={styles.eventMeta}>{ev.description}</Text>
          )}

          {ev.start_time && (
            <Text style={styles.eventMeta}>
              Starts: {new Date(ev.start_time).toLocaleString()}
            </Text>
          )}

          {ev.end_time && (
            <Text style={styles.eventMeta}>
              Ends: {new Date(ev.end_time).toLocaleString()}
            </Text>
          )}

          <View style={styles.eventActions}>
            <Pressable
              style={styles.smallButton}
              onPress={() => startEditing(ev)}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.smallButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              style={styles.smallButton}
              onPress={() => handleToggleStatus(ev)}
            >
              <Ionicons
                name={ev.status === 'open' ? 'lock-closed' : 'lock-open'}
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.smallButtonText}>
                {ev.status === 'open' ? 'Close' : 'Reopen'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.smallButton}
              onPress={() => handleViewAttendees(ev)}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.smallButtonText}>
                {openEventId === ev.id ? 'Hide' : 'Attendance'}
              </Text>
            </Pressable>
          </View>

          {openEventId === ev.id && (
            <View style={styles.attendeeBox}>
              {attendeesLoading === ev.id && (
                <Text style={styles.hint}>Loading attendance…</Text>
              )}

              {attendeesLoading !== ev.id &&
                (attendees[ev.id]?.length ?? 0) === 0 && (
                  <Text style={styles.hint}>No one has scanned in yet.</Text>
                )}

              {attendees[ev.id]?.map((a) => (
                <View key={a.studentId} style={styles.attendeeRow}>
                  <View style={styles.attendeeInfo}>
                    <Text style={styles.attendeeName}>
                      {a.fullName ?? a.email}
                    </Text>
                    <Text style={styles.attendeeEmail}>{a.email}</Text>
                  </View>

                  <Text style={styles.attendeeTime}>
                    {new Date(a.scannedAt).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({ value, icon, onPress }: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pickerFieldPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={COLORS.primary} />

      <Text style={styles.pickerValue}>{value}</Text>

      <Ionicons
        name="calendar-outline"
        size={18}
        color={COLORS.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },


  lockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },


  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  pickerField: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pickerFieldPressed: {
    backgroundColor: COLORS.surface,
  },

  pickerValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginHorizontal: 10,
  },

  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
  },

  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  pickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },

  message: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 12,
  },

  messageError: {
    color: COLORS.danger,
  },

  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  saveButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },

  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  disabledButton: {
    opacity: 0.6,
  },

  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },

  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },

  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  payloadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 32,
    marginBottom: 12,
  },

  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeOpen: { backgroundColor: '#E6F4EA' },
  badgeClosed: { backgroundColor: '#FCE8E6' },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  badgeTextOpen: { color: '#2E7D5B' },
  badgeTextClosed: { color: '#B3261E' },

  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },

  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },

  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  smallButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },

  attendeeBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  attendeeInfo: { flex: 1 },

  attendeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  attendeeEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  attendeeTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
