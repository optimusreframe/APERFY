import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { BulkImportProvider } from "@/contexts/BulkImportContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BulkImportBanner from "@/components/BulkImportBanner";
import PageTransition from "@/components/motion/PageTransition";
import InstallPWAPopup from "@/components/InstallPWAPopup";
import CartAddedToast from "./components/CartAddedToast";
import MacAppShell from "@/components/layout/MacAppShell";

const Index = lazy(() => import('./pages/Index'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const Profile = lazy(() => import('./pages/Profile'));
const Favorites = lazy(() => import('./pages/Favorites'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminMaterials = lazy(() => import('./pages/admin/AdminMaterials'));
const AdminAISettings = lazy(() => import('./pages/admin/AdminAISettings'));
const AdminIntegrations = lazy(() => import('./pages/admin/AdminIntegrations'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AdminQuestions = lazy(() => import('./pages/admin/AdminQuestions'));
const AdminPaymentSettings = lazy(() => import('./pages/admin/AdminPaymentSettings'));
const AdminShipping = lazy(() => import('./pages/admin/AdminShipping'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminDiscounts = lazy(() => import('./pages/admin/AdminDiscounts'));
const AdminBackgroundQA = lazy(() => import('./pages/admin/AdminBackgroundQA'));
const AdminHomepage = lazy(() => import('./pages/admin/AdminHomepage'));
const AdminInventoryImport = lazy(() => import('./pages/admin/AdminInventoryImport'));
const RequestModel = lazy(() => import('./pages/RequestModel'));
const Contact = lazy(() => import('./pages/Contact'));
const EmailUnsubscribe = lazy(() => import('./pages/EmailUnsubscribe'));

const queryClient = new QueryClient();

function RouteLoading() {
  return <div className="flex min-h-[40vh] flex-1 items-center justify-center p-8" role="status" aria-live="polite">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
  </div>;
}

const AppContent = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <>
      <PageTransition>
        <Suspense fallback={<RouteLoading />}>
          <Routes location={location}>
            <Route element={<MacAppShell><Outlet /></MacAppShell>}>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/products" element={<Navigate to="/" replace />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/catalog" element={<Navigate to="/" replace />} />
              <Route path="/ask" element={<RequestModel />} />
              <Route path="/request-product" element={<Navigate to="/ask" replace />} />
              <Route path="/request-model" element={<Navigate to="/ask" replace />} />
              <Route path="/our-process" element={<Navigate to="/" replace />} />
              <Route path="/materials" element={<Navigate to="/" replace />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/unsubscribe" element={<EmailUnsubscribe />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute redirectAdmin><Profile /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            </Route>
            <Route element={<MacAppShell variant="admin"><Outlet /></MacAppShell>}>
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="inventory-import" element={<AdminInventoryImport />} />
                <Route path="variants" element={<AdminMaterials />} />
                <Route path="materials" element={<Navigate to="/admin/variants" replace />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="finance" element={<AdminFinance />} />
                <Route path="requests" element={<AdminRequests />} />
                <Route path="questions" element={<AdminQuestions />} />
                <Route path="payments" element={<AdminPaymentSettings />} />
                <Route path="shipping" element={<AdminShipping />} />
                <Route path="discounts" element={<AdminDiscounts />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="background-qa" element={<AdminBackgroundQA />} />
                <Route path="homepage" element={<AdminHomepage />} />
                <Route path="ai-settings" element={<AdminAISettings />} />
                <Route path="integrations" element={<AdminIntegrations />} />
                <Route path="notifications" element={<AdminNotifications />} />
              </Route>
            </Route>
            <Route element={<MacAppShell><Outlet /></MacAppShell>}>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </PageTransition>
      {!isAdmin && <CartAddedToast />}
      {!isAdmin && <InstallPWAPopup />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <BulkImportProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
                <BulkImportBanner />
              </BrowserRouter>
            </TooltipProvider>
          </BulkImportProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
