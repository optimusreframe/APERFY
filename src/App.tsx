import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { RegionalPricingProvider } from "@/contexts/RegionalPricingContext";
import { StorefrontLayoutProvider } from "@/contexts/StorefrontLayoutContext";
import { SeoProvider } from "@/contexts/SeoContext";
import { BulkImportProvider } from "@/contexts/BulkImportContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BulkImportBanner from "@/components/BulkImportBanner";
import PageTransition from "@/components/motion/PageTransition";
import InstallPWAPopup from "@/components/InstallPWAPopup";
import CartAddedToast from "./components/CartAddedToast";
import MacAppShell from "@/components/layout/MacAppShell";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const Index = lazyWithRetry(() => import('./pages/Index'), 'index');
const NotFound = lazyWithRetry(() => import('./pages/NotFound'), 'not-found');
const Auth = lazyWithRetry(() => import('./pages/Auth'), 'auth');
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'), 'reset-password');
const ProductDetail = lazyWithRetry(() => import('./pages/ProductDetail'), 'product-detail');
const Cart = lazyWithRetry(() => import('./pages/Cart'), 'cart');
const Checkout = lazyWithRetry(() => import('./pages/Checkout'), 'checkout');
const Orders = lazyWithRetry(() => import('./pages/Orders'), 'orders');
const Profile = lazyWithRetry(() => import('./pages/Profile'), 'profile');
const Favorites = lazyWithRetry(() => import('./pages/Favorites'), 'favorites');
const AdminLayout = lazyWithRetry(() => import('./pages/admin/AdminLayout'), 'admin-layout');
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'), 'admin-dashboard');
const AdminProducts = lazyWithRetry(() => import('./pages/admin/AdminProducts'), 'admin-products');
const AdminCategories = lazyWithRetry(() => import('./pages/admin/AdminCategories'), 'admin-categories');
const AdminMaterials = lazyWithRetry(() => import('./pages/admin/AdminMaterials'), 'admin-materials');
const AdminIntegrations = lazyWithRetry(() => import('./pages/admin/AdminIntegrations'), 'admin-integrations');
const AdminNotifications = lazyWithRetry(() => import('./pages/admin/AdminNotifications'), 'admin-notifications');
const AdminOrders = lazyWithRetry(() => import('./pages/admin/AdminOrders'), 'admin-orders');
const AdminFinance = lazyWithRetry(() => import('./pages/admin/AdminFinance'), 'admin-finance');
const AdminRequests = lazyWithRetry(() => import('./pages/admin/AdminRequests'), 'admin-requests');
const AdminQuestions = lazyWithRetry(() => import('./pages/admin/AdminQuestions'), 'admin-questions');
const AdminPaymentSettings = lazyWithRetry(() => import('./pages/admin/AdminPaymentSettings'), 'admin-payment-settings');
const AdminShipping = lazyWithRetry(() => import('./pages/admin/AdminShipping'), 'admin-shipping');
const AdminLogs = lazyWithRetry(() => import('./pages/admin/AdminLogs'), 'admin-logs');
const AdminDiscounts = lazyWithRetry(() => import('./pages/admin/AdminDiscounts'), 'admin-discounts');
const AdminBackgroundQA = lazyWithRetry(() => import('./pages/admin/AdminBackgroundQA'), 'admin-background-qa');
const AdminHomepage = lazyWithRetry(() => import('./pages/admin/AdminHomepage'), 'admin-homepage');
const AdminStorefrontLayout = lazyWithRetry(() => import('./pages/admin/AdminStorefrontLayout'), 'admin-storefront-layout');
const AdminSeo = lazyWithRetry(() => import('./pages/admin/AdminSeo'), 'admin-seo');
const AdminInventoryImport = lazyWithRetry(() => import('./pages/admin/AdminInventoryImport'), 'admin-inventory-import');
const RequestModel = lazyWithRetry(() => import('./pages/RequestModel'), 'request-model');
const Contact = lazyWithRetry(() => import('./pages/Contact'), 'contact');
const EmailUnsubscribe = lazyWithRetry(() => import('./pages/EmailUnsubscribe'), 'email-unsubscribe');

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
                <Route path="storefront-layout" element={<AdminStorefrontLayout />} />
                <Route path="seo" element={<AdminSeo />} />
                <Route path="ai-settings" element={<Navigate to="/admin/integrations" replace />} />
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="aperfy-theme">
      <LanguageProvider>
        <AuthProvider>
          <StorefrontLayoutProvider>
          <RegionalPricingProvider>
            <CartProvider>
              <BulkImportProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <SeoProvider>
                      <AppErrorBoundary>
                        <AppContent />
                        <BulkImportBanner />
                      </AppErrorBoundary>
                    </SeoProvider>
                  </BrowserRouter>
                </TooltipProvider>
              </BulkImportProvider>
            </CartProvider>
          </RegionalPricingProvider>
          </StorefrontLayoutProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
