import { TaskListClient } from "@/components/tasks/TaskListClient";

export default function TasksPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">每日待办</h1>
      <TaskListClient />
    </div>
  );
}
