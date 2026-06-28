import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherShell from "@/components/teacher/TeacherShell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (role === "STUDENT") redirect("/student/dashboard");
  if (role === "SCHOOL") redirect("/school/dashboard");
  if (role === "PARENT") redirect("/parent/dashboard");
  if (role === "CMS_ADMIN") redirect("/cms/dashboard");

  return <TeacherShell>{children}</TeacherShell>;
}
