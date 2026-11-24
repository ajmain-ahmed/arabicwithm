# Phrase crawl dry-run review

Generated 2026-11-24T13:15:06.517Z. Production writes performed: NO.

## Sources

| source | records | scanned | tokenised | plain | structured | unstructured | empty | skipped |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| books | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| shows | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| transcript_groups | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chapters | 134 | 134 | 132 | 0 | 2 | 0 | 0 | 0 |
| episodes | 128 | 128 | 126 | 0 | 0 | 0 | 2 | 0 |
| youtube_transcripts | 182 | 178 | 33 | 0 | 0 | 145 | 0 | 4 |
| vocabulary | 23655 | 23655 | 0 | 0 | 0 | 23655 | 0 | 0 |
| transcript_segments | 12782 | 12751 | 11357 | 1394 | 0 | 0 | 0 | 31 |

Books, Shows and groups are parent inventories. Their Arabic content is scanned through chapters, episodes and transcripts. Personal user imports and unfinished transcripts are excluded explicitly. Website/AWM imports, canonical saved transcripts, English-source Arabic translations and vocabulary examples participate.

The wider schema inventory found 22 content suggestions (unapproved or mirrored canonical edits, excluded), no dictionary-cache rows, private Memory/session/preferences state (excluded), and the Hans dictionary (lexical reference, excluded from passage extraction).

## Extraction

{
  "candidate_phrases": 2318,
  "occurrences": 2845,
  "duplicate_occurrences": 527,
  "already_existing": 6,
  "new_proposed": 2037,
  "borderline": 275,
  "rejected": 24
}

Occurrences are distinct source-unit evidence, not rows to insert. Raw/canonical transcript mirrors are deduplicated where they share parent and segment position.

## Proposed import

There are 2037 proposed expressions. The highest-priority sample below contains up to 50. The CSV and JSON contain the complete proposal.

| phrase_ar_di | phrase_tr | english | cefr | notes |
| --- | --- | --- | --- | --- |
| السَّلَامُ عَلَيْكُمْ | as-salāmu ʿalaykum | peace be upon you |  | Conventional expression; matched within a source sentence |
| إِلَى اللِّقَاءِ | ilā l-liqāʾ | see you |  | Conventional expression; matched within a source sentence |
| إِنْ شَاءَ اللَّهُ | in shāʾa llāh | God willing |  | Conventional expression; matched within a source sentence |
| أَهْلًا وَسَهْلًا | ʾahlan wa-sahlan | welcome |  | Conventional expression; matched within a source sentence |
| بِالنِّسْبَةِ إِلَى | bi-n-nisbati ilā | with regard to |  | Conventional expression; matched within a source sentence |
| بِسْمِ اللَّهِ | bi-smi llāh | in the name of Allah |  | Conventional expression; matched within a source sentence |
| بِغَضِّ النَّظَرِ عَنْ | bi-ghaḍḍi n-naẓari ʿan | regardless of | C1 | Conventional expression; matched within a source sentence |
| بِكُلِّ تَأْكِيدٍ | bi-kulli taʾkīd | certainly |  | Conventional expression; matched within a source sentence |
| جَزَاكَ اللَّهُ خَيْرًا | jazāka llāhu khayran | May Allah reward you with goodness |  | Conventional expression; matched within a source sentence |
| صَبَاحُ الْخَيْرِ | ṣabāḥu l-khayr | good morning |  | Conventional expression; matched within a source sentence |
| عَلَى الرَّغْمِ مِنْ | ʿalā r-raghmi min | despite |  | Conventional expression; matched within a source sentence |
| عَلَى حَدِّ عِلْمِي | ʿalā ḥaddi ʿilmī | as far as I know |  | Conventional expression; matched within a source sentence |
| عَلَى سَبِيلِ الْمِثَالِ | ʿalā sabīli l-mithāl | for example |  | Conventional expression; matched within a source sentence |
| عَلَى كُلِّ حَالٍ | ʿalā kulli ḥāl | in any case |  | Conventional expression; matched within a source sentence |
| فِي الْوَاقِعِ | fī l-wāqiʿ | in fact | A2 | Conventional expression; matched within a source sentence |
| فِي نَفْسِ الْوَقْتِ | fī nafsi l-waqt | at the same time |  | Conventional expression; matched within a source sentence |
| لَا بَأْسَ | lā baʾs | no problem |  | Conventional expression; matched within a source sentence |
| لَا شَكَّ | lā shakk | no doubt |  | Conventional expression; matched within a source sentence |
| مَا شَاءَ اللَّهُ | mā shāʾa llāh | what God has willed |  | Conventional expression; matched within a source sentence |
| مَسَاءُ الْخَيْرِ | masāʾu l-khayr | good evening |  | Conventional expression; matched within a source sentence |
| مَعَ السَّلَامَةِ | maʿa s-salāma | goodbye |  | Conventional expression; matched within a source sentence |
| مِنْ أَجْلِ | min ʾajli | for the sake of |  | Conventional expression; matched within a source sentence |
| مِنْ فَضْلِكَ | min faḍlik | please |  | Conventional expression; matched within a source sentence |
| مِنْ نَاحِيَةٍ أُخْرَى | min nāḥiyatin ʾukhrā | on the other hand |  | Conventional expression; matched within a source sentence |
| وَعَلَيْكُمُ السَّلَامُ | wa-ʿalaykumu s-salām | and peace be upon you |  | Conventional expression; matched within a source sentence |
| آلَ إِلَى | āla ilā | ends up, leads to |  | Authored multi-word lexical entry with one direct English meaning |
| آلَةُ مِزْهَرٍ | ālat mizhar | mizhar instrument |  | Authored multi-word lexical entry with one direct English meaning |
| آنًا فَآنًا | ānan fa-ānan | gradually, little by little |  | Authored multi-word lexical entry with one direct English meaning |
| آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ | ānā’a al-layl wa-aṭrāfa an-nahār | by night and by day |  | Authored multi-word lexical entry with one direct English meaning |
| أَبْدَى رَغْبَةً | abdā raghbah | expressed a desire |  | Authored multi-word lexical entry with one direct English meaning |
| ابْنُ بَجْدَتِهَا | ibn bajdatihā | expert, right person for the job |  | Authored multi-word lexical entry with one direct English meaning |
| ابْيَضَّ وَجْهُهُ | ibyaḍḍa wajhuhu | saved face, gained honor |  | Authored multi-word lexical entry with one direct English meaning |
| اِتَّخَذَ التَّدَابِيرَ اللَّازِمَةَ | ittakhadha at-tadābīra al-lāzimah | took the necessary measures |  | Authored multi-word lexical entry with one direct English meaning |
| اتَّخَذَ مِنْهُ الْوَسِيلَةَ | ittakhadha minhu al-wasīlah | made it the means, used it as the way |  | Authored multi-word lexical entry with one direct English meaning |
| اتَّخَذَ مِنْهُ وَسِيلَةً | ittakhadha minhu wasīlah | used it as a means, made it a tool |  | Authored multi-word lexical entry with one direct English meaning |
| اِتَّصَلَ بِهِ هَاتِفِيًّا | ittaṣala bihi hātifiyyan | called, phoned |  | Authored multi-word lexical entry with one direct English meaning |
| أَتَى الْبُيُوتَ مِنْ أَبْوَابِهَا | atā al-buyūt min abwābihā | does things properly, takes the right approach |  | Authored multi-word lexical entry with one direct English meaning |
| أَثْقَلَ كَاهِلَهُ | athqala kāhilahu | burdened him, weighed him down |  | Authored multi-word lexical entry with one direct English meaning |
| أَجَابَ طَلَبَهُ | ajāba ṭalabahu | complied with his request, granted his request |  | Authored multi-word lexical entry with one direct English meaning |
| اجْتَمَعُوا عَلَى كَلِمَتِهِمْ | ijtamaʿū ʿalā kalimatihim | came to an agreement, united |  | Authored multi-word lexical entry with one direct English meaning |
| أَجْهَشَ بِالْبُكَاءِ | ajhasha bil-bukāʾ | burst into tears, broke down crying |  | Authored multi-word lexical entry with one direct English meaning |
| اِخْتَلَسَ الْخُطَى إِلَى | ikhtalasa al-khuṭā ilā | crept toward, sneaked toward |  | Authored multi-word lexical entry with one direct English meaning |
| أَخَذَ الْكَرَى بِمَعْقِدِ جَفْنِهِ | akhadha al-karā bi-maʿqid jafnih | sleep closed his eyelids |  | Authored multi-word lexical entry with one direct English meaning |
| أَخَذَ بِأَسْبَابِ الْحَضَارَةِ الْحَدِيثَةِ | akhadha bi-asbābi al-ḥaḍārati al-ḥadīthah | adopted modern civilization |  | Authored multi-word lexical entry with one direct English meaning |
| أَخَذَ عَلَى خَاطِرِهِ | ʾaakhadha ʿalaā khaāṭirihi | felt offended, took offense |  | Authored multi-word lexical entry with one direct English meaning |
| أَخْرَجَهُ الْحُزْنُ عَنْ طَوْرِهِ | akhrajahu al-ḥuzn ʿan ṭawrih | grief drove him out of his mind |  | Authored multi-word lexical entry with one direct English meaning |
| أَخْلَى بَيْنَهُ وَبَيْنَ مَا يَقُولُ | ʾakhlaā baynahu wabayna mā yaqūlu | let him speak freely |  | Authored multi-word lexical entry with one direct English meaning |
| أَدْلَى بِدَلْوِهِ | ʾadlaā bidalwihi | made his contribution, added his view |  | Authored multi-word lexical entry with one direct English meaning |
| أَدَّى التَّحِيَّةَ الْعَسْكَرِيَّةَ | addā at-taḥiyyata al-ʿaskariyyah | gave a military salute |  | Authored multi-word lexical entry with one direct English meaning |
| أَذَابَ مُخَّهُ | adhāba mukhkhah | racked his brain |  | Authored multi-word lexical entry with one direct English meaning |

## Borderline sample

These are unverified multi-word authored tokens. Ordinary fragments may be present. None are approved for automatic import.

| phrase_ar_di | phrase_tr | english | notes |
| --- | --- | --- | --- |
| أَبُوهُ—لَا | ʾabūhu—lā | his father—I don't | Multi-word authored token; phrase-level meaning needs review |
| أَخْبَرَهُ بِـ | akhbarahu bi- |  | Multi-word lexical entry requires sense review |
| إِذَا دَرَسْتَ | ʾidhā darasta | if you were to study | Multi-word authored token; phrase-level meaning needs review |
| إِذَا كُنَّا نُحَاوِلُ | ʾidhā kunnā nuḥāwilu | if we're trying | Multi-word authored token; phrase-level meaning needs review |
| إِذَنْ لَدَيْكَ | ʾidhan ladayka | - So you got | Multi-word authored token; phrase-level meaning needs review |
| اِسْتَعَدَّ لِـ | istaʿadda li |  | Multi-word lexical entry requires sense review |
| أَشْبَهُ شَيْءٍ بِـ | ashbahu shayʾin bi- |  | Multi-word lexical entry requires sense review |
| أَشْعُرُ أَنَّ | ʾashʿuru ʾanna | I feel like | Multi-word authored token; phrase-level meaning needs review |
| اِعْتَبَرَ بِـ | iʿtabara bi- |  | Multi-word lexical entry requires sense review |
| أَعْنِي حِينَ أَتَنَقَّلُ، | ʾaʿnī ḥīna ʾatanaqqalu, | like when I go around, | Multi-word authored token; phrase-level meaning needs review |
| اِفْتَتَنَ بِـ | iftatana bi |  | Multi-word lexical entry requires sense review |
| أَفْضَلَ قَلِيلًا. | ʾafḍala qalīlan. | a little bit better. | Multi-word authored token; phrase-level meaning needs review |
| أَفْكَارٍ جَدِيدَةٍ | ʾafkārin jadīdatin | new ideas | Multi-word authored token; phrase-level meaning needs review |
| الِاخْتِرَاعَ الْجَمَاعِيَّ. | aliākhtirāʿa aljamāʿiyya. | group invention. | Multi-word authored token; phrase-level meaning needs review |
| الِاخْتِرَاعَ الْحَقِيقِيَّ، | aliākhtirāʿa alḥaqīqiyya, | real invention, | Multi-word authored token; phrase-level meaning needs review |
| الِاعْتِرَاضَاتِ السَّهْلَةِ | aliāʿtirāḍāti alssahlati | easy objections | Multi-word authored token; phrase-level meaning needs review |
| التَّجَوُّلَ الْفِكْرِيَّ | alttajawwula alfikriyya | wandering | Multi-word authored token; phrase-level meaning needs review |
| التَّحْسِينُ التَّدْرِيجِيُّ | alttaḥsīnu alttadrījiyyu | Incremental improvement | Multi-word authored token; phrase-level meaning needs review |
| التَّفْكِيرِ الْجَانِبِيِّ الْحَقِيقِيِّ، | alttafkīri aljānibiyyi alḥaqīqiyyi, | real lateral thinking, | Multi-word authored token; phrase-level meaning needs review |
| الَّتِي تَجْعَلُ الْعَالَمَ | allatī tajʿalu alʿaalama | that makes the world | Multi-word authored token; phrase-level meaning needs review |
| الَّتِي يَكُونُونَ بِهَا أَذْكِيَاءَ. | allatī yakūnūna bihā ʾadhkiyāʾa. | that they're smart. | Multi-word authored token; phrase-level meaning needs review |
| الْخَطِّ الْمُسْتَقِيمِ | alkhaṭṭi almustaqīmi | straight line | Multi-word authored token; phrase-level meaning needs review |
| الَّذِي أَقُومُ بِهِ | alladhī ʾaqūmu bihi | that I do | Multi-word authored token; phrase-level meaning needs review |
| الَّذِي نَرْسُمُهُ | alladhī narsumuhu | that we're drawing | Multi-word authored token; phrase-level meaning needs review |
| أَلْفُ طَرِيقَةٍ | ʾalfu ṭarīqatin | a thousand ways | Multi-word authored token; phrase-level meaning needs review |

## Rejected sample

There are 24 rejected authored candidates. All available examples up to 25 follow.

| arabic | reason |
| --- | --- |
| 22:10–23:00. | Not a usable multi-word Arabic expression |
| 22:20. | Not a usable multi-word Arabic expression |
| 23:00 | Not a usable multi-word Arabic expression |
| «بِالطَّبْعِ.» | Not a usable multi-word Arabic expression |
| «بِالطَّبْعِ | Not a usable multi-word Arabic expression |
| S.KERR.ADMIN | Not a usable multi-word Arabic expression |
| S.KERR.ADMIN | Not a usable multi-word Arabic expression |
| «بِالطَّبْعِ | Not a usable multi-word Arabic expression |
| بِالطَّبْعِ.» | Not a usable multi-word Arabic expression |
| 70,000 | Not a usable multi-word Arabic expression |
| أُورُوبَّا/أَوْرُوبَّا | Alternative word forms separated by a slash; not a phrase |
| أُورُغُوَاي/أُورُوجُوَاي | Alternative word forms separated by a slash; not a phrase |
| أُورُوبِّيٌّ/أُورُوبِيٌّ | Alternative word forms separated by a slash; not a phrase |
| بِنْبَاشِي/بِيكْبَاشِي/بِينْبَاشِي | Alternative word forms separated by a slash; not a phrase |
| أَجْزَاجِي/أَجْزَاخَانَة | Alternative word forms separated by a slash; not a phrase |
| بِـ/عَلَى/ـهُ | Alternative word forms separated by a slash; not a phrase |
| أَخٌ/أُخْتٌ | Alternative word forms separated by a slash; not a phrase |
| األلوف/بيك | Alternative word forms separated by a slash; not a phrase |
| أُوتُومَاتِيكِيٌّ/أَوْتُومَاتِيكِيٌّ | Alternative word forms separated by a slash; not a phrase |
| ابليز/اثفية/اثمد/اسوج/بربيس/بندورة/بيدق/بيذق/تموز/ثيتل/جاكتة/جام/جاموس/جاه/جراج/حانبة | Alternative word forms separated by a slash; not a phrase |
| بُرْتُغَال/بُورْتُغَال | Alternative word forms separated by a slash; not a phrase |
| بِـ/عَلَى | Alternative word forms separated by a slash; not a phrase |
| بِـ/عَلَى | Alternative word forms separated by a slash; not a phrase |
| 70,000 | Not a usable multi-word Arabic expression |

## Fields and manual precedence

The canonical table is phrases. Fields are id, phrase_ar_di, phrase_tr, english, cefr, notes, created_at and updated_at. ID is GENERATED ALWAYS AS IDENTITY and will be assigned by PostgreSQL on approved insertion. There is no stored CSV field. CSV is an export. Unknown CEFR remains empty. Existing manually curated rows are never updated. Exact, normalized and authored-ID matches are held as existing entries.

## Implementation and checks

scripts/phrase-crawl.mjs performs paginated server-side reads with request deadlines. It uses authored phrase metadata and a conservative reviewed expression matcher across tokens within sentence boundaries. It does not enumerate arbitrary n-grams. Re-run node --env-file=.env.local scripts/phrase-crawl.mjs to rescan future content. The current preview is CSV/JSON/Markdown, without an additional Admin interface or publication-time hooks.

Nine self-checks cover Arabic normalization, clitic spacing, duplicate evidence, ordinary fragments, sentence boundaries, authored phrases, the long religious formula, and exclusion of grammar labels/answers. The initial expression-list encoding error was corrected before these review files were generated.

Only source reads are implemented. No Book, Show, Episode, transcript, vocabulary or Phrase Library record has been modified. No migration is required for this dry run. A production import remains gated on explicit approval of the proposed count and content. Repeated runs overwrite local reports and cannot create database duplicates.