import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import CartSidebar from './components/CartSidebar';
import MyOrders from './pages/MyOrders';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Navbar />
          <CartSidebar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              {/* Trang chủ */}
              <Route path="/" element={<Home />} />
              
              {/* Trang thanh toán */}
              <Route 
                path="/checkout" 
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                } 
              />
	      <Route 
                path="/my-orders" 
                element={
                  <ProtectedRoute>
                    <MyOrders />
                  </ProtectedRoute>
                } 
              />
              {/* Trang Admin */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          <Toaster position="bottom-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;