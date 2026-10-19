/** Today's Tally events plus Google Calendar events, all-day first then by start time. */
export function agendaForDay(localEvents, googleEvents, day) {
  const local = (localEvents || [])
    .filter((event) => event && !event.deleted && event.day === day)
    .map((event) => ({
      id: `local:${event.id}`,
      title: event.title || '(No title)',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      allDay: Boolean(event.allDay || !event.startTime),
      source: 'tally',
      href: '',
      location: event.location || '',
    }));
  const remote = (googleEvents || [])
    .filter((event) => event && event.day === day)
    .map((event) => ({
      id: `google:${event.id}`,
      title: event.title || '(No title)',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      allDay: Boolean(event.allDay),
      source: 'google',
      href: event.href || '',
      location: event.location || '',
    }));
  return [...local, ...remote].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title);
  });
}
