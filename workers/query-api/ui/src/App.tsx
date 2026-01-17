import { useState, useEffect } from 'react';
import Navbar, { type Page } from './components/Navbar.tsx';
import QueryPage from './pages/QueryPage.tsx';
import EventSimulatorPage from './pages/EventSimulatorPage.tsx';

function getPageFromHash(): Page {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (hash === 'simulator') return 'simulator';
  return 'query';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handlePageChange = (page: Page) => {
    window.location.hash = page === 'query' ? '' : page;
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
      {currentPage === 'query' ? <QueryPage /> : <EventSimulatorPage />}
    </div>
  );
}
