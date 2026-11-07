import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AuthProvider from "./auth/AuthProvider";
import ProtectedApp from "./components/ProtectedApp";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ProtectedApp><App /></ProtectedApp>
    </AuthProvider>
  </React.StrictMode>,
);
