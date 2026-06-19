import { defineHook } from "eve/hooks";
import { getDefaultStore } from "#lib/store";

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      const store = getDefaultStore();
      const existing = await store.getSession(ctx.session.id);
      if (!existing) {
        await store.createSessionWithId(ctx.session.id);
      }
    },
  },
});
