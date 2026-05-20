import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";

class MissingRouteParamError extends Data.TaggedError("MissingRouteParamError")<{
  readonly name: string;
}> {
  override get message() {
    return `Missing route parameter: ${this.name}`;
  }
}

export const requirePathParam = (name: string) =>
  Effect.gen(function* () {
    const params = yield* HttpRouter.params;
    const value = params[name];
    if (typeof value !== "string" || value.length === 0) {
      return yield* Effect.fail(new MissingRouteParamError({ name }));
    }
    return value;
  });

export const respondMissingRouteParam = (error: MissingRouteParamError) =>
  Effect.succeed(
    HttpServerResponse.jsonUnsafe(
      { error: error.message },
      { status: 400, headers: { "access-control-allow-origin": "*" } },
    ),
  );
