/**
 * Default dashboard configuration for icelight analytics events
 */
import type { DashboardConfig, PortletConfig } from "./types.js";

/**
 * Default dashboard ID (used for seeding)
 */
export const DEFAULT_DASHBOARD_ID = "default-events-dashboard";

type AnalysisConfig = NonNullable<PortletConfig["analysisConfig"]>;

const DATE_FILTER = ["date-range"];

/**
 * Retention needs a fixed date range; use the last 8 weeks as of when the
 * config is built (the daily cron re-saves the default dashboard).
 */
function lastWeeks(weeks: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Standard query portlet
 */
function queryPortlet(
  id: string,
  title: string,
  chartType: string,
  query: Record<string, unknown>,
  chartConfig: Record<string, unknown> = {},
  displayConfig: Record<string, unknown> = {},
  filtered = true
): PortletConfig {
  return {
    id,
    title,
    w: 6,
    h: 4,
    x: 0,
    y: 0,
    ...(filtered ? { dashboardFilterMapping: DATE_FILTER } : {}),
    analysisConfig: {
      version: 1,
      analysisType: "query",
      activeView: "chart",
      charts: { query: { chartType, chartConfig, displayConfig } },
      query,
    } as AnalysisConfig,
  };
}

/**
 * KPI portlet for the grouped "Key Metrics" card
 */
function kpiPortlet(
  id: string,
  title: string,
  measure: string,
  granularity: "day" | "week",
  chartType: "kpiNumber" | "kpiDelta",
  displayConfig: Record<string, unknown>
): PortletConfig {
  return queryPortlet(
    id,
    title,
    chartType,
    { measures: [measure], timeDimensions: [{ dimension: "Events.timestamp", granularity }] },
    { yAxis: [measure] },
    displayConfig
  );
}

/**
 * Default dashboard using drizzle-cube AnalysisConfig-based portlets.
 *
 * Layout is explicit `rows`; the top row is a portlet group ("combination
 * portlet") that renders the KPIs inside one card.
 */
export const defaultDashboardConfig: DashboardConfig = {
  layoutMode: "rows",
  grid: {
    cols: 12,
    rowHeight: 90,
    minW: 3,
    minH: 3,
  },
  filters: [
    {
      id: "date-range",
      label: "Date Range",
      isUniversalTime: true,
      filter: {
        member: "Events.timestamp",
        operator: "inDateRange" as const,
        values: ["last 6 months"],
      },
    },
  ],
  groups: [
    {
      id: "group-key-metrics",
      title: "Key Metrics",
      direction: "row",
      cells: [
        { portletIds: ["kpi-total-events"] },
        { portletIds: ["kpi-unique-users"] },
        { portletIds: ["kpi-anonymous-users"] },
        { portletIds: ["kpi-revenue"] },
        { portletIds: ["kpi-avg-order"] },
      ],
    },
  ],
  rows: [
    { id: "row-kpis", h: 3, columns: [{ groupId: "group-key-metrics", w: 12 }] },
    {
      id: "row-trends",
      h: 4,
      columns: [
        { portletId: "chart-events-over-time", w: 8 },
        { portletId: "chart-events-by-type", w: 4 },
      ],
    },
    {
      id: "row-users",
      h: 4,
      columns: [
        { portletId: "chart-daily-active-users", w: 6 },
        { portletId: "chart-revenue-over-time", w: 6 },
      ],
    },
    { id: "row-flow", h: 5, columns: [{ portletId: "flow-user-journey", w: 12 }] },
    {
      id: "row-conversion",
      h: 5,
      columns: [
        { portletId: "funnel-signup-to-purchase", w: 7 },
        { portletId: "chart-users-by-plan", w: 5 },
      ],
    },
    { id: "row-retention", h: 5, columns: [{ portletId: "retention-weekly", w: 12 }] },
    {
      id: "row-paths",
      h: 5,
      columns: [
        { portletId: "flow-after-signup", w: 6 },
        { portletId: "chart-top-products", w: 6 },
      ],
    },
    {
      id: "row-audience",
      h: 4,
      columns: [
        { portletId: "chart-platforms", w: 4 },
        { portletId: "chart-device-types", w: 4 },
        { portletId: "chart-campaign-sources", w: 4 },
      ],
    },
    { id: "row-activity", h: 4, columns: [{ portletId: "chart-activity-grid", w: 12 }] },
    {
      id: "row-tables",
      h: 4,
      columns: [
        { portletId: "grid-top-events", w: 6 },
        { portletId: "grid-top-pages", w: 6 },
      ],
    },
  ],
  portlets: [
    // === Key metrics (rendered together in group-key-metrics) ===
    kpiPortlet("kpi-total-events", "Daily Events", "Events.count", "day", "kpiNumber", {
      decimals: 0,
      suffix: " events",
    }),
    kpiPortlet("kpi-unique-users", "Weekly Uniques", "Events.uniqueUsers", "week", "kpiDelta", {
      decimals: 0,
      suffix: " users",
      useLastCompletePeriod: true,
    }),
    kpiPortlet("kpi-anonymous-users", "Daily Anonymous", "Events.uniqueAnonymous", "day", "kpiNumber", {
      decimals: 0,
      suffix: " visitors",
    }),
    kpiPortlet("kpi-revenue", "Weekly Revenue", "Events.totalRevenue", "week", "kpiDelta", {
      decimals: 0,
      prefix: "$",
      useLastCompletePeriod: true,
    }),
    kpiPortlet("kpi-avg-order", "Avg Order Value", "Events.avgRevenue", "week", "kpiNumber", {
      decimals: 2,
      prefix: "$",
      useLastCompletePeriod: true,
    }),

    // === Trends ===
    queryPortlet(
      "chart-events-over-time",
      "Events Over Time",
      "area",
      {
        measures: ["Events.count"],
        dimensions: ["Events.type"],
        timeDimensions: [{ dimension: "Events.timestamp", granularity: "day" }],
      },
      { xAxis: ["Events.timestamp"], yAxis: ["Events.count"], series: ["Events.type"] },
      { showLegend: true, stacked: true, stackType: "normal" }
    ),
    queryPortlet(
      "chart-events-by-type",
      "Events by Type",
      "treemap",
      { measures: ["Events.count"], dimensions: ["Events.type"], order: { "Events.count": "desc" } },
      { xAxis: ["Events.type"], yAxis: ["Events.count"] },
      { showLegend: true }
    ),
    queryPortlet(
      "chart-daily-active-users",
      "Daily Active Users",
      "line",
      {
        measures: ["Events.uniqueUsers", "Events.uniqueAnonymous"],
        timeDimensions: [{ dimension: "Events.timestamp", granularity: "day" }],
      },
      { xAxis: ["Events.timestamp"], yAxis: ["Events.uniqueUsers", "Events.uniqueAnonymous"] },
      { showLegend: true }
    ),
    queryPortlet(
      "chart-revenue-over-time",
      "Revenue by Week",
      "bar",
      {
        measures: ["Events.totalRevenue"],
        timeDimensions: [{ dimension: "Events.timestamp", granularity: "week" }],
      },
      { xAxis: ["Events.timestamp"], yAxis: ["Events.totalRevenue"] },
      { showLegend: false, leftYAxisFormat: { unit: "currency", abbreviate: true } }
    ),

    // === User journey ===
    {
      id: "flow-user-journey",
      title: "User Journey Flow",
      w: 12,
      h: 5,
      x: 0,
      y: 0,
      analysisConfig: {
        version: 1,
        analysisType: "flow",
        activeView: "chart",
        charts: {
          flow: { chartType: "sankey", chartConfig: {}, displayConfig: { showLabels: true } },
        },
        query: {
          flow: {
            bindingKey: "Events.userId",
            timeDimension: "Events.timestamp",
            startingStep: {
              name: "Identify",
              filter: {
                type: "and",
                filters: [
                  { member: "Events.timestamp", operator: "inDateRange", values: [], dateRange: "last 30 days" },
                  { member: "Events.type", operator: "equals", values: ["identify"] },
                ],
              },
            },
            // Deeper flows exceed Basin SQL's expression nesting limit
            stepsBefore: 2,
            stepsAfter: 3,
            eventDimension: "Events.type",
            outputMode: "sankey",
            // Basin SQL does not support LATERAL joins
            joinStrategy: "window",
          },
        },
      } as AnalysisConfig,
    },

    // === Conversion ===
    {
      id: "funnel-signup-to-purchase",
      title: "Signup to Purchase Funnel",
      w: 7,
      h: 5,
      x: 0,
      y: 0,
      analysisConfig: {
        version: 1,
        analysisType: "funnel",
        activeView: "chart",
        charts: {
          funnel: { chartType: "funnel", chartConfig: {}, displayConfig: {} },
        },
        query: {
          funnel: {
            bindingKey: "Events.userId",
            timeDimension: "Events.timestamp",
            steps: [
              {
                name: "Sign Up",
                cube: "Events",
                filter: [{ member: "Events.event", operator: "equals", values: ["Signup Started"] }],
              },
              {
                name: "Download",
                cube: "Events",
                filter: [{ member: "Events.event", operator: "equals", values: ["File Downloaded"] }],
              },
              {
                name: "Purchase",
                cube: "Events",
                filter: [{ member: "Events.event", operator: "equals", values: ["Purchase Completed"] }],
              },
            ],
            includeTimeMetrics: true,
          },
        },
      } as AnalysisConfig,
    },
    queryPortlet(
      "chart-users-by-plan",
      "Users by Plan",
      "bar",
      {
        measures: ["Events.uniqueUsers"],
        dimensions: ["Events.plan"],
        filters: [{ member: "Events.plan", operator: "set", values: [] }],
        order: { "Events.uniqueUsers": "desc" },
      },
      { xAxis: ["Events.plan"], yAxis: ["Events.uniqueUsers"] },
      { showLegend: false, orientation: "horizontal" }
    ),

    // === Retention ===
    {
      id: "retention-weekly",
      title: "Weekly Retention",
      w: 12,
      h: 5,
      x: 0,
      y: 0,
      analysisConfig: {
        version: 1,
        analysisType: "retention",
        activeView: "chart",
        charts: {
          retention: { chartType: "retentionHeatmap", chartConfig: {}, displayConfig: {} },
        },
        query: {
          retention: {
            timeDimension: "Events.timestamp",
            bindingKey: "Events.userId",
            dateRange: lastWeeks(8),
            granularity: "week",
            periods: 6,
            retentionType: "classic",
          },
        },
      } as AnalysisConfig,
    },

    // === Paths and products ===
    {
      id: "flow-after-signup",
      title: "Paths After Signup",
      w: 6,
      h: 5,
      x: 0,
      y: 0,
      analysisConfig: {
        version: 1,
        analysisType: "flow",
        activeView: "chart",
        charts: {
          flow: { chartType: "sunburst", chartConfig: {}, displayConfig: {} },
        },
        query: {
          flow: {
            bindingKey: "Events.userId",
            timeDimension: "Events.timestamp",
            startingStep: {
              name: "Signup Started",
              filter: { member: "Events.event", operator: "equals", values: ["Signup Started"] },
            },
            stepsBefore: 0,
            stepsAfter: 3,
            eventDimension: "Events.event",
            outputMode: "sunburst",
            // No entityLimit: it currently triggers a Basin SQL planner error
            // Basin SQL does not support LATERAL joins
            joinStrategy: "window",
          },
        },
      } as AnalysisConfig,
    },
    queryPortlet(
      "chart-top-products",
      "Most Added Products",
      "bar",
      {
        measures: ["Events.count"],
        dimensions: ["Events.product"],
        filters: [
          { member: "Events.event", operator: "equals", values: ["Item Added to Cart"] },
          { member: "Events.product", operator: "set", values: [] },
        ],
        order: { "Events.count": "desc" },
        limit: 10,
      },
      { xAxis: ["Events.product"], yAxis: ["Events.count"] },
      { showLegend: false, orientation: "horizontal" }
    ),

    // === Audience ===
    queryPortlet(
      "chart-platforms",
      "Platforms",
      "pie",
      {
        measures: ["Events.uniqueUsers"],
        dimensions: ["Events.platform"],
        filters: [{ member: "Events.platform", operator: "set", values: [] }],
        order: { "Events.uniqueUsers": "desc" },
      },
      { xAxis: ["Events.platform"], yAxis: ["Events.uniqueUsers"] },
      { showLegend: true }
    ),
    queryPortlet(
      "chart-device-types",
      "Device Types",
      "pie",
      {
        measures: ["Events.uniqueUsers"],
        dimensions: ["Events.ctxDeviceType"],
        filters: [{ member: "Events.ctxDeviceType", operator: "set", values: [] }],
        order: { "Events.uniqueUsers": "desc" },
      },
      { xAxis: ["Events.ctxDeviceType"], yAxis: ["Events.uniqueUsers"], innerRadius: "50%" },
      { showLegend: true, innerRadius: "50%" }
    ),
    queryPortlet(
      "chart-campaign-sources",
      "Campaign Sources",
      "bar",
      {
        measures: ["Events.uniqueUsers"],
        dimensions: ["Events.campaignSource"],
        filters: [{ member: "Events.campaignSource", operator: "set", values: [] }],
        order: { "Events.uniqueUsers": "desc" },
        limit: 10,
      },
      { xAxis: ["Events.campaignSource"], yAxis: ["Events.uniqueUsers"] },
      { showLegend: false }
    ),

    // === Activity ===
    queryPortlet(
      "chart-activity-grid",
      "Activity by Hour",
      "activityGrid",
      {
        measures: ["Events.count"],
        timeDimensions: [{ dimension: "Events.timestamp", granularity: "hour" }],
      },
      { dateField: ["Events.timestamp"], valueField: ["Events.count"] },
      { showLegend: false }
    ),

    // === Tables ===
    queryPortlet(
      "grid-top-events",
      "Top Event Names",
      "table",
      {
        measures: ["Events.count", "Events.uniqueUsers"],
        dimensions: ["Events.event"],
        filters: [{ member: "Events.event", operator: "set", values: [] }],
        order: { "Events.count": "desc" },
        limit: 10,
      }
    ),
    queryPortlet(
      "grid-top-pages",
      "Top Pages",
      "table",
      {
        measures: ["Events.count", "Events.uniqueUsers"],
        dimensions: ["Events.pagePath"],
        filters: [{ member: "Events.pagePath", operator: "set", values: [] }],
        order: { "Events.count": "desc" },
        limit: 10,
      }
    ),
  ],
};

/**
 * Default dashboard record for database seeding
 */
export const defaultDashboardRecord = {
  id: DEFAULT_DASHBOARD_ID,
  name: "Events Dashboard",
  description:
    "Default analytics dashboard showing key event metrics and trends.  This is an example only, you could easily embed this in your own UI where your users could create / edit / share their own dashboards and analysis.",
  config: defaultDashboardConfig,
  displayOrder: 0,
  isActive: true,
  isDefault: true,
};
