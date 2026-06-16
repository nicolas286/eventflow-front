ALTER TABLE public.event_form_field_groups
  DROP CONSTRAINT IF EXISTS event_form_field_groups_label_check;

ALTER TABLE public.event_form_field_groups
  ADD CONSTRAINT event_form_field_groups_label_check
  CHECK (
    length(trim(both from label)) BETWEEN 1 AND 100
  );

ALTER TABLE public.event_form_field_groups
  ADD CONSTRAINT event_form_field_groups_sort_order_check
  CHECK (
    sort_order BETWEEN 0 AND 10000
  );