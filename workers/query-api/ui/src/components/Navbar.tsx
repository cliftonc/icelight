import { useState } from 'react';
import TokenInput from './TokenInput.tsx';
import ThemeToggle from './ThemeToggle.tsx';
import DuckDbStatus from './DuckDbStatus.tsx';

type Page = 'home' | 'query' | 'duckdb' | 'simulator' | 'analysis' | 'dashboard';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handlePageChange = (page: Page) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  const toggleMobile = () => setMobileOpen((open) => !open);

  return (
    <div className="bg-base-100 shadow-lg border-b border-base-300">
      <div className="navbar container mx-auto max-w-7xl px-4">
        {/* Left: Logo (clickable to home) */}
        <div className="navbar-start">
          <button
            onClick={() => handlePageChange('home')}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="icelight" className="h-10 w-auto" />
            <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              icelight
            </span>
          </button>
        </div>

        {/* Center: Tabs (hidden on mobile) */}
        <div className="navbar-center hidden md:flex">
          <div role="tablist" className="tabs tabs-boxed bg-base-200">
            <button
              role="tab"
              className={`tab ${currentPage === 'home' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('home')}
            >
              Home
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'analysis' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('analysis')}
            >
              Analysis
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'dashboard' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('dashboard')}
            >
              Dashboard
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'query' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('query')}
            >
              R2 SQL
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'duckdb' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('duckdb')}
            >
              DuckDB
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'simulator' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('simulator')}
            >
              Event Simulator
            </button>
          </div>
        </div>

        {/* Right: Controls (hidden on mobile) + Mobile menu button */}
        <div className="navbar-end">
          <div className="hidden md:flex items-center gap-2">
            <a
              href="https://github.com/cliftonc/icelight"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-circle"
              title="View on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <DuckDbStatus />
            <TokenInput />
            <ThemeToggle />
          </div>
          <a
            href="https://github.com/cliftonc/icelight"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-circle md:hidden"
            title="View on GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <button
            className="btn btn-ghost btn-square md:hidden"
            aria-label="Toggle menu"
            onClick={toggleMobile}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

        {/* Mobile overlay + side panel */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div
          className={`fixed top-16 right-0 bottom-0 w-72 bg-base-100 shadow-lg z-30 transform transition-transform duration-200 md:hidden ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-4 flex flex-col gap-4 h-full">
            <div role="tablist" className="tabs tabs-boxed bg-base-200 flex-col items-start gap-2">
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'home' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('home')}
              >
                Home
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'analysis' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('analysis')}
              >
                Analysis
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'dashboard' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('dashboard')}
              >
                Dashboard
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'query' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('query')}
              >
                R2 SQL
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'duckdb' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('duckdb')}
              >
                DuckDB
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'simulator' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('simulator')}
              >
                Event Simulator
              </button>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/cliftonc/icelight"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-circle"
                title="View on GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <DuckDbStatus />
              <TokenInput />
              <ThemeToggle />
            </div>
            <div className="flex-1" />
            <button className="btn btn-ghost w-full" onClick={() => setMobileOpen(false)}>
              Close
            </button>
          </div>
        </div>
    </div>
  );
}

export type { Page };
