-- Supprime l'ancien check
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_slug_check;

-- Recrée le check avec la nouvelle limite
ALTER TABLE public.events
ADD CONSTRAINT events_slug_check
CHECK (
  char_length(slug) >= 3
  AND char_length(slug) <= 150
);