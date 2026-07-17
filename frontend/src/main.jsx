import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { LanguageProvider } from './i18n'
import LoginPage      from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage    from './pages/ProfilePage'
import BudgetPage   from './pages/BudgetPage'
import HousePage    from './pages/HousePage'
import EatingPage   from './pages/EatingPage'
import ClothingPage from './pages/ClothingPage'
import TravelPage   from './pages/TravelPage'
import DebtsPage    from './pages/DebtsPage'
import SavingsPage  from './pages/SavingsPage'
import PremiumPage  from './pages/PremiumPage'
import AssistantPage from './pages/AssistantPage'
import AnalyticsPage from './pages/AnalyticsPage'
import CategoriesPage from './pages/CategoriesPage'
import AccountsPage from './pages/AccountsPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import ChildrenPage from './pages/ChildrenPage'
import TermsPage from './pages/TermsPage'
import './index.css'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken')
  return token ? children : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
    <UserProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/terms"      element={<TermsPage />} />
        <Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
        <Route path="/profile"  element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/budget"   element={<PrivateRoute><BudgetPage /></PrivateRoute>} />
        <Route path="/house"    element={<PrivateRoute><HousePage /></PrivateRoute>} />
        <Route path="/eating"   element={<PrivateRoute><EatingPage /></PrivateRoute>} />
        <Route path="/clothing" element={<PrivateRoute><ClothingPage /></PrivateRoute>} />
        <Route path="/travel"   element={<PrivateRoute><TravelPage /></PrivateRoute>} />
        <Route path="/debts"    element={<PrivateRoute><DebtsPage /></PrivateRoute>} />
        <Route path="/savings"  element={<PrivateRoute><SavingsPage /></PrivateRoute>} />
        <Route path="/premium"  element={<PrivateRoute><PremiumPage /></PrivateRoute>} />
        <Route path="/assistant" element={<PrivateRoute><AssistantPage /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><CategoriesPage /></PrivateRoute>} />
        <Route path="/accounts"  element={<PrivateRoute><AccountsPage /></PrivateRoute>} />
        <Route path="/subscriptions" element={<PrivateRoute><SubscriptionsPage /></PrivateRoute>} />
        <Route path="/children" element={<PrivateRoute><ChildrenPage /></PrivateRoute>} />
        <Route path="*"         element={<Navigate to="/budget" replace />} />
      </Routes>
    </BrowserRouter>
    </UserProvider>
    </LanguageProvider>
  </React.StrictMode>
)