import {describe,it,expect} from 'vitest'
import {normaliseManualTranscript,transcriptVideoId,transcriptResultHref} from './manualTranscripts'
const srt='2\n00:00:01,200 --> 00:00:03,700\nتعلم العربية\n\n1\n00:00:10,000 --> 00:00:12,500\nالعربية جميلة'
describe('manual transcript boundary',()=>{
 it('reuses canonical YouTube IDs',()=>{for(const url of ['https://youtu.be/Dgj9fQYbCZY?t=3','https://youtube.com/watch?v=Dgj9fQYbCZY','Dgj9fQYbCZY'])expect(transcriptVideoId(url)).toBe('Dgj9fQYbCZY');expect(()=>transcriptVideoId('https://evil.test/watch?v=Dgj9fQYbCZY')).toThrow();expect(()=>transcriptVideoId('https://name@youtube.com/watch?v=Dgj9fQYbCZY')).toThrow()})
 it('orders real millisecond cues and pairs English by timing',()=>{const result=normaliseManualTranscript(srt,'1\n00:00:01,200 --> 00:00:03,700\nLearn Arabic\n\n2\n00:00:10,000 --> 00:00:12,500\nArabic is beautiful');expect(result.content).toEqual([{text:'تعلم العربية',offset:1200,duration:2500,english:'Learn Arabic'},{text:'العربية جميلة',offset:10000,duration:2500,english:'Arabic is beautiful'}])})
 it('accepts VTT metadata and explicit pasted ranges without guessing',()=>{expect(normaliseManualTranscript('WEBVTT\n\n00:01.200 --> 00:03.700 align:start\n<b>تعلم العربية</b>').content[0]).toEqual({text:'تعلم العربية',offset:1200,duration:2500});expect(normaliseManualTranscript('[00:00:01.200 --> 00:00:03.700] تعلم العربية').content[0].duration).toBe(2500)})
 it.each(['plain untimed Arabic: تعلم العربية','00:00:01,200 --> 00:00:01,200\nتعلم','00:00:62,000 --> 00:01:03,000\nتعلم'])('rejects untimed or invalid original %s',text=>{expect(()=>normaliseManualTranscript(text)).toThrow()})
 it('rejects mismatched and ambiguous translations',()=>{expect(()=>normaliseManualTranscript(srt,'00:00:01,200 --> 00:00:04,700\nWrong interval')).toThrow();expect(()=>normaliseManualTranscript(srt,'00:00:01,200 --> 00:00:03,700\nOne\n\n00:00:01,200 --> 00:00:03,700\nTwo')).toThrow()})
 it('keeps fractional seek seconds in the internal viewer URL',()=>{expect(transcriptResultHref('11111111-1111-4111-8111-111111111111',300.18)).toBe('/transcripts/11111111-1111-4111-8111-111111111111?t=300.18')})
})

it('imports adjacent explicitly timed pasted lines as separate cues',()=>{const text='[00:00:01.000 --> 00:00:02.000] \u062a\u0639\u0644\u0645\n[00:00:03.000 --> 00:00:04.000] \u0639\u0631\u0628\u064a';expect(normaliseManualTranscript(text).content.map(c=>c.offset)).toEqual([1000,3000])})
it('rejects multiple subtitle time ranges in one cue rather than swallowing timing text',()=>{expect(()=>normaliseManualTranscript('1\n00:00:01.000 --> 00:00:02.000\n\u062a\u0639\u0644\u0645\n2\n00:00:03.000 --> 00:00:04.000\n\u0639\u0631\u0628\u064a')).toThrow('blank lines')})

it('accepts English and refuses to reorder source cues',()=>{expect(normaliseManualTranscript('00:00:01,000 --> 00:00:03,000\nEnglish only').content[0].text).toBe('English only');expect(()=>normaliseManualTranscript('00:00:10,000 --> 00:00:12,000\nLater\n\n00:00:01,000 --> 00:00:02,000\nEarlier')).toThrow('timestamp-order')})
