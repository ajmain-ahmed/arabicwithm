-- Cover images are now resolved automatically from slugs under public/covers/.
-- Clear any stale stored paths so they do not confuse future lookups.

update shows set cover = null;
update episodes set cover = null;
