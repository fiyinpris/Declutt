import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./Component/Navbar";
import Footer from "./Component/Footer";

import Login from "./Component/Login";
import Signup from "./Component/Signup";
import { HomeSection } from "./Component/HomeSection";
import Listings from "./Component/Listings";
import SellerDashboard from "./Component/SellerDashboard";
import BuyerDashboard from "./Component/BuyerDashboard";
import AdminDashboard from "./Component/AdminDashboard";
import ProtectedRoute from "./Component/ProtectedRoute";
import Messages from "./Component/Messages";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <main className="pt-4">
          <Routes>
            <Route path="/" element={<HomeSection />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
