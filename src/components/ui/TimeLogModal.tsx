"use client";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDuration, formatDate } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimerEntry {
  id: string;
  startTime: string;
  endTime: string | null;
  date: string;
}

interface TimeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskType: string;
  taskId: string;
  taskTitle: string;
}

export function TimeLogModal({ isOpen, onClose, taskType, taskId, taskTitle }: TimeLogModalProps) {
  const [logs, setLogs] = useState<TimerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && taskType && taskId) {
      setLoading(true);
      fetch(`/api/time-tracker?taskType=${taskType}&taskId=${taskId}`)
        .then((r) => r.json())
        .then((data) => {
          setLogs(Array.isArray(data) ? data : []);
        })
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, taskType, taskId]);

  function getEntryDuration(entry: TimerEntry): number {
    if (entry.endTime) {
      return Math.floor((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000);
    }
    return Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
  }

  const totalSeconds = logs.reduce((sum, log) => sum + getEntryDuration(log), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Time Logs - ${taskTitle}`} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Total Sessions: <span className="font-medium text-gray-900">{logs.length}</span></span>
            <span className="text-gray-500">Total Time: <span className="font-medium text-indigo-600">{formatDuration(totalSeconds)}</span></span>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Start Time</th>
                  <th className="px-4 py-2 font-medium">End Time</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log, i) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 text-gray-900">{formatDate(log.date || log.startTime)}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(log.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {log.endTime ? (
                        new Date(log.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                      ) : (
                        <span className="text-green-600 font-medium">Running</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-900 font-mono">{formatDuration(getEntryDuration(log))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400">No time entries recorded for this task.</p>
        </div>
      )}
    </Modal>
  );
}
