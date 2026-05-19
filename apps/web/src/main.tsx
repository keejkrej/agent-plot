import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { App } from "./App.js";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <ToastProvider>
        <AnchoredToastProvider>
          <App />
        </AnchoredToastProvider>
      </ToastProvider>
    </TooltipProvider>
  </StrictMode>,
);
