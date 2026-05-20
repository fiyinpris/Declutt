import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./Component/Navbar";
import Footer from "./Component/Footer";

import Login from "./Component/Login";
import Signup from "./Component/Signup";
import { HomeSection } from "./Component/HomeSection";
import Listings from "./Component/Listings";
import ProductDetails from "./Component/ProductDetails";
import SellerDashboard from "./Component/SellerDashboard";
import BuyerDashboard from "./Component/BuyerDashboard";
import AdminDashboard from "./Component/AdminDashboard";
import ResetPassword from "./Component/ResetPassword";
import ProtectedRoute from "./Component/ProtectedRoute";
import Messages from "./Component/Messages";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />

          <main className="flex-1 pt-4">
            <Routes>
            <Route path="/" element={<HomeSection />} />
            <Route path="/listings" element={<Listings />} />

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

            {/* Messages route (fixed position) */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={<h1 className="text-center mt-20">Page Not Found</h1>}
            />
          </Routes>
        </main>

        <Footer />
      </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
