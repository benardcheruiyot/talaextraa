// App.js
import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import './styles/globals.css';

// Pages
import Home from './pages/Home';
import Eligibility from './pages/Eligibility';
import Loan from './pages/Loan';
import LoanProcessing from './pages/LoanProcessing';
import Processing from './pages/Processing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import ProtectedRoute from './components/ProtectedRoute';

function PushSubscriber() {
  const { user } = useContext(AuthContext);
  usePushNotifications(!!user); // only subscribe when logged in
  return null;
}

function AppRoutes() {
  return (
    <>
      <PushSubscriber />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/eligibility" element={<Eligibility />} />

        <Route
          path="/processing"
          element={
            <ProtectedRoute>
              <Processing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/loanapproval"
          element={
            <ProtectedRoute>
              <Processing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/loan"
          element={
            <ProtectedRoute>
              <Loan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/apply"
          element={
            <ProtectedRoute>
              <Loan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/loan-processing"
          element={
            <ProtectedRoute>
              <LoanProcessing />
            </ProtectedRoute>
          }
        />

        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
