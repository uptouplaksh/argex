import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { CurrencyProvider } from './context/CurrencyContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './layouts/Layout'
import AdminPanelPage from './pages/AdminPanelPage'
import AuctionRoomPage from './pages/AuctionRoomPage'
import AuctionsPage from './pages/AuctionsPage'
import CreateAuctionPage from './pages/CreateAuctionPage'
import DefenderDashboardPage from './pages/DefenderDashboardPage'
import EditAuctionPage from './pages/EditAuctionPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SetupPinPage from './pages/SetupPinPage'
import VerifyOtpPage from './pages/VerifyOtpPage'
import WatchlistPage from './pages/WatchlistPage'

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-otp" element={<VerifyOtpPage />} />
                <Route path="/setup-pin" element={<SetupPinPage />} />
                <Route path="/auctions" element={<AuctionsPage />} />
                <Route
                  path="/auctions/:auctionId"
                  element={
                    <ProtectedRoute>
                      <AuctionRoomPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/auctions/:auctionId/edit"
                  element={
                    <ProtectedRoute allowedRoles={['seller']}>
                      <EditAuctionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/watchlist"
                  element={
                    <ProtectedRoute>
                      <WatchlistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seller"
                  element={
                    <ProtectedRoute allowedRoles={['seller']}>
                      <SellerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seller/create"
                  element={
                    <ProtectedRoute allowedRoles={['seller']}>
                      <CreateAuctionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/defender"
                  element={
                    <ProtectedRoute allowedRoles={['defender']}>
                      <DefenderDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminPanelPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  )
}

export default App
