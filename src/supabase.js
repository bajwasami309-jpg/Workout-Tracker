import { createClient } from '@supabase/supabase-js';
import { createEmptyWeek } from './storage.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** All people plus their week row for `weekStart` (empty week if none saved yet). */
export async function fetchAllWeekData(weekStart) {
  const { data: people, error: peopleError } = await supabase
    .from('people')
    .select('id, slug, display_name, sort_order')
    .order('sort_order');

  if (peopleError) throw peopleError;

  const { data: entries, error: entriesError } = await supabase
    .from('week_entries')
    .select('person_id, days')
    .eq('week_start', weekStart);

  if (entriesError) throw entriesError;

  const entriesByPerson = new Map(
    (entries ?? []).map((entry) => [entry.person_id, entry.days])
  );

  return (people ?? []).map((person) => ({
    id: person.id,
    slug: person.slug,
    displayName: person.display_name,
    sortOrder: person.sort_order,
    week: entriesByPerson.get(person.id) ?? createEmptyWeek(),
  }));
}

/** Merge one day's updates and upsert the row for that person + week. */
export async function saveDay(personId, weekStart, day, updates) {
  const { data: existing, error: fetchError } = await supabase
    .from('week_entries')
    .select('id, days')
    .eq('person_id', personId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const days = existing?.days ?? createEmptyWeek();
  days[day] = { ...(days[day] ?? {}), ...updates };

  if (existing) {
    const { error } = await supabase
      .from('week_entries')
      .update({ days })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('week_entries').insert({
      person_id: personId,
      week_start: weekStart,
      days,
    });
    if (error) throw error;
  }
}
