import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Kept out of the main bundle: only one person ever opens it.
const AdminPage = lazy(() => import("./AdminPage"));
const isAdminPath = window.location.pathname.replace(/\/+$/, "") === "/admin";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isAdminPath ? <Suspense fallback={null}><AdminPage /></Suspense> : <App />}
  </React.StrictMode>,
);
