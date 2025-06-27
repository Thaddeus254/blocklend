// App.js
import React from "react";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 bg-gray-100 p-4">
      <LoginForm />
      <RegisterForm />
    </div>
  );
}

export default App;
