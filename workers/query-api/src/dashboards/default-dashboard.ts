/**
 * Default dashboard configuration for icelight analytics events
 */
import type { DashboardConfig, PortletConfig } from "./types.js";

/**
 * Default dashboard ID (used for seeding)
 */
export const DEFAULT_DASHBOARD_ID = "default-events-dashboard";

type AnalysisConfig = NonNullable<PortletConfig["analysisConfig"]>;

const DATE_FILTER_ID = "date-range";
/**
 * Universal time only rewrites the dateRange of a portlet's time dimensions.
 * Portlets without one (KPI totals, breakdowns, tables) map the filter onto
 * Events.timestamp instead, which applies it as a regular inDateRange filter.
 */
const DATE_FILTER_TIME_SERIES = [DATE_FILTER_ID];
const DATE_FILTER_ON_TIMESTAMP = [{ filterId: DATE_FILTER_ID, member: "Events.timestamp" }];
const DEFAULT_RANGE = "last 30 days";
const USD = { unit: "currency", currencyCode: "USD", decimals: 0 };

/**
 * Retention needs a fixed date range. Computed per call: in Workers, Date at
 * module scope is the epoch, so this must not run at import time.
 */
function lastWeeks(weeks: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Standard query portlet, mapped to the dashboard date filter
 */
function queryPortlet(
  id: string,
  title: string,
  chartType: string,
  query: Record<string, unknown>,
  chartConfig: Record<string, unknown> = {},
  displayConfig: Record<string, unknown> = {}
): PortletConfig {
  return {
    id,
    title,
    w: 6,
    h: 4,
    x: 0,
    y: 0,
    dashboardFilterMapping: query.timeDimensions ? DATE_FILTER_TIME_SERIES : DATE_FILTER_ON_TIMESTAMP,
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
 * Compact KPI for the grouped "Key Metrics" card. kpiNumber is a total over
 * the dashboard date range (no time dimension, so it isn't an average of
 * buckets); kpiDelta compares the last complete week with the one before.
 */
function kpiPortlet(
  id: string,
  title: string,
  measure: string,
  chartType: "kpiNumber" | "kpiDelta",
  displayConfig: Record<string, unknown>
): PortletConfig {
  const delta = chartType === "kpiDelta";
  return queryPortlet(
    id,
    title,
    chartType,
    {
      measures: [measure],
      ...(delta ? { timeDimensions: [{ dimension: "Events.timestamp", granularity: "week" }] } : {}),
    },
    delta ? { yAxis: [measure], xAxis: ["Events.timestamp"] } : { yAxis: [measure] },
    { layout: "compact", ...displayConfig }
  );
}

/** Pie with a hole, for share across a few categories */
function donutPortlet(id: string, title: string, dimension: string): PortletConfig {
  return queryPortlet(
    id,
    title,
    "pie",
    {
      measures: ["Events.uniqueUsers"],
      dimensions: [dimension],
      filters: [{ member: dimension, operator: "set", values: [] }],
      order: { "Events.uniqueUsers": "desc" },
    },
    { xAxis: [dimension], yAxis: ["Events.uniqueUsers"] },
    { showLegend: true, innerRadius: "40%" }
  );
}

/**
 * Build the default dashboard using drizzle-cube AnalysisConfig-based portlets.
 *
 * Layout is explicit `rows`; the top row is a portlet group ("combination
 * portlet") that renders the KPIs inside one card. The universal time filter
 * drives the date bar; the funnel takes it on its first step, while flow and
 * retention portlets ignore dashboard filters and carry their own ranges.
 *
 * Call per request: the retention range is relative to now.
 */
export function getDefaultDashboardConfig(): DashboardConfig {
  return {
    layoutMode: "rows",
    grid: {
      cols: 12,
      rowHeight: 90,
      minW: 3,
      minH: 2,
    },
    filters: [
      {
        id: DATE_FILTER_ID,
        label: "Date Range",
        isUniversalTime: true,
        filter: {
          member: "Events.timestamp",
          operator: "inDateRange" as const,
          values: [],
          dateRange: DEFAULT_RANGE,
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
          { portletIds: ["kpi-weekly-users"] },
          { portletIds: ["kpi-purchases"] },
          { portletIds: ["kpi-weekly-revenue"] },
          { portletIds: ["kpi-avg-order"] },
        ],
      },
    ],
    rows: [
      { id: "row-kpis", h: 2, columns: [{ groupId: "group-key-metrics", w: 12 }] },
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
          { portletId: "chart-daily-revenue", w: 6 },
        ],
      },
      { id: "row-flow", h: 5, columns: [{ portletId: "flow-user-journey", w: 12 }] },
      {
        id: "row-conversion",
        h: 5,
        columns: [
          { portletId: "funnel-cart-to-purchase", w: 7 },
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
          { portletId: "chart-campaign-mediums", w: 4 },
          { portletId: "chart-device-types", w: 4 },
          { portletId: "chart-campaign-sources", w: 4 },
        ],
      },
      { id: "row-activity", h: 4, columns: [{ portletId: "chart-activity-grid", w: 12 }] },
      {
        id: "row-tables",
        h: 5,
        columns: [
          { portletId: "grid-top-events", w: 6 },
          { portletId: "grid-top-pages", w: 6 },
        ],
      },
    ],
    portlets: [
      // === Key metrics (rendered together in group-key-metrics) ===
      kpiPortlet("kpi-total-events", "Events", "Events.count", "kpiNumber", { decimals: 0 }),
      kpiPortlet("kpi-weekly-users", "Weekly Active Users", "Events.uniqueUsers", "kpiDelta", {
        decimals: 0,
        useLastCompletePeriod: true,
      }),
      kpiPortlet("kpi-purchases", "Purchases", "Events.purchases", "kpiNumber", { decimals: 0 }),
      kpiPortlet("kpi-weekly-revenue", "Weekly Revenue", "Events.totalRevenue", "kpiDelta", {
        decimals: 0,
        prefix: "$",
        useLastCompletePeriod: true,
      }),
      kpiPortlet("kpi-avg-order", "Avg Order Value", "Events.avgRevenue", "kpiNumber", {
        decimals: 2,
        prefix: "$",
      }),

      // === Trends ===
      queryPortlet(
        "chart-events-over-time",
        "Events per Day by Type",
        "area",
        {
          measures: ["Events.count"],
          dimensions: ["Events.type"],
          timeDimensions: [{ dimension: "Events.timestamp", granularity: "day" }],
        },
        { xAxis: ["Events.timestamp"], yAxis: ["Events.count"], series: ["Events.type"] },
        { showLegend: true, stackType: "normal" }
      ),
      queryPortlet(
        "chart-events-by-type",
        "Events by Type",
        "pie",
        { measures: ["Events.count"], dimensions: ["Events.type"], order: { "Events.count": "desc" } },
        { xAxis: ["Events.type"], yAxis: ["Events.count"] },
        { showLegend: true, innerRadius: "40%" }
      ),
      queryPortlet(
        "chart-daily-active-users",
        "Daily Active Users",
        "area",
        {
          measures: ["Events.uniqueUsers"],
          timeDimensions: [{ dimension: "Events.timestamp", granularity: "day" }],
        },
        { xAxis: ["Events.timestamp"], yAxis: ["Events.uniqueUsers"] },
        { showLegend: false }
      ),
      queryPortlet(
        "chart-daily-revenue",
        "Daily Revenue & Purchases",
        "line",
        {
          measures: ["Events.totalRevenue", "Events.purchases"],
          timeDimensions: [{ dimension: "Events.timestamp", granularity: "day" }],
        },
        {
          xAxis: ["Events.timestamp"],
          yAxis: ["Events.totalRevenue", "Events.purchases"],
          yAxisAssignment: { "Events.purchases": "right" },
        },
        { showLegend: true, showPoints: false, leftYAxisFormat: USD }
      ),

      // === User journey ===
      {
        id: "flow-user-journey",
        title: "User Journey Around Identify",
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
                    { member: "Events.timestamp", operator: "inDateRange", values: [], dateRange: DEFAULT_RANGE },
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
        id: "funnel-cart-to-purchase",
        title: "Signup to Purchase Funnel",
        w: 7,
        h: 5,
        x: 0,
        y: 0,
        // Applied as an inDateRange filter on step 0 (the entering cohort)
        dashboardFilterMapping: DATE_FILTER_TIME_SERIES,
        analysisConfig: {
          version: 1,
          analysisType: "funnel",
          activeView: "chart",
          charts: {
            funnel: {
              chartType: "funnel",
              chartConfig: {},
              displayConfig: { showFunnelConversion: true, showFunnelMedianTime: true },
            },
          },
          query: {
            funnel: {
              bindingKey: "Events.userId",
              timeDimension: "Events.timestamp",
              steps: [
                {
                  name: "Signed Up",
                  filter: { member: "Events.event", operator: "equals", values: ["Signup Started"] },
                },
                {
                  name: "Added to Cart",
                  filter: { member: "Events.event", operator: "equals", values: ["Item Added to Cart"] },
                  timeToConvert: "P7D",
                },
                {
                  name: "Purchased",
                  filter: { member: "Events.event", operator: "equals", values: ["Purchase Completed"] },
                  timeToConvert: "P7D",
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
        { showLegend: false }
      ),

      // === Retention ===
      {
        id: "retention-weekly",
        title: "Weekly Retention (last 8 weeks)",
        w: 12,
        h: 5,
        x: 0,
        y: 0,
        analysisConfig: {
          version: 1,
          analysisType: "retention",
          activeView: "chart",
          charts: {
            retention: {
              chartType: "retentionCombined",
              chartConfig: {},
              displayConfig: { retentionDisplayMode: "combined" },
            },
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
        title: "What Users Do After Signup",
        w: 6,
        h: 5,
        x: 0,
        y: 0,
        analysisConfig: {
          version: 1,
          analysisType: "flow",
          activeView: "chart",
          charts: {
            flow: { chartType: "sunburst", chartConfig: {}, displayConfig: { hideSummaryFooter: false } },
          },
          query: {
            flow: {
              bindingKey: "Events.userId",
              timeDimension: "Events.timestamp",
              startingStep: {
                name: "Signup Started",
                filter: {
                  type: "and",
                  filters: [
                    { member: "Events.timestamp", operator: "inDateRange", values: [], dateRange: DEFAULT_RANGE },
                    { member: "Events.event", operator: "equals", values: ["Signup Started"] },
                  ],
                },
              },
              stepsBefore: 0,
              // Event types (track/page/screen) keep the rings readable;
              // event names give hundreds of slivers after two steps
              stepsAfter: 3,
              eventDimension: "Events.type",
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
        "Most Added to Cart",
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
        { showLegend: false, showAllXLabels: true }
      ),

      // === Audience ===
      donutPortlet("chart-campaign-mediums", "Users by Campaign Medium", "Events.campaignMedium"),
      donutPortlet("chart-device-types", "Users by Device Type", "Events.ctxDeviceType"),
      queryPortlet(
        "chart-campaign-sources",
        "Users by Campaign Source",
        "bar",
        {
          measures: ["Events.uniqueUsers"],
          dimensions: ["Events.campaignSource"],
          filters: [{ member: "Events.campaignSource", operator: "set", values: [] }],
          order: { "Events.uniqueUsers": "desc" },
          limit: 10,
        },
        { xAxis: ["Events.campaignSource"], yAxis: ["Events.uniqueUsers"] },
        { showLegend: false, showAllXLabels: true }
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
        { showLabels: true, fitToWidth: true }
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
}

/**
 * Default dashboard record for database seeding
 */
export function getDefaultDashboardRecord() {
  return {
    id: DEFAULT_DASHBOARD_ID,
    name: "Events Dashboard",
    description:
      "Default analytics dashboard showing key event metrics and trends.  This is an example only, you could easily embed this in your own UI where your users could create / edit / share their own dashboards and analysis.",
    config: getDefaultDashboardConfig(),
    displayOrder: 0,
    isActive: true,
    isDefault: true,
  };
}
