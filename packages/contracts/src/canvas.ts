import * as Schema from "effect/Schema";

/** Payload map merged into canvas.json template ($payload refs). */
export const CanvasPayloadRecord = Schema.Record(Schema.String, Schema.Unknown);

export type CanvasPayloadRecord = typeof CanvasPayloadRecord.Type;

export const CanvasSpecSchema = Schema.Struct({
  root: Schema.String,
  elements: Schema.Record(Schema.String, Schema.Unknown),
});

export type CanvasSpec = typeof CanvasSpecSchema.Type;

export const decodeCanvasPayloadRecord = Schema.decodeUnknownSync(CanvasPayloadRecord);
