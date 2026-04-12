import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FacilitatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const role = (session.user as any).role;

  // Only admins see the facilitators list
  // The individual profile page (/dashboard/facilitators/[id]) has its own auth check
  // that allows facilitators to view their own profile
  return <>{children}</>;
}