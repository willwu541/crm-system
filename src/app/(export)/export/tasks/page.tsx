import { TasksClient } from "@/components/export/TasksClient";

export default function ExportTasksPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Tasks 任务</h1>
      <TasksClient />
    </div>
  );
}
