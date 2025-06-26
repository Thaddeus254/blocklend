// components/RegisterForm.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: role,
      });

      setSuccess(true);
    } catch (err) {
      setError("Registration failed. " + err.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Register</h2>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      {success && <p className="text-green-600 mb-2">Registration successful!</p>}
      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-3 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select
          className="w-full mb-4 p-2 border rounded"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700">
          Register
        </button>
      </form>
    </div>
  );
}

export default RegisterForm;
