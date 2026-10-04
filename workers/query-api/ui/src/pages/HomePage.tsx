import { useState, useSyncExternalStore } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

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

// Decorative flowing lines SVG for visual interest
function DecorativeCurve() {
  return (
    <svg
      className="w-full h-64"
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {/* Main flowing line - top */}
      <path
        d="M0 60 Q200 20 400 50 T800 30 T1200 55"
        stroke="url(#gradient1)"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Secondary wave - middle */}
      <path
        d="M0 100 Q300 60 600 100 T1200 80"
        stroke="url(#gradient2)"
        strokeWidth="2"
        fill="none"
        opacity="0.8"
      />
      {/* Third accent line - lower */}
      <path
        d="M0 140 Q250 100 500 130 T900 110 T1200 140"
        stroke="url(#gradient3)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Fourth subtle line */}
      <path
        d="M0 170 Q400 140 800 160 T1200 150"
        stroke="url(#gradient2)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      {/* Accent dots scattered across */}
      <circle cx="150" cy="45" r="5" fill="#818cf8" opacity="0.9" />
      <circle cx="400" cy="55" r="6" fill="#6366f1" opacity="0.8" />
      <circle cx="700" cy="35" r="4" fill="#a5b4fc" opacity="0.7" />
      <circle cx="1000" cy="50" r="5" fill="#818cf8" opacity="0.7" />
      <circle cx="250" cy="95" r="4" fill="#c7d2fe" opacity="0.6" />
      <circle cx="550" cy="105" r="5" fill="#6366f1" opacity="0.7" />
      <circle cx="850" cy="85" r="4" fill="#a5b4fc" opacity="0.6" />
      <circle cx="1100" cy="90" r="4" fill="#818cf8" opacity="0.5" />
      <circle cx="100" cy="135" r="3" fill="#6366f1" opacity="0.5" />
      <circle cx="450" cy="125" r="4" fill="#c7d2fe" opacity="0.5" />
      <circle cx="750" cy="115" r="3" fill="#818cf8" opacity="0.4" />
      <circle cx="950" cy="130" r="4" fill="#a5b4fc" opacity="0.5" />

      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#a5b4fc" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Flow connector between sections - curved path from center-bottom to center-top
function FlowConnector({ direction }: { direction: 'left-to-right' | 'right-to-left' }) {
  const isLeftToRight = direction === 'left-to-right';

  // viewBox is wide (1200) and tall (150) to match typical screen proportions
  // Path connects from ~25% width to ~75% width (or vice versa)

  const pathD = isLeftToRight
    ? "M 300 0 C 300 75, 900 75, 900 150"
    : "M 900 0 C 900 75, 300 75, 300 150";

  return (
    <div className="w-full h-32 md:h-40 relative overflow-visible">
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 150"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        {/* Main static path */}
        <path
          d={pathD}
          stroke="url(#flowGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        {/* Secondary subtle path */}
        <path
          d={isLeftToRight
            ? "M 305 0 C 305 70, 905 80, 905 150"
            : "M 895 0 C 895 70, 295 80, 295 150"
          }
          stroke="url(#flowGradient2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />

        {/* Large slow particle */}
        <circle r="10" fill="url(#particleGradient)">
          <animateMotion dur="8s" repeatCount="indefinite" path={pathD} />
          <animate
            attributeName="opacity"
            values="0;0.7;0.7;0"
            keyTimes="0;0.1;0.9;1"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Medium particle */}
        <circle r="6" fill="url(#particleGradient2)">
          <animateMotion dur="5s" repeatCount="indefinite" path={pathD} begin="2s" />
          <animate
            attributeName="opacity"
            values="0;0.6;0.6;0"
            keyTimes="0;0.1;0.9;1"
            dur="5s"
            repeatCount="indefinite"
            begin="2s"
          />
        </circle>

        {/* Small fast particle */}
        <circle r="4" fill="url(#particleGradient)">
          <animateMotion dur="3.5s" repeatCount="indefinite" path={pathD} begin="0.5s" />
          <animate
            attributeName="opacity"
            values="0;0.5;0.5;0"
            keyTimes="0;0.1;0.9;1"
            dur="3.5s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </circle>

        {/* Tiny fastest particle */}
        <circle r="3" fill="url(#particleGradient2)">
          <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} begin="4s" />
          <animate
            attributeName="opacity"
            values="0;0.4;0.4;0"
            keyTimes="0;0.1;0.9;1"
            dur="2.5s"
            repeatCount="indefinite"
            begin="4s"
          />
        </circle>

        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#c7d2fe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="particleGradient">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="particleGradient2">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

// Architecture node - clickable with hover state
function ArchitectureNode({
  label,
  sublabel,
  beta,
  href
}: {
  label: string;
  sublabel?: string;
  beta?: boolean;
  href?: string;
}) {
  const content = (
    <div className={`relative w-[140px] h-[80px] flex flex-col items-center justify-center rounded-lg border-2 border-primary/40 bg-base-100 text-center px-3 transition-all ${href ? 'cursor-pointer hover:border-primary hover:shadow-md hover:shadow-primary/20' : ''}`}>
      <div className="text-sm font-semibold text-base-content">{label}</div>
      {sublabel && <div className="text-xs text-base-content/70 mt-0.5">{sublabel}</div>}
      {beta && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-medium bg-warning text-warning-content rounded">
          beta
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="no-underline" onClick={(e) => {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      }}>
        {content}
      </a>
    );
  }

  return content;
}

// Arrow connector with primary color
function Arrow() {
  return (
    <div className="flex items-center px-2">
      <svg className="w-6 h-6 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </div>
  );
}

// Static architecture diagram with clickable nodes
function ArchitectureDiagram() {
  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="flex items-center justify-center gap-2 min-w-[900px] px-4">
        <ArchitectureNode label="Your App" sublabel="Analytics SDK" href="#client-sdk" />
        <Arrow />
        <ArchitectureNode label="Ingest Worker" sublabel="Cloudflare" href="#ingest-worker" />
        <Arrow />
        <ArchitectureNode label="Basin Pipelines" sublabel="Cloudflare" href="#pipelines" />
        <Arrow />
        <ArchitectureNode label="Basin Catalog" sublabel="R2 + Iceberg" href="#r2-iceberg" />
        <Arrow />
        <ArchitectureNode label="Basin SQL" sublabel="Cloudflare" href="#basin-sql" />
        <Arrow />
        <ArchitectureNode label="Drizzle-Cube" sublabel="Semantic Layer" href="#drizzle-cube" />
      </div>
    </div>
  );
}

// Clean code block with copy button
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
      <pre className="rounded border border-base-300 bg-base-200/50 p-4 overflow-x-auto text-sm">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      <button
        className="absolute top-2 right-2 p-1.5 rounded text-base-content/40 hover:text-base-content/70 hover:bg-base-300/50 transition-colors"
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// Detail section component - alternating left/right layout
interface DetailSectionProps {
  id: string;
  title: string;
  description: string;
  align: 'left' | 'right';
  beta?: boolean;
  children: React.ReactNode;
  image?: {
    light: string;
    dark: string;
    alt: string;
  };
  links?: Array<{ label: string; url: string }>;
}

function DetailSection({
  id,
  title,
  description,
  align,
  beta,
  children,
  image,
  links
}: DetailSectionProps) {
  const theme = useTheme();
  const isLeft = align === 'left';

  const textContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-bold">{title}</h3>
        {beta && (
          <span className="px-2 py-0.5 text-xs font-medium bg-warning text-warning-content rounded">
            beta
          </span>
        )}
      </div>
      <p className="text-base-content/60 leading-relaxed">{description}</p>
      {children}
      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-2">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              {link.label}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const imageContent = image && (
    <div className="rounded-lg overflow-hidden border border-base-300 shadow-sm">
      <img
        src={theme === 'light' ? image.light : image.dark}
        alt={image.alt}
        className="w-full"
      />
    </div>
  );

  return (
    <section id={id} className="scroll-mt-20">
      <div className="container mx-auto max-w-6xl px-4">
        {image ? (
          <div className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${!isLeft ? 'md:[direction:rtl]' : ''}`}>
            <div className={!isLeft ? 'md:[direction:ltr]' : ''}>{textContent}</div>
            <div className={!isLeft ? 'md:[direction:ltr]' : ''}>{imageContent}</div>
          </div>
        ) : (
          <div className={`max-w-2xl ${isLeft ? '' : 'md:ml-auto'}`}>
            {textContent}
          </div>
        )}
      </div>
    </section>
  );
}

// Quick start step with plain number
function QuickStartStep({ number, title, code }: { number: number; title: string; code: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-primary font-bold text-lg">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-medium mb-2 text-base-content/90">{title}</h4>
        <CodeBlock code={code} />
      </div>
    </div>
  );
}

type Page = 'home' | 'query' | 'simulator' | 'analysis' | 'dashboard';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [sdkTab, setSdkTab] = useState<'rudderstack' | 'http'>('rudderstack');
  // This deployment's MCP endpoint (https://try.icelight.dev/mcp on the demo)
  const mcpUrl = `${window.location.origin}/mcp`;
  const faqSections = [
    {
      title: 'Ingestion & Architecture',
      items: [
        {
          question: 'How do I send Analytics.js events from RudderStack or Segment into Icelight?',
          answer:
            'Point your Analytics.js or RudderStack data plane to the ingest worker URL, keep your existing track/identify calls, and we normalize them to the Iceberg schema before batching to R2.',
        },
        {
          question: 'What role does the Cloudflare Worker play?',
          answer:
            'The Worker is the public edge endpoint: it terminates analytics calls, validates payloads, handles CORS/auth, and forwards clean events into Cloudflare Pipelines so you do not expose R2 directly.',
        },
        {
          question: 'How do Cloudflare Pipelines help with stream analytics?',
          answer:
            'Pipelines buffer high-volume events, batch them efficiently, and write Apache Iceberg-compatible Parquet objects to R2. They handle retries and backpressure so your ingest endpoint stays fast.',
        },
        {
          question: 'How much setup is required to pilot this?',
          answer:
            'You need a Cloudflare account on the Workers Paid plan (required for Basin Pipelines). Clone the repo, run pnpm launch, and point a test site or RudderStack source at the ingest endpoint.',
        },
      ],
    },
    {
      title: 'Storage: Iceberg + Parquet on R2',
      items: [
        {
          question: 'What is Apache Iceberg and why use it on Cloudflare R2?',
          answer:
            'Apache Iceberg is an open table format for large analytics datasets. On R2 it keeps metadata in Iceberg manifests, stores columns in Parquet, and lets you time-travel or evolve schemas without rewriting objects.',
        },
        {
          question: 'How are Iceberg tables organized for streaming analytics?',
          answer:
            'Events land as immutable Parquet files partitioned by date/hour and bucketed by user identifiers. Iceberg metadata tracks snapshots so readers only scan the latest manifests rather than every object in the bucket.',
        },
        {
          question: 'Why choose Iceberg tables over raw Parquet for stream analytics?',
          answer:
            'Iceberg adds ACID semantics, partition pruning, hidden partitioning, and versioned snapshots. That keeps queries predictable as your event volume grows and avoids listing millions of R2 objects.',
        },
        {
          question: 'How does Parquet fit into Iceberg on R2 and how should I size files?',
          answer:
            'Iceberg stores data files as Parquet objects referenced by manifests. Aim for 64–256 MB Parquet files to balance read parallelism with metadata overhead; enable compaction to merge tiny files. Basin Catalog can compact small files automatically, and Basin SQL uses column pruning and predicate pushdown to minimize bytes scanned.',
        },
        {
          question: 'How do I keep costs low on R2 + Iceberg?',
          answer:
            'Use partitioning to prune scans, enable Basin Catalog compaction and snapshot expiration, and cache common semantic-layer queries in KV. Basin SQL bills by compressed bytes scanned, so selective filters and LIMITs directly reduce cost.',
        },
      ],
    },
    {
      title: 'Query & Semantic Layer',
      items: [
        {
          question: 'How does Basin SQL query the Iceberg data stored on R2?',
          answer:
            'Basin SQL is Cloudflare’s serverless, distributed query engine. It reads Iceberg metadata from Basin Catalog, prunes partitions and files, and supports aggregations, joins, window functions, CTEs and JSON functions, with no containers or clusters to run.',
        },
        {
          question: 'Can I run SQL over streaming analytics data in near real-time?',
          answer:
            'Yes. Pipelines flush small batches frequently so new objects appear within minutes. Basin SQL and the semantic API query the latest Iceberg snapshot for ad-hoc analysis or dashboard refreshes.',
        },
        {
          question: 'What does the Drizzle-Cube semantic layer add?',
          answer:
            'Drizzle-Cube turns business metrics into reusable measures and dimensions. It generates optimized SQL that runs on Basin SQL, enforces row-level security, and feeds both dashboards and APIs from one model.',
        },
        {
          question: 'How does the semantic API differ from running raw SQL?',
          answer:
            'The semantic API sits in front of Basin SQL: clients request metrics like “weekly active users” and Drizzle-Cube compiles safe SQL with filters and joins. This prevents leaky queries and keeps KPI logic consistent.',
        },
        {
          question: 'Can I mix Iceberg with other data sources?',
          answer:
            'Yes. Basin SQL supports joins across tables in the same catalog, so Drizzle-Cube can model joins between your events and other Iceberg tables. External engines like DuckDB, Spark or PyIceberg can also attach the catalog via its Iceberg REST endpoint.',
        },
      ],
    },
    {
      title: 'Use Cases & Platform Status',
      items: [
        {
          question: 'What about Cloudflare Web Analytics—how is this different?',
          answer:
            'Cloudflare Web Analytics is a hosted product. Icelight is a build-it-yourself stack that keeps raw events in your R2 account so you can model custom events, join to product data, and control retention.',
        },
        {
          question: 'Are the Cloudflare services used here production ready?',
          answer:
            'Yes. Basin (Pipelines, Catalog and SQL) has been generally available since October 2026. Some limits remain: streams, sinks and pipeline SQL cannot be changed after creation, and Basin SQL is read-only. Check the Basin pricing and limits pages before production rollout.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Hero Section */}
      <section className="pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-base-content">
            Stream Analytics Events
            <br />
            <span className="text-primary">to Iceberg on R2</span>
          </h1>
          <p className="text-lg text-base-content/60 mb-6 max-w-2xl mx-auto">
            Analytics.js compatible events to Iceberg tables on Cloudflare.
            Query with Basin SQL or the semantic API.
          </p>
          <p className="text-sm text-base-content/70 mb-10 max-w-2xl mx-auto px-4 py-3 rounded border border-primary/30 bg-primary/5">
            <strong>This is an example project, not a hosted service.</strong> Clone the repo and
            run <code className="text-primary">pnpm launch</code> to deploy your own copy to your
            Cloudflare account, then adapt the schema, cubes and dashboards to build your own
            in-house product analytics.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              className="px-6 py-3 bg-primary text-primary-content rounded font-medium hover:bg-primary/90 transition-colors"
              onClick={() => onNavigate('dashboard')}
            >
              Try the Demo
            </button>
            <a
              href="https://github.com/cliftonc/icelight"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-base-300 rounded font-medium hover:bg-base-200 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Decorative flowing lines - below content */}
        <div className="mt-12 -mb-16 relative z-0">
          <DecorativeCurve />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-base-200/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-2">How It Works</h2>
          <p className="text-center text-base-content/60 mb-6">Click any component to learn more</p>
          <ArchitectureDiagram />
        </div>
      </section>

      {/* Detailed Flow Sections */}
      <div className="py-16 space-y-4">
        {/* 1. Client SDK Integration */}
        <DetailSection
          id="client-sdk"
          title="Client SDK Integration"
          description="Send analytics events using any Analytics.js-compatible SDK or make direct HTTP calls. The ingest worker accepts RudderStack and Segment event formats out of the box."
          align="left"
          image={{
            light: '/event_simulator_light.png',
            dark: '/event_simulator_dark.png',
            alt: 'Event Simulator for testing analytics events',
          }}
          links={[
            { label: 'RudderStack JS SDK', url: 'https://www.rudderstack.com/docs/sources/event-streams/sdks/rudderstack-javascript-sdk/' },
            { label: 'Segment Analytics.js', url: 'https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/' },
          ]}
        >
          {/* Simple text tabs */}
          <div className="flex gap-6 mb-4">
            <button
              className={`pb-1 border-b-2 transition-colors ${
                sdkTab === 'rudderstack'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/60 hover:text-base-content'
              }`}
              onClick={() => setSdkTab('rudderstack')}
            >
              RudderStack / Segment
            </button>
            <button
              className={`pb-1 border-b-2 transition-colors ${
                sdkTab === 'http'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/60 hover:text-base-content'
              }`}
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
  dataPlaneUrl: 'https://your-worker.workers.dev'
});

analytics.track('Purchase Completed', { revenue: 99.99 });`}
            />
          )}

          {sdkTab === 'http' && (
            <CodeBlock
              language="bash"
              code={`curl -X POST https://your-worker.workers.dev/v1/track \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"user-123","event":"Button Clicked"}'`}
            />
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('simulator')}
              className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try Event Simulator
            </button>
          </div>
        </DetailSection>

        <FlowConnector direction="left-to-right" />

        {/* 2. Ingest Worker */}
        <DetailSection
          id="ingest-worker"
          title="Ingest Worker"
          description="A Cloudflare Worker that receives analytics events, validates the payload, and forwards them to Basin Pipelines. Handles CORS, authentication, and batch processing."
          align="right"
          links={[
            { label: 'Cloudflare Workers', url: 'https://developers.cloudflare.com/workers/' },
          ]}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-1">Available Endpoints</h4>
              <div className="flex flex-wrap gap-2">
                {['/v1/track', '/v1/identify', '/v1/page', '/v1/screen', '/v1/batch'].map((endpoint) => (
                  <code key={endpoint} className="px-2 py-1 text-xs bg-base-200 rounded">{endpoint}</code>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-1">Pipeline Binding</h4>
              <CodeBlock
                language="json"
                code={`{
  "pipelines": [{
    "binding": "PIPELINE",
    "pipeline": "icelight-events-pipeline"
  }]
}`}
              />
            </div>
          </div>
        </DetailSection>

        <FlowConnector direction="right-to-left" />

        {/* 3. Pipelines */}
        <DetailSection
          id="pipelines"
          title="Basin Pipelines"
          description="Cloudflare's streaming ingestion service batches incoming events and writes them to R2 as Apache Iceberg tables. Events are buffered and flushed every minute for efficient storage."
          align="left"
          links={[
            { label: 'Basin Pipelines', url: 'https://developers.cloudflare.com/basin-pipelines/' },
          ]}
        >
          <div>
            <h4 className="font-medium text-sm text-base-content/80 mb-1">Event Schema</h4>
            <CodeBlock
              language="json"
              code={`{
  "type": "object",
  "properties": {
    "message_id": { "type": "string" },
    "type": { "type": "string" },
    "user_id": { "type": "string", "nullable": true },
    "event": { "type": "string", "nullable": true },
    "properties": { "type": "string", "nullable": true },
    "timestamp": { "type": "string", "format": "date-time" }
  }
}`}
            />
          </div>
        </DetailSection>

        <FlowConnector direction="left-to-right" />

        {/* 4. R2 + Iceberg */}
        <DetailSection
          id="r2-iceberg"
          title="Basin Catalog + Apache Iceberg"
          description="Events are stored in Cloudflare R2 as Apache Iceberg tables managed by Basin Catalog. This provides columnar storage for fast analytical queries, schema evolution, and time travel capabilities."
          align="right"
          links={[
            { label: 'Basin Catalog', url: 'https://developers.cloudflare.com/basin-catalog/' },
            { label: 'Apache Iceberg', url: 'https://iceberg.apache.org/' },
          ]}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Key Benefits</h4>
              <ul className="space-y-1 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Columnar storage</strong> — Fast analytical queries on specific columns</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Schema evolution</strong> — Add columns without rewriting data</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Time travel</strong> — Query historical snapshots of your data</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Open format</strong> — Compatible with Spark, DuckDB, PyIceberg</span>
                </li>
              </ul>
            </div>
          </div>
        </DetailSection>

        <FlowConnector direction="right-to-left" />

        {/* 5. Basin SQL */}
        <DetailSection
          id="basin-sql"
          title="Basin SQL"
          description="Basin SQL is Cloudflare's serverless query engine for Iceberg tables in Basin Catalog. It supports aggregations, joins, window functions and JSON functions, and powers both the SQL explorer and the semantic layer, with no servers or containers to run."
          align="left"
          image={{
            light: '/sql_query_light.png',
            dark: '/sql_query_dark.png',
            alt: 'Basin SQL query interface with results',
          }}
          links={[
            { label: 'Basin SQL', url: 'https://developers.cloudflare.com/basin-sql/' },
            { label: 'Basin pricing', url: 'https://developers.cloudflare.com/basin/platform/pricing/' },
          ]}
        >
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('query')}
              className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try Basin SQL Query
            </button>
          </div>
        </DetailSection>

        <FlowConnector direction="left-to-right" />

        {/* 6. Drizzle-Cube */}
        <DetailSection
          id="drizzle-cube"
          title="Drizzle-Cube"
          description="A semantic layer that transforms business questions into optimized SQL queries. Define measures and dimensions once, then use them across dashboards, APIs, and ad-hoc analysis."
          align="right"
          image={{
            light: '/analysis_light.png',
            dark: '/analysis_dark.png',
            alt: 'Analysis page with Drizzle-Cube',
          }}
          links={[
            { label: 'Drizzle-Cube', url: 'https://try.drizzle-cube.dev' },
          ]}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Measures & Dimensions</strong> — Define metrics once, reuse everywhere</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Security Context</strong> — Row-level security built in</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Query Optimization</strong> — Automatic SQL generation</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('analysis')}
                className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try Analysis
              </button>
            </div>
          </div>
        </DetailSection>

        <FlowConnector direction="right-to-left" />

        {/* 7. Analytics Dashboards */}
        <DetailSection
          id="dashboards"
          title="Analytics Dashboards"
          description="Build interactive dashboards that visualize user behavior, track conversions, and surface actionable insights. This repo provides a toolkit for you to use as a basis to build your own in-house MixPanel or Amplitude."
          align="left"
          image={{
            light: '/dashboard_light.png',
            dark: '/dashboard_dark.png',
            alt: 'Dashboard Preview',
          }}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Visualization Types</h4>
              <ul className="space-y-1 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Funnels</strong> — Track conversion rates through multi-step flows</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>User Journeys</strong> — Visualize paths users take through your app</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Activity Grids</strong> — See engagement patterns over time</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Metrics Cards</strong> — Key numbers at a glance with trends</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </DetailSection>

        <FlowConnector direction="left-to-right" />

        {/* 8. MCP - ask Claude about your events */}
        <DetailSection
          id="mcp"
          title="Ask Claude (MCP)"
          description="The query API exposes the semantic layer as an MCP server, so Claude can answer questions about your events in plain English. It discovers the cubes, builds and validates the query, and runs it against Basin SQL. No SQL needed."
          align="right"
          image={{
            light: '/claude_mcp.png',
            dark: '/claude_mcp.png',
            alt: 'Claude answering questions about icelight events and revenue over MCP',
          }}
          links={[
            { label: 'Custom connectors in Claude', url: 'https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp' },
            { label: 'MCP in Claude Code', url: 'https://code.claude.com/docs/en/mcp' },
          ]}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Claude (web, desktop and mobile)</h4>
              <ol className="space-y-1 text-sm text-base-content/70 list-decimal list-inside">
                <li>Open <strong>Settings → Connectors</strong> and choose <strong>Add custom connector</strong></li>
                <li>Name it <strong>Icelight</strong> and use this URL:</li>
              </ol>
              <div className="mt-2">
                <CodeBlock code={mcpUrl} language="plain" />
              </div>
              <p className="text-sm text-base-content/60 mt-2">
                Then enable it in a chat and ask something like “How many events did we have this week, and which day had the most revenue?”
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Claude Code</h4>
              <CodeBlock code={`claude mcp add --transport http icelight ${mcpUrl}`} />
            </div>
            <p className="text-xs text-base-content/50">
              Tools: <code>discover</code>, <code>validate</code>, <code>load</code> and <code>chart</code>. If your deployment sets <code>API_TOKEN</code>, add <code>--header "Authorization: Bearer &lt;token&gt;"</code> in Claude Code.
            </p>
          </div>
        </DetailSection>
      </div>

      {/* Quick Start */}
      <section id="quickstart" className="py-16 px-4 scroll-mt-16">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-10">Quick Start</h2>
          <div className="space-y-6">
            <QuickStartStep
              number={1}
              title="Clone & Install"
              code={`git clone https://github.com/cliftonc/icelight.git
cd icelight && pnpm install`}
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
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-4 bg-base-200/30">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">About</h2>
          <p className="text-base-content/60 leading-relaxed">
            I built this to explore Cloudflare Basin, wiring everything from
            Analytics.js to working dashboards. Questions?{' '}
            <a href="mailto:clifton@guidemode.dev" className="text-primary hover:underline">
              Email me
            </a>{' '}
            or{' '}
            <a
              href="https://github.com/cliftonc/icelight/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              open an issue
            </a>.
          </p>
        </div>
      </section>

      {/* FAQ / SEO Content */}
      <section id="faq" className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-4">Apache Iceberg on R2 FAQ</h2>
          <p className="text-center text-base-content/60 max-w-2xl mx-auto mb-6">
            Deep-dive answers for the queries we see most: Apache Iceberg, Iceberg tables on R2,
            Basin SQL, RudderStack, Cloudflare Workers, Basin Pipelines, and the Drizzle-Cube semantic layer.
          </p>
          <div className="grid gap-6 md:gap-8 md:grid-cols-2">
            {faqSections.map((section, sectionIdx) => (
              <div
                key={section.title}
                className={`border border-base-300 rounded-xl overflow-hidden ${
                  sectionIdx % 2 === 0 ? 'bg-base-100/70' : 'bg-base-200/60'
                }`}
              >
                <div className="px-4 md:px-5 py-3 border-b border-base-300/70 bg-primary/10 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-base-content">{section.title}</h3>
                  <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-primary/20 text-primary">
                    FAQ
                  </span>
                </div>
                <div className="divide-y divide-base-300/70">
                  {section.items.map((faq) => (
                    <details key={faq.question} className="group p-4 md:p-5">
                      <summary className="flex items-center justify-between cursor-pointer text-base font-semibold text-base-content">
                        <span>{faq.question}</span>
                        <span className="ml-3 text-sm text-primary group-open:rotate-45 transition-transform">
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-base-content/70">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-base-content/60">
            <a
              href="https://github.com/cliftonc/icelight"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://developers.cloudflare.com/basin/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              Cloudflare Basin
            </a>
            <a
              href="https://developers.cloudflare.com/basin-sql/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              Basin SQL
            </a>
            <a
              href="https://try.drizzle-cube.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              Drizzle-Cube
            </a>
          </div>
          <p className="mt-6 text-xs text-base-content/40">MIT License</p>
        </div>
      </footer>
    </div>
  );
}
