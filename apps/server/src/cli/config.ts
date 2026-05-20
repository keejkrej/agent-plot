import * as NetService from "@agent-plot/shared/Net";
import { DesktopBackendBootstrap } from "@agent-plot/contracts/desktop";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { Flag } from "effect/unstable/cli";

import { readBootstrapEnvelope } from "../bootstrap.ts";
import {
  DEFAULT_PORT,
  deriveServerPaths,
  ensureServerDirectories,
  type RuntimeMode,
  type ServerConfigShape,
} from "../config.ts";

export const portFlag = Flag.integer("port").pipe(
  Flag.withDescription("Port for the HTTP/WebSocket server."),
  Flag.optional,
);
export const hostFlag = Flag.string("host").pipe(
  Flag.withDescription("Host/interface to bind."),
  Flag.optional,
);
export const baseDirFlag = Flag.string("base-dir").pipe(
  Flag.withDescription("Base directory path (equivalent to AGENT_PLOT_HOME)."),
  Flag.optional,
);
export const devUrlFlag = Flag.string("dev-url").pipe(
  Flag.withSchema(Schema.URLFromString),
  Flag.withDescription("Dev web URL (equivalent to VITE_DEV_SERVER_URL)."),
  Flag.optional,
);
export const noBrowserFlag = Flag.boolean("no-browser").pipe(
  Flag.withDescription("Disable automatic browser opening."),
  Flag.optional,
);
export const bootstrapFdFlag = Flag.integer("bootstrap-fd").pipe(
  Flag.withDescription("Read bootstrap JSON from the given file descriptor."),
  Flag.optional,
);

export interface CliServerFlags {
  readonly port: Option.Option<number>;
  readonly host: Option.Option<string>;
  readonly baseDir: Option.Option<string>;
  readonly cwd: Option.Option<string>;
  readonly devUrl: Option.Option<URL>;
  readonly noBrowser: Option.Option<boolean>;
  readonly bootstrapFd: Option.Option<number>;
}

export const sharedServerCommandFlags = {
  port: portFlag,
  host: hostFlag,
  baseDir: baseDirFlag,
  cwd: Flag.string("cwd").pipe(Flag.optional),
  devUrl: devUrlFlag,
  noBrowser: noBrowserFlag,
  bootstrapFd: bootstrapFdFlag,
} as const;

const EnvServerConfig = Config.all({
  port: Config.port("AGENT_PLOT_PORT").pipe(Config.option, Config.map(Option.getOrUndefined)),
  host: Config.string("AGENT_PLOT_HOST").pipe(Config.option, Config.map(Option.getOrUndefined)),
  agentPlotHome: Config.string("AGENT_PLOT_HOME").pipe(
    Config.option,
    Config.map(Option.getOrUndefined),
  ),
  devUrl: Config.url("VITE_DEV_SERVER_URL").pipe(Config.option, Config.map(Option.getOrUndefined)),
  noBrowser: Config.boolean("AGENT_PLOT_NO_BROWSER").pipe(
    Config.option,
    Config.map(Option.getOrUndefined),
  ),
  bootstrapFd: Config.int("AGENT_PLOT_BOOTSTRAP_FD").pipe(
    Config.option,
    Config.map(Option.getOrUndefined),
  ),
});

const resolveBaseDir = Effect.fn(function* (configured: string | undefined) {
  const path = yield* Path.Path;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  const home = process.env.HOME ?? process.cwd();
  return path.join(home, ".agent-plot");
});

export const resolveServerConfig = (flags: CliServerFlags) =>
  Effect.gen(function* () {
    const { findAvailablePort } = yield* NetService.NetService;
    const path = yield* Path.Path;
    const env = yield* EnvServerConfig;

    const bootstrapFd = Option.getOrUndefined(flags.bootstrapFd) ?? env.bootstrapFd;
    const bootstrapEnvelope =
      bootstrapFd !== undefined
        ? yield* readBootstrapEnvelope(DesktopBackendBootstrap, bootstrapFd)
        : Option.none();
    const bootstrap = Option.getOrUndefined(bootstrapEnvelope);

    const mode: RuntimeMode = bootstrap?.mode ?? "web";
    const port =
      Option.getOrUndefined(flags.port) ??
      env.port ??
      bootstrap?.port ??
      (mode === "desktop"
        ? DEFAULT_PORT
        : yield* findAvailablePort(DEFAULT_PORT));

    const devUrl = Option.getOrUndefined(flags.devUrl) ?? env.devUrl;
    const devUrlResolved = devUrl === undefined ? undefined : new URL(devUrl);

    const baseDir = yield* resolveBaseDir(
      Option.getOrUndefined(flags.baseDir) ?? env.agentPlotHome ?? bootstrap?.agentPlotHome,
    );
    const cwd = path.resolve(Option.getOrElse(flags.cwd, () => process.cwd()));
    const derivedPaths = yield* deriveServerPaths(baseDir, devUrlResolved);
    yield* ensureServerDirectories(derivedPaths);

    const config: ServerConfigShape = {
      ...derivedPaths,
      mode,
      port,
      host:
        Option.getOrUndefined(flags.host) ??
        env.host ??
        bootstrap?.host ??
        (mode === "desktop" ? "127.0.0.1" : undefined),
      cwd,
      baseDir,
      devUrl: devUrlResolved,
      noBrowser:
        Option.getOrUndefined(flags.noBrowser) ??
        env.noBrowser ??
        bootstrap?.noBrowser ??
        mode === "desktop",
      desktopBootstrapToken: bootstrap?.desktopBootstrapToken,
    };

    return config;
  });
