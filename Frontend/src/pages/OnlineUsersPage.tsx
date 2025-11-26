import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useTaskContext } from "@/context/TaskContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserStatus {
  id: number;
  username: string;
  online: boolean;
}

/** ✅ Utility for initials */
const getInitials = (username: string, dup: boolean): string =>
  dup ? username.substring(0, 2).toUpperCase() : username.charAt(0).toUpperCase();

export default function OnlineUsersPage() {
  const { userStatuses } = useTaskContext();
  const [users, setUsers] = useState<UserStatus[]>([]);

  /** ✅ Fetch full users status list once (so offline users appear) */
  useEffect(() => {
    const fetchInitialUsers = async () => {
      try {
        const res = await api.get("/api/users/online-status");
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to load user list", err);
      }
    };

    fetchInitialUsers();
  }, []);

  /** ✅ Merge backend users with live websocket status */
  const mergedUsers = users.map((u) => ({
    ...u,
    online: userStatuses[u.username] ?? u.online,
  }));

  /** ✅ Memoized rendering list */
  const processedUsers = useMemo(() => {
    const sorted = [...mergedUsers].sort((a, b) =>
      a.online === b.online ? 0 : a.online ? -1 : 1
    );

    const counts = mergedUsers.reduce<Record<string, number>>((acc, u) => {
      const first = u.username.charAt(0).toUpperCase();
      acc[first] = (acc[first] || 0) + 1;
      return acc;
    }, {});

    return sorted.map((u) => ({
      ...u,
      initials: getInitials(
        u.username,
        counts[u.username.charAt(0).toUpperCase()] > 1
      ),
    }));
  }, [mergedUsers]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Team Presence
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedUsers.map((u) => (
            <Tooltip key={u.id}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow hover:shadow-lg transition-all border hover:border-primary cursor-default">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center font-bold text-gray-800 text-lg shadow-inner">
                      {u.initials}
                    </div>

                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        u.online
                          ? "bg-green-500 shadow-green-500/70 shadow-sm"
                          : "bg-red-500 shadow-red-500/70 shadow-sm"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900 text-base">
                      {u.username}
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        u.online ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {u.online ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>
              </TooltipTrigger>

              <TooltipContent className="p-3 text-sm shadow-lg bg-white rounded-lg border">
                <div className="font-semibold">{u.username}</div>
                <div>Status: {u.online ? "🟢 Active now" : "🔴 Offline"}</div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
