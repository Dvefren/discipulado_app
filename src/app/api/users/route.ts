import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { hash } from "bcryptjs";

const VALID_ROLES = ["ADMIN", "SCHEDULE_LEADER", "SECRETARY", "FACILITATOR"] as const;
type Role = typeof VALID_ROLES[number];

function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && VALID_ROLES.includes(role as Role);
}

export async function GET() {
  // Solo ADMIN puede ver la lista completa de usuarios
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

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
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { name, email, password, role, scheduleId, facilitatorId } = await req.json();

  // Validación de input
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const hashed = await hash(password, 10);

  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase().trim(), password: hashed, role },
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

  // Auto-create or link a Facilitator record for leaders and secretaries
  if (role === "SCHEDULE_LEADER" || role === "SECRETARY") {
    const existingFac = await prisma.facilitator.findFirst({
      where: { name: name.trim(), userId: null },
    });
    if (existingFac) {
      await prisma.facilitator.update({
        where: { id: existingFac.id },
        data: { userId: user.id },
      });
    } else {
      await prisma.facilitator.create({
        data: { name: name.trim(), userId: user.id },
      });
    }
  }

  if (role === "FACILITATOR" && facilitatorId) {
    await prisma.facilitator.update({
      where: { id: facilitatorId },
      data: { userId: user.id },
    });
  }

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    { status: 201 }
  );
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id, name, email, role, scheduleId, facilitatorId } = await req.json();

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Validar role si se está cambiando
  if (role !== undefined && !isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // 🛡️ Prevenir auto-degradación: el último admin no puede dejar de ser admin
  if (id === session!.user.id && role && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove admin role from the last admin" },
        { status: 400 }
      );
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (email && email !== existingUser.email) {
    const dup = await prisma.user.findUnique({ where: { email } });
    if (dup) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
  }

  const data: Record<string, any> = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();
  if (role !== undefined) data.role = role;

  const user = await prisma.user.update({ where: { id }, data });

  if (name !== undefined) {
    const linkedFac = await prisma.facilitator.findUnique({ where: { userId: id } });
    if (linkedFac) {
      await prisma.facilitator.update({
        where: { id: linkedFac.id },
        data: { name: name.trim() },
      });
    }
  }

  if (role && role !== existingUser.role) {
    await prisma.scheduleLeader.deleteMany({ where: { userId: id } });
    await prisma.secretary.deleteMany({ where: { userId: id } });

    const linkedFacilitator = await prisma.facilitator.findUnique({ where: { userId: id } });

    if (role === "SCHEDULE_LEADER" || role === "SECRETARY") {
      if (!linkedFacilitator) {
        const facName = name ?? existingUser.name;
        const existingFac = await prisma.facilitator.findFirst({
          where: { name: facName, userId: null },
        });
        if (existingFac) {
          await prisma.facilitator.update({
            where: { id: existingFac.id },
            data: { userId: id },
          });
        } else {
          await prisma.facilitator.create({
            data: { name: facName, userId: id },
          });
        }
      }
    } else {
      if (linkedFacilitator) {
        await prisma.facilitator.update({
          where: { id: linkedFacilitator.id },
          data: { userId: null },
        });
      }
    }

    if (role === "SCHEDULE_LEADER" && scheduleId) {
      await prisma.scheduleLeader.create({ data: { userId: id, scheduleId } });
    }
    if (role === "SECRETARY" && scheduleId) {
      await prisma.secretary.create({ data: { userId: id, scheduleId } });
    }
    if (role === "FACILITATOR" && facilitatorId) {
      await prisma.facilitator.update({
        where: { id: facilitatorId },
        data: { userId: id },
      });
    }
  } else {
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
  const { error, session } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // 🛡️ Prevenir auto-eliminación
  if (id === session!.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // 🛡️ Prevenir eliminar el último admin
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin" },
        { status: 400 }
      );
    }
  }

  await prisma.scheduleLeader.deleteMany({ where: { userId: id } });
  await prisma.secretary.deleteMany({ where: { userId: id } });

  const linkedFacilitator = await prisma.facilitator.findUnique({
    where: { userId: id },
    include: { tables: true },
  });
  if (linkedFacilitator) {
    if (linkedFacilitator.tables.length === 0) {
      await prisma.facilitator.delete({ where: { id: linkedFacilitator.id } });
    } else {
      await prisma.facilitator.update({
        where: { id: linkedFacilitator.id },
        data: { userId: null },
      });
    }
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}