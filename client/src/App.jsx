import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { SearchProvider } from './contexts/SearchContext';
import PublicLayout, { RouteFallback } from './layouts/PublicLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const DestinationsPage = lazy(() => import('./pages/DestinationsPage'));
const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HotelPage = lazy(() => import('./pages/HotelPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AccountLayout = lazy(() => import('./layouts/AccountLayout'));
const AccountOverview = lazy(() => import('./pages/account/Overview'));
const AccountTrips = lazy(() => import('./pages/account/Trips'));
const AccountProfile = lazy(() => import('./pages/account/Profile'));
const AccountSettings = lazy(() => import('./pages/account/Settings'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminHotels = lazy(() => import('./pages/admin/Hotels'));
const AdminBookings = lazy(() => import('./pages/admin/Bookings'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ProtectedRoute({ children, admin = false }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'restoring') return <RouteFallback label="Restoring your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/account" replace state={{ notice: 'That area is for the operations team.' }} />;
  return children;
}

/** Auth pages should redirect a signed-in visitor to where they came from. */
function PublicOnly({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'authenticated' && user) return <Navigate to={location.state?.from || (user.role === 'admin' ? '/admin' : '/account')} replace />;
  return children;
}

export default function App() {
  const wrap = (node, { label, auth = false, admin = false } = {}) => (
    <Suspense fallback={<RouteFallback label={label} />}>
      {auth ? <ProtectedRoute admin={admin}>{node}</ProtectedRoute> : node}
    </Suspense>
  );

  return (
    <ToastProvider>
      <AuthProvider>
        <WishlistProvider>
          <SearchProvider>
            <Routes>
              {/* standalone (no marketing chrome) */}
              <Route path="/login" element={<PublicOnly>{wrap(<LoginPage />, { label: 'Loading' })}</PublicOnly>} />
              <Route path="/register" element={<PublicOnly>{wrap(<RegisterPage />, { label: 'Loading' })}</PublicOnly>} />

              <Route path="/account" element={<ProtectedRoute>{wrap(<AccountLayout />, { label: 'Loading your dashboard' })}</ProtectedRoute>}>
                <Route index element={<AccountOverview />} />
                <Route path="trips" element={<AccountTrips />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="profile" element={<AccountProfile />} />
                <Route path="settings" element={<AccountSettings />} />
              </Route>

              <Route path="/admin" element={<ProtectedRoute admin>{wrap(<AdminLayout />, { label: 'Loading the console' })}</ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="hotels" element={<AdminHotels />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="reviews" element={<AdminReviews />} />
              </Route>

              {/* everything else shares the public chrome */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/destinations" element={<DestinationsPage />} />
                <Route path="/experiences" element={<ExperiencesPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/stay/:slug" element={wrap(<HotelPage />, { label: 'Loading the property' })} />
                <Route path="/stay/:slug/book" element={wrap(<BookingPage />, { label: 'Preparing your booking', auth: true })} />
                <Route path="/stay/:slug/confirm/:id" element={wrap(<ConfirmationPage />, { label: 'Confirming', auth: true })} />
                <Route path="/wishlist" element={wrap(<WishlistPage />, { label: 'Loading your saves' })} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </SearchProvider>
        </WishlistProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
