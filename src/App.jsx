import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Navbar from "./Component/Navbar";
import Footer from "./Component/Footer";
import { HomeSection } from "./Component/HomeSection";
import ProtectedRoute from "./Component/ProtectedRoute";

// Other pages load on demand, so the first visit only downloads what it shows
const Login = lazy(() => import("./Component/Login"));
const Signup = lazy(() => import("./Component/Signup"));
const Listings = lazy(() => import("./Component/Listings"));
const ProductDetails = lazy(() => import("./Component/ProductDetails"));
const SellerDashboard = lazy(() => import("./Component/SellerDashboard"));
const BuyerDashboard = lazy(() => import("./Component/BuyerDashboard"));
const AdminDashboard = lazy(() => import("./Component/AdminDashboard"));
const ResetPassword = lazy(() => import("./Component/ResetPassword"));
const About = lazy(() => import("./Component/About"));
const Contact = lazy(() => import("./Component/Contact"));
const Checkout = lazy(() => import("./Component/Checkout"));
const CheckoutComplete = lazy(() => import("./Component/CheckoutComplete"));

const PageLoading = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status">
    <span className="w-8 h-8 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
    <span className="sr-only">Loading…</span>
  </div>
);

const MessagesRedirect = () => {
  const { profile } = useAuth();
  const to =
    profile?.role === "admin"
      ? "/admin"
      : `/${profile?.role === "seller" ? "seller" : "buyer"}?tab=messages`;
  return <Navigate to={to} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />

          <main className="flex-1 pt-4">
            <Suspense fallback={<PageLoading />}>
            <Routes>
            <Route path="/" element={<HomeSection />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* Product Detail Page Route */}
            <Route path="/product/:id" element={<ProductDetails />} />

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/buyer"
              element={
                <ProtectedRoute allowedRole="buyer">
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/seller"
              element={
                <ProtectedRoute allowedRole="seller">
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout/complete"
              element={
                <ProtectedRoute>
                  <CheckoutComplete />
                </ProtectedRoute>
              }
            />

            {/* Old /messages links → the signed-in user's Messages tab */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessagesRedirect />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={<h1 className="text-center mt-20">Page Not Found</h1>}
            />
          </Routes>
            </Suspense>
        </main>

        <Footer />
      </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
