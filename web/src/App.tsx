import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from '@components/layout/Layout'
import ProtectedRoute from '@components/auth/ProtectedRoute'

const LoginPage = lazy(() => import('@pages/LoginPage'))
const ChatPage = lazy(() => import('@pages/ChatPage'))
const HistoryPage = lazy(() => import('@pages/HistoryPage'))
const ProfilePage = lazy(() => import('@pages/ProfilePage'))
const AdminPage = lazy(() => import('@pages/AdminPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-500">Cargando...</div>
      }>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>
              } />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
