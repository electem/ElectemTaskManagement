import { useState, useEffect } from "react";
import axios from "axios";

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
      const res = await axios.get("/api/users");
     
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
