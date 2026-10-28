"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type State = "loading" | "ok" | "error";

// Testar att frontend (3000) kan prata med backend (8000). Det testar också CORS.
export default function HealthCheck() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    fetch(`${API_URL}/health`, { credentials: "include" })
      .then((res) => (res.ok ? setState("ok") : setState("error")))
      .catch(() => setState("error"));
  }, []);

  const text = {
    loading: "Kollar backend…",
    ok: "Backend svarar ✓",
    error: "Backend svarar inte. Kör den på port 8000?",
  }[state];

  return (
    <p role="status" className="text-sm text-blush-300">
      {text}
    </p>
  );
}
