import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { HttpRouter, HttpServer } from "effect/unstable/http";

import * as NetService from "@agent-plot/shared/Net";
import { ServerConfig } from "./config.ts";
import {
  ServerEnvironment,
  layer as ServerEnvironmentLayer,
} from "./environment/ServerEnvironment.ts";
import { browserApiCorsLayer, makeHttpRoutesLayer } from "./http.ts";
import { layer as SessionChatLayer } from "./session/Layers/SessionChat.ts";
import {
  layer as SessionStoreLayer,
  SESSIONS_ROOT_PATH,
} from "./session/Layers/SessionStore.ts";
import { websocketRouteLayer } from "./ws.ts";
import { layer as WsHubLayer } from "./wsHub.ts";

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

const SessionServicesLive = SessionChatLayer.pipe(
  Layer.provideMerge(SessionStoreLayer),
  Layer.provideMerge(WsHubLayer),
);

const makeRoutesLayer = Layer.mergeAll(makeHttpRoutesLayer, websocketRouteLayer).pipe(
  Layer.provide(browserApiCorsLayer),
  Layer.provideMerge(SessionServicesLive),
);

const StartupLogLive = Layer.effectDiscard(
  Effect.sync(() => {
    console.log(`Sessions directory: ${SESSIONS_ROOT_PATH}`);
  }),
);

export const makeServerLayer = Layer.mergeAll(
  HttpRouter.serve(makeRoutesLayer),
  StartupLogLive,
).pipe(
  Layer.provideMerge(SessionServicesLive),
  Layer.provideMerge(ServerEnvironmentLayer),
  Layer.provideMerge(HttpServerLive),
  Layer.provideMerge(NodeHttpClient.layerUndici),
  Layer.provideMerge(NetService.layer),
  Layer.provideMerge(PlatformServicesLive),
);

export const runServer = Layer.launch(makeServerLayer);
