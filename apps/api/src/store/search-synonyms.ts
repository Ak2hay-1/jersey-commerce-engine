/** Nickname / common short-name expansions for storefront catalog search. */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  barca: ['barcelona', 'barça', 'fcb'],
  barcelona: ['barca', 'barça', 'fcb'],
  fcb: ['barcelona', 'barca'],
  madrid: ['real madrid', 'rmcf'],
  'real madrid': ['madrid', 'rmcf'],
  united: ['manchester united', 'man united', 'man utd', 'mufc'],
  'man united': ['manchester united', 'united', 'man utd', 'mufc'],
  'man utd': ['manchester united', 'united', 'man united', 'mufc'],
  milan: ['ac milan', 'inter milan', 'inter'],
  'ac milan': ['milan'],
  inter: ['inter milan', 'milan'],
  city: ['manchester city', 'man city', 'mcfc'],
  'man city': ['manchester city', 'city', 'mcfc'],
  arsenal: ['gunners', 'afc'],
  gunners: ['arsenal'],
  liverpool: ['lfc', 'reds'],
  chelsea: ['cfc'],
  tottenham: ['spurs', 'thfc'],
  spurs: ['tottenham'],
  juve: ['juventus'],
  juventus: ['juve'],
  psg: ['paris saint-germain', 'paris'],
  bayern: ['bayern munich', 'fc bayern'],
  argentina: ['albiceleste'],
  brazil: ['seleção', 'selecao'],
  portugal: ['seleção portuguesa'],
};

/** Expand a free-text query into unique search terms (original + synonyms). */
export function expandSearchTerms(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  const lower = trimmed.toLowerCase();
  const terms = new Set<string>([trimmed]);
  const direct = SEARCH_SYNONYMS[lower];
  if (direct) {
    for (const term of direct) {
      terms.add(term);
    }
  }
  for (const [alias, expansions] of Object.entries(SEARCH_SYNONYMS)) {
    if (lower.includes(alias) || alias.includes(lower)) {
      terms.add(alias);
      for (const term of expansions) {
        terms.add(term);
      }
    }
  }
  return [...terms];
}
