export {
  getDefaultStore,
  pathAttachmentsFromEntries,
  resetDefaultStoreForTests,
  SessionStore,
  type Session,
  type SessionListEntry,
} from "./store.js";

export { SESSIONS_ROOT_PATH } from "./python/paths.js";

export {
  broadcastActivityEnd,
  broadcastActivityStart,
  broadcastAssistantDelta,
  broadcastAssistantEnd,
  broadcastAssistantStart,
  broadcastSystemNote,
  broadcastUser,
  type BroadcastOptions,
} from "./chat.js";

export {
  applyCanvasVisibility,
  defaultCanvasVisibility,
  describeVisibility,
  mergeCanvasVisibility,
  parseCanvasIntentDelta,
  type CanvasVisibility,
} from "./canvasIntent.js";

export { buildAgentMessageText } from "./pathAttachments.js";

export { refreshSessionCanvas, type CanvasRefreshResult } from "./canvasRefresh.js";
export { jsonRender, mergePayloadIntoSpec, pruneEmptyAlerts, type CanvasSpec } from "./mergeCanvas.js";

export { buildArtifacts, describeTiff, type PythonResult } from "./python/index.js";

export { browseFilesystem, parentBrowsePath } from "./fsBrowse.js";

export {
  cursorAssistantReply,
  disposeSessionAgent,
  formatCursorAgentError,
  isCursorAgentConfigured,
  type SessionAgentPersistence,
} from "./cursorAgent.js";

export {
  agentAssistantReply,
  createAgent,
  createAgentModel,
  createAgentTools,
  describeModel,
  isAgentConfigured,
  type Agent,
  type AgentTools,
  type ReplyOptions,
  type ToolCallbacks,
} from "./agent/index.js";
