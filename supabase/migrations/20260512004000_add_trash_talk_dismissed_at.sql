alter table public.trash_talk_messages
add column dismissed_at timestamptz;

create policy "trash_talk_update_recipient"
on public.trash_talk_messages
for update
using (private.is_own_member(recipient_member_id))
with check (private.is_own_member(recipient_member_id));
