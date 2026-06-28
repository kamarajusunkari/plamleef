import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentShell from "@/components/student/StudentShell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
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

  if (role === "TEACHER") redirect("/teacher/dashboard");
  if (role === "SCHOOL") redirect("/school/dashboard");
  if (role === "PARENT") redirect("/parent/dashboard");
  if (role === "CMS_ADMIN") redirect("/cms/dashboard");

  return <StudentShell>{children}</StudentShell>;
}
