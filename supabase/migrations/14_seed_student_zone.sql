-- ============================================================
-- SEED DATA for YouTube Family / Student Zone
-- Run this AFTER 13_create_student_zone.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. STUDY MATERIALS (PDF Notes with Google Drive links)
-- ──────────────────────────────────────────────────────────
INSERT INTO public.sz_study_materials (title, subject, class_name, youtube_link, drive_link) VALUES
(
  'Class 10 Maths – Chapter 1: Real Numbers (Complete Notes)',
  'Mathematics',
  'Class 10',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-real-numbers/view'
),
(
  'Class 10 Science – Light: Reflection and Refraction Notes',
  'Science',
  'Class 10',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-light-notes/view'
),
(
  'Class 10 Maths – Triangles & Similarity (Formulas Sheet)',
  'Mathematics',
  'Class 10',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-triangles/view'
),
(
  'Class 9 Science – Matter in Our Surroundings – Full Notes',
  'Science',
  'Class 9',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-matter/view'
),
(
  'Class 9 Maths – Number System – Practice Questions PDF',
  'Mathematics',
  'Class 9',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-number-system/view'
),
(
  'Class 10 – Trigonometry Formulas & Tricks (SP Jha Sir)',
  'Mathematics',
  'Class 10',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-trigonometry/view'
),
(
  'Class 10 Hindi – Kshitij Chapter 1 Summary & Notes',
  'Hindi',
  'Class 10',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-hindi-kshitij/view'
),
(
  'Class 9 Social Science – India Size and Location Notes',
  'Social Science',
  'Class 9',
  'https://www.youtube.com/@sunriseclasses81',
  'https://drive.google.com/file/d/sample-sst-india/view'
);

-- ──────────────────────────────────────────────────────────
-- 2. STUDENT DOUBTS (Mix of pending & answered)
-- ──────────────────────────────────────────────────────────
INSERT INTO public.sz_doubts (student_name, class_name, subject, doubt_text, video_link, status, answer_text) VALUES
(
  'Rahul Kumar',
  'Class 10',
  'Mathematics',
  'Sir, Trigonometry mein sin²θ + cos²θ = 1 kaise prove karte hain? Main samajh nahi paa raha tha.',
  'https://www.youtube.com/@sunriseclasses81',
  'answered',
  'Bahut achha sawal hai Rahul! Ek right-angled triangle lo jahan hypotenuse = r, perpendicular = y, base = x. Phir Pythagoras theorem se x² + y² = r². Dono side r² se divide karo: (x/r)² + (y/r)² = 1. Isi ko cos²θ + sin²θ = 1 kehte hain. Practice karo, ho jayega! 💪'
),
(
  'Priya Singh',
  'Class 10',
  'Science',
  'Sir, light ka reflection aur refraction mein kya difference hai? Dono confuse ho jaate hain mere.',
  'https://www.youtube.com/@sunriseclasses81',
  'answered',
  'Priya, simple baat yaad rakho: Reflection = Light usi medium mein wapas aa jaati hai (mirror ki tarah). Refraction = Light ek medium se doosre mein jaati hai aur mudi jaati hai (paani mein pencil tedhi dikhti hai). Mirror = Reflection, Lens = Refraction. ✨'
),
(
  'Amit Yadav',
  'Class 9',
  'Mathematics',
  'Sir Rational aur Irrational numbers ka difference nahi samajh aaya. Koi easy trick batao.',
  NULL,
  'pending',
  NULL
),
(
  'Sonu Kumari',
  'Class 10',
  'Mathematics',
  'Quadratic equations mein discriminant kya hota hai aur iska kya use hai?',
  'https://www.youtube.com/@sunriseclasses81',
  'pending',
  NULL
),
(
  'Deepak Paswan',
  'Class 9',
  'Science',
  'Sir evaporation aur boiling mein kya fark hai? Exam mein ye dono almost same lagte hain.',
  NULL,
  'answered',
  'Deepak, yad rakho: Evaporation = Surface se, kisi bhi temperature par, slowly hoti hai (kapde sukhna). Boiling = Poore liquid mein, ek specific temperature par, rapidly hoti hai (paani garam karna). Evaporation cooling effect deta hai, boiling nahi. Exam ready ho jao! 🔥'
),
(
  'Kajal Jha',
  'Class 10',
  'Hindi',
  'Sir Kshitij ke kavitaon ka bhavarth samjhane wala video aayega kya? Exam mein bahut mushkil lagta hai.',
  'https://www.youtube.com/@sunriseclasses81',
  'pending',
  NULL
);

-- ──────────────────────────────────────────────────────────
-- 3. TOPIC REQUESTS
-- ──────────────────────────────────────────────────────────
INSERT INTO public.sz_topic_requests (student_name, subject, topic_name, status) VALUES
(
  'Rohit Kumar',
  'Class 10 Maths',
  'Sir please Coordinate Geometry ka ek detailed video banayein. Distance formula aur section formula mein bahut confusion hoti hai.',
  'pending'
),
(
  'Anjali Devi',
  'Class 10 Science',
  'Carbon and its Compounds ka video chahiye – especially IUPAC naming bahut tough lagti hai.',
  'pending'
),
(
  'Vikash Sah',
  'Class 9 Maths',
  'Sir Linear Equations in Two Variables – graph banana sikhao please. School mein bilkul nahi samjha.',
  'pending'
),
(
  'Pinky Kumari',
  'Class 10 Hindi',
  'Neta ji ka Chasma aur Balgobin Bhagat ka summary video banao Sir, board mein zarur aata hai.',
  'pending'
),
(
  'Sumit Gupta',
  'Class 10 Maths',
  'Statistics – Mean, Median, Mode ka video chahiye with examples. Direct aur assumed mean method confuse karta hai.',
  'completed'
),
(
  'Renu Kumari',
  'Class 9 Science',
  'Force and Laws of Motion – Newton ke teeno laws practically samjhao sir, with real life examples.',
  'pending'
),
(
  'Arun Singh',
  'Class 10 Science',
  'Heredity and Evolution topic par video banao please. Mendel ke laws aur Punnett square kaise banate hain?',
  'pending'
),
(
  'Seema Jha',
  'Class 10 Maths',
  'Probability ka video chahiye – basic concepts aur problems. Ye topic important hai board ke liye.',
  'completed'
);
