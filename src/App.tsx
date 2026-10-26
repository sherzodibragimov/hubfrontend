import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import { tokenStore } from './api/client';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MoviesPage = lazy(() => import('./pages/MoviesPage'));
const MovieEditPage = lazy(() => import('./pages/MovieEditPage'));
const SourcesPage = lazy(() => import('./pages/SourcesPage'));
const TrackedPage = lazy(() => import('./pages/TrackedPage'));
const AutofillPage = lazy(() => import('./pages/AutofillPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const RadarPage = lazy(() => import('./pages/RadarPage'));

function RequireAuth({ children }: { children: JSX.Element }) {
  return tokenStore.get() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Suspense fallback={<div className="loader" />}><DashboardPage /></Suspense>} />
        <Route path="movies" element={<Suspense fallback={<div className="loader" />}><MoviesPage /></Suspense>} />
        <Route path="movies/new" element={<Suspense fallback={<div className="loader" />}><MovieEditPage /></Suspense>} />
<Route path="autofill" element={<Suspense fallback={<div className="loader" />}><AutofillPage /></Suspense>} />
        <Route path="system" element={<Suspense fallback={<div className="loader" />}><SystemPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<div className="loader" />}><SettingsPage /></Suspense>} />
        <Route path="collections" element={<Suspense fallback={<div className="loader" />}><CollectionsPage /></Suspense>} />
        <Route path="collections/:id" element={<Suspense fallback={<div className="loader" />}><CollectionPage /></Suspense>} />
        <Route path="radar" element={<Suspense fallback={<div className="loader" />}><RadarPage /></Suspense>} />
        <Route path="sources" element={<Suspense fallback={<div className="loader" />}><SourcesPage /></Suspense>} />
        <Route path="sources/tracked" element={<Suspense fallback={<div className="loader" />}><TrackedPage /></Suspense>} />
        <Route path="movies/:id" element={<Suspense fallback={<div className="loader" />}><MovieEditPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
