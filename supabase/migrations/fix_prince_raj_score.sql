-- Prince Raj ka score fix karo
-- Coordinate Geometry Part-2, Class 10, Score: 32/35

UPDATE public.online_test_attempts
SET 
  score = 32,
  total_marks = 35,
  is_completed = true,
  submission_type = 'manual'
WHERE student_id = (
  SELECT id FROM public.students 
  WHERE name ILIKE '%Prince Raj%' 
  LIMIT 1
)
AND test_id = (
  SELECT id FROM public.online_tests 
  WHERE title ILIKE '%Coordinate Geometry Part%2%' 
     OR title ILIKE '%Coordinate Geometry Part- 2%'
  LIMIT 1
);

-- Verify karo ki update hua ya nahi:
SELECT 
  s.name,
  ot.title,
  ota.score,
  ota.total_marks,
  ota.is_completed,
  ota.submitted_at
FROM public.online_test_attempts ota
JOIN public.students s ON s.id = ota.student_id
JOIN public.online_tests ot ON ot.id = ota.test_id
WHERE s.name ILIKE '%Prince%Raj%';
