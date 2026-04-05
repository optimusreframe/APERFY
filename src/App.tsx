import { useState, useCallback, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { BulkImportProvider } from "@/contexts/BulkImportContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BulkImportBanner from "@/components/BulkImportBanner";
import PrintingBackground from "@/components/PrintingBackground";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import { Navigate } from "react-router-dom";
import ProductDetail from "./pages/ProductDetail";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminMaterials from "./pages/admin/AdminMaterials";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminPaymentSettings from "./pages/admin/AdminPaymentSettings";
import AdminShipping from "./pages/admin/AdminShipping";
import RequestModel from "./pages/RequestModel";
import OurProcess from "./pages/OurProcess";
import Materials from "./pages/Materials";

const SplashLoader3D = lazy(() => import("@/components/SplashLoader3D"));

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const shouldShowLoader = location.pathname === "/" && !sessionStorage.getItem("3dp-loaded");
  const [showLoader, setShowLoader] = useState(shouldShowLoader);

  const handleLoaderComplete = useCallback(() => setShowLoader(false), []);

  return (
    <>
      {showLoader && (
        <Suspense fallback={null}>
          <SplashLoader3D onComplete={handleLoaderComplete} />
        </Suspense>
      )}
      {!isAdmin && <PrintingBackground />}
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/3dmodels" element={<Navigate to="/" replace />} />
                <Route path="/3dmodels/:slug" element={<ProductDetail />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/request-model" element={<RequestModel />} />
                <Route path="/our-process" element={<OurProcess />} />
                <Route path="/materials" element={<Materials />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="materials" element={<AdminMaterials />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="requests" element={<AdminRequests />} />
                  <Route path="payments" element={<AdminPaymentSettings />} />
                  <Route path="shipping" element={<AdminShipping />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
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
