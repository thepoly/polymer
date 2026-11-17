const typeMap: Record<string, string> = {
  opinion: 'opinion', column: 'column', 'staff editorial': 'staff-editorial',
  'editorial notebook': 'editorial-notebook', endorsement: 'endorsement',
  'top hat': 'top-hat', 'candidate profile': 'candidate-profile',
  'letter to the editor': 'letter-to-the-editor', "the poly's recommendations": 'polys-recommendations',
  "editor's notebook": 'editors-notebook', derby: 'derby', other: 'other',
};
export function deriveOpinionType(kicker: string | null | undefined): string {
  const key = (kicker || '').trim().toLowerCase().replace(/[’‘]/g, "'");
  return key ? typeMap[key] || 'more' : 'opinion';
}
