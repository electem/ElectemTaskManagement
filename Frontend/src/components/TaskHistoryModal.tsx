import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTaskHistory, TaskChangeGroup } from "@/context/TaskHistoryContext";

interface TaskHistoryModalProps {
  taskId: number;
  column: "owner" | "dueDate" | "status";
  onClose: () => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  taskId,
  column,
  onClose,
}) => {
  const { fetchTaskHistory } = useTaskHistory();
  const [history, setHistory] = useState<TaskChangeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      const data = await fetchTaskHistory(taskId);
      if (data) {
        const filteredGroups = data.history
          .map((group) => ({
            ...group,
            changes: group.changes.filter((c) => c.fieldChanged === column),
          }))
          .filter((group) => group.changes.length > 0);
        setHistory(filteredGroups);
      }
      setLoading(false);
    };
    loadHistory();
  }, [taskId, column]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-[500px] max-h-[80vh] overflow-auto p-4 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X />
        </button>
        <h3 className="text-lg font-semibold mb-4 capitalize">{column} History</h3>

        {loading ? (
          <p>Loading...</p>
        ) : history.length === 0 ? (
          <p>No history available for this column.</p>
        ) : (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="px-3 py-2 text-left">Changed At</th>
                <th className="px-3 py-2 text-left">Old Value</th>
                <th className="px-3 py-2 text-left">New Value</th>
              </tr>
            </thead>
            <tbody>
              {history.map((group) =>
                group.changes.map((change, idx) => (
                  <tr key={group.changeGroupId + idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{new Date(group.changedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{change.oldValue}</td>
                    <td className="px-3 py-2">{change.newValue}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
