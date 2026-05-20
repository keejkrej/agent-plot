import * as Effect from "effect/Effect";

import { ServerConfig } from "../config.ts";
import { runServer } from "../server.ts";
import { type CliServerFlags, resolveServerConfig } from "./config.ts";

export const runServerCommand = (flags: CliServerFlags) =>
  Effect.gen(function* () {
    const config = yield* resolveServerConfig(flags);
    return yield* runServer.pipe(Effect.provideService(ServerConfig, config));
  });
