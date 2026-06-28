"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  role: string;
  initials: string;
  // School admin
  schoolId?: string;
  schoolName?: string;        // slug (username)
  schoolDisplayName?: string; // human-readable
  board?: string;
  city?: string;
  state?: string;
  website?: string;
  // Teacher
  teacherId?: string;
  // Student
  studentId?: string;
  studentRecordId?: string;
  classId?: string;
  className?: string;
  totalXp?: number;
  level?: number;
  // Parent (child info loaded separately)
  childStudentId?: string;
}

function calcInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function calcLevel(xp: number) {
  if (xp >= 10000) return 12;
  if (xp >= 8000)  return 11;
  if (xp >= 6500)  return 10;
  if (xp >= 5200)  return 9;
  if (xp >= 4000)  return 8;
  if (xp >= 3000)  return 7;
  if (xp >= 2200)  return 6;
  if (xp >= 1500)  return 5;
  if (xp >= 1000)  return 4;
  if (xp >= 600)   return 3;
  if (xp >= 250)   return 2;
  return 1;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || cancelled) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("users")
        .select("id, email, name, photo, role")
        .eq("id", authUser.id)
        .single();

      if (!profile || cancelled) { setLoading(false); return; }

      const base: CurrentUser = {
        ...profile,
        initials: calcInitials(profile.name ?? profile.email),
      };

      if (profile.role === "SCHOOL") {
        const { data: school } = await supabase
          .from("schools")
          .select("id, username, board, display_name, city, state, website")
          .eq("user_id", authUser.id)
          .single();
        if (school) {
          base.schoolId          = school.id;
          base.schoolName        = school.username;
          base.schoolDisplayName = school.display_name ?? school.username;
          base.board             = school.board;
          base.city              = school.city;
          base.state             = school.state;
          base.website           = school.website;
        }

      } else if (profile.role === "TEACHER") {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id, school_id")
          .eq("user_id", authUser.id)
          .single();
        if (teacher) {
          base.teacherId = teacher.id;
          base.schoolId  = teacher.school_id;
        }

      } else if (profile.role === "STUDENT") {
        const { data: student } = await supabase
          .from("students")
          .select("id, school_id")
          .eq("user_id", authUser.id)
          .single();
        if (student) {
          base.studentId = student.id;
          base.schoolId  = student.school_id;

          const { data: record } = await supabase
            .from("student_records")
            .select("id, class_id, classes(name, section)")
            .eq("student_id", student.id)
            .eq("is_current", true)
            .maybeSingle();

          if (record) {
            base.studentRecordId = record.id;
            base.classId         = record.class_id;
            const cls = Array.isArray(record.classes)
              ? record.classes[0]
              : (record.classes as { name?: string; section?: string } | null);
            base.className = cls ? `${cls.name}-${cls.section}` : undefined;

            const { data: xpRow } = await supabase
              .from("student_xp")
              .select("total_xp")
              .eq("student_records_id", record.id)
              .maybeSingle();
            base.totalXp = xpRow?.total_xp ?? 0;
            base.level   = calcLevel(base.totalXp ?? 0);
          }
        }

      } else if (profile.role === "PARENT") {
        // Find linked child via a student with matching parent email pattern
        // (store child link however your app does; here we try by school email convention)
        // For now expose the parent user only — child data loaded in parent pages
      }

      if (!cancelled) {
        setUser(base);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { user, loading };
}
