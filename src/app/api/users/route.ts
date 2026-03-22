import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      facilitator: {
        include: {
          tables: { include: { schedule: true } },
        },
      },
      scheduleLeaders: { include: { schedule: true } },
      secretaries: { include: { schedule: true } },
    },
  });

  const data = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    facilitatorId: u.facilitator?.id || null,
    facilitatorName: u.facilitator?.name || null,
    facilitatorSchedule: u.facilitator?.tables[0]?.schedule?.label || null,
    scheduleIds: [
      ...u.scheduleLeaders.map((sl) => sl.scheduleId),
      ...u.secretaries.map((s) => s.scheduleId),
    ],
    scheduleLabels: [
      ...u.scheduleLeaders.map((sl) => sl.schedule.label),
      ...u.secretaries.map((s) => s.schedule.label),
    ],
  }));

  const course = await prisma.course.findFirst({
    where: { isActive: true },
    include: {
      schedules: {
        orderBy: [{ day: "asc" }, { time: "asc" }],
      },
    },
  });

  const schedules = course?.schedules.map((s) => ({ id: s.id, label: s.label })) || [];

  const facilitators = await prisma.facilitator.findMany({
    include: {
      tables: { include: { schedule: true } },
    },
    orderBy: { name: "asc" },
  });

  const facilitatorOptions = facilitators.map((f) => ({
    id: f.id,
    name: f.name,
    scheduleLabel: f.tables[0]?.schedule?.label || "Unassigned",
    linked: !!f.userId,
  }));

  return NextResponse.json({ users: data, schedules, facilitators: facilitatorOptions });
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, email, password, role, scheduleId, facilitatorId } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
  }

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const hashed = await hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
  });

  // Assign to schedule based on role
  if (role === "SCHEDULE_LEADER" && scheduleId) {
    await prisma.scheduleLeader.create({
      data: { userId: user.id, scheduleId },
    });
  }

  if (role === "SECRETARY" && scheduleId) {
    await prisma.secretary.create({
      data: { userId: user.id, scheduleId },
    });
  }

  if (role === "FACILITATOR" && facilitatorId) {
    await prisma.facilitator.update({
      where: { id: facilitatorId },
      data: { userId: user.id },
    });
  }

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, name, email, role, scheduleId, facilitatorId } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check email uniqueness if changed
  if (email && email !== existingUser.email) {
    const dup = await prisma.user.findUnique({ where: { email } });
    if (dup) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
  }

  const data: Record<string, any> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;

  const user = await prisma.user.update({ where: { id }, data });

  // If role changed, clean up old role assignments and create new ones
  if (role && role !== existingUser.role) {
    // Remove old assignments
    await prisma.scheduleLeader.deleteMany({ where: { userId: id } });
    await prisma.secretary.deleteMany({ where: { userId: id } });
    // Unlink from facilitator
    const linkedFacilitator = await prisma.facilitator.findUnique({ where: { userId: id } });
    if (linkedFacilitator) {
      await prisma.facilitator.update({
        where: { id: linkedFacilitator.id },
        data: { userId: null },
      });
    }

    // Create new assignment
    if (role === "SCHEDULE_LEADER" && scheduleId) {
      await prisma.scheduleLeader.create({
        data: { userId: id, scheduleId },
      });
    }
    if (role === "SECRETARY" && scheduleId) {
      await prisma.secretary.create({
        data: { userId: id, scheduleId },
      });
    }
    if (role === "FACILITATOR" && facilitatorId) {
      await prisma.facilitator.update({
        where: { id: facilitatorId },
        data: { userId: id },
      });
    }
  } else {
    // Role didn't change, but schedule assignment might have
    if ((role === "SCHEDULE_LEADER" || existingUser.role === "SCHEDULE_LEADER") && scheduleId !== undefined) {
      await prisma.scheduleLeader.deleteMany({ where: { userId: id } });
      if (scheduleId) {
        await prisma.scheduleLeader.create({ data: { userId: id, scheduleId } });
      }
    }
    if ((role === "SECRETARY" || existingUser.role === "SECRETARY") && scheduleId !== undefined) {
      await prisma.secretary.deleteMany({ where: { userId: id } });
      if (scheduleId) {
        await prisma.secretary.create({ data: { userId: id, scheduleId } });
      }
    }
    if ((role === "FACILITATOR" || existingUser.role === "FACILITATOR") && facilitatorId !== undefined) {
      const oldFac = await prisma.facilitator.findUnique({ where: { userId: id } });
      if (oldFac) {
        await prisma.facilitator.update({ where: { id: oldFac.id }, data: { userId: null } });
      }
      if (facilitatorId) {
        await prisma.facilitator.update({ where: { id: facilitatorId }, data: { userId: id } });
      }
    }
  }

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Clean up role assignments
  await prisma.scheduleLeader.deleteMany({ where: { userId: id } });
  await prisma.secretary.deleteMany({ where: { userId: id } });

  const linkedFacilitator = await prisma.facilitator.findUnique({ where: { userId: id } });
  if (linkedFacilitator) {
    await prisma.facilitator.update({
      where: { id: linkedFacilitator.id },
      data: { userId: null },
    });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}