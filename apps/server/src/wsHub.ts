import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";

export interface WsConnection {
  readonly send: (data: string) => void;
}

export interface WsHubShape {
  readonly register: (sessionId: string, connection: WsConnection) => Effect.Effect<void>;
  readonly unregister: (sessionId: string, connection: WsConnection) => Effect.Effect<void>;
  readonly broadcast: (sessionId: string, message: unknown) => Effect.Effect<void>;
}

export class WsHub extends Context.Service<WsHub, WsHubShape>()("agent-plot/server/WsHub") {}

const makeWsHub = Effect.gen(function* () {
  const sockets = yield* Ref.make(new Map<string, Set<WsConnection>>());

  const register = Effect.fn("wsHub.register")(function* (
    sessionId: string,
    connection: WsConnection,
  ) {
    yield* Ref.update(sockets, (current) => {
      const next = new Map(current);
      const set = new Set(next.get(sessionId) ?? []);
      set.add(connection);
      next.set(sessionId, set);
      return next;
    });
  });

  const unregister = Effect.fn("wsHub.unregister")(function* (
    sessionId: string,
    connection: WsConnection,
  ) {
    yield* Ref.update(sockets, (current) => {
      const next = new Map(current);
      const set = next.get(sessionId);
      if (!set) {
        return current;
      }
      const updated = new Set(set);
      updated.delete(connection);
      if (updated.size === 0) {
        next.delete(sessionId);
      } else {
        next.set(sessionId, updated);
      }
      return next;
    });
  });

  const broadcast = Effect.fn("wsHub.broadcast")(function* (sessionId: string, message: unknown) {
    const snapshot = yield* Ref.get(sockets);
    const set = snapshot.get(sessionId);
    if (!set) {
      return;
    }
    const line = JSON.stringify(message);
    for (const ws of set) {
      try {
        ws.send(line);
      } catch {
        /* ignore */
      }
    }
  });

  return WsHub.of({ register, unregister, broadcast });
});

export const layer = Layer.effect(WsHub, makeWsHub);
