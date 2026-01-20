/**
 * Default dashboard configuration for icelight analytics events
 */
import type { DashboardConfig } from './types.js';

/**
 * Default dashboard ID (used for seeding)
 */
export const DEFAULT_DASHBOARD_ID = 'default-events-dashboard';

/**
 * Default dashboard using drizzle-cube AnalysisConfig-based portlets
 */
export const defaultDashboardConfig: DashboardConfig = {
  layoutMode: 'rows',
  grid: {
    cols: 12,
    rowHeight: 90,
    minW: 3,
    minH: 2,
  },
  filters: [
    {
      id: 'date-range',
      label: 'Date Range',
      isUniversalTime: true,
      filter: {
        member: 'Events.timestamp',
        operator: 'inDateRange' as const,
        values: ['last 6 months'],
      },
    },
  ],
  portlets: [
    {
      id: 'kpi-total-events',
      title: 'Daily Events',
      w: 4,
      h: 3,
      x: 0,
      y: 0,
      dashboardFilterMapping: ['date-range'],
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'kpiNumber',
            chartConfig: {
              yAxis: ['Events.count'],
            },
            displayConfig: {
              decimals: 0,
              suffix: ' events',
            },
          },
        },
        query: {
          measures: ['Events.count'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'day',
            },
          ],
        },
      },
    },
    {
      id: 'kpi-unique-users',
      title: 'Weekly Uniques',
      w: 4,
      h: 3,
      x: 4,
      y: 0,
      dashboardFilterMapping: ['date-range'],
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'kpiDelta',
            chartConfig: {
              yAxis: ['Events.uniqueUsers'],
            },
            displayConfig: {
              decimals: 0,
              suffix: ' weekly users',
            },
          },
        },
        query: {
          measures: ['Events.uniqueUsers'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'week',
            },
          ],
        },
      },
    },
    {
      id: 'kpi-anonymous-users',
      title: 'Daily Anonymous',
      w: 4,
      h: 3,
      x: 8,
      y: 0,
      dashboardFilterMapping: ['date-range'],
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'kpiNumber',
            chartConfig: {
              yAxis: ['Events.uniqueAnonymous'],
            },
            displayConfig: {
              decimals: 0,
              suffix: ' visitors',
            },
          },
        },
        query: {
          measures: ['Events.uniqueAnonymous'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'day',
            },
          ],
        },
      },
    },
    {
      id: 'flow-user-journey',
      title: 'User Journey Flow',
      w: 12,
      h: 5,
      x: 0,
      y: 3,
      analysisConfig: {
        version: 1,
        analysisType: 'flow',
        activeView: 'chart',
        charts: {
          flow: {
            chartType: 'sankey',
            chartConfig: {},
            displayConfig: {
              showLabels: true,
            },
          },
        },
        query: {
          flow: {
            bindingKey: 'Events.userId',
            timeDimension: 'Events.timestamp',
            startingStep: {
              name: 'Starting Step',
              filter: {
                type: 'and',
                filters: [
                  {
                    member: 'Events.timestamp',
                    operator: 'inDateRange',
                    values: [],
                    dateRange: 'this month',
                  },
                  {
                    member: 'Events.type',
                    operator: 'equals',
                    values: ['identify'],
                  },
                ],
              },
            },
            stepsBefore: 3,
            stepsAfter: 5,
            eventDimension: 'Events.type',
            outputMode: 'sankey',
            joinStrategy: 'auto',
          },
        },
      },
    },
    {
      id: 'funnel-signup-to-purchase',
      title: 'Signup to Purchase Funnel',
      w: 12,
      h: 5,
      x: 0,
      y: 8,
      analysisConfig: {
        version: 1,
        analysisType: 'funnel',
        activeView: 'chart',
        charts: {
          funnel: {
            chartType: 'funnel',
            chartConfig: {},
            displayConfig: {},
          },
        },
        query: {
          funnel: {
            bindingKey: 'Events.userId',
            timeDimension: 'Events.timestamp',
            steps: [
              {
                name: 'Sign Up',
                cube: 'Events',
                filter: [
                  {
                    member: 'Events.event',
                    operator: 'equals',
                    values: ['Signup Started'],
                  },
                ],
              },
              {
                name: 'Download',
                cube: 'Events',
                filter: [
                  {
                    member: 'Events.event',
                    operator: 'equals',
                    values: ['File Downloaded'],
                  },
                ],
              },
              {
                name: 'Purchase',
                cube: 'Events',
                filter: [
                  {
                    member: 'Events.event',
                    operator: 'equals',
                    values: ['Purchase Completed'],
                  },
                ],
              },
            ],
            includeTimeMetrics: true,
          },
        },
      },
    },
    {
      id: 'chart-events-over-time',
      title: 'Events Over Time',
      w: 12,
      h: 4,
      x: 0,
      y: 13,
      dashboardFilterMapping: ['date-range'],
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'activityGrid',
            chartConfig: {
              dateField: ['Events.timestamp'],
              valueField: ['Events.count'],
            },
            displayConfig: {
              showLegend: false,
            },
          },
        },
        query: {
          measures: ['Events.count'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'hour',
            },
          ],
        },
      },
    },
    {
      id: 'chart-events-by-type',
      title: 'Events by Type',
      w: 6,
      h: 4,
      x: 0,
      y: 17,
      dashboardFilterMapping: ['date-range'],
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'treemap',
            chartConfig: {
              xAxis: ['Events.type'],
              yAxis: ['Events.count'],
            },
            displayConfig: {
              showLegend: true,
            },
          },
        },
        query: {
          measures: ['Events.count'],
          dimensions: ['Events.type'],
          order: {
            'Events.count': 'desc',
          },
        },
      },
    },
    {
      id: 'grid-top-events',
      title: 'Top Event Names',
      w: 6,
      h: 4,
      x: 6,
      y: 17,
      dashboardFilterMapping: ['date-range'],
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'table',
            chartConfig: {},
            displayConfig: {},
          },
        },
        query: {
          measures: ['Events.count'],
          dimensions: ['Events.event'],
          order: {
            'Events.count': 'desc',
          },
          limit: 10,
        },
      },
    },
  ],
};

/**
 * Default dashboard record for database seeding
 */
export const defaultDashboardRecord = {
  id: DEFAULT_DASHBOARD_ID,
  name: 'Events Overview',
  description: 'Default analytics dashboard showing key event metrics and trends',
  config: defaultDashboardConfig,
  displayOrder: 0,
  isActive: true,
  isDefault: true,
};
