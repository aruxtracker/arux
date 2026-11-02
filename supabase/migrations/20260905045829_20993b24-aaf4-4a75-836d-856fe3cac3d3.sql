-- Lock down SECURITY DEFINER functions
-- handle_new_user is trigger-only; nobody should call it directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- is_list_member / is_list_owner are used inside RLS policies for shared task lists;
-- only signed-in users need them. Remove PUBLIC/anon access.
REVOKE EXECUTE ON FUNCTION public.is_list_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_list_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_list_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_list_owner(uuid, uuid) TO authenticated;