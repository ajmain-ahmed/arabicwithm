alter table public.books
  add column if not exists reading_time_minutes integer
  check (reading_time_minutes is null or reading_time_minutes > 0);

comment on column public.books.reading_time_minutes is
  'Estimated reading duration in whole minutes';

update public.books
set description = 'An Arabic mafia crime drama set in Al-Marsa Al-Abyad, exploring loyalty, pressure, secrecy, ambition and consequence through a tense adult story written in sophisticated Modern Standard Arabic.'
where id = '6e48b69e-68db-4b80-88c5-f38a7a611cd1'
  and nullif(trim(description), '') is null;

update public.books
set description = 'Reem navigates work, study, errands and changing appointments in a practical beginner story about making small plans and managing a busy week.'
where id = '27a6ba6a-a1e3-4584-bdde-49842be91ea3'
  and nullif(trim(description), '') is null;

update public.books
set description = 'After a guilty verdict sends Daniel Mercer to prison, he studies the case from behind bars and searches for the overlooked proof that could expose the truth.'
where id = '534cf977-42a7-4989-914b-2f58395779c4'
  and nullif(trim(description), '') is null;

notify pgrst, 'reload schema';
