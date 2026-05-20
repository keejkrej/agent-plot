import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { HttpRouter, HttpServer } from "effect/unstable/http";

import * as NetService from "@agent-plot/shared/Net";
import { setChatBroadcastSender } from "./chatBroadcast.ts";
import { ServerConfig } from "./config.ts";
import {
  ServerEnvironment,
  layer as ServerEnvironmentLayer,
} from "./environment/ServerEnvironment.ts";
import { browserApiCorsLayer, makeHttpRoutesLayer } from "./http.ts";
import { sessionsRoot } from "./session.ts";
import { websocketRouteLayer } from "./ws.ts";
import { WsHub, layer as WsHubLayer } from "./wsHub.ts";

const HttpServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    const [NodeHttpServer, NodeHttp] = yield* Effect.all([
      Effect.promise(() => import("@effect/platform-node/NodeHttpServer")),
      Effect.promise(() => import("node:http")),
    ]);
    return NodeHttpServer.layer(NodeHttp.createServer, {
      host: config.host,
      port: config.port,
    });
  }),
);

const PlatformServicesLive = Layer.unwrap(
  Effect.promise(() => import("@effect/platform-node/NodeServices")).pipe(
    Effect.map((module) => module.layer),
  ),
);

const wireChatBroadcastLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const wsHub = yield* WsHub;
    setChatBroadcastSender((sessionId, msg) => {
      Effect.runSync(wsHub.broadcast(sessionId, msg));
    });
  }),
);

const makeRoutesLayer = Layer.mergeAll(makeHttpRoutesLayer, websocketRouteLayer).pipe(
  Layer.provide(browserApiCorsLayer),
);

const makeServerLayer = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    yield* Effect.sync(() => {
      console.log(`Sessions directory: ${sessionsRoot()}`);
    });

    return Layer.mergeAll(
      HttpRouter.serve(makeRoutesLayer),
      wireChatBroadcastLayer,
    ).pipe(
      Layer.provideMerge(WsHubLayer),
      Layer.provideMerge(ServerEnvironmentLayer),
      Layer.provideMerge(HttpServerLive),
      Layer.provideMerge(NodeHttpClient.layerUndici),
      Layer.provideMerge(NetService.layer),
      Layer.provideMerge(PlatformServicesLive),
    );
  }),
);

export const runServer = Layer.launch(makeServerLayer);
