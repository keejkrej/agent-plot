export const APP_BASE_NAME = "Agent Plot";
export const APP_STAGE_LABEL = process.env.NODE_ENV === "development" ? "Dev" : "Beta";
export const APP_DISPLAY_NAME = `${APP_BASE_NAME} (${APP_STAGE_LABEL})`;
export const APP_VERSION = process.env.APP_VERSION || "0.1.0";
