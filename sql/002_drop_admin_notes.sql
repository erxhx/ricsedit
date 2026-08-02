-- Drop appointments.admin_notes. Run once in the Supabase SQL Editor.
--
-- WHY
-- The column was mapped in lib/db.ts and exposed on the Appointment type, but
-- no component ever rendered it. Staff notes about a client live in the
-- `client_notes` table, keyed by phone — that is what the section LABELLED
-- "Admin notes" in AppointmentDetail reads and writes.
--
-- Two things called "admin notes", only one of them real, is not a stable
-- situation. On 2026-08-02 an import of 65 client notes was written into this
-- column, where nobody could see them, before the working feature was found.
--
-- SAFETY
-- Verified empty before writing this: 0 of 1597 rows held a non-null value.
-- Re-check before running if any time has passed:
--
--   select count(*) from appointments where admin_notes is not null;
--
-- If that returns anything other than 0, stop and look at what wrote it.
--
-- ORDER
-- Safe to run before or after deploying the code change. The code no longer
-- reads or writes the column, and nothing else references it.

alter table appointments drop column if exists admin_notes;

-- Verify: should return no rows.
-- select column_name from information_schema.columns
--  where table_name = 'appointments' and column_name = 'admin_notes';
