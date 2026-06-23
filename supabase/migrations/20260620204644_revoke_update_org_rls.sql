drop policy if exists organizations_update_own on public.organizations;

revoke update on public.organizations from authenticated;