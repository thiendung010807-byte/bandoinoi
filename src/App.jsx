import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import CartSidebar from './components/CartSidebar';
import FloatingSupport from './components/FloatingSupport';
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
          {/* 2. GỌI COMPONENT NÚT HỖ TRỢ */}
          <FloatingSupport />

          {/* 3. CẤU HÌNH LẠI TOASTER (Giao diện Premium) */}
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'font-sans font-medium text-slate-800 rounded-2xl shadow-soft border border-slate-100',
              duration: 4000,
              style: {
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '16px 24px',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }} 
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;