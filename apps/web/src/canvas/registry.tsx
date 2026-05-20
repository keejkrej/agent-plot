import { defineRegistry } from "@json-render/react";
import {
  AlertBlock,
  KeyValueListBlock,
  MetricBlock,
  PreviewImageBlock,
  TableBlock,
  TextBlock,
} from "./components/data.js";
import {
  CaptionHeading,
  DividerLine,
  GridLayout,
  MetricGridLayout,
  StackLayout,
} from "./components/layout.js";
import {
  BarChartSvg,
  HistogramSvg,
  LinePlotSvg,
  ScatterPlotSvg,
} from "./components/plots.js";
import { plotCatalog } from "./catalog.js";

export const { registry: plotRegistry } = defineRegistry(plotCatalog, {
  components: {
    Stack: ({ props, children }) => (
      <StackLayout direction={props.direction} gap={props.gap}>
        {children}
      </StackLayout>
    ),
    Grid: ({ props, children }) => (
      <GridLayout columns={props.columns} gap={props.gap}>
        {children}
      </GridLayout>
    ),
    Divider: ({ props }) => <DividerLine label={props.label} />,
    Caption: ({ props }) => <CaptionHeading text={props.text} />,
    Metric: ({ props }) => (
      <MetricBlock label={props.label} value={props.value} unit={props.unit} hint={props.hint} />
    ),
    MetricGrid: ({ props, children }) => (
      <MetricGridLayout columns={props.columns} gap={props.gap}>
        {children}
      </MetricGridLayout>
    ),
    KeyValueList: ({ props }) => <KeyValueListBlock items={props.items} />,
    Table: ({ props }) => (
      <TableBlock columns={props.columns} rows={props.rows} caption={props.caption} />
    ),
    Text: ({ props }) => <TextBlock text={props.text} variant={props.variant} />,
    Alert: ({ props }) => (
      <AlertBlock title={props.title} message={props.message} variant={props.variant} />
    ),
    PreviewImage: ({ props }) => (
      <PreviewImageBlock src={props.src} caption={props.caption} />
    ),
    LinePlot: ({ props }) => <LinePlotSvg title={props.title} x={props.x} y={props.y} />,
    Histogram: ({ props }) => <HistogramSvg title={props.title} x={props.x} y={props.y} />,
    ScatterPlot: ({ props }) => <ScatterPlotSvg title={props.title} x={props.x} y={props.y} />,
    BarChart: ({ props }) => (
      <BarChartSvg title={props.title} labels={props.labels} values={props.values} />
    ),
  },
});
