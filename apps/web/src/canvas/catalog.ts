import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * Catalog aligned with `apps/server/src/starter-canvas.json` element types.
 */
export const plotCatalog = defineCatalog(schema, {
  components: {
    Stack: {
      props: z.object({
        direction: z.enum(["column", "row"]),
        gap: z.number().optional(),
      }),
      slots: ["default"],
      description: "Flex stack for layout (row or column).",
    },
    Caption: {
      props: z.object({
        text: z.string(),
      }),
      slots: [],
      description: "Section title or caption text.",
    },
    PreviewImage: {
      props: z.object({
        src: z.string(),
        caption: z.string().optional(),
      }),
      slots: [],
      description: "Image preview with optional caption (URL from server).",
    },
    LinePlot: {
      props: z.object({
        title: z.string().optional(),
        x: z.array(z.number()),
        y: z.array(z.number()),
      }),
      slots: [],
      description: "Line chart for numeric series (e.g. profile).",
    },
    Histogram: {
      props: z.object({
        title: z.string().optional(),
        x: z.array(z.number()),
        y: z.array(z.number()),
      }),
      slots: [],
      description: "Bar-style histogram from bin centers and counts.",
    },
  },
  actions: {},
});
