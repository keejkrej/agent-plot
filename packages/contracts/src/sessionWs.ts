import * as Schema from "effect/Schema";

export const PathAttachmentKindSchema = Schema.Literals(["file", "folder"]);

export const PathAttachmentSchema = Schema.Struct({
  id: Schema.String,
  path: Schema.String,
  kind: PathAttachmentKindSchema,
});

export const WsClientFsBrowseSchema = Schema.Struct({
  type: Schema.Literal("fs.browse"),
  requestId: Schema.String,
  partialPath: Schema.String,
});

export const WsClientUserMessageSchema = Schema.Struct({
  type: Schema.Literal("user.message"),
  text: Schema.String,
  pathAttachments: Schema.optional(Schema.Array(PathAttachmentSchema)),
});

export const WsClientJsonRenderSchema = Schema.Struct({
  type: Schema.Literal("json_render"),
});

export const WsClientMessageSchema = Schema.Union([
  WsClientFsBrowseSchema,
  WsClientUserMessageSchema,
  WsClientJsonRenderSchema,
]);

export type WsClientFsBrowse = typeof WsClientFsBrowseSchema.Type;
export type WsClientUserMessage = typeof WsClientUserMessageSchema.Type;
export type WsClientJsonRender = typeof WsClientJsonRenderSchema.Type;
export type WsClientMessage = typeof WsClientMessageSchema.Type;

export const decodeWsClientMessage = Schema.decodeUnknownEffect(WsClientMessageSchema);
