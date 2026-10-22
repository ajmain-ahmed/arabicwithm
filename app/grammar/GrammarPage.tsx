'use client';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Dialog, DialogContent, DialogTitle, IconButton, LinearProgress, Paper, Select, MenuItem, Typography } from '@mui/material';
import { ArrowBack, Close, InfoOutlined } from '@mui/icons-material';
import { useAuth } from '@/app/AuthContext';
import LearningSignInGate from '@/app/components/LearningSignInGate';
import { loadGrammar } from '@/app/actions/grammar';
import curriculum from './mobile-curriculum.json';
import WebsiteActivity from './WebsiteActivity';
import BankActivity from './BankActivity';
import { Arabic, English, Instruction, GrammarProvider, GrammarSettings, Feedback, useGrammarDisplay } from './GrammarUI';
import { ruleLevels } from './ruleLevels';
import useCorrectAutoAdvance from './useCorrectAutoAdvance';
import TenFormsRevision from './TenFormsRevision';
import { balancedVerbs, catalogue, categories, eligible, prepareNahw, formLabel, reviewed, roman, sourceValid, title, validVerb, type Mode, type NahwRow, type PreparedRow, type Target, type Verb } from './models';
type Rule = {
    title: string;
    arabic?: string | null;
    sections: {
        heading: string;
        text?: string | null;
        detail?: string | null;
        arabic?: string | null;
        translation?: string | null;
    }[];
};
const cardStyle = { p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2, textAlign:'center' as const, '& .MuiTypography-root:not([lang=ar]):not(h2)':{fontSize:'var(--grammar-english-size)'}, '& [lang=ar], & [dir=rtl]':{fontSize:'var(--grammar-arabic-size)'}, '& .MuiButton-root':{fontSize:'var(--grammar-english-size)'} };
const arabicStyle = { fontFamily: 'var(--font-serif)', fontSize: 'var(--grammar-arabic-size)', lineHeight: 1.9, textAlign: 'center' as const, direction: 'rtl' as const };
export default function GrammarPage() { return <GrammarProvider><GrammarContent /></GrammarProvider>; }
function GrammarContent() {
    const { user, loading } = useAuth();
    const [branch, setBranch] = useState<'nahw' | 'sarf' | null>(null), [activity, setActivity] = useState(''), [rule, setRule] = useState<Rule | null>(null);
    if (loading)
        return <LinearProgress />;
    if (!user)
        return <LearningSignInGate activity="Grammar"/>;
    return <Container maxWidth="xl" sx={{ pt: { xs: 3, md: 5 }, pb: 6 }}>
    {activity && <Button startIcon={<ArrowBack />} onClick={() => { setActivity(''); setBranch(null); }}>Back to Grammar</Button>}
    <Box sx={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Typography component="h1" sx={{ mb: 3, fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 42 }, fontWeight: 600 }}>Grammar</Typography><GrammarSettings /></Box>
    {!activity ? <Box sx={{ display: 'grid', gap: 4 }}>{(['nahw', 'sarf'] as const).map(section => <Box component="section" key={section} aria-label={section === 'nahw' ? 'Na\u1e25w' : '\u1e62arf'}>
      <Typography component="h2" sx={{ mb: 2, fontFamily: 'var(--font-heading)', fontSize: 28 }}>{section === 'nahw' ? 'Na\u1e25w' : '\u1e62arf'}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>{catalogue[section].map(item => <Button key={item.id} variant="outlined" sx={{ minHeight: 64, fontSize: 16, textTransform: 'none', borderRadius: '12px', color: 'var(--awm-bark)', borderColor: 'color-mix(in srgb, var(--awm-forest) 25%, transparent)' }} onClick={() => { setBranch(section); setActivity(item.id); }}>{item.title}</Button>)}</Box>
    </Box>)}</Box> : branch === 'nahw' ? activity === 'rules' ? <RuleLibrary show={setRule}/> : ['word_type','sentence_role','grammatical_case'].includes(activity) ? <BankActivity key={activity} mode={activity as Mode}/> : <NahwActivity key={activity} activity={activity} show={setRule}/> : <SarfActivity key={activity} activity={activity} show={setRule}/>}
    <Dialog open={!!rule} onClose={() => setRule(null)} fullWidth maxWidth="sm"><DialogTitle>{rule?.title}<IconButton aria-label="Close explanation" sx={{ float: 'right' }} onClick={() => setRule(null)}><Close /></IconButton></DialogTitle><DialogContent>{rule?.arabic && <Arabic>{rule.arabic}</Arabic>}{rule?.sections.map((section, i) => <Box key={i} sx={{ my: 2 }}><Typography variant="h6">{section.heading}</Typography>{section.text && <English>{section.text}</English>}{section.detail && <Typography sx={{ mt: 1, color: 'text.secondary' }}>{section.detail}</Typography>}{section.arabic && <Arabic>{section.arabic}</Arabic>}{section.translation && <English>{section.translation}</English>}</Box>)}</DialogContent></Dialog>
  </Container>;
}
function RuleLibrary({ show }: {
    show: (r: Rule) => void;
}) { return <Box>{(['A1','A2','B1','B2','C1','C2'] as const).map(level=><Box component="section" key={level} aria-label={`${level} rules`} sx={{mb:3}}><Typography component="h2" variant="h5" sx={{mb:1.25}}>{level}</Typography><Box sx={{display:'grid',gridTemplateColumns:{xs:'repeat(2,minmax(0,1fr))',md:'repeat(3,minmax(0,1fr))',lg:'repeat(4,minmax(0,1fr))'},gap:1.25}}>{Object.entries(curriculum.rules).filter(([key])=>ruleLevels[key as keyof typeof ruleLevels]===level).map(([key,r])=><Button key={key} sx={{minHeight:88,minWidth:0,p:1,gap:.25,flexDirection:'column',borderRadius:3,fontSize:'calc(var(--grammar-english-size) * .875)',overflowWrap:'anywhere','& [data-grammar-arabic]':{fontSize:'calc(var(--grammar-arabic-size) * .875)',my:0,lineHeight:1.35}}} variant="outlined" onClick={()=>show(r)}><span>{r.title}</span><Arabic>{r.arabic}</Arabic></Button>)}</Box></Box>)}</Box>; }

function NahwActivity({ activity, show }: {
    activity: string;
    show: (r: Rule) => void;
}) {
    const [rows, setRows] = useState<NahwRow[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState(''), [index, setIndex] = useState(0);
    const mode: Mode = ['word_type', 'grammatical_case'].includes(activity) ? activity as Mode : 'sentence_role';
    const reload = useCallback(() => { setBusy(true); setError(''); loadGrammar('nahw', mode, crypto.randomUUID()).then(data => { setRows(prepareNahw(data.nahw.filter(r => activity === 'governance' || activity === 'build' ? relations(r, activity).length > 0 : eligible(r, mode, activity === 'phrases').length >= 2),mode,activity === 'governance' || activity === 'build')); setIndex(0); }).catch(() => setError('Unable to load this activity. Please try again.')).finally(() => setBusy(false)); }, [mode, activity]);
    useEffect(() => { const timer = window.setTimeout(reload, 0); return () => window.clearTimeout(timer); }, [reload]); // Each activity starts one immutable session.
    if (busy)
        return <LinearProgress />;
    if (error)
        return <Alert action={<Button onClick={reload}>Try again</Button>}>{error}</Alert>;
    if (!rows.length)
        return <Alert severity="info">No reviewed sentences are available for this activity yet.</Alert>;
    if (index >= rows.length)
        return <Paper sx={cardStyle}><Typography variant="h5">Activity completed</Typography><Button onClick={reload}>Practise again</Button></Paper>;
    const row = rows[index];
    return <><Typography>{index + 1} / {rows.length}</Typography>{activity === 'governance' || activity === 'build' ? <RelationCard key={row.id} row={row} activity={activity} next={() => setIndex(i => i + 1)} show={show}/> : <MappingCard key={row.id} row={row} mode={mode} phrases={activity === 'phrases'} next={() => setIndex(i => i + 1)} show={show}/>}</>;
}
function MappingCard({ row, mode, phrases, next, show }: {
    row: NahwRow;
    mode: Mode;
    phrases: boolean;
    next: () => void;
    show: (r: Rule) => void;
}) {
    const [targets] = useState(() => eligible(row, mode, phrases)), [selected, setSelected] = useState(''), [placed, setPlaced] = useState<Record<number, string>>({}), [used, setUsed] = useState<string[]>([]), [feedback, setFeedback] = useState('');
    const [labels] = useState(() => { const answers = targets.map((t, i) => ({ id: `answer-${i}`, category: t[mode]!.category })), noun = targets.every(t => t.word_type?.category !== 'present'); const extras = categories[mode].filter(c => !answers.some(a => a.category === c) && (mode !== 'grammatical_case' || c !== (noun ? 'jussive' : 'genitive'))).sort(() => Math.random() - .5).slice(0, 2).map((category, i) => ({ id: `extra-${i}`, category })); return [...answers, ...extras].sort(() => Math.random() - .5); });
    useCorrectAutoAdvance(Object.keys(placed).length === targets.length, next);
    function place(t: Target, id: string) { if (placed[t.token_index] || used.includes(id))
        return; const label = labels.find(l => l.id === id); if (label?.category !== t[mode]!.category) {
        setFeedback('Try another label. Look at the meaning and position in this sentence.');
        return;
    } setPlaced(p => ({ ...p, [t.token_index]: label.category })); setUsed(u => [...u, id]); setSelected(''); setFeedback('Correct \u2713'); }
    const words = [];
    for (let i = 0; i < row.paragraph.tokens.length; i++) {
        const t = targets.find(t => t.token_index === i);
        if (t) {
            words.push(<Box key={i} sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', mx: .5 }}><Button aria-label={`Place label on ${t.arabic}`} onClick={() => place(t, selected)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); place(t, e.dataTransfer.getData('text/plain')); }} sx={{ ...arabicStyle, color: 'inherit', textTransform: 'none', borderRadius: 3, border: placed[i] ? '2px solid var(--awm-gold)' : '1px dashed var(--awm-muted)', px: 1 }}>{t.arabic}</Button>{placed[i] && <Box><Typography component="span">{title(placed[i])}</Typography><IconButton aria-label={`Explain ${t.arabic}`} onClick={() => show({ title: title(placed[i]), arabic: t.arabic, sections: [{ heading: 'In this sentence', text: t[mode]!.why }, { heading: 'Structure', text: reviewed(t.structure) ? t.structure!.why : null }, ...((curriculum.rules as Record<string, Rule>)[placed[i]]?.sections ?? [])] })}><InfoOutlined /></IconButton></Box>}</Box>);
            i = (t.token_end ?? i + 1) - 1;
        }
        else
            words.push(<Typography key={i} component="span" sx={arabicStyle}>{row.paragraph.tokens[i].arabic}</Typography>);
    }
    return <Paper variant="outlined" sx={cardStyle}><Typography>Drag a label onto its word or phrase, or select a label and tap the target.</Typography><Box dir="rtl" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'start', gap: 1, my: 3 }}>{words}</Box><English>{row.paragraph.translation}</English><Typography variant="caption">{row.source_label}</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 3 }}>{labels.filter(l => !used.includes(l.id)).map(l => <Button key={l.id} aria-label={title(l.category)} draggable onDragStart={e => e.dataTransfer.setData('text/plain', l.id)} variant={selected === l.id ? 'contained' : 'outlined'} onClick={() => setSelected(l.id)} sx={{ minHeight: 48, textTransform: 'none' }}><Box><Typography dir="rtl" sx={{fontSize:22,fontFamily:"var(--font-serif)"}}>{(curriculum.rules as Record<string,Rule>)[l.category]?.arabic}</Typography><Typography sx={{fontSize:14}}>{title(l.category)}</Typography></Box></Button>)}</Box><Typography role="status">{feedback}</Typography><Button fullWidth variant="contained" disabled={Object.keys(placed).length !== targets.length} onClick={next} sx={{ mt: 2, minHeight: 48 }}>Next Sentence</Button></Paper>;
}
function relations(row: NahwRow, activity: string) { const spans = new Map(row.targets.map(t => [`${t.token_index}:${t.token_end ?? t.token_index + 1}`, t])); return row.targets.flatMap(source => (source.relations ?? []).filter(r => reviewed(r) && spans.has(r.target_span) && spans.get(r.target_span) !== source && (activity === 'governance' ? r.type === 'governs' && (reviewed(spans.get(r.target_span)?.grammatical_case) || reviewed(spans.get(r.target_span)?.sentence_role)) : ['describes', 'idafa', 'predicates', 'attachment', 'subject', 'object'].includes(r.type))).map(r => ({ source, target: spans.get(r.target_span)!, ...r }))); }
function RelationCard({ row, activity, next, show }: {
    row: NahwRow;
    activity: string;
    next: () => void;
    show: (r: Rule) => void;
}) {
    const [items] = useState(() => relations(row, activity)), [index, setIndex] = useState(0), [from, setFrom] = useState(''), [to, setTo] = useState(''), [correct, setCorrect] = useState(false), [feedback, setFeedback] = useState('');
    useCorrectAutoAdvance(correct, () => {
      if (index + 1 === items.length) next();
      else { setIndex(i => i + 1); setCorrect(false); setFrom(''); setTo(''); setFeedback(''); }
    });
    const relation = items[index];
    const span = (t: Target) => `${t.token_index}:${t.token_end ?? t.token_index + 1}`;
    return <Paper variant="outlined" sx={cardStyle}><Arabic>{row.paragraph.tokens.map(t => t.arabic).join(' ')}</Arabic><English>{row.paragraph.translation}</English><Typography sx={{ my: 2 }}>Choose the two parts linked by: {title(relation.type)}</Typography>{[['From', from, setFrom], ['To', to, setTo]].map(([label, value, set]) => <Select key={label as string} displayEmpty fullWidth value={value as string} onChange={e => (set as (v: string) => void)(e.target.value as string)} disabled={correct} sx={{ mb: 2 }}><MenuItem value="">{label as string}</MenuItem>{row.targets.map(t => <MenuItem key={span(t)} value={span(t)}>{t.arabic}</MenuItem>)}</Select>)}<Button variant="contained" disabled={!from || !to || correct} onClick={() => { const ok = from === span(relation.source) && to === span(relation.target); setCorrect(ok); setFeedback(ok ? 'Correct \u2713' : 'Try again. Check the relationship between the two parts.'); }}>Place relationship</Button><Typography role="status" sx={{ my: 2 }}>{feedback}</Typography>{correct && <><Typography>{relation.why}</Typography><Button onClick={() => show({ title: title(relation.type), sections: [{ heading: 'Why?', text: relation.why }] })}>Explanation</Button><Button fullWidth variant="contained" onClick={() => { if (index + 1 === items.length)
        next();
    else {
        setIndex(i => i + 1);
        setCorrect(false);
        setFrom('');
        setTo('');
        setFeedback('');
    } }}>{index + 1 === items.length ? 'Next Sentence' : 'Next relationship'}</Button></>}</Paper>;
}
function SarfActivity({ activity, show }: {
    activity: string;
    show: (r: Rule) => void;
}) {
    const [root, setRoot] = useState(0), [weakMode, setWeakMode] = useState('identify');
    if (activity === 'ten')
        return <TenFormsRevision/>;
    if (activity === 'roots') return <><Select size="small" value={root} inputProps={{ 'aria-label': 'Root types' }} onChange={e => setRoot(Number(e.target.value))} sx={{ mb: 2 }}><MenuItem value={0}>All Root Types</MenuItem><MenuItem value={3}>Three-Letter Roots</MenuItem><MenuItem value={4}>Four-Letter Roots</MenuItem></Select><WebsiteActivity key={root} activity="roots" rootLength={root}/></>;
    if (['conjugation','morphology'].includes(activity)) return <WebsiteActivity activity={activity}/>;
    if (activity === 'weak')
        return <><Select size="small" value={weakMode} onChange={e => setWeakMode(e.target.value)} sx={{ mb: 2 }}><MenuItem value="identify">Identify weak type</MenuItem><MenuItem value="recall">Conjugation recall</MenuItem></Select><WeakCards key={weakMode} mode={weakMode}/></>;
    if (activity === 'context' || activity === 'patterns')
        return <PreparedActivity activity={activity} show={show}/>;
    return <><Select size="small" value={root} onChange={e => setRoot(Number(e.target.value))} sx={{ mb: 2 }}><MenuItem value={0}>All Root Types</MenuItem><MenuItem value={3}>Three-Letter Roots</MenuItem><MenuItem value={4}>Four-Letter Roots</MenuItem></Select><Typography sx={{ mb: 2 }}>Unlevelled Hans Wehr practice</Typography><VerbSession key={root} pool={(curriculum.hans as Verb[]).filter(v => !root || (v.quadriliteral_pattern ? 4 : 3) === root)} show={show}/></>;
}
function VerbSession({ pool, show }: {
    pool: Verb[];
    show: (r: Rule) => void;
}) {
    const [cards, setCards] = useState(() => balancedVerbs(pool)), [index, setIndex] = useState(0), [correct, setCorrect] = useState(false), [feedback, setFeedback] = useState('');
    useCorrectAutoAdvance(correct, () => { setIndex(i => i + 1); setCorrect(false); setFeedback(''); });
    const verb = cards[index];
    if (!verb)
        return <Paper sx={cardStyle}><Typography>Activity completed</Typography><Button onClick={() => { setCards(balancedVerbs(pool)); setIndex(0); setCorrect(false); }}>Practise again</Button></Paper>;
    const choices = verb.quadriliteral_pattern ? Object.entries(curriculum.quadriliteral).map(([id, f]) => ({ id, label: f.label })) : roman.map((r, i) => ({ id: String(i + 1), label: `Form ${r}` }));
    return <Paper sx={cardStyle} variant="outlined"><Typography>{index + 1} / {cards.length}</Typography><Arabic>{verb.arabic}</Arabic><English>{verb.meaning}</English><Arabic>{verb.root}</Arabic><Typography>Which form or pattern is this?</Typography><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1, my: 2 }}>{choices.map(c => <Button key={c.id} variant="outlined" disabled={correct} sx={{ minHeight: 48 }} onClick={() => { const ok = c.id === (verb.quadriliteral_pattern ?? String(verb.form)); setCorrect(ok); setFeedback(ok ? 'Correct \u2713' : 'Try again. Compare the stem with its root.'); }}>{c.label}</Button>)}</Box><Typography role="status">{feedback}</Typography><Button startIcon={<InfoOutlined />} onClick={() => { const info = verb.form ? curriculum.forms[verb.form - 1] : (curriculum.quadriliteral as Record<string, Omit<typeof curriculum.forms[number], "example">>)[verb.quadriliteral_pattern!]; show({ title: formLabel(verb), sections: [{ heading: 'Pattern', arabic: info.past }, { heading: 'Present', arabic: info.present }, { heading: 'Verbal noun', arabic: info.masdar }, { heading: 'Meaning tendency', text: info.tendency }, ...(verb.form_i ? [{ heading: 'Attested Form I reading', arabic: [verb.form_i.past, verb.form_i.present].filter(Boolean).join(' / '), text: verb.form_i.masdars.join(' / ') }] : [])] }); }}>Form information</Button><Typography variant="caption" sx={{ display: "block" }}>{verb.source}</Typography><Button fullWidth variant="contained" sx={{ mt: 2, minHeight: 48 }} disabled={!correct} onClick={() => { setIndex(i => i + 1); setCorrect(false); setFeedback(''); }}>Next Verb</Button></Paper>;
}
function WeakCards({ mode }: {
    mode: string;
}) {
    const text=useGrammarDisplay();
    const [cards, setCards] = useState(() => { const remaining = [...curriculum.weakCards].sort(() => Math.random() - .5), counts = new Map<string, number>(), result: typeof remaining = []; while (remaining.length && result.length < 10) {
        remaining.sort((a, b) => (counts.get(a.type) ?? 0) - (counts.get(b.type) ?? 0));
        const c = remaining.shift()!;
        result.push(c);
        counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
    } return result; }), [index, setIndex] = useState(0), [revealed, setRevealed] = useState(false), [feedback, setFeedback] = useState(''), [reinforcements, setReinforcements] = useState(0);
    useCorrectAutoAdvance(mode === 'identify' && revealed, () => { setIndex(i => i + 1); setRevealed(false); setFeedback(''); });
    const card = cards[index];
    if (!card)
        return <Alert severity="success">Weak Verbs activity completed.</Alert>;
    const types = [...new Map(curriculum.weakCards.map(c => [c.type, c])).values()];
    function advance(again: boolean) { if (again && reinforcements < 5) {
        const comparable = curriculum.weakCards.find(c => c.type === card.type && c.root !== card.root && c.tense === card.tense && c.person === card.person) ?? card;
        setCards(old => { const copy = [...old]; copy.splice(Math.min(index + 4, copy.length), 0, comparable); return copy; });
        setReinforcements(n => n + 1);
    } setIndex(i => i + 1); setRevealed(false); setFeedback(''); }
    return <Paper variant="outlined" sx={cardStyle}><Typography>{index + 1} / {cards.length}</Typography><Arabic>{card.base}</Arabic><English>{card.meaning}</English><Arabic>{card.root}</Arabic><Instruction>{mode === 'identify' ? 'Which weak verb type is this?' : 'Recall the requested conjugation.'}</Instruction>{mode === 'identify' ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent:'center',mt:4,mb:2 }}>{types.map(t => <Button disabled={revealed || !!feedback} key={t.type} variant="outlined" sx={{ minHeight: 48 }} onClick={() => { const ok = t.type === card.type; setRevealed(ok); setFeedback(ok ? 'Correct \u2713' : `Incorrect. Correct answer: ${card.typeLabel}. ${card.description}`); }}>{t.typeLabel} · <Box component="span" lang="ar" sx={{fontFamily:"var(--font-serif)",fontSize:"var(--grammar-arabic-size)",ml:1}}>{text(t.typeArabic)}</Box></Button>)}</Box> : <><Typography>{card.tense}</Typography><Arabic>{card.pronoun}</Arabic>{!revealed && <Button fullWidth variant="contained" onClick={() => setRevealed(true)}>Reveal answer</Button>}</>}<>{feedback && <Feedback correct={revealed} onContinue={()=>advance(false)}>{text(revealed ? card.description : feedback)}{!revealed && <Arabic>{card.typeArabic}</Arabic>}</Feedback>}</>{revealed && <><Typography>{card.typeLabel} · {card.description}</Typography>{mode !== 'identify' && <><Arabic>{card.answer}</Arabic><Typography>{text(card.explanation)}</Typography></>}{mode !== 'identify' && <Box sx={{ display: 'flex', gap: 1, mt: 3 }}><Button fullWidth variant="outlined" onClick={() => advance(true)}>Again</Button><Button fullWidth variant="contained" onClick={() => advance(false)}>Got it</Button></Box>}</>}</Paper>;
}
function PreparedActivity({ activity, show }: {
    activity: string;
    show: (r: Rule) => void;
}) {
    const text=useGrammarDisplay();
    const [rows, setRows] = useState<PreparedRow[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState(''), [offset, setOffset] = useState(0), [index, setIndex] = useState(0), [targetIndex, setTargetIndex] = useState(0), [correct, setCorrect] = useState(false), [feedback, setFeedback] = useState(''), [seed] = useState(() => crypto.randomUUID());
    const load = useCallback(() => { setBusy(true); setError(''); loadGrammar(activity === 'context' ? 'sarf' : 'word_pattern', 'sentence_role', seed, offset).then(data => { setRows(data.prepared.filter(r => sourceValid(r) && typeof r.payload?.arabic === 'string' && typeof r.payload.english === 'string' && Array.isArray(r.payload.targets) && r.payload.targets.length > 0 && r.payload.targets.length <= 3 && r.payload.targets.every(t => Number.isInteger(t.token_index) && t.token_index >= 0 && typeof t.surface === 'string' && (activity === 'context' ? validVerb(t.verb) : Number.isInteger(t.pattern_index) && !!curriculum.patterns[t.pattern_index!] && curriculum.patterns[t.pattern_index!].dictionaryEntryId === t.dictionary_entry_id)))); setIndex(0); setTargetIndex(0); setCorrect(false); }).catch(() => setError('Unable to load sentences. Please try again.')).finally(() => setBusy(false)); }, [activity, seed, offset]);
    useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
    useCorrectAutoAdvance(correct, () => {
      const current = rows[index];
      if (!current) return;
      if (targetIndex + 1 < current.payload.targets.length) setTargetIndex(i => i + 1);
      else { setTargetIndex(0); setIndex(i => i + 1); }
      setCorrect(false); setFeedback('');
    });
    if (busy)
        return <LinearProgress />;
    if (error)
        return <Alert action={<Button onClick={load}>Try again</Button>}>{error}</Alert>;
    const row = rows[index];
    if (!row)
        return <Alert severity="info" action={<Button onClick={() => setOffset(n => n + 5)}>More sentences</Button>}>No more reviewed sentences in this batch.</Alert>;
    const target = row.payload.targets[targetIndex], pattern = curriculum.patterns[target.pattern_index ?? 0];
    return <Paper data-word-pattern-workspace={activity === 'patterns' ? true : undefined} sx={{...cardStyle,textAlign:'center',...(activity === 'patterns' ? {resize:{xs:'none',md:'both'},overflow:'auto',width:{xs:'100%',md:'80%'},mx:'auto',minWidth:{md:500},minHeight:420,maxWidth:'100%',maxHeight:{md:'85dvh'}} : {})}} variant="outlined"><Box dir="rtl" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>{row.payload.arabic.split(/\s+/).map((word, i) => <Typography key={i} lang="ar" dir="rtl" sx={{ ...arabicStyle, bgcolor: i === target.token_index ? 'color-mix(in srgb,var(--awm-gold) 20%,transparent)' : undefined, borderRadius: 1 }}>{text(word)}</Typography>)}</Box><English>{row.payload.english}</English><Typography variant="caption">{row.source_label}</Typography>{activity === 'context' ? <Arabic>{target.verb?.root ?? ''}</Arabic> : null}<Instruction>{activity === 'context' ? 'Which verb form is highlighted?' : 'Which word pattern is highlighted?'}</Instruction><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1 }}>{(activity === 'context' ? (target.verb?.quadriliteral_pattern ? Object.entries(curriculum.quadriliteral).map(([id, p]) => ({ id, label: p.label })) : roman.map((r, i) => ({ id: String(i + 1), label: `Form ${r}` }))) : curriculum.patterns.map((p, i) => ({ id: String(i), label: p.pattern }))).map(choice => <Button key={choice.id} variant="outlined" disabled={!!feedback} sx={{ minHeight: 52, fontFamily:activity === 'patterns' ? 'var(--font-serif)' : undefined, '&&':{fontSize:activity === 'patterns' ? 'var(--grammar-arabic-size)' : 'var(--grammar-english-size)'} }} onClick={() => { const answer = activity === 'context' ? (target.verb!.quadriliteral_pattern ?? String(target.verb!.form)) : String(target.pattern_index); const ok = choice.id === answer; setCorrect(ok); setFeedback(ok ? 'Correct \u2713' : `Incorrect. Correct answer: ${activity === 'context' ? formLabel(target.verb!) : pattern.pattern}.`); }}>{text(choice.label)}</Button>)}</Box><>{feedback && <Feedback correct={correct}>{text(correct ? (activity === 'patterns' ? pattern.tendency : target.meaning ?? '') : feedback)}</Feedback>}</>{activity === 'patterns' && <Button startIcon={<InfoOutlined />} onClick={() => { if (activity === 'patterns')
        show({ title: 'Word pattern', sections: [{ heading: 'Pattern', arabic: pattern.pattern }, { heading: 'Meaning tendency', text: pattern.tendency }, { heading: 'Attested example', arabic: pattern.example, translation: pattern.meaning }] });
    else {
        const v = target.verb!, f = v.form ? curriculum.forms[v.form - 1] : (curriculum.quadriliteral as Record<string, Omit<typeof curriculum.forms[number], "example">>)[v.quadriliteral_pattern!];
        show({ title: formLabel(v), sections: [{ heading: 'Pattern', arabic: f.past }, { heading: 'Present', arabic: f.present }, { heading: 'Verbal noun', arabic: f.masdar }, { heading: 'Meaning tendency', text: f.tendency }, { heading: 'Meaning in context', text: target.meaning }] });
    } }}>Information</Button>}<Button fullWidth variant="contained" disabled={!feedback} onClick={() => { if (targetIndex + 1 < row.payload.targets.length)
        setTargetIndex(i => i + 1);
    else {
        setTargetIndex(0);
        setIndex(i => i + 1);
    } setCorrect(false); setFeedback(''); }}>{correct ? 'Next' : 'Continue'}</Button></Paper>;
}
