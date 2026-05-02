-- Allow 'holiday' status in attendance_records
-- Drop the old check constraint and add new one with 'holiday' included

ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN ('present', 'absent', 'holiday'));
