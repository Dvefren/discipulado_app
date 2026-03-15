# Discipulado App

A church discipleship management dashboard for tracking courses, schedules, facilitators, students, and attendance.

Built with **Next.js 16**, **Prisma ORM**, **PostgreSQL**, and **TypeScript**.

---

## Features

- **Course management** — two courses per year, each with four schedules (Wednesday 7pm, Sunday 9am, 11am, 1pm)
- **Schedule & class tracking** — 21 weekly sessions per schedule with topics and dates
- **Facilitator tables** — each facilitator manages a group of students organized by table
- **Student profiles** — names, contact info, addresses, and flexible profile notes (JSON)
- **Attendance system** — mark and track attendance per class per student
- **Role-based access control (RBAC)** — four roles with different permissions:
  - **Admin** — full access to everything
  - **Schedule Leader** — supervises a specific schedule
  - **Secretary** — manages attendance for an assigned schedule
  - **Facilitator** — manages their own student table and attendance

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Authentication | Auth.js v5 (Credentials) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix) |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Discipulado_app.git
cd Discipulado_app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and auth secret
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed the database with initial data
npx tsx prisma/seed.ts

# Set the admin password
npx tsx scripts/set-admin-password.ts YourPassword
```

### Development

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to the login page.

**Default admin credentials:**
- Email: `admin@discipulado.app`
- Password: whatever you set in the script above

### Prisma Studio

```bash
npx prisma studio
```

Opens a visual database browser at `http://localhost:5555`.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js route handler
│   │   └── facilitators/         # Facilitators API
│   ├── dashboard/
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # Home (stats & schedules)
│   │   ├── students/             # Students management
│   │   ├── attendance/           # Attendance tracking
│   │   ├── classes/              # Class list
│   │   ├── courses/              # Course management
│   │   ├── calendar/             # Calendar view
│   │   └── facilitators/         # Facilitators by schedule
│   ├── login/                    # Login page
│   └── actions/                  # Server actions
├── components/
│   ├── sidebar.tsx               # Navigation sidebar
│   └── ui/                       # shadcn components
├── lib/
│   ├── auth.ts                   # Auth.js full config
│   ├── auth.config.ts            # Auth.js edge-compatible config
│   └── prisma.ts                 # Prisma client singleton
├── generated/prisma/             # Generated Prisma client
└── types/
    └── next-auth.d.ts            # Auth type extensions
prisma/
├── schema.prisma                 # Database schema
├── seed.ts                       # Seed script
└── migrations/                   # Database migrations
scripts/
└── set-admin-password.ts         # Admin password utility
```

## Roadmap

- [x] Project setup (Next.js + Prisma + PostgreSQL)
- [x] Database schema & seed data
- [x] Authentication & RBAC
- [x] Dashboard layout & navigation
- [x] All dashboard pages (Home, Students, Classes, Courses, Facilitators)
- [ ] UI polish (responsive design, dark mode)
- [ ] CRUD operations (add/edit/delete)
- [ ] Attendance system
- [ ] Role-based views
- [ ] Student profiles with church-related questions
- [ ] Calendar integration

## License

Private project — not for public distribution.
