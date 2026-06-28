import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ParentShell from "@/components/parent/ParentShell";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
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
  if (role === "TEACHER") redirect("/teacher/dashboard");
  if (role === "SCHOOL") redirect("/school/dashboard");
  if (role === "CMS_ADMIN") redirect("/cms/dashboard");

  return <ParentShell>{children}</ParentShell>;
}
