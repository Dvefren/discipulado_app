import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FacilitatorProfileClient } from "./facilitator-profile-client";

export default async function FacilitatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  return (
    <FacilitatorProfileClient
      facilitatorId={id}
      currentUserRole={(session.user as any).role}
    />
  );
}