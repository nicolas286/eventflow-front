-- Supprime l'ancien check
ALTER TABLE public.organization_profile
DROP CONSTRAINT IF EXISTS organization_profile_slug_check;

-- Recrée le check avec la nouvelle limite
ALTER TABLE public.organization_profile
ADD CONSTRAINT organization_profile_slug_check
CHECK (
  char_length(slug) >= 3
  AND char_length(slug) <= 150
);