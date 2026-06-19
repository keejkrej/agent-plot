import { startHub } from "@agent-plot/ws-hub";

startHub().catch((error) => {
  console.error("ws-hub failed to start", error);
  process.exit(1);
});
