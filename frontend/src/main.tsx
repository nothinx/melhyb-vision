import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import RuteAplikasi from "./components/RuteAplikasi";
import "./styles.css";

const penyimpan = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 0, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={penyimpan}>
      <RuteAplikasi />
    </QueryClientProvider>
  </StrictMode>,
);
