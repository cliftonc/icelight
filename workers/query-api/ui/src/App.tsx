import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CubeProvider } from 'drizzle-cube/client';
import Navbar, { type Page } from './components/Navbar.tsx';
import HomePage from './pages/HomePage.tsx';
import QueryPage from './pages/QueryPage.tsx';
import EventSimulatorPage from './pages/EventSimulatorPage.tsx';
import AnalysisPage from './pages/AnalysisPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import { fetchServerConfig, getApiToken, type ServerConfig } from './api/auth.ts';

const queryClient = new QueryClient();

// Shared Cube provider configuration
const cubeApiOptions = { apiUrl: '/cubejs-api/v1' };
// enableAI defaults to true in drizzle-cube, but the query API doesn't serve
// the /api/ai routes it needs, so the assistant would only show errors.
// Dashboards use the rows layout only (sections and portlet groups).
const cubeFeatures = { useAnalysisBuilder: true, dashboardModes: ['rows'], enableAI: false };
// Read once: changing the token in the navbar reloads the page
const apiToken = getApiToken();
const cubeToken = apiToken ? `Bearer ${apiToken}` : undefined;

function getPageFromHash(): Page {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (hash === 'query') return 'query';
  if (hash === 'simulator') return 'simulator';
  if (hash === 'analysis') return 'analysis';
  if (hash === 'dashboard') return 'dashboard';
  return 'home';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  useEffect(() => {
    fetchServerConfig().then(setServerConfig);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handlePageChange = (page: Page) => {
    window.location.hash = page === 'home' ? '' : page;
    setCurrentPage(page);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <CubeProvider
        apiOptions={cubeApiOptions}
        features={cubeFeatures}
        token={cubeToken}
        enableBatching={false}
      >
        <div className="min-h-screen bg-base-200">
          <Navbar
            currentPage={currentPage}
            onPageChange={handlePageChange}
            showTokenInput={serverConfig?.authRequired ?? false}
          />
          {currentPage === 'home' && <HomePage onNavigate={handlePageChange} />}
          {currentPage === 'query' && <QueryPage />}
          {currentPage === 'simulator' && <EventSimulatorPage />}
          {currentPage === 'analysis' && <AnalysisPage />}
          {currentPage === 'dashboard' && <DashboardPage />}
        </div>
      </CubeProvider>
    </QueryClientProvider>
  );
}
