import { useState, useEffect } from "react";
import api from "@/lib/api";

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/users/users");
     
      setUsers(Array.isArray(res.data) ? res.data : []); // safe fallback
    } catch (err) {
      console.error(err);
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  fetchUsers();
}, []);


  return { users, loading, error };
};
