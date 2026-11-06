import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/auth";
import { useTheme } from "@/hooks/theme";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <ThemedToaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      dir="rtl"
      position="top-center"
      richColors
      toastOptions={{ style: { fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif' } }}
    />
  );
}
