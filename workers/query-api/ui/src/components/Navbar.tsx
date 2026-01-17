import TokenInput from './TokenInput.tsx';
import ThemeToggle from './ThemeToggle.tsx';

type Page = 'query' | 'simulator';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  return (
    <div className="bg-base-100 shadow-lg border-b border-base-300">
      <div className="navbar container mx-auto max-w-7xl px-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-primary-content" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"/>
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              cdpflare
            </span>
          </div>
        </div>
        <div className="flex-none flex items-center gap-4">
          <div role="tablist" className="tabs tabs-boxed bg-base-200">
            <button
              role="tab"
              className={`tab ${currentPage === 'query' ? 'tab-active' : ''}`}
              onClick={() => onPageChange('query')}
            >
              Query Editor
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'simulator' ? 'tab-active' : ''}`}
              onClick={() => onPageChange('simulator')}
            >
              Event Simulator
            </button>
          </div>
          <div className="flex items-center gap-2">
            <TokenInput />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Page };
