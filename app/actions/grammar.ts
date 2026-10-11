'use server';
import { getAuthClient } from '@/app/lib/supabase/server';
import { validNahw, type Mode, type NahwRow, type PreparedRow } from '@/app/grammar/models';
export async function loadGrammar(kind: 'nahw' | 'sarf' | 'word_pattern', mode: Mode, seed: string, offset = 0): Promise<{
    nahw: NahwRow[];
    prepared: PreparedRow[];
}> {
    if (!['nahw', 'sarf', 'word_pattern'].includes(kind) || !['word_type', 'sentence_role', 'grammatical_case'].includes(mode) || typeof seed !== 'string' || seed.length > 64 || !Number.isInteger(offset) || offset < 0 || offset > 500)
        throw new Error('Invalid activity request');
    const client = await getAuthClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user)
        throw new Error('Sign in to practise Grammar');
    const response = kind === 'nahw' ? await client.rpc('nahw_candidates', { p_mode: mode, p_seed: seed, p_limit: 40 }).abortSignal(AbortSignal.timeout(8000)) : await client.rpc('prepared_practice_candidates', { p_kind: kind, p_root_type: null, p_cefr: null, p_patterns: null, p_seed: seed, p_offset: offset, p_limit: 5 }).abortSignal(AbortSignal.timeout(8000));
    if (response.error)
        throw new Error('Unable to load this activity. Please try again.');
    const data = Array.isArray(response.data) ? response.data : [];
    return { nahw: kind === 'nahw' ? data.filter(validNahw) : [], prepared: kind === 'nahw' ? [] : data as PreparedRow[] };
}
