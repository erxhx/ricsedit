-- Prevent the public booking funnel from double-booking a staff member.
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- WHY A DATABASE CONSTRAINT
-- The funnel already calls validateSlot before inserting, but the gap between
-- that check and the insert includes a Square charge — seconds, not
-- milliseconds. Two clients booking overlapping times in that window both pass
-- the check and both insert. The existing unique index only catches an exact
-- same-minute collision; a 2pm set landing across a 2:30pm fill goes through.
--
-- WHY overlap_ok
-- This guard is about the funnel's race, not about what the studio may do.
-- Staff book two people at once on purpose, and the admin path deliberately
-- skips validateSlot. Rows made or moved in the admin set overlap_ok, and the
-- constraint ignores them. Public bookings never set it.

-- 1. The exemption flag.
alter table appointments
  add column if not exists overlap_ok boolean not null default false;

-- 2. Exempt overlaps that already exist, so step 3 can apply. Two pairs of
--    Eric's appointments from Oct/Nov 2025 overlap today; they are historical
--    and were made by staff, so the flag is simply true of them. Written as a
--    self-join rather than hardcoded ids so it stays correct if more turn up.
update appointments a
set    overlap_ok = true
where  a.status in ('confirmed', 'completed', 'blocked')
and    exists (
  select 1 from appointments b
  where  b.id     <> a.id
  and    b.staff   = a.staff
  and    b.date    = a.date
  and    b.status in ('confirmed', 'completed', 'blocked')
  and    a.start_time < b.end_time
  and    a.end_time   > b.start_time
);

-- 3. The guard. tsrange is half-open, so 2:00–3:00 and 3:00–4:00 are fine —
--    matching the half-open overlap test the app uses. Cancelled and no_show
--    are excluded so a freed slot can be rebooked.
create extension if not exists btree_gist;

alter table appointments drop constraint if exists appointments_no_overlap;
alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    staff with =,
    date  with =,
    tsrange(
      ('2000-01-01'::date + start_time)::timestamp,
      ('2000-01-01'::date + end_time)::timestamp
    ) with &&
  )
  where (status in ('confirmed', 'completed', 'blocked') and not overlap_ok);

-- Verify: should return one row named appointments_no_overlap.
-- select conname from pg_constraint where conname = 'appointments_no_overlap';
