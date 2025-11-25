import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AutoLogout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded: any = jwtDecode(token);
      const now = Date.now() / 1000;

      // Token already expired — logout instantly
      if (decoded.exp <= now) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const msUntilExpire = (decoded.exp - now) * 1000;

      // AUTO LOGOUT TIMER
      const timer = setTimeout(() => {
        localStorage.removeItem("token");
        navigate("/login");
      }, msUntilExpire);

      return () => clearTimeout(timer);
    } catch (err) {
      // Token invalid or corrupted
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  return null;
};

export default AutoLogout;
