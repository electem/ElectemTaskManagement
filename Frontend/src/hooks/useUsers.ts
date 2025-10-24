import { useState, useEffect } from "react";
<<<<<<< HEAD
import api from "@/lib/api";
=======
import axios from "axios";
>>>>>>> ca2965efbdb0910b36d6788750b8bbb771a50f83

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
<<<<<<< HEAD
      const res = await api.get("/api/users/users");
=======
      const res = await axios.get("/api/users");
>>>>>>> ca2965efbdb0910b36d6788750b8bbb771a50f83
     
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
