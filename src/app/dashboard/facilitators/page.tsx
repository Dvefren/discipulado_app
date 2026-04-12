import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FacilitatorsClient } from "./facilitators-client";

export default async function FacilitatorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;

  if (role !== "ADMIN") {
    // All non-admin roles get redirected to their own profile if they have a Facilitator record
    const userId = (session.user as any).id;
    const facilitator = await prisma.facilitator.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (facilitator) {
      redirect(`/dashboard/facilitators/${facilitator.id}`);
    }
    redirect("/dashboard");
  }

  return <FacilitatorsClient />;
}