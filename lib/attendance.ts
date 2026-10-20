import { supabase } from './supabase';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
  status: string;
};


export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

/**
 * Records attendance by calling the database function.
 * All validation (event open, time window, duplicates) happens
 * inside the database, so it cannot be bypassed by the client.
 */
export async function registerAttendance(
  rawPayload: string,
  _studentId?: string
): Promise<RegisterResult> {
  let eventCode: string | null = null;

  try {
    const parsed = JSON.parse(rawPayload);
    if (parsed && typeof parsed.event === 'string' && parsed.event.length > 0) {
      eventCode = parsed.event;
    }
  } catch {
    // Not JSON — fall back to treating the raw string as the code.
    eventCode = rawPayload;
  }

  if (!eventCode) {
    return { success: false, message: 'Invalid QR code.' };
  }

  const { data, error } = await supabase.rpc('register_attendance', {
    p_event_code: eventCode,
  });

  if (error) {
    return {
      success: false,
      message: 'Could not reach the server. Please try again.',
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return { success: false, message: 'Unexpected server response.' };
  }

  return {
    success: row.ok,
    message: row.message,
    eventTitle: row.event_title ?? undefined,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, status, events ( id, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.id ?? '',
    eventTitle: row.events?.title ?? 'Unknown event',
    scannedAt: row.scanned_at,
    status: row.status ?? 'present',
  }));
}

export type EventAttendee = {
  studentId: string;
  email: string;
  fullName: string | null;
  scannedAt: string;
  status: string;
};

export async function getEventAttendees(
  eventId: string
): Promise<EventAttendee[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, status, profiles ( email, full_name )')
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    studentId: row.student_id,
    email: row.profiles?.email ?? 'Unknown',
    fullName: row.profiles?.full_name ?? null,
    scannedAt: row.scanned_at,
    status: row.status,
  }));
}

