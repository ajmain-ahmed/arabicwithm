import { createClient } from '@supabase/supabase-js'

const descriptions = {
  'qss-1': 'Pharaoh and Haman discuss the growing support for Musa after the magicians believe, revealing their pride and fear of losing power.',
  'qss-2': 'A believing mother finds the courage to enter the fire after her infant speaks and reassures her that she stands upon the truth.',
  'inv-3': 'Mark and Eve talk honestly about relationships, identity, family, and the time it takes to understand who they want to become.',
  'qss-3': 'The faithful boy gives his life so the people will believe in Allah, leaving the furious king to order the digging of the trenches.',
  'inv-4': 'William encounters an injured Nolan after the university attack and grows suspicious when he notices blood on Nolan’s hands.',
  'qss-5': 'The faithful boy refuses the king’s command, calls the people to worship Allah, and is rescued from the guards on the mountain.',
  'inv-5': 'Nolan discovers that Donald has been spying on his family and turns on Cecil’s loyal agent in a tense confrontation.',
  'qss-6': 'A blind minister learns that healing comes from Allah, accepts faith, and has his sight restored through the boy’s prayer.',
  'inv-6': 'Nolan rehearses how he might confess the murder of the Guardians to Mark while insisting that duty forced his actions.',
  'inv-7': 'Mark reveals his superhero identity to Amber, only to learn that secrecy and broken trust have already ended their relationship.',
  'sb-3': 'SpongeBob celebrates the anniversary of meeting Squidward by sharing an affectionate scrapbook filled with memories of their friendship.',
  'inv-8': 'Debbie confronts Nolan about the Guardians and orders him out after his evasions destroy the trust built over twenty years.',
  'awgb-1': 'Richard faces a comically difficult test of fatherhood when Anais asks why her brothers no longer want to play with her.',
  'inv-11': 'Nolan and Debbie disagree over Mark’s priorities, his future as a hero, and which parent he should trust for guidance.',
  'inv-12': 'Nolan trains Mark to divert an asteroid, but Mark’s relationship with Amber quickly pulls his attention back to Earth.',
  'inv-13': 'Nolan describes Viltrum’s supposed mission to improve other worlds, while Mark questions why his father really came to Earth.',
  'sb-4': 'SpongeBob discovers the legendary Sizzle Master, a remarkable new spatula that promises to transform his work in the kitchen.',
  'hxh-1': 'Gon questions the story of his father’s death and wonders why his aunt is hiding the truth about a father who may still be alive.',
  'inv-14': 'Mark’s friends tease him about Eve and debate whether the pair are really just friends or could become something more.',
  'inv-15': 'Mark asks Nolan to test his new strength, eager to prove that he can endure a punch and become a hero like his father.',
  'inv-16': 'Nolan tells Mark about Viltrum, its powerful people, and the mission that brought him to Earth before Mark was born.',
  'inv-17': 'Nolan rejects the human life he built and tells Mark that his painful “real education” as a Viltrumite is about to begin.',
  'tmnt-2': 'Donnie unveils a robot ninja designed to keep the turtles safe, then tries to prove that invention and adaptation belong in ninjutsu.',
  'inv-18': 'Nolan tells Mark that every human life will vanish with time, but Mark’s answer reminds him that a son still needs his father.',
  'bism-1': 'A cruel master publicly beats an exhausted slave while onlookers defend the injustice and call for him to be made an example.',
  'inv-19': 'Mark steps into a school confrontation after Todd harasses Amber, even as his friends warn him not to rely on superhuman strength.',
  'bism-2': 'Waraqah ibn Nawfal pleads with a powerful master to stop beating his slave and challenges his ideas of status and nobility.',
  'tmnt-3': 'Splinter warns the turtles that Shredder knows they exist, while the team wrestles with blame, fear, and the danger ahead.',
  'awgb-2': 'Nicole worries that ridicule over Gumball and Darwin’s karate uniforms will damage their confidence and shape their whole future.',
  'str-1': 'Mike excitedly plans spring-break outings with Eleven, while his friends tease him for making every conversation about her.',
  'sb-5': 'SpongeBob unknowingly hires the Tattletale Strangler as his bodyguard and eagerly follows him toward an increasingly suspicious plan.',
  'str-2': 'Hopper gives Mike a quiet warning to keep Eleven safe before the children head into the woods.',
  'omar-2': 'Early Muslims ask Abu Sufyan to leave them to pray in peace, provoking an argument about faith, status, and the leaders of Quraysh.',
  'sb-6': 'SpongeBob sneaks toward Patrick’s secret box, sparking a pillow fight and a painful argument over trust and friendship.',
  'tmnt-4': 'The turtles comfort April after her father is abducted and promise that finding him is now their shared responsibility.',
  'sb-7': 'SpongeBob embraces police work a little too eagerly and arrests a cookie seller for operating without an impossibly specific permit.',
  'ppg-1': 'Bubbles discovers Professor Utonium’s old diary and repeatedly asks to read the private thoughts and secrets inside it.',
  'awgb-3': 'Gumball bargains for a mysterious bowl and discovers an unexpected companion who can understand everything he says.',
  'awgb-4': 'Gumball jokes about his parents’ age until Nicole reminds him that nobody stays young forever.',
  'awgb-5': 'Richard forgets Nicole’s birthday gift and sends Gumball and Darwin on a hurried shopping trip before she arrives home.',
  'sb-8': 'Squidward is horrified to learn that his mother has adopted SpongeBob and Patrick as his new brothers.',
  'yugi-1': 'After Joey loses a duel, Yugi’s mention of his grandfather’s game shop leads the friends toward a mysterious rare card.',
  'awgb-6': 'Darwin confronts Gumball for treating him like a follower while a simple attempt to recover a toy becomes a lesson about respect.',
  'tmnt-5': 'April meets the turtles, struggles to believe what she sees, and receives a very awkward welcome to their hideout.',
  'awgb-7': 'Anais convinces her brothers that contaminated brownies have infected them, then reveals their panic was an online prank.',
  'sb-9': 'Squidward is caught secretly eating Krabby Patties and finally admits that he loves the food he always claimed to hate.',
  'sb-10': 'SpongeBob tries every possible trick to persuade a disgusted Squidward to taste his first Krabby Patty.',
  'awgb-8': 'Gumball tries to repair an accidental insult with clumsy compliments and an increasingly desperate demand for a smile.',
  'awgb-9': 'A supposedly lucky helmet brings sudden good fortune to the Watterson family and raises fears about envy and the evil eye.',
  'ppg-2': 'The girls complain that school photos never look good before remembering who always manages to look perfect.',
  'awgb-10': 'Anais orders Gumball to recover her lost Daisy doll from Tina, forcing her frightened older brother into action.',
  'awgb-11': 'Gumball tries to rescue Daisy with bluster and dramatic threats, but his attempt to intimidate Tina quickly falls apart.',
  'awgb-12': 'Nicole senses disaster while Gumball teases Anais about age, old technology, and an imaginary black-and-white past.',
  'misc-1': 'A wrestler explains how family tragedy, medical costs, and a criminal gang pushed him into becoming the villainous Space Wrestler.',
  'misc-2': 'On the way to a new school, Sally and her father imagine what the principal will be like based on her strict former teacher.',
  'dbz-1': 'Goku and Piccolo compare their training and prepare a risky new combat technique against a confident enemy.',
  'dbz-2': 'Goku hears the story of the strange child found in a spherical craft and realizes that the child in the tale was him.',
  'misc-3': 'Before his first match, Hassan hides his nerves behind jokes and a confident philosophy about controlling counter-attacks.',
  'misc-4': 'Coaches debate pairing a rookie with a stronger player, then watch Hassan surprise everyone with speed and a brilliant interception.',
}

const showDescriptions = {
  cotp: 'Historical scenes from the lives of the Prophet’s companions, featuring faith, leadership, justice, and reflective Classical Arabic narration.',
  dbz: 'Arabic-dubbed Dragon Ball Z scenes about training, combat, teamwork, and Goku’s mysterious origins.',
  hxh: 'Arabic-dubbed Hunter × Hunter scenes exploring Gon’s family, identity, and search for the truth about his father.',
  bism: 'Dramatic scenes from early Makkah confronting slavery, injustice, social status, courage, and the first stirrings of faith.',
  inv: 'Arabic-dubbed superhero drama following Mark, Nolan, and their family through power, identity, loyalty, relationships, and the truth about Viltrum.',
  qss: 'Animated Islamic stories about Musa, the People of the Trench, steadfast believers, miracles, faith, and trust in Allah.',
  misc: 'A varied collection of Arabic-dubbed scenes covering school, sport, family hardship, competition, and everyday conversation.',
  nar: 'Arabic-dubbed Naruto scenes about ambition, rivalry, ninja training, and Naruto’s determination to become Hokage.',
  ppg: 'Light Arabic-dubbed Powerpuff Girls scenes about school, family curiosity, privacy, and everyday childhood comedy.',
  sb: 'Funny Arabic-dubbed SpongeBob scenes full of friendship, food, work, misunderstandings, and lively everyday dialogue.',
  spyx: 'Arabic-dubbed Spy × Family comedy following Anya and her unusual family through secrets, mind-reading, and unexpected danger.',
  str: 'Arabic-dubbed Stranger Things scenes about friendship, young romance, spring-break plans, and Hopper’s protective warnings.',
  tmnt: 'Arabic-dubbed TMNT adventures about April, Shredder, teamwork, technology, courage, and the turtles’ responsibility to protect one another.',
  awgb: 'Arabic-dubbed Gumball comedy about family, friendship, school, sibling schemes, and the chaos of everyday life.',
  omar: 'Historical Arabic drama depicting the earliest Muslim community, its worship, courage, social tensions, and encounters with Quraysh.',
  yugi: 'Arabic-dubbed Yu-Gi-Oh scenes about friendship, duelling, strategy, and the search for rare cards.',
}

const showTags = {
  cotp: ['Islamic History', 'Biography', 'Faith'],
  dbz: ['Anime', 'Action', 'Training'],
  hxh: ['Anime', 'Family', 'Mystery'],
  bism: ['Islamic History', 'Social Justice', 'Drama'],
  inv: ['Superhero', 'Drama', 'Dialogue'],
  qss: ['Islamic History', 'Faith', 'Narration'],
  misc: ['Everyday Arabic', 'Dialogue'],
  nar: ['Anime', 'Action', 'Ambition'],
  ppg: ['Cartoon', 'Comedy', 'School'],
  sb: ['Comedy', 'Everyday Arabic', 'Dialogue'],
  spyx: ['Anime', 'Comedy', 'Family'],
  str: ['Sci-Fi', 'Friendship', 'Dialogue'],
  tmnt: ['Action', 'Teamwork', 'Dialogue'],
  awgb: ['Comedy', 'Family', 'Everyday Arabic'],
  omar: ['Islamic History', 'Faith', 'Dialogue'],
  yugi: ['Anime', 'Games', 'Friendship'],
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')

const apply = process.argv.includes('--apply')
const client = createClient(url, key, { auth: { persistSession: false } })
const [{ data: shows, error: showError }, { data: episodes, error: episodeError }] = await Promise.all([
  client.from('shows').select('id, slug, title, description'),
  client.from('episodes').select('id, show_id, slug, title, description, tags'),
])
if (showError || episodeError) throw new Error(showError?.message ?? episodeError?.message)

const showsById = new Map(shows.map((show) => [show.id, show]))
const episodeUpdates = episodes.map((episode) => {
  const show = showsById.get(episode.show_id)
  if (!show) throw new Error(`Missing show for ${episode.slug}`)
  return {
    id: episode.id,
    slug: episode.slug,
    description: episode.description || descriptions[episode.slug] || `${episode.title}, presented with an interactive Arabic transcript and English translation.`,
    tags: showTags[show.slug] ?? ['Dialogue'],
  }
})

console.log(`Prepared ${episodeUpdates.length} episode updates and ${shows.length} show updates.`)
const genericDescriptions = episodeUpdates.filter((update) => update.description.endsWith('presented with an interactive Arabic transcript and English translation.'))
if (genericDescriptions.length > 0) console.log(`Generic descriptions: ${genericDescriptions.map((update) => update.slug).join(', ')}`)
if (!apply) {
  console.log('Dry run only. Pass --apply to write the metadata.')
} else {
  for (const update of episodeUpdates) {
    const { error } = await client.from('episodes').update({ description: update.description, tags: update.tags }).eq('id', update.id)
    if (error) throw new Error(`${update.slug}: ${error.message}`)
  }
  for (const show of shows) {
    const description = showDescriptions[show.slug] || show.description || `${show.title}, with interactive Arabic transcripts and English translations.`
    const { error } = await client.from('shows').update({ description }).eq('id', show.id)
    if (error) throw new Error(`${show.slug}: ${error.message}`)
  }
  console.log('Metadata backfill complete.')
}
