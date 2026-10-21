import curriculum from './mobile-curriculum.json';
export type Mode = 'sentence_role' | 'word_type' | 'grammatical_case';
export interface Annotation {
    category: string;
    why: string;
    validated: boolean;
    confidence: number;
}
export interface Target {
    token_index: number;
    token_end?: number;
    arabic: string;
    word_type?: Annotation;
    sentence_role?: Annotation;
    grammatical_case?: Annotation;
    structure?: {
        validated: boolean;
        confidence: number;
        why: string;
        phrase_type?: string;
        clause_type?: string;
    };
    relations?: {
        type: string;
        target_span: string;
        why: string;
        validated: boolean;
        confidence: number;
    }[];
}
export interface NahwRow {
    id: string | number;
    validated: boolean;
    review_version: number;
    content_hash: string;
    source_kind: string;
    source_label: string;
    source_id: string;
    book_id?: string;
    chapter_number?: number;
    paragraph_index?: number;
    start_seconds?: number;
    phrase_breaks: number[];
    paragraph: {
        tokens: {
            arabic: string;
        }[];
        translation: string;
    };
    targets: Target[];
}
export interface Verb {
    id: string;
    arabic: string;
    meaning: string;
    root: string;
    source: string;
    form: number | null;
    quadriliteral_pattern?: string | null;
    form_i?: {
        past_vowel: string;
        present_vowels: string[];
        masdars: string[];
        past?: string;
        present?: string;
    };
}
export interface PreparedRow {
    id: string;
    source_kind: string;
    source_id: string;
    source_label: string;
    payload: {
        arabic: string;
        english: string;
        targets: {
            token_index: number;
            surface: string;
            meaning?: string;
            verb?: Verb;
            pattern_index?: number;
            dictionary_entry_id?: number;
        }[];
    };
}
export const categories: Record<Mode, string[]> = {
    word_type: ['noun', 'past', 'present', 'imperative', 'adjective', 'preposition', 'conjunction', 'demonstrative', 'pronoun', 'masdar', 'participle', 'jussive_particle', 'subjunctive_particle', 'interrogative_particle'],
    sentence_role: ['subject', 'object', 'role_adjective', 'described_noun', 'idafa_first', 'idafa_second', 'topic', 'predicate', 'kana_noun', 'kana_predicate', 'inna_noun', 'inna_predicate', 'delayed_topic', 'fronted_predicate', 'prepositional_phrase', 'adverbial_phrase', 'verbal_predicate', 'nominal_predicate', 'quasi_predicate'],
    grammatical_case: ['nominative', 'accusative', 'genitive', 'jussive'],
};
export const reviewed = (a: {
    validated?: boolean;
    confidence?: number;
    why?: string;
} | undefined) => a?.validated === true && typeof a.confidence === 'number' && a.confidence >= .98 && a.confidence <= 1 && typeof a.why === 'string' && a.why.trim().length >= 12;
export function sourceValid(row: {
    source_kind: string;
    source_id: string;
    source_label: string;
    book_id?: string;
    chapter_number?: number;
    paragraph_index?: number;
    start_seconds?: number;
}) {
    return !!row.source_id && !!row.source_label && (row.source_kind === 'book' ? !!row.book_id && Number.isInteger(row.chapter_number) && row.chapter_number! >= 1 && Number.isInteger(row.paragraph_index) && row.paragraph_index! >= 0 : row.source_kind === 'transcript' && Number.isFinite(row.start_seconds) && row.start_seconds! >= 0);
}
export function validNahw(value: unknown): value is NahwRow {
    if (!value || typeof value !== 'object')
        return false;
    const r = value as NahwRow;
    return sourceValid(r) && r.validated === true && r.review_version === 1 && typeof r.content_hash === 'string' && Array.isArray(r.paragraph?.tokens) && r.paragraph.tokens.length >= 3 && r.paragraph.tokens.length <= 36 && r.paragraph.tokens.every(t => typeof t?.arabic === 'string' && /[\u0621-\u064a]/.test(t.arabic) && !/[a-z\ufffd]/i.test(t.arabic)) && typeof r.paragraph.translation === 'string' && r.paragraph.translation.trim().length >= 12 && r.paragraph.translation.length <= 500 && !/unclear|inaudible|internal qa|translation unavailable|\[music\]|♪/i.test(r.paragraph.translation) && Array.isArray(r.targets) && r.targets.every(t => Number.isInteger(t.token_index) && t.token_index >= 0 && (t.token_end ?? t.token_index + 1) <= r.paragraph.tokens.length && (t.token_end ?? t.token_index + 1) > t.token_index && t.arabic === r.paragraph.tokens.slice(t.token_index, t.token_end ?? t.token_index + 1).map(t => t.arabic).join(' '));
}
export function eligible(row: NahwRow, mode: Mode, phrases = false): Target[] {
    const targets = row.targets.filter(t => reviewed(t[mode]) && categories[mode].includes(t[mode]!.category) && (mode !== 'grammatical_case' || (t.word_type?.category === 'present' ? t[mode]!.category !== 'genitive' : ['noun', 'adjective', 'masdar', 'participle'].includes(t.word_type?.category ?? '') && t[mode]!.category !== 'jussive')));
    const selected: Target[] = [];
    for (const t of targets.sort((a, b) => (b.token_end ?? b.token_index + 1) - b.token_index - ((a.token_end ?? a.token_index + 1) - a.token_index)))
        if (!selected.some(s => s.token_index < (t.token_end ?? t.token_index + 1) && t.token_index < (s.token_end ?? s.token_index + 1)))
            selected.push(t);
    if (phrases && !selected.some(t => reviewed(t.structure) && ((t.token_end ?? t.token_index + 1) - t.token_index > 1 || t.structure?.phrase_type || t.structure?.clause_type)))
        return [];
    if (mode === 'grammatical_case') {
        const nouns = selected.filter(t => t.word_type?.category !== 'present');
        return (nouns.length >= 2 ? nouns : selected.filter(t => t.word_type?.category === 'present')).slice(0, 6).sort((a, b) => a.token_index - b.token_index);
    }
    return selected.slice(0, 6).sort((a, b) => a.token_index - b.token_index);
}
export function validVerb(v: Verb | undefined): v is Verb { return !!v && ['id', 'arabic', 'meaning', 'root', 'source'].every(k => typeof v[k as keyof Verb] === 'string' && !!v[k as keyof Verb]) && ((Number.isInteger(v.form) && v.form! >= 1 && v.form! <= 10 && !v.quadriliteral_pattern) || (v.form === null && Object.hasOwn(curriculum.quadriliteral, v.quadriliteral_pattern ?? ''))); }
export function balancedVerbs(pool: Verb[], limit = 10): Verb[] { const used = new Set<string>(), counts = new Map<string, number>(), remaining = pool.filter(v => validVerb(v) && !used.has(v.id) && !!used.add(v.id)).sort(() => Math.random() - .5), result: Verb[] = []; while (remaining.length && result.length < limit) {
    remaining.sort((a, b) => (counts.get(a.quadriliteral_pattern ?? String(a.form)) ?? 0) - (counts.get(b.quadriliteral_pattern ?? String(b.form)) ?? 0));
    const v = remaining.shift()!;
    result.push(v);
    const key = v.quadriliteral_pattern ?? String(v.form);
    counts.set(key, (counts.get(key) ?? 0) + 1);
} return result; }
export function prepareNahw(rows: NahwRow[], mode: Mode, advanced = false): NahwRow[] {
    const seen = new Set<string>(), sources = new Map<string, number>(), labels = new Map<string, number>(), structures = new Map<string, number>();
    const remaining = rows.filter(r => { const key = r.paragraph.tokens.map(t => t.arabic).join(' ').replace(/[\u064b-\u065f]/g, ''); if (seen.has(key)) return false; seen.add(key); return true; });
    const result: NahwRow[] = [];
    const structure = (r: NahwRow) => eligible(r, mode).map(t => t[mode]!.category).join(',');
    const cost = (r: NahwRow) => (sources.get(r.source_id) ?? 0) * 8 + (structures.get(structure(r)) ?? 0) * 4 + eligible(r, mode).reduce((sum, t) => sum + (labels.get(t[mode]!.category) ?? 0), 0);
    const complexity = (r: NahwRow) => r.paragraph.tokens.length + r.targets.reduce((sum,t) => sum + (t.structure?.clause_type ? ((t.token_end ?? t.token_index+1)-t.token_index)*3 : 0) + (['inna_noun','kana_noun'].includes(t.sentence_role?.category??'')?12:0),0);
    while (remaining.length && result.length < 10) { remaining.sort((a,b) => advanced ? complexity(a)-complexity(b) : cost(a)-cost(b)); const row=remaining.shift()!; result.push(row); sources.set(row.source_id,(sources.get(row.source_id)??0)+1); structures.set(structure(row),(structures.get(structure(row))??0)+1); for(const target of eligible(row,mode)) labels.set(target[mode]!.category,(labels.get(target[mode]!.category)??0)+1); }
    return result;
}
export const title = (key: string) => (curriculum.rules as Record<string, {
    title: string;
}>)[key]?.title ?? key.replaceAll('_', ' ');
export const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function formLabel(v: Verb) { return v.form ? `Form ${roman[v.form - 1]}` : (curriculum.quadriliteral as Record<string, {
    label: string;
}>)[v.quadriliteral_pattern ?? '']?.label ?? ''; }
export const catalogue = {
    nahw: [{ id: 'word_type', title: 'Word Type' }, { id: 'sentence_role', title: 'Sentence Role' }, { id: 'grammatical_case', title: 'Case Endings' }, { id: 'rules', title: 'Revise Na\u1e25w Rules' }],
    sarf: [{ id: 'roots', title: 'Root Types' }, { id: 'context', title: 'Context \u1e62arf' }, { id: 'weak', title: 'Weak Verbs' }, { id: 'patterns', title: 'Word Patterns' }, { id: 'ten', title: 'Revise the Ten Forms' }],
};
