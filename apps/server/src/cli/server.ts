import * as Effect from "effect/Effect";

import { ServerConfig } from "../config.ts";
import { makeServerLayer } from "../server.ts";
import * as Layer from "effect/Layer";
import { type CliServerFlags, resolveServerConfig } from "./config.ts";

export const runServerCommand = (flags: CliServerFlags) =>
  Effect.gen(function* () {
    const config = yield* resolveServerConfig(flags);
    const appLayer = makeServerLayer.pipe(Layer.provide(Layer.succeed(ServerConfig, config)));
    return yield* Layer.launch(appLayer);
  });
