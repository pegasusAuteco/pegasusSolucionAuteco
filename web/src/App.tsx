import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from '@components/layout/Layout'
import ProtectedRoute from '@components/auth/ProtectedRoute'
import ToastViewport from '@components/shared/ToastViewport'
import { ChatProvider } from './contexts/ChatContext'
import { WorkshopProvider } from './contexts/WorkshopContext'

const LoginPage = lazy(() => import('@pages/LoginPage'))
const RegisterPage = lazy(() => import('@pages/RegisterPage'))
const HistoryPage = lazy(() => import('@pages/HistoryPage'))
const ProfilePage = lazy(() => import('@pages/ProfilePage'))
const WorkshopPage = lazy(() => import('@pages/WorkshopPage'))

export default function App() {
  return (
    <BrowserRouter>
      <ToastViewport />
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-500">Cargando...</div>
      }>
        <WorkshopProvider>
          <ChatProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/chat" element={<Layout />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/workshop" element={<WorkshopPage />} />
                <Route path="/admin" element={<Navigate to="/chat" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </ChatProvider>
        </WorkshopProvider>
      </Suspense>
    </BrowserRouter>
  )
}
