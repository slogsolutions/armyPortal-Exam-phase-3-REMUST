import api from "../api/api";

export default function AdminLogin() {
  const login = async () => {
    const res = await api.post("/auth/login", {
      username: "admin",
      password: "admin123"
    });
    localStorage.setItem("token", res.data.token);
    window.location.href = "/admin/dashboard";
  };

  return <button onClick={login}>Admin Login</button>;
}
