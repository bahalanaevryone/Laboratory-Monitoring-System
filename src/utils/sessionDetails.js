export function getPersonName(person, fallback = 'Participant') {
  if (typeof person === 'string') return person;

  return (
    person?.student_name ||
    person?.name ||
    `${person?.first_name || person?.firstname || ''} ${person?.last_name || person?.lastname || ''}`.trim() ||
    person?.student?.name ||
    person?.user?.name ||
    person?.user?.display_name ||
    fallback
  );
}

export function getPcNumber(person) {
  if (!person || typeof person === 'string') return null;
  return person.pc_number || person.pc || person.pcn || person.pc_no || null;
}

export function normalizeParticipantList(source, fallback = 'Participant') {
  if (!source) return [];

  if (Array.isArray(source)) {
    return source
      .map((person, index) => ({
        name: getPersonName(person, `${fallback} ${index + 1}`),
        pc: getPcNumber(person),
      }))
      .filter((person) => person.name);
  }

  return String(source)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, pc: null }));
}

export function getSessionParticipants(attendanceList = [], session = {}) {
  if (Array.isArray(attendanceList) && attendanceList.length > 0) {
    return normalizeParticipantList(attendanceList, 'Guest');
  }

  return normalizeParticipantList(
    session.students ||
      session.participants ||
      session.student_names ||
      session.student_list ||
      session.participant_list,
    'Participant'
  );
}
