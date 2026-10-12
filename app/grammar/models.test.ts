import { describe, it, expect } from 'vitest';
import { balancedVerbs, eligible, validNahw, type Verb } from './models';
import curriculum from './mobile-curriculum.json';
import data from '@/e2e/learning-data.json';
describe('Mobile curriculum adapters', () => {
    it('retains validated source sentences and rejects unreviewed data', () => { expect(data.nahw.filter(validNahw).length).toBeGreaterThan(5); expect(validNahw({ ...data.nahw[0], validated: false })).toBe(false); });
    it('preserves complete phrase targets without overlapping placements', () => { const phrase = data.nahw.filter(validNahw).find(r => eligible(r, 'sentence_role', true).length >= 2)!; expect(phrase).toBeDefined(); const targets = eligible(phrase, 'sentence_role', true); expect(targets.some(t => (t.token_end ?? t.token_index + 1) - t.token_index > 1)).toBe(true); for (let i = 1; i < targets.length; i++)
        expect(targets[i].token_index).toBeGreaterThanOrEqual(targets[i - 1].token_end ?? targets[i - 1].token_index + 1); });
    it('balances attested forms instead of allowing Form I to dominate', () => { const cards = balancedVerbs(curriculum.hans as Verb[]); expect(cards.length).toBe(10); expect(new Set(cards.map(v => v.quadriliteral_pattern ?? v.form)).size).toBeGreaterThanOrEqual(7); expect(cards.filter(v => v.form === 1).length).toBeLessThanOrEqual(2); });
});
