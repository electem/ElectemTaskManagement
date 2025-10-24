# Task Management Backend API

This is the backend implementation for the Task Management application using Node.js, Express.js, PostgreSQL, and Prisma ORM.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE task_management;
```

2. Copy `.env.example` to `.env` and update the credentials:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/task_management?schema=public"
JWT_SECRET="your-secret-key-here"
PORT=5000
```

### 3. Run Database Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

This will create all the required tables in your database.

### 4. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

### 5. View Database (Optional)

To view and manage your database visually:

```bash
npm run prisma:studio
```

This will open Prisma Studio at `http://localhost:5555`

## API Endpoints

### Team Members

- `POST /api/team-members` - Create a new team member
- `GET /api/team-members` - Get all team members
- `GET /api/team-members/:id` - Get a specific team member
- `PUT /api/team-members/:id` - Update a team member
- `DELETE /api/team-members/:id` - Delete a team member

### Projects

- `POST /api/projects` - Create a new project
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get a specific project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Tasks

- `POST /api/tasks` - Create a new task
- `GET /api/tasks` - Get all tasks (supports query params: projectId, ownerId, status)
- `GET /api/tasks/:id` - Get a specific task
- `PUT /api/tasks/:id` - Update a task
- `PATCH /api/tasks/:id/close` - Close a task (set status to Completed)
- `DELETE /api/tasks/:id` - Delete a task

### Chat

- `POST /api/chat` - Send a message
- `GET /api/chat/task/:taskId` - Get all messages for a task

## Database Schema

The application uses the following models:

- **TeamMember**: Stores team member information (name, email, phone, password)
- **Project**: Stores project information (name, description, owner)
- **Task**: Stores task information (title, description, dueDate, status, project, owner, members)
- **ChatMessage**: Stores chat messages for tasks

## Production Build

To build for production:

```bash
npm run build
npm start
```

## Important Notes for Lovable Integration

**Note**: This backend code is provided as requested, but **Lovable cannot run Node.js/Express backends directly**. 

If you want to implement backend functionality within Lovable, you should use **Lovable Cloud** which provides:
- Built-in PostgreSQL database
- Authentication system
- File storage
- Serverless edge functions
- All without requiring external setup

To use Lovable Cloud, you would need to enable it through the Lovable interface and adapt your code to use Supabase client libraries instead of this Express API.
