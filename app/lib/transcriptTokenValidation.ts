/** Arabic Script AND Unicode Letter, excluding presentation-form vowel marks; same frozen character class in the SQL migration. */
export const ARABIC_LETTER_PATTERN = "[ؠ-ؿف-يٮ-ٯٱ-ۓەۥ-ۦۮ-ۯۺ-ۼۿݐ-ݿࡰ-ࢇࢉ-࢏ࢠ-ࣉﭐ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﺀ-ﻼ𐻂-𐻇𞸀-𞸃𞸅-𞸟𞸡-𞸢𞸤𞸧𞸩-𞸲𞸴-𞸷𞸹𞸻𞹂𞹇𞹉𞹋𞹍-𞹏𞹑-𞹒𞹔𞹗𞹙𞹛𞹝𞹟𞹡-𞹢𞹤𞹧-𞹪𞹬-𞹲𞹴-𞹷𞹹-𞹼𞹾𞺀-𞺉𞺋-𞺛𞺡-𞺣𞺥-𞺩𞺫-𞺻]"
const arabicLetter=new RegExp(ARABIC_LETTER_PATTERN,'u')
export const hasArabicLetter=(value:string):boolean=>arabicLetter.test(value)
