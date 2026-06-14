select
  p.proname,
  pg_get_function_identity_arguments(p.oid)
from pg_proc p
where p.proname = 'get_event_detail_admin_core';