import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

export const DEFAULT_PORT = 8787;

export const RuntimeMode = ["web", "desktop"] as const;
export type RuntimeMode = (typeof RuntimeMode)[number];

export interface ServerDerivedPaths {
  readonly stateDir: string;
  readonly logsDir: string;
  readonly environmentIdPath: string;
}

export interface ServerConfigShape extends ServerDerivedPaths {
  readonly mode: RuntimeMode;
  readonly port: number;
  readonly host: string | undefined;
  readonly cwd: string;
  readonly baseDir: string;
  readonly devUrl: URL | undefined;
  readonly noBrowser: boolean;
  readonly desktopBootstrapToken: string | undefined;
}

export class ServerConfig extends Context.Service<ServerConfig, ServerConfigShape>()(
  "agent-plot/server/Config",
) {}

export const deriveServerPaths = Effect.fn(function* (
  baseDir: string,
  devUrl: URL | undefined,
): Effect.fn.Return<ServerDerivedPaths, never, Path.Path> {
  const { join } = yield* Path.Path;
  const stateDir = join(baseDir, devUrl !== undefined ? "dev" : "userdata");
  const logsDir = join(stateDir, "logs");
  return {
    stateDir,
    logsDir,
    environmentIdPath: join(stateDir, "environment-id"),
  };
});

export const ensureServerDirectories = Effect.fn(function* (derivedPaths: ServerDerivedPaths) {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.makeDirectory(derivedPaths.stateDir, { recursive: true });
  yield* fs.makeDirectory(derivedPaths.logsDir, { recursive: true });
});

export const layer = (config: ServerConfigShape) => Layer.succeed(ServerConfig, config);
