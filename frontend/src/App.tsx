import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Directory } from './pages/Directory';
import { EventDetail } from './pages/EventDetail';
import { PlaceDetail } from './pages/PlaceDetail';
import { BusinessLayout } from './components/business/BusinessLayout';
import { Dashboard } from './pages/business/Dashboard';
import { Analytics } from './pages/business/Analytics';
import { AIMarketing } from './pages/business/AIMarketing';
import { TeamManagement } from './pages/business/TeamManagement';
import { SubscriptionSettings } from './pages/business/SubscriptionSettings';
import { ChatManagement } from './pages/business/ChatManagement';
import { Events } from './pages/business/Events';
import { BusinessEventDetail } from './pages/business/BusinessEventDetail';
import { Onboarding } from './pages/business/Onboarding';
import { Settings as BusinessSettings } from './pages/business/Settings';
import { Settings as UserSettings } from './pages/Settings';
import { Checkout } from './pages/Checkout';
import { BookingConfirmation } from './pages/BookingConfirmation';
import { TicketView } from './pages/TicketView';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthCallback } from './pages/AuthCallback';
import { BusinessLogin } from './pages/BusinessLogin';
import { BusinessRegister } from './pages/BusinessRegister';
import { Passport } from './pages/Passport';
import { PassportList } from './pages/PassportList';
import { CouponWallet } from './pages/CouponWallet';
import { VerifyOTP } from './pages/VerifyOTP';
import { ForgotPassword } from './pages/ForgotPassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import { VenueDashboard } from './pages/business/VenueDashboard';
import { PerkMarketplace } from './pages/PerkMarketplace';
import { PerkRewardView } from './pages/PerkRewardView';
import { Pricing } from './pages/Pricing';

import { AdminLayout } from './components/admin/AdminLayout';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminVenues } from './pages/admin/AdminVenues';
import { AdminEvents } from './pages/admin/AdminEvents';
import { AdminPerks } from './pages/admin/AdminPerks';
import { AdminBills } from './pages/admin/AdminBills';
import { AboutUs } from './pages/AboutUs';
import { TermsConditions } from './pages/TermsConditions';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { PublicProfile } from './pages/public/PublicProfile';
import { PublicReward } from './pages/public/PublicReward';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Directory />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/places/:slug" element={<PlaceDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/business/login" element={<BusinessLogin />} />
        <Route path="/business/register" element={<BusinessRegister />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* Public QR Preview Routes */}
        <Route path="/p/:hashId" element={<PublicProfile />} />
        <Route path="/r/:qrToken" element={<PublicReward />} />

        {/* Protected User Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/confirmation" element={<BookingConfirmation />} />
          <Route path="/tickets/:id" element={<TicketView />} />
          <Route path="/passport" element={<Passport />} />
          <Route path="/profile/passports" element={<PassportList />} />
          <Route path="/profile/coupons" element={<CouponWallet />} />
          <Route path="/settings" element={<UserSettings />} />
          <Route path="/marketplace" element={<PerkMarketplace />} />
          <Route path="/reward-tickets/:id" element={<PerkRewardView />} />
        </Route>

        {/* Admin Routes - Obfuscated URL */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/gestion" element={<AdminLayout />}>
            <Route index element={<AdminUsers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="venues" element={<AdminVenues />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="perks" element={<AdminPerks />} />
            <Route path="bills" element={<AdminBills />} />

          </Route>
        </Route>

        {/* Protected Business Routes */}
        <Route element={<ProtectedRoute requiredRole={['owner', 'worker']} />}>
          <Route path="/business" element={<BusinessLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<BusinessEventDetail />} />
            <Route path="loyalty" element={<VenueDashboard />} />
            <Route path="chat" element={<ChatManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="ai-marketing" element={<AIMarketing />} />

            {/* Owner Only Business Routes */}
            <Route element={<ProtectedRoute requiredRole="owner" />}>
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="team" element={<TeamManagement />} />
              <Route path="subscription" element={<SubscriptionSettings />} />
              <Route path="settings" element={<BusinessSettings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
