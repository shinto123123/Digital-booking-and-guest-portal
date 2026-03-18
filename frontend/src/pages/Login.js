import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Request JWT token
      const res = await api.post("auth/token/", formData);

      const access = res.data.access;
      const refresh = res.data.refresh;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      // Fetch current user role
      api.defaults.headers.common["Authorization"] = `Bearer ${access}`;
      const me = await api.get("auth/me/");
      const role = me.data.role;

      localStorage.setItem("role", role);

      if (role === "admin") navigate("/admin");
      else if (role === "staff") navigate("/staff");
      else navigate("/");

    } catch (err) {
      console.log(err);
      alert("Invalid login credentials!");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email" onChange={handleChange} /><br /><br />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} /><br /><br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
