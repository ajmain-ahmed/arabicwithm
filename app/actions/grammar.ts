'use server';
import { getAuthClient } from '@/app/lib/supabase/server';
import { validNahw, type Mode, type NahwRow, type PreparedRow } from '@/app/grammar/models';
import type { BankRow } from '@/app/grammar/questionBank';
export async function loadGrammarBank(mode: Mode, seed: string, recent: string[] = [], cefr: number | null = null): Promise<BankRow[]> {
    if (!['word_type','sentence_role','grammatical_case'].includes(mode) || typeof seed !== 'string' || seed.length>64 || !Array.isArray(recent) || recent.length>200 || recent.some(id=>typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id)) || (cefr!==null && (!Number.isInteger(cefr)||cefr<1||cefr>6))) throw new Error('Invalid activity request');
    const client=await getAuthClient();
    const {data,error}=await client.auth.getUser();
    if(error||!data.user) throw new Error('Sign in to practise Grammar');
    const response=await client.rpc('website_grammar_candidates',{p_mode:mode,p_seed:seed,p_recent:recent,p_cefr:cefr}).abortSignal(AbortSignal.timeout(8000));
    if(response.error) throw new Error('Unable to load uploaded practice sentences.');
    return Array.isArray(response.data)?response.data:[];
}
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
