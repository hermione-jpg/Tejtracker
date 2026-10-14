import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AccessGate } from './components/AccessGate';
import { Layout } from './components/Layout';
import { TimerProvider } from './lib/TimerContext';
import { setUnauthorizedHandler } from './lib/api';
import CalendarPage from './pages/Calendar';
import Today from './pages/Today';
import Personal from './pages/Personal';
import Professional from './pages/Professional';
import History from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => window.location.reload());
  }, []);

  return (
    <AccessGate>
      <TimerProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<CalendarPage />} />
              <Route path="/today" element={<Today />} />
              <Route path="/personal" element={<Personal />} />
              <Route path="/professional" element={<Professional />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TimerProvider>
    </AccessGate>
  );
}
