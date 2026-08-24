alter table public.books
  add column if not exists tags text[] not null default '{}';

comment on column public.books.tags is 'Secondary catalogue tags derived from the book content';

update public.shows set category = 'Islamic Heritage' where slug in ('omar', 'bism');

update public.episodes set description = 'Aomine’s instinctive street-basketball style overwhelms the players, forcing them to recognise that his moves are anything but ordinary.', tags = array['Basketball', 'Competition', 'Dialogue'] where slug = 'misc-5';
update public.episodes set description = 'Hassan is confronted about hurting others and warned that his violent behaviour will cost him a place on the basketball team.', tags = array['School', 'Behaviour', 'Dialogue'] where slug = 'misc-6';
update public.episodes set description = 'Hassan receives an invitation to join his school basketball club and excitedly imagines becoming one of its star players.', tags = array['Basketball', 'School', 'Ambition'] where slug = 'misc-7';
update public.episodes set description = 'A proud princess expects a poor musician to serve her, but he insists that she share the household work and prepare her own food.', tags = array['Fairy Tale', 'Responsibility', 'Dialogue'] where slug = 'misc-8';
update public.episodes set description = 'A fifteen-year-old asks to join a dangerous mission to rescue captives from pirates at al-Daybul, explaining how he learned where they are held.', tags = array['History', 'Courage', 'Dialogue'] where slug = 'misc-9';
update public.episodes set description = 'An arrogant princess mocks each of her suitors for his appearance, hurting a prince who sincerely loves her.', tags = array['Fairy Tale', 'Character', 'Narration'] where slug = 'misc-10';
update public.episodes set description = 'On her nineteenth birthday, Lena feels uncertain about her future while fielding an offer to represent a cosmetics campaign she cannot ethically support.', tags = array['Coming of Age', 'Career', 'Dialogue'] where slug = 'misc-11';
update public.episodes set description = 'A dragon proposes a dangerous bargain: earn the Monkey King’s trust, then steal his powerful weapon.', tags = array['Fantasy', 'Deception', 'Dialogue'] where slug = 'misc-12';
update public.episodes set description = 'Āsiya openly declares her faith in Allah before Pharaoh, challenges his denial of Musa’s signs, and refuses to accept his claim to lordship.', tags = array['Islamic History', 'Faith', 'Courage'] where slug = 'qss-7';
update public.episodes set description = 'A princess speaks honestly with a beast about appearance and wisdom, refusing to flatter him while recognising the thoughtfulness behind his words.', tags = array['Fairy Tale', 'Honesty', 'Dialogue'] where slug = 'misc-13';
update public.episodes set description = 'The rebellious Monkey King argues over whether his legendary weapon makes him a hero or leaves him isolated from everyone around him.', tags = array['Fantasy', 'Identity', 'Dialogue'] where slug = 'misc-14';
update public.episodes set description = 'Khabbab welcomes Umar’s change of heart and tells him of the Prophet’s prayer before taking him to meet the Messenger and his companions.', tags = array['Islamic History', 'Faith', 'Biography'] where slug = 'omar-3';
update public.episodes set description = 'Barney’s classmates ridicule his malfunctioning B-Bot when it cannot perform its basic purpose of making friends.', tags = array['School', 'Friendship', 'Technology'] where slug = 'misc-15';
update public.episodes set description = 'Abu Bakr stands beside the Prophet at the Kaaba, defends his right to worship Allah, and remains devoted even after being attacked.', tags = array['Islamic History', 'Faith', 'Courage'] where slug = 'omar-4';
update public.episodes set description = 'Charlie struggles with immediate regret after saying something hurtful and tries to recover from the awkward encounter.', tags = array['Regret', 'Relationships', 'Dialogue'] where slug = 'misc-16';
update public.episodes set description = 'A student who skipped school for an internet café is confronted about lying to his mother and neglecting a required lecture.', tags = array['School', 'Responsibility', 'Dialogue'] where slug = 'misc-17';
update public.episodes set description = 'A hopeful performer accepts the challenge of making a ruler’s daughter laugh and finally succeeds in lifting her lifelong gloom.', tags = array['Fairy Tale', 'Humour', 'Narration'] where slug = 'misc-18';
update public.episodes set description = 'A girl reluctantly sells the donkey she inherited from her father so that she can find work and support herself.', tags = array['Hardship', 'Work', 'Narration'] where slug = 'misc-19';
update public.episodes set description = 'Trapped by a shackle and terrified that stolen treasure will expose him, a man sends Marjana to fetch a keymaker in secret.', tags = array['Adventure', 'Danger', 'Dialogue'] where slug = 'misc-20';
update public.episodes set description = 'Aladdin promises to care for the princess and accepts the ruler’s challenge to build her a magnificent palace in a single night.', tags = array['Fairy Tale', 'Promises', 'Dialogue'] where slug = 'misc-21';
update public.episodes set description = 'At an orphanage, Jerusha is ordered to supervise cleaning and miss an important school exam despite her objections.', tags = array['School', 'Responsibility', 'Hardship'] where slug = 'misc-22';
update public.episodes set description = 'Before her father travels, Belle asks only for his safe return and a bouquet of flowers rather than an expensive gift.', tags = array['Family', 'Travel', 'Dialogue'] where slug = 'misc-23';
update public.episodes set description = 'Sherman is mocked over his lunch and family, while another student tries to correct the bullies’ assumptions.', tags = array['School', 'Bullying', 'Dialogue'] where slug = 'misc-24';
update public.episodes set description = 'Two young rivals argue over whose Dragon Ball shines more and who is capable of keeping the precious objects safe.', tags = array['Anime', 'Adventure', 'Competition'] where slug = 'dbz-3';
update public.episodes set description = 'A late customer and a shopkeeper discuss how a severe storm—and the wider climate disaster—has kept everyone indoors.', tags = array['Climate', 'Everyday Arabic', 'Dialogue'] where slug = 'misc-25';

update public.books
set description = 'Layla’s shadow stops copying her and begins moving independently, leading Layla through a playful story about frustration, cooperation, and sharing the lead.',
    tags = array['Children', 'Friendship', 'Cooperation', 'Fantasy']
where slug = 'ch-1';

update public.books
set description = 'After an accident erases Mariam’s recent memories, she returns to a home and marriage she cannot remember while deciding what trust and identity mean to her now.',
    tags = array['Mystery', 'Memory', 'Relationships', 'Identity']
where slug = 'the-stranger-who-knows-my-name';

update public.books
set description = 'A practical guide to effective learning through retrieval, spacing, purposeful practice, suitable tools, and study systems that adapt to real life.',
    tags = array['Learning', 'Study Skills', 'Memory', 'Self-development']
where slug = 'when-learning-feels-real';
