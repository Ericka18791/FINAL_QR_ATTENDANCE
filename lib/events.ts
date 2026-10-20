import { supabase } from './supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  status: 'open' | 'closed';
};

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('events').insert({
    event_code: event.eventId,
    title: event.title,
    start_time: event.start || null,
    end_time: event.end || null,
    created_by: user?.id ?? null,
  });

  return { error: error?.message ?? null };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}

export async function getOpenEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'open')
    .order('start_time', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function closeEvent(
  eventId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

export async function reopenEvent(
  eventId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'open' })
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

export async function updateEvent(input: {
  eventId: string;
  title: string;
  eventCode: string;
  start: string;
  end: string;
  venue: string | null;
  description: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_event', {
    p_event_id: input.eventId,
    p_title: input.title,
    p_event_code: input.eventCode,
    p_start_time: input.start,
    p_end_time: input.end,
    p_venue: input.venue,
    p_description: input.description,
  });

  return { error: error?.message ?? null };
}
