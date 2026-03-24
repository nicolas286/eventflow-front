  insert into user_profile (
  user_id
)
select id
from auth.users
where email = 'test@test.com'
on conflict (user_id) do nothing;