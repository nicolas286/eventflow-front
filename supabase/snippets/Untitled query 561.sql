SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.events'::regclass;