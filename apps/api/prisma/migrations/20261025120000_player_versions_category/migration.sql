-- The live Player Versions category was created under an AC Milan product slug.
UPDATE "categories"
SET
  "slug" = 'player-versions',
  "description" = 'Player-version football jerseys: the slimmer match cut worn on the pitch, in club and national kits.',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'ac-milan-26-27-away-master-version';
