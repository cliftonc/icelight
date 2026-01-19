import { useState, useEffect, useSyncExternalStore } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';

function useTheme() {
  const subscribe = (callback: () => void) => {
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  };
  const getSnapshot = () =>
    document.documentElement.getAttribute('data-theme') || 'night';
  return useSyncExternalStore(subscribe, getSnapshot, () => 'night');
}

interface ArchitectureNodeProps {
  label: string;
  sublabel?: string;
  delay?: number;
  isHighlighted?: boolean;
}

function ArchitectureNode({ label, sublabel, delay = 0, isHighlighted }: ArchitectureNodeProps) {
  return (
    <div
      className={`relative px-4 py-3 rounded-lg border-2 transition-all duration-500 ${
        isHighlighted
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-base-300 bg-base-100'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-sm font-semibold">{label}</div>
      {sublabel && <div className="text-xs opacity-70">{sublabel}</div>}
    </div>
  );
}

function AnimatedArrow({ delay = 0, isActive }: { delay?: number; isActive?: boolean }) {
  return (
    <div className="flex items-center justify-center px-2">
      <svg
        className={`w-8 h-8 transition-all duration-300 ${
          isActive ? 'text-primary' : 'text-base-300'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7l5 5m0 0l-5 5m5-5H6"
          className={isActive ? 'animate-pulse' : ''}
          style={{ animationDelay: `${delay}ms` }}
        />
      </svg>
    </div>
  );
}

function ArchitectureDiagram() {
  const [activeStep, setActiveStep] = useState(0);

  // Auto-cycle through steps (6 steps now, faster animation)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:block w-full overflow-x-auto py-8">
      <div className="flex items-center justify-center gap-2 min-w-[850px] px-4">
        <ArchitectureNode
          label="Your App"
          sublabel="Analytics.js SDK"
          isHighlighted={activeStep === 0}
        />
        <AnimatedArrow isActive={activeStep === 1} />
        <ArchitectureNode
          label="Event Ingest"
          sublabel="Worker"
          isHighlighted={activeStep === 1}
        />
        <AnimatedArrow isActive={activeStep === 2} />
        <ArchitectureNode
          label="Cloudflare"
          sublabel="Pipeline"
          isHighlighted={activeStep === 2}
        />
        <AnimatedArrow isActive={activeStep === 3} />
        <ArchitectureNode
          label="R2 + Iceberg"
          sublabel="Data Catalog"
          isHighlighted={activeStep === 3}
        />
        <AnimatedArrow isActive={activeStep === 4} />
        <ArchitectureNode
          label="Query API"
          sublabel="Worker"
          isHighlighted={activeStep === 4}
        />
        <AnimatedArrow isActive={activeStep === 5} />
        <ArchitectureNode
          label="Drizzle-Cube"
          sublabel="Semantic Layer"
          isHighlighted={activeStep === 5}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        <div className="text-primary text-4xl mb-2">{icon}</div>
        <h3 className="card-title">{title}</h3>
        <p className="text-base-content/70">{description}</p>
      </div>
    </div>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const grammar = Prism.languages[language] || Prism.languages.plain;
  const highlighted = Prism.highlight(code, grammar, language);

  return (
    <div className="relative">
      <pre className="rounded-lg p-4 overflow-x-auto text-sm bg-base-300 border border-base-content/10">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      <button
        className="absolute top-2 right-2 btn btn-ghost btn-xs opacity-60 hover:opacity-100"
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

function QuickStartStep({
  number,
  title,
  code,
}: {
  number: number;
  title: string;
  code: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold mb-2">{title}</h4>
        <CodeBlock code={code} />
      </div>
    </div>
  );
}

type Page = 'home' | 'query' | 'duckdb' | 'simulator' | 'analysis' | 'dashboard';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [sdkTab, setSdkTab] = useState<'rudderstack' | 'http'>('rudderstack');
  const theme = useTheme();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-base-200 via-base-100 to-base-200">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Analytics Events
            </span>
            <br />
            <span className="text-base-content">to Apache Iceberg on Cloudflare</span>
          </h1>
          <p className="text-xl text-base-content/70 mb-8 max-w-2xl mx-auto">
            Stream Analytics.js compatible events to Apache Iceberg tables on Cloudflare's data
            platform. Query with R2 SQL, DuckDB, or the semantic API.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <a href="#quickstart" className="btn btn-primary btn-lg">
              Get Started
            </a>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => onNavigate('dashboard')}
            >
              Try Demo
            </button>
          </div>

          {/* Animated Architecture Diagram */}
          <ArchitectureDiagram />
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16 px-4 bg-base-200">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              }
              title="Event Ingestion"
              description="RudderStack/Segment-compatible HTTP endpoints. Drop-in replacement for your existing analytics pipeline."
            />
            <FeatureCard
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              }
              title="Apache Iceberg Storage"
              description="Automatic compaction, schema evolution, and time travel. Your data stored in open table format on R2."
            />
            <FeatureCard
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              title="Flexible Querying"
              description="R2 SQL for simple queries, DuckDB for full SQL support, and a semantic API for building dashboards."
            />
          </div>
        </div>
      </section>

      {/* Visualization Showcase */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Dashboard screenshot - switches based on theme */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl border border-base-300">
              <img
                src={theme === 'light' ? '/dashboard_light.png' : '/dashboard_dark.png'}
                alt="Dashboard Preview"
                className="w-full"
              />
            </div>

            {/* Text content + CTAs */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-4">Powerful Analytics Dashboards</h2>
                <p className="text-base-content/70 text-lg">
                  Build interactive dashboards with funnels, user journey flows, activity grids,
                  metrics, and more. Analyze conversion rates, visualize behavior patterns,
                  and track key metrics in near real-time.
                </p>
              </div>

              {/* Drizzle-Cube info */}
              <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <div className="card-body p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="font-bold">Powered by Drizzle-Cube</h3>
                  </div>
                  <p className="text-sm text-base-content/70 mb-3">
                    A semantic layer for analytics that transforms queries into optimized SQL.
                    Define measures, dimensions, and filters once - use them everywhere.
                  </p>
                  <a
                    href="https://www.npmjs.com/package/drizzle-cube"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-sm inline-flex items-center gap-1"
                  >
                    Learn more about Drizzle-Cube
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('analysis')}
                  className="btn btn-primary gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Try Analysis
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="btn btn-secondary gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 2 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  View Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="py-16 px-4 bg-base-200 scroll-mt-16">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Quick Start</h2>
          <div className="space-y-8">
            <QuickStartStep
              number={1}
              title="Clone & Install"
              code={`git clone https://github.com/cliftonc/icelight.git
cd icelight
pnpm install`}
            />
            <QuickStartStep
              number={2}
              title="Login to Cloudflare"
              code="npx wrangler login"
            />
            <QuickStartStep
              number={3}
              title="Launch Everything"
              code="pnpm launch"
            />
            <QuickStartStep
              number={4}
              title="Open the Web UI"
              code="https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev"
            />
          </div>
        </div>
      </section>

      {/* SDK Integration */}
      <section className="py-16 px-4 bg-base-200">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">SDK Integration</h2>
          <div className="tabs tabs-boxed justify-center mb-6 bg-base-300">
            <button
              className={`tab ${sdkTab === 'rudderstack' ? 'tab-active' : ''}`}
              onClick={() => setSdkTab('rudderstack')}
            >
              RudderStack / Segment
            </button>
            <button
              className={`tab ${sdkTab === 'http' ? 'tab-active' : ''}`}
              onClick={() => setSdkTab('http')}
            >
              Direct HTTP
            </button>
          </div>

          {sdkTab === 'rudderstack' && (
            <CodeBlock
              language="javascript"
              code={`import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'any-value',
  dataPlaneUrl: 'https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev'
});

// Track events
analytics.track('Purchase Completed', {
  orderId: '12345',
  revenue: 99.99
});

// Identify users
analytics.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});`}
            />
          )}

          {sdkTab === 'http' && (
            <CodeBlock
              language="bash"
              code={`# Track event
curl -X POST https://YOUR-WORKER.workers.dev/v1/track \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"user-123","event":"Button Clicked","properties":{"button":"signup"}}'

# Batch events
curl -X POST https://YOUR-WORKER.workers.dev/v1/batch \\
  -H "Content-Type: application/json" \\
  -d '{"batch":[
    {"type":"track","userId":"u1","event":"Page View"},
    {"type":"identify","userId":"u1","traits":{"name":"John"}}
  ]}'`}
            />
          )}
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-12 px-4 bg-base-200">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-6">Resources</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/cliftonc/icelight"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            <a
              href="https://developers.cloudflare.com/pipelines/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Cloudflare Pipelines
            </a>
            <a
              href="https://developers.cloudflare.com/r2/data-catalog/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              R2 Data Catalog
            </a>
            <a
              href="https://developers.cloudflare.com/r2-sql/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              R2 SQL
            </a>
            <a
              href="https://www.npmjs.com/package/drizzle-cube"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Drizzle-Cube
            </a>
          </div>
          <p className="mt-8 text-base-content/50">MIT License</p>
        </div>
      </section>
    </div>
  );
}
