import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Kept out of the main bundle: few people ever open these.
const AdminPage = lazy(() => import("./AdminPage"));
const PrivacyPage = lazy(() => import("./InfoPages").then((module) => ({ default: module.PrivacyPage })));
const HelpPage = lazy(() => import("./InfoPages").then((module) => ({ default: module.HelpPage })));

const standalone = { "/admin": AdminPage, "/privacidade": PrivacyPage, "/ajuda": HelpPage };
const Page = standalone[window.location.pathname.replace(/\/+$/, "") as keyof typeof standalone];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {Page ? <Suspense fallback={null}><Page /></Suspense> : <App />}
  </React.StrictMode>,
);
