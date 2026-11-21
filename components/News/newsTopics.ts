/**
 * Topics for the tabbed row on /news (Administration, Academia, Campus
 * Infrastructure, Interview). A story belongs to a topic when its whole
 * kicker is one of the topic's kickers, in any capitalisation. Add a kicker
 * here when editors start using a new one. Safe to import from client code.
 */
export const NEWS_TOPICS = [
  {
    key: 'administration',
    label: 'Administration',
    kickers: [
      'Administration',
      'Board of Trustees',
      'Budget',
      'Dining',
      'Finance',
      'Housing',
      'Institute',
      'Public Safety',
      'Tuition',
    ],
  },
  {
    key: 'academia',
    label: 'Academia',
    kickers: [
      'Academia',
      'Academics',
      'Curriculum',
      'Faculty',
      'Faculty Senate',
      'Folsom Library',
      'Graduate',
      'Library',
      'Research',
    ],
  },
  {
    key: 'infrastructure',
    label: 'Campus Infrastructure',
    kickers: ['Campus Infrastructure', 'Construction', 'Facilities', 'Parking', 'Shuttle', 'Transportation'],
  },
  {
    key: 'interview',
    label: 'Interview',
    kickers: ['Interview', 'Interviews', 'Q&A', 'Town Hall'],
  },
] as const;

export type NewsTopicKey = (typeof NEWS_TOPICS)[number]['key'];

/** Maximum cards per topic: four on tablets, the first three elsewhere. */
export const TOPIC_CARDS = 4;

const normalize = (kicker: string) => kicker.trim().replace(/\s+/g, ' ').toLowerCase();

/** The topic a kicker files a story under, if any */
export function topicOf(kicker: string | null | undefined): NewsTopicKey | null {
  if (!kicker) return null;
  const k = normalize(kicker);
  for (const topic of NEWS_TOPICS) {
    if (topic.kickers.some((t) => normalize(t) === k)) return topic.key;
  }
  return null;
}
