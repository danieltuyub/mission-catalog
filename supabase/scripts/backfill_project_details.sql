-- One-off backfill: persist, for every existing project, the placeholder text the detail
-- page used to generate in the frontend. Run it in the Supabase SQL editor AFTER applying
-- the migration that adds `projects.details`.
--
-- Idempotent: only touches projects whose `details` is still empty, so re-running it never
-- overwrites text that was written or edited later. Paragraphs are separated by a blank line.

update public.projects p
set details =
  p.name
  || ' nació como un grupo pequeño de familias que decidieron reunirse cada semana en una casa para orar, estudiar la Biblia y compartir la comida. Con el tiempo la comunidad ha crecido de manera natural, y hoy recibe a vecinos, amigos y visitantes'
  || coalesce(' de ' || coalesce(nullif(p.region, ''), nullif(p.country, '')), '')
  || '.'
  || E'\n\n'
  || 'Además de las reuniones, el equipo acompaña a las familias con visitas, apoyo en momentos difíciles y actividades para niños y jóvenes. Si quieres conocer más o visitarnos, escribe o llama a la persona responsable'
  || coalesce(' (' || nullif(p.responsible, '') || ')', '')
  || '.'
where p.details is null or btrim(p.details) = '';
