-- ============================================================
-- EduBattle — Comprehensive Demo Seed Data
-- 3 Schools · 5 Teachers each · 50 Students each · 6 Classes each
-- Run in: Supabase Dashboard → SQL Editor (as postgres / service_role)
-- ============================================================

-- ── 0. Ensure timetable table exists ────────────────────────────────────────
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS timetable (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   uuid        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day        text        NOT NULL,      -- 'Monday'..'Friday'
    period     int         NOT NULL,      -- 1..8
    subject_id uuid        REFERENCES subjects(id),
    teacher_id uuid        REFERENCES teachers(id),
    created_at timestamptz DEFAULT now()
  );
  RAISE NOTICE 'timetable table ready';
END;
$$;


-- ============================================================
-- SCHOOL 1 — DPS New Delhi
-- ============================================================
DO $$
DECLARE
  -- school admin
  v_admin_id   uuid := gen_random_uuid();
  v_school_id  uuid;

  -- teacher user IDs
  v_t1 uuid := gen_random_uuid();
  v_t2 uuid := gen_random_uuid();
  v_t3 uuid := gen_random_uuid();
  v_t4 uuid := gen_random_uuid();
  v_t5 uuid := gen_random_uuid();

  -- teacher record IDs
  v_tr1 uuid := gen_random_uuid();
  v_tr2 uuid := gen_random_uuid();
  v_tr3 uuid := gen_random_uuid();
  v_tr4 uuid := gen_random_uuid();
  v_tr5 uuid := gen_random_uuid();

  -- subject IDs
  v_math_id    uuid := gen_random_uuid();
  v_sci_id     uuid := gen_random_uuid();
  v_eng_id     uuid := gen_random_uuid();
  v_hindi_id   uuid := gen_random_uuid();
  v_social_id  uuid := gen_random_uuid();

  -- class IDs
  v_cls8a  uuid := gen_random_uuid();
  v_cls8b  uuid := gen_random_uuid();
  v_cls9a  uuid := gen_random_uuid();
  v_cls9b  uuid := gen_random_uuid();
  v_cls10a uuid := gen_random_uuid();
  v_cls10b uuid := gen_random_uuid();

  -- student loop vars
  v_uid       uuid;
  v_sid       uuid;
  v_rec_id    uuid;
  v_idx       int := 0;
  v_class_id  uuid;
  v_xp_val    int;

  first_names text[] := ARRAY[
    'Aarav','Vivaan','Aditya','Vihaan','Arjun',
    'Sai','Reyansh','Ayaan','Krishna','Ishaan',
    'Shaurya','Atharv','Advik','Pranav','Dhruv',
    'Kabir','Ritvik','Aarush','Arnav','Darsh',
    'Ananya','Diya','Piya','Saanvi','Aadhya',
    'Riya','Siya','Myra','Aanya','Kiara',
    'Navya','Tanvi','Pooja','Priya','Sneha',
    'Isha','Khushi','Mehak','Naina','Ridhi',
    'Rohan','Karan','Nikhil','Rahul','Suresh',
    'Vijay','Manish','Rajesh','Deepak','Sanket'
  ];
  last_names text[] := ARRAY[
    'Sharma','Kumar','Singh','Patel','Gupta',
    'Verma','Mehta','Joshi','Nair','Reddy',
    'Rao','Agarwal','Chopra','Malhotra','Saxena',
    'Bose','Das','Iyer','Pillai','Menon',
    'Shah','Srivastava','Tiwari','Pandey','Mishra',
    'Trivedi','Desai','Bhatt','Jain','Kapoor',
    'Ahuja','Arora','Bhatia','Chadha','Dhawan',
    'Gill','Khanna','Luthra','Narang','Oberoi',
    'Prasad','Rajan','Sethi','Tandon','Uppal',
    'Varma','Walia','Yadav','Zutshi','Bakshi'
  ];

BEGIN

  -- ── School admin auth user ────────────────────────────────────────────────
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES (v_admin_id, 'admin@dps-newdelhi.edubattle.in',
      crypt('School@2025', gen_salt('bf')), now(),
      '{"name":"Ramesh Kumar"}'::jsonb,
      'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, email, name, role)
  VALUES (v_admin_id, 'admin@dps-newdelhi.edubattle.in', 'Ramesh Kumar', 'SCHOOL')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO schools (id, username, board, display_name, user_id, city, state, website, created_at)
  VALUES (gen_random_uuid(), 'dps-newdelhi', 'CBSE', 'DPS New Delhi',
      v_admin_id, 'New Delhi', 'Delhi', 'https://dps.edu.in', now())
  ON CONFLICT (username) DO NOTHING;

  SELECT id INTO v_school_id FROM schools WHERE username = 'dps-newdelhi';

  -- ── Subjects ──────────────────────────────────────────────────────────────
  INSERT INTO subjects (id, name, school_id) VALUES
    (v_math_id,   'Mathematics',    v_school_id),
    (v_sci_id,    'Science',        v_school_id),
    (v_eng_id,    'English',        v_school_id),
    (v_hindi_id,  'Hindi',          v_school_id),
    (v_social_id, 'Social Studies', v_school_id)
  ON CONFLICT DO NOTHING;

  -- ── Teachers auth ─────────────────────────────────────────────────────────
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES
    (v_t1,'t1.dps@dps-newdelhi.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Priya Sharma"}'::jsonb,'authenticated','authenticated',now(),now()),
    (v_t2,'t2.dps@dps-newdelhi.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Rajan Mehta"}'::jsonb, 'authenticated','authenticated',now(),now()),
    (v_t3,'t3.dps@dps-newdelhi.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Sunita Gupta"}'::jsonb,'authenticated','authenticated',now(),now()),
    (v_t4,'t4.dps@dps-newdelhi.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Vikram Nair"}'::jsonb, 'authenticated','authenticated',now(),now()),
    (v_t5,'t5.dps@dps-newdelhi.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Anita Verma"}'::jsonb, 'authenticated','authenticated',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, email, name, role) VALUES
    (v_t1,'t1.dps@dps-newdelhi.edubattle.in','Priya Sharma','TEACHER'),
    (v_t2,'t2.dps@dps-newdelhi.edubattle.in','Rajan Mehta', 'TEACHER'),
    (v_t3,'t3.dps@dps-newdelhi.edubattle.in','Sunita Gupta','TEACHER'),
    (v_t4,'t4.dps@dps-newdelhi.edubattle.in','Vikram Nair', 'TEACHER'),
    (v_t5,'t5.dps@dps-newdelhi.edubattle.in','Anita Verma', 'TEACHER')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO teachers (id, user_id, school_id) VALUES
    (v_tr1, v_t1, v_school_id),
    (v_tr2, v_t2, v_school_id),
    (v_tr3, v_t3, v_school_id),
    (v_tr4, v_t4, v_school_id),
    (v_tr5, v_t5, v_school_id)
  ON CONFLICT DO NOTHING;

  -- ── Classes ───────────────────────────────────────────────────────────────
  INSERT INTO classes (id, school_id, name, section, class_teacher_id) VALUES
    (v_cls8a,  v_school_id, 'Grade 8',  'A', v_tr1),
    (v_cls8b,  v_school_id, 'Grade 8',  'B', v_tr2),
    (v_cls9a,  v_school_id, 'Grade 9',  'A', v_tr3),
    (v_cls9b,  v_school_id, 'Grade 9',  'B', v_tr4),
    (v_cls10a, v_school_id, 'Grade 10', 'A', v_tr5),
    (v_cls10b, v_school_id, 'Grade 10', 'B', v_tr1)
  ON CONFLICT DO NOTHING;

  -- ── Class subjects ────────────────────────────────────────────────────────
  INSERT INTO class_subjects (class_id, subject_id, teacher_id, school_id)
  SELECT c.id, s.id,
    CASE s.id
      WHEN v_math_id   THEN v_tr1
      WHEN v_sci_id    THEN v_tr2
      WHEN v_eng_id    THEN v_tr3
      WHEN v_hindi_id  THEN v_tr4
      WHEN v_social_id THEN v_tr5
    END,
    v_school_id
  FROM classes c
  CROSS JOIN (
    SELECT unnest(ARRAY[v_math_id, v_sci_id, v_eng_id, v_hindi_id, v_social_id]) AS id
  ) s
  WHERE c.school_id = v_school_id
  ON CONFLICT DO NOTHING;

  -- ── 50 Students via loop ──────────────────────────────────────────────────
  FOR v_idx IN 1..50 LOOP
    v_uid := gen_random_uuid();
    v_sid := gen_random_uuid();
    v_rec_id := gen_random_uuid();

    -- distribute across 6 classes: ~8-9 each
    v_class_id := CASE
      WHEN v_idx BETWEEN  1 AND  9 THEN v_cls8a
      WHEN v_idx BETWEEN 10 AND 17 THEN v_cls8b
      WHEN v_idx BETWEEN 18 AND 26 THEN v_cls9a
      WHEN v_idx BETWEEN 27 AND 34 THEN v_cls9b
      WHEN v_idx BETWEEN 35 AND 42 THEN v_cls10a
      ELSE v_cls10b
    END;

    -- varied XP 500-8000
    v_xp_val := 500 + ((v_idx * 157 + 83) % 7500);

    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_uid,
      lower(first_names[v_idx]) || '.' || lower(last_names[v_idx]) || '@dps-newdelhi.edubattle.in',
      crypt('Student@2025', gen_salt('bf')),
      now(),
      jsonb_build_object('name', first_names[v_idx] || ' ' || last_names[v_idx]),
      'authenticated', 'authenticated', now(), now()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO users (id, email, name, role) VALUES (
      v_uid,
      lower(first_names[v_idx]) || '.' || lower(last_names[v_idx]) || '@dps-newdelhi.edubattle.in',
      first_names[v_idx] || ' ' || last_names[v_idx],
      'STUDENT'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO students (id, user_id, school_id) VALUES (v_sid, v_uid, v_school_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO student_records (id, student_id, class_id, is_current)
    VALUES (v_rec_id, v_sid, v_class_id, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO student_xp (student_records_id, total_xp) VALUES (v_rec_id, v_xp_val)
    ON CONFLICT (student_records_id) DO UPDATE SET total_xp = EXCLUDED.total_xp;

    INSERT INTO xp_logs (student_records_id, xp, source, created_at)
    VALUES
      (v_rec_id, (v_xp_val / 5),     'ASSIGNMENT', now() - ((v_idx % 7)     || ' days')::interval),
      (v_rec_id, (v_xp_val / 8),     'GAME',       now() - ((v_idx % 5 + 1) || ' days')::interval),
      (v_rec_id, (v_xp_val / 12),    'QUIZ',       now() - ((v_idx % 3 + 1) || ' days')::interval);
  END LOOP;

  -- ── Leaderboards ──────────────────────────────────────────────────────────
  INSERT INTO leaderboards (class_id, student_records_id, rank, xp)
  SELECT
    sr.class_id,
    sr.id,
    ROW_NUMBER() OVER (PARTITION BY sr.class_id ORDER BY sx.total_xp DESC),
    sx.total_xp
  FROM student_records sr
  JOIN student_xp sx ON sx.student_records_id = sr.id
  JOIN classes c ON c.id = sr.class_id
  WHERE c.school_id = v_school_id
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '=== DPS New Delhi seeded ===';
  RAISE NOTICE 'Admin  : admin@dps-newdelhi.edubattle.in  /  School@2025';
  RAISE NOTICE 'Teachers (Password: Teacher@2025):';
  RAISE NOTICE '  t1.dps@dps-newdelhi.edubattle.in  (Priya Sharma)';
  RAISE NOTICE '  t2.dps@dps-newdelhi.edubattle.in  (Rajan Mehta)';
  RAISE NOTICE '  t3.dps@dps-newdelhi.edubattle.in  (Sunita Gupta)';
  RAISE NOTICE '  t4.dps@dps-newdelhi.edubattle.in  (Vikram Nair)';
  RAISE NOTICE '  t5.dps@dps-newdelhi.edubattle.in  (Anita Verma)';
  RAISE NOTICE 'Sample Students (Password: Student@2025):';
  RAISE NOTICE '  aarav.sharma@dps-newdelhi.edubattle.in   (Grade 8-A)';
  RAISE NOTICE '  ananya.patel@dps-newdelhi.edubattle.in   (Grade 8-A)';
  RAISE NOTICE '  rohan.singh@dps-newdelhi.edubattle.in    (Grade 9-A)';
  RAISE NOTICE '  diya.verma@dps-newdelhi.edubattle.in     (Grade 10-A)';

END;
$$;


-- ============================================================
-- SCHOOL 2 — KV Mumbai
-- ============================================================
DO $$
DECLARE
  v_admin_id   uuid := gen_random_uuid();
  v_school_id  uuid;

  v_t1 uuid := gen_random_uuid();
  v_t2 uuid := gen_random_uuid();
  v_t3 uuid := gen_random_uuid();
  v_t4 uuid := gen_random_uuid();
  v_t5 uuid := gen_random_uuid();

  v_tr1 uuid := gen_random_uuid();
  v_tr2 uuid := gen_random_uuid();
  v_tr3 uuid := gen_random_uuid();
  v_tr4 uuid := gen_random_uuid();
  v_tr5 uuid := gen_random_uuid();

  v_math_id    uuid := gen_random_uuid();
  v_sci_id     uuid := gen_random_uuid();
  v_eng_id     uuid := gen_random_uuid();
  v_hindi_id   uuid := gen_random_uuid();
  v_social_id  uuid := gen_random_uuid();

  v_cls8a  uuid := gen_random_uuid();
  v_cls8b  uuid := gen_random_uuid();
  v_cls9a  uuid := gen_random_uuid();
  v_cls9b  uuid := gen_random_uuid();
  v_cls10a uuid := gen_random_uuid();
  v_cls10b uuid := gen_random_uuid();

  v_uid      uuid;
  v_sid      uuid;
  v_rec_id   uuid;
  v_idx      int := 0;
  v_class_id uuid;
  v_xp_val   int;

  first_names text[] := ARRAY[
    'Arjun','Sai','Reyansh','Ayaan','Krishna',
    'Ishaan','Shaurya','Atharv','Advik','Pranav',
    'Dhruv','Kabir','Ritvik','Aarush','Arnav',
    'Darsh','Parth','Yash','Harsh','Dev',
    'Ananya','Diya','Piya','Saanvi','Aadhya',
    'Riya','Siya','Myra','Aanya','Kiara',
    'Tanvi','Pooja','Priya','Sneha','Isha',
    'Khushi','Mehak','Naina','Ridhi','Simran',
    'Rahul','Nikhil','Suresh','Vijay','Manish',
    'Rajesh','Deepak','Sanket','Akash','Rohit'
  ];
  last_names text[] := ARRAY[
    'Rao','Nair','Pillai','Menon','Iyer',
    'Krishnamurthy','Subramanian','Venkatesh','Murthy','Balasubramanian',
    'Shetty','Kamath','Pai','Prabhu','Hegde',
    'Kulkarni','Joshi','Deshpande','Gokhale','Chitnis',
    'Shah','Mehta','Parikh','Thakkar','Patel',
    'Desai','Bhatt','Modi','Trivedi','Vora',
    'Agarwal','Gupta','Sharma','Verma','Singh',
    'Kumar','Pandey','Mishra','Tiwari','Saxena',
    'Chopra','Malhotra','Kapoor','Khanna','Arora',
    'Bhatia','Chawla','Dhawan','Gill','Oberoi'
  ];

BEGIN

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES (v_admin_id, 'admin@kv-mumbai.edubattle.in',
      crypt('School@2025', gen_salt('bf')), now(),
      '{"name":"Sunita Rao"}'::jsonb,
      'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, email, name, role)
  VALUES (v_admin_id, 'admin@kv-mumbai.edubattle.in', 'Sunita Rao', 'SCHOOL')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO schools (id, username, board, display_name, user_id, city, state, website, created_at)
  VALUES (gen_random_uuid(), 'kv-mumbai', 'CBSE', 'KV Mumbai',
      v_admin_id, 'Mumbai', 'Maharashtra', 'https://kvmumbai.edu.in', now())
  ON CONFLICT (username) DO NOTHING;

  SELECT id INTO v_school_id FROM schools WHERE username = 'kv-mumbai';

  INSERT INTO subjects (id, name, school_id) VALUES
    (v_math_id,   'Mathematics',    v_school_id),
    (v_sci_id,    'Science',        v_school_id),
    (v_eng_id,    'English',        v_school_id),
    (v_hindi_id,  'Hindi',          v_school_id),
    (v_social_id, 'Social Studies', v_school_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES
    (v_t1,'t1.kv@kv-mumbai.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Amit Kulkarni"}'::jsonb, 'authenticated','authenticated',now(),now()),
    (v_t2,'t2.kv@kv-mumbai.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Rekha Shetty"}'::jsonb,  'authenticated','authenticated',now(),now()),
    (v_t3,'t3.kv@kv-mumbai.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Dinesh Pawar"}'::jsonb,  'authenticated','authenticated',now(),now()),
    (v_t4,'t4.kv@kv-mumbai.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Lata Joshi"}'::jsonb,    'authenticated','authenticated',now(),now()),
    (v_t5,'t5.kv@kv-mumbai.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Nitin Shah"}'::jsonb,    'authenticated','authenticated',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, email, name, role) VALUES
    (v_t1,'t1.kv@kv-mumbai.edubattle.in','Amit Kulkarni','TEACHER'),
    (v_t2,'t2.kv@kv-mumbai.edubattle.in','Rekha Shetty', 'TEACHER'),
    (v_t3,'t3.kv@kv-mumbai.edubattle.in','Dinesh Pawar', 'TEACHER'),
    (v_t4,'t4.kv@kv-mumbai.edubattle.in','Lata Joshi',   'TEACHER'),
    (v_t5,'t5.kv@kv-mumbai.edubattle.in','Nitin Shah',   'TEACHER')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO teachers (id, user_id, school_id) VALUES
    (v_tr1, v_t1, v_school_id),
    (v_tr2, v_t2, v_school_id),
    (v_tr3, v_t3, v_school_id),
    (v_tr4, v_t4, v_school_id),
    (v_tr5, v_t5, v_school_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO classes (id, school_id, name, section, class_teacher_id) VALUES
    (v_cls8a,  v_school_id, 'Grade 8',  'A', v_tr1),
    (v_cls8b,  v_school_id, 'Grade 8',  'B', v_tr2),
    (v_cls9a,  v_school_id, 'Grade 9',  'A', v_tr3),
    (v_cls9b,  v_school_id, 'Grade 9',  'B', v_tr4),
    (v_cls10a, v_school_id, 'Grade 10', 'A', v_tr5),
    (v_cls10b, v_school_id, 'Grade 10', 'B', v_tr1)
  ON CONFLICT DO NOTHING;

  INSERT INTO class_subjects (class_id, subject_id, teacher_id, school_id)
  SELECT c.id, s.id,
    CASE s.id
      WHEN v_math_id   THEN v_tr1
      WHEN v_sci_id    THEN v_tr2
      WHEN v_eng_id    THEN v_tr3
      WHEN v_hindi_id  THEN v_tr4
      WHEN v_social_id THEN v_tr5
    END,
    v_school_id
  FROM classes c
  CROSS JOIN (
    SELECT unnest(ARRAY[v_math_id, v_sci_id, v_eng_id, v_hindi_id, v_social_id]) AS id
  ) s
  WHERE c.school_id = v_school_id
  ON CONFLICT DO NOTHING;

  FOR v_idx IN 1..50 LOOP
    v_uid    := gen_random_uuid();
    v_sid    := gen_random_uuid();
    v_rec_id := gen_random_uuid();

    v_class_id := CASE
      WHEN v_idx BETWEEN  1 AND  9 THEN v_cls8a
      WHEN v_idx BETWEEN 10 AND 17 THEN v_cls8b
      WHEN v_idx BETWEEN 18 AND 26 THEN v_cls9a
      WHEN v_idx BETWEEN 27 AND 34 THEN v_cls9b
      WHEN v_idx BETWEEN 35 AND 42 THEN v_cls10a
      ELSE v_cls10b
    END;

    v_xp_val := 500 + ((v_idx * 211 + 97) % 7500);

    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_uid,
      lower(first_names[v_idx]) || '.' || lower(last_names[v_idx]) || '@kv-mumbai.edubattle.in',
      crypt('Student@2025', gen_salt('bf')),
      now(),
      jsonb_build_object('name', first_names[v_idx] || ' ' || last_names[v_idx]),
      'authenticated', 'authenticated', now(), now()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO users (id, email, name, role) VALUES (
      v_uid,
      lower(first_names[v_idx]) || '.' || lower(last_names[v_idx]) || '@kv-mumbai.edubattle.in',
      first_names[v_idx] || ' ' || last_names[v_idx],
      'STUDENT'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO students (id, user_id, school_id) VALUES (v_sid, v_uid, v_school_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO student_records (id, student_id, class_id, is_current)
    VALUES (v_rec_id, v_sid, v_class_id, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO student_xp (student_records_id, total_xp) VALUES (v_rec_id, v_xp_val)
    ON CONFLICT (student_records_id) DO UPDATE SET total_xp = EXCLUDED.total_xp;

    INSERT INTO xp_logs (student_records_id, xp, source, created_at)
    VALUES
      (v_rec_id, (v_xp_val / 5),  'ASSIGNMENT', now() - ((v_idx % 7)     || ' days')::interval),
      (v_rec_id, (v_xp_val / 8),  'GAME',       now() - ((v_idx % 5 + 1) || ' days')::interval),
      (v_rec_id, (v_xp_val / 12), 'QUIZ',       now() - ((v_idx % 3 + 1) || ' days')::interval);
  END LOOP;

  INSERT INTO leaderboards (class_id, student_records_id, rank, xp)
  SELECT
    sr.class_id,
    sr.id,
    ROW_NUMBER() OVER (PARTITION BY sr.class_id ORDER BY sx.total_xp DESC),
    sx.total_xp
  FROM student_records sr
  JOIN student_xp sx ON sx.student_records_id = sr.id
  JOIN classes c ON c.id = sr.class_id
  WHERE c.school_id = v_school_id
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '=== KV Mumbai seeded ===';
  RAISE NOTICE 'Admin  : admin@kv-mumbai.edubattle.in  /  School@2025';
  RAISE NOTICE 'Teachers (Password: Teacher@2025):';
  RAISE NOTICE '  t1.kv@kv-mumbai.edubattle.in  (Amit Kulkarni)';
  RAISE NOTICE '  t2.kv@kv-mumbai.edubattle.in  (Rekha Shetty)';
  RAISE NOTICE '  t3.kv@kv-mumbai.edubattle.in  (Dinesh Pawar)';
  RAISE NOTICE '  t4.kv@kv-mumbai.edubattle.in  (Lata Joshi)';
  RAISE NOTICE '  t5.kv@kv-mumbai.edubattle.in  (Nitin Shah)';
  RAISE NOTICE 'Sample Students (Password: Student@2025):';
  RAISE NOTICE '  arjun.rao@kv-mumbai.edubattle.in      (Grade 8-A)';
  RAISE NOTICE '  ananya.nair@kv-mumbai.edubattle.in    (Grade 8-A)';
  RAISE NOTICE '  rahul.shah@kv-mumbai.edubattle.in     (Grade 9-A)';
  RAISE NOTICE '  diya.mehta@kv-mumbai.edubattle.in     (Grade 10-A)';

END;
$$;


-- ============================================================
-- SCHOOL 3 — DAV Bangalore
-- ============================================================
DO $$
DECLARE
  v_admin_id   uuid := gen_random_uuid();
  v_school_id  uuid;

  v_t1 uuid := gen_random_uuid();
  v_t2 uuid := gen_random_uuid();
  v_t3 uuid := gen_random_uuid();
  v_t4 uuid := gen_random_uuid();
  v_t5 uuid := gen_random_uuid();

  v_tr1 uuid := gen_random_uuid();
  v_tr2 uuid := gen_random_uuid();
  v_tr3 uuid := gen_random_uuid();
  v_tr4 uuid := gen_random_uuid();
  v_tr5 uuid := gen_random_uuid();

  v_math_id    uuid := gen_random_uuid();
  v_sci_id     uuid := gen_random_uuid();
  v_eng_id     uuid := gen_random_uuid();
  v_hindi_id   uuid := gen_random_uuid();
  v_social_id  uuid := gen_random_uuid();

  v_cls8a  uuid := gen_random_uuid();
  v_cls8b  uuid := gen_random_uuid();
  v_cls9a  uuid := gen_random_uuid();
  v_cls9b  uuid := gen_random_uuid();
  v_cls10a uuid := gen_random_uuid();
  v_cls10b uuid := gen_random_uuid();

  v_uid      uuid;
  v_sid      uuid;
  v_rec_id   uuid;
  v_idx      int := 0;
  v_class_id uuid;
  v_xp_val   int;

  first_names text[] := ARRAY[
    'Aditya','Vihaan','Sai','Reyansh','Ayaan',
    'Krishna','Ishaan','Shaurya','Atharv','Advik',
    'Pranav','Dhruv','Kabir','Ritvik','Aarush',
    'Arnav','Darsh','Parth','Yash','Harsh',
    'Saanvi','Aadhya','Riya','Siya','Myra',
    'Aanya','Kiara','Tanvi','Pooja','Priya',
    'Sneha','Isha','Khushi','Mehak','Naina',
    'Ridhi','Simran','Trisha','Avni','Preeti',
    'Suresh','Vijay','Manish','Rajesh','Deepak',
    'Sanket','Akash','Rohit','Nikhil','Rahul'
  ];
  last_names text[] := ARRAY[
    'Nair','Pillai','Menon','Iyer','Krishnamurthy',
    'Subramanian','Venkatesh','Murthy','Balasubramanian','Raghavan',
    'Gowda','Naidu','Reddy','Prasad','Rao',
    'Kumar','Srinivas','Rajan','Anand','Suresh',
    'Hegde','Kamath','Pai','Shetty','Prabhu',
    'Sharma','Gupta','Verma','Singh','Patel',
    'Desai','Bhatt','Jain','Kapoor','Mehta',
    'Tiwari','Pandey','Mishra','Saxena','Tripathi',
    'Chopra','Malhotra','Arora','Bhatia','Chawla',
    'Dhawan','Gill','Khanna','Luthra','Narang'
  ];

BEGIN

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES (v_admin_id, 'admin@dav-bangalore.edubattle.in',
      crypt('School@2025', gen_salt('bf')), now(),
      '{"name":"Prakash Nair"}'::jsonb,
      'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, email, name, role)
  VALUES (v_admin_id, 'admin@dav-bangalore.edubattle.in', 'Prakash Nair', 'SCHOOL')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO schools (id, username, board, display_name, user_id, city, state, website, created_at)
  VALUES (gen_random_uuid(), 'dav-bangalore', 'CBSE', 'DAV Bangalore',
      v_admin_id, 'Bangalore', 'Karnataka', 'https://davbangalore.edu.in', now())
  ON CONFLICT (username) DO NOTHING;

  SELECT id INTO v_school_id FROM schools WHERE username = 'dav-bangalore';

  INSERT INTO subjects (id, name, school_id) VALUES
    (v_math_id,   'Mathematics',    v_school_id),
    (v_sci_id,    'Science',        v_school_id),
    (v_eng_id,    'English',        v_school_id),
    (v_hindi_id,  'Hindi',          v_school_id),
    (v_social_id, 'Social Studies', v_school_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES
    (v_t1,'t1.dav@dav-bangalore.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Kavitha Reddy"}'::jsonb,  'authenticated','authenticated',now(),now()),
    (v_t2,'t2.dav@dav-bangalore.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Ramesh Gowda"}'::jsonb,   'authenticated','authenticated',now(),now()),
    (v_t3,'t3.dav@dav-bangalore.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Deepa Hegde"}'::jsonb,    'authenticated','authenticated',now(),now()),
    (v_t4,'t4.dav@dav-bangalore.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Srinivas Pai"}'::jsonb,   'authenticated','authenticated',now(),now()),
    (v_t5,'t5.dav@dav-bangalore.edubattle.in', crypt('Teacher@2025',gen_salt('bf')),now(),'{"name":"Usha Krishnan"}'::jsonb,  'authenticated','authenticated',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, email, name, role) VALUES
    (v_t1,'t1.dav@dav-bangalore.edubattle.in','Kavitha Reddy', 'TEACHER'),
    (v_t2,'t2.dav@dav-bangalore.edubattle.in','Ramesh Gowda',  'TEACHER'),
    (v_t3,'t3.dav@dav-bangalore.edubattle.in','Deepa Hegde',   'TEACHER'),
    (v_t4,'t4.dav@dav-bangalore.edubattle.in','Srinivas Pai',  'TEACHER'),
    (v_t5,'t5.dav@dav-bangalore.edubattle.in','Usha Krishnan', 'TEACHER')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO teachers (id, user_id, school_id) VALUES
    (v_tr1, v_t1, v_school_id),
    (v_tr2, v_t2, v_school_id),
    (v_tr3, v_t3, v_school_id),
    (v_tr4, v_t4, v_school_id),
    (v_tr5, v_t5, v_school_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO classes (id, school_id, name, section, class_teacher_id) VALUES
    (v_cls8a,  v_school_id, 'Grade 8',  'A', v_tr1),
    (v_cls8b,  v_school_id, 'Grade 8',  'B', v_tr2),
    (v_cls9a,  v_school_id, 'Grade 9',  'A', v_tr3),
    (v_cls9b,  v_school_id, 'Grade 9',  'B', v_tr4),
    (v_cls10a, v_school_id, 'Grade 10', 'A', v_tr5),
    (v_cls10b, v_school_id, 'Grade 10', 'B', v_tr1)
  ON CONFLICT DO NOTHING;

  INSERT INTO class_subjects (class_id, subject_id, teacher_id, school_id)
  SELECT c.id, s.id,
    CASE s.id
      WHEN v_math_id   THEN v_tr1
      WHEN v_sci_id    THEN v_tr2
      WHEN v_eng_id    THEN v_tr3
      WHEN v_hindi_id  THEN v_tr4
      WHEN v_social_id THEN v_tr5
    END,
    v_school_id
  FROM classes c
  CROSS JOIN (
    SELECT unnest(ARRAY[v_math_id, v_sci_id, v_eng_id, v_hindi_id, v_social_id]) AS id
  ) s
  WHERE c.school_id = v_school_id
  ON CONFLICT DO NOTHING;

  FOR v_idx IN 1..50 LOOP
    v_uid    := gen_random_uuid();
    v_sid    := gen_random_uuid();
    v_rec_id := gen_random_uuid();

    v_class_id := CASE
      WHEN v_idx BETWEEN  1 AND  9 THEN v_cls8a
      WHEN v_idx BETWEEN 10 AND 17 THEN v_cls8b
      WHEN v_idx BETWEEN 18 AND 26 THEN v_cls9a
      WHEN v_idx BETWEEN 27 AND 34 THEN v_cls9b
      WHEN v_idx BETWEEN 35 AND 42 THEN v_cls10a
      ELSE v_cls10b
    END;

    v_xp_val := 500 + ((v_idx * 179 + 113) % 7500);

    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_uid,
      lower(first_names[v_idx]) || '.' || lower(last_names[v_idx]) || '@dav-bangalore.edubattle.in',
      crypt('Student@2025', gen_salt('bf')),
      now(),
      jsonb_build_object('name', first_names[v_idx] || ' ' || last_names[v_idx]),
      'authenticated', 'authenticated', now(), now()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO users (id, email, name, role) VALUES (
      v_uid,
      lower(first_names[v_idx]) || '.' || lower(last_names[v_idx]) || '@dav-bangalore.edubattle.in',
      first_names[v_idx] || ' ' || last_names[v_idx],
      'STUDENT'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO students (id, user_id, school_id) VALUES (v_sid, v_uid, v_school_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO student_records (id, student_id, class_id, is_current)
    VALUES (v_rec_id, v_sid, v_class_id, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO student_xp (student_records_id, total_xp) VALUES (v_rec_id, v_xp_val)
    ON CONFLICT (student_records_id) DO UPDATE SET total_xp = EXCLUDED.total_xp;

    INSERT INTO xp_logs (student_records_id, xp, source, created_at)
    VALUES
      (v_rec_id, (v_xp_val / 5),  'ASSIGNMENT', now() - ((v_idx % 7)     || ' days')::interval),
      (v_rec_id, (v_xp_val / 8),  'GAME',       now() - ((v_idx % 5 + 1) || ' days')::interval),
      (v_rec_id, (v_xp_val / 12), 'QUIZ',       now() - ((v_idx % 3 + 1) || ' days')::interval);
  END LOOP;

  INSERT INTO leaderboards (class_id, student_records_id, rank, xp)
  SELECT
    sr.class_id,
    sr.id,
    ROW_NUMBER() OVER (PARTITION BY sr.class_id ORDER BY sx.total_xp DESC),
    sx.total_xp
  FROM student_records sr
  JOIN student_xp sx ON sx.student_records_id = sr.id
  JOIN classes c ON c.id = sr.class_id
  WHERE c.school_id = v_school_id
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '=== DAV Bangalore seeded ===';
  RAISE NOTICE 'Admin  : admin@dav-bangalore.edubattle.in  /  School@2025';
  RAISE NOTICE 'Teachers (Password: Teacher@2025):';
  RAISE NOTICE '  t1.dav@dav-bangalore.edubattle.in  (Kavitha Reddy)';
  RAISE NOTICE '  t2.dav@dav-bangalore.edubattle.in  (Ramesh Gowda)';
  RAISE NOTICE '  t3.dav@dav-bangalore.edubattle.in  (Deepa Hegde)';
  RAISE NOTICE '  t4.dav@dav-bangalore.edubattle.in  (Srinivas Pai)';
  RAISE NOTICE '  t5.dav@dav-bangalore.edubattle.in  (Usha Krishnan)';
  RAISE NOTICE 'Sample Students (Password: Student@2025):';
  RAISE NOTICE '  aditya.nair@dav-bangalore.edubattle.in     (Grade 8-A)';
  RAISE NOTICE '  saanvi.pillai@dav-bangalore.edubattle.in   (Grade 8-A)';
  RAISE NOTICE '  pranav.rao@dav-bangalore.edubattle.in      (Grade 9-A)';
  RAISE NOTICE '  sneha.kumar@dav-bangalore.edubattle.in     (Grade 10-A)';

END;
$$;


-- ============================================================
-- Timetable data (for all schools)
-- ============================================================
DO $$
DECLARE
  v_school   RECORD;
  v_cls      RECORD;
  v_subjects uuid[];
  v_teachers uuid[];
  v_day      text;
  v_period   int;
  v_days     text[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'];
  v_subj_idx int;
  v_sub_id   uuid;
  v_tch_id   uuid;
BEGIN
  FOR v_school IN SELECT id FROM schools LOOP
    -- collect subjects and their assigned teachers for this school
    FOR v_cls IN SELECT id FROM classes WHERE school_id = v_school.id LOOP
      v_subj_idx := 1;
      FOREACH v_day IN ARRAY v_days LOOP
        FOR v_period IN 1..6 LOOP
          -- round-robin subjects from class_subjects
          SELECT cs.subject_id, cs.teacher_id
          INTO v_sub_id, v_tch_id
          FROM class_subjects cs
          WHERE cs.class_id = v_cls.id
          ORDER BY cs.subject_id
          LIMIT 1 OFFSET ((v_subj_idx - 1) % 5);

          INSERT INTO timetable (class_id, day, period, subject_id, teacher_id)
          VALUES (v_cls.id, v_day, v_period, v_sub_id, v_tch_id)
          ON CONFLICT DO NOTHING;

          v_subj_idx := v_subj_idx + 1;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== Timetable seeded for all schools ===';
END;
$$;


-- ============================================================
-- Final credential summary
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '  EduBattle Seed Complete — 3 schools, 150 students';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SCHOOL 1: DPS New Delhi';
  RAISE NOTICE '  Admin    : admin@dps-newdelhi.edubattle.in  /  School@2025';
  RAISE NOTICE '  Teachers : t1-t5.dps@dps-newdelhi.edubattle.in  /  Teacher@2025';
  RAISE NOTICE '  Students : <name>.<surname>@dps-newdelhi.edubattle.in  /  Student@2025';
  RAISE NOTICE '  Sample   : aarav.sharma@dps-newdelhi.edubattle.in';
  RAISE NOTICE '             vivaan.kumar@dps-newdelhi.edubattle.in';
  RAISE NOTICE '             ananya.patel@dps-newdelhi.edubattle.in';
  RAISE NOTICE '';
  RAISE NOTICE 'SCHOOL 2: KV Mumbai';
  RAISE NOTICE '  Admin    : admin@kv-mumbai.edubattle.in  /  School@2025';
  RAISE NOTICE '  Teachers : t1-t5.kv@kv-mumbai.edubattle.in  /  Teacher@2025';
  RAISE NOTICE '  Students : <name>.<surname>@kv-mumbai.edubattle.in  /  Student@2025';
  RAISE NOTICE '  Sample   : arjun.rao@kv-mumbai.edubattle.in';
  RAISE NOTICE '             ananya.nair@kv-mumbai.edubattle.in';
  RAISE NOTICE '             rahul.shah@kv-mumbai.edubattle.in';
  RAISE NOTICE '';
  RAISE NOTICE 'SCHOOL 3: DAV Bangalore';
  RAISE NOTICE '  Admin    : admin@dav-bangalore.edubattle.in  /  School@2025';
  RAISE NOTICE '  Teachers : t1-t5.dav@dav-bangalore.edubattle.in  /  Teacher@2025';
  RAISE NOTICE '  Students : <name>.<surname>@dav-bangalore.edubattle.in  /  Student@2025';
  RAISE NOTICE '  Sample   : aditya.nair@dav-bangalore.edubattle.in';
  RAISE NOTICE '             saanvi.pillai@dav-bangalore.edubattle.in';
  RAISE NOTICE '             pranav.rao@dav-bangalore.edubattle.in';
  RAISE NOTICE '';
  RAISE NOTICE 'Each school has: 6 classes (Gr8-A/B, Gr9-A/B, Gr10-A/B)';
  RAISE NOTICE '                 5 subjects per class (Math, Science, English, Hindi, Social)';
  RAISE NOTICE '                 50 students, ~8-9 per class';
  RAISE NOTICE '                 XP data + leaderboard + timetable populated';
  RAISE NOTICE '====================================================';
END;
$$;
