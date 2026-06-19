import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const keyValueItem = z.object({
  label: z.string(),
  value: z.string(),
});

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
    Grid: {
      props: z.object({
        columns: z.number().min(1).max(6),
        gap: z.number().optional(),
      }),
      slots: ["default"],
      description: "CSS grid layout with fixed column count.",
    },
    Divider: {
      props: z.object({
        label: z.string().optional(),
      }),
      slots: [],
      description: "Horizontal section divider with optional label.",
    },
    Caption: {
      props: z.object({
        text: z.string(),
      }),
      slots: [],
      description: "Section title or caption text.",
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        unit: z.string().optional(),
        hint: z.string().optional(),
      }),
      slots: [],
      description: "Single scalar KPI (label + value).",
    },
    MetricGrid: {
      props: z.object({
        columns: z.number().min(1).max(6).optional(),
        gap: z.number().optional(),
      }),
      slots: ["default"],
      description: "Grid wrapper for Metric children.",
    },
    KeyValueList: {
      props: z.object({
        items: z.array(keyValueItem),
      }),
      slots: [],
      description: "Label/value list for metadata or parameters.",
    },
    Table: {
      props: z.object({
        columns: z.array(z.string()),
        rows: z.array(z.array(z.string())),
        caption: z.string().optional(),
      }),
      slots: [],
      description: "Tabular scientific results.",
    },
    Text: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["default", "muted", "small"]).optional(),
      }),
      slots: [],
      description: "Paragraph or note text.",
    },
    Alert: {
      props: z.object({
        title: z.string(),
        message: z.string(),
        variant: z.enum(["default", "info", "warning", "error", "success"]).optional(),
      }),
      slots: [],
      description: "QC or status alert banner.",
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
    ScatterPlot: {
      props: z.object({
        title: z.string().optional(),
        x: z.array(z.number()),
        y: z.array(z.number()),
      }),
      slots: [],
      description: "Scatter plot for point clouds or correlations.",
    },
    BarChart: {
      props: z.object({
        title: z.string().optional(),
        labels: z.array(z.string()),
        values: z.array(z.number()),
      }),
      slots: [],
      description: "Categorical bar chart (labels + values).",
    },
  },
  actions: {},
});
