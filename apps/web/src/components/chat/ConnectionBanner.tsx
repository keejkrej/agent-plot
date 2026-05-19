import { WifiOffIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ConnectionBannerProps = {
  connection: "connected" | "connecting" | "disconnected";
};

export function ConnectionBanner({ connection }: ConnectionBannerProps) {
  if (connection === "connected") return null;

  return (
    <div className="mx-auto max-w-3xl pt-3">
      <Alert variant={connection === "disconnected" ? "error" : "default"}>
        <WifiOffIcon />
        <AlertTitle>{connection === "connecting" ? "Connecting…" : "Disconnected"}</AlertTitle>
        <AlertDescription>
          {connection === "connecting"
            ? "Opening WebSocket to the analysis server."
            : "Reconnecting automatically. Messages are queued until connected."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
