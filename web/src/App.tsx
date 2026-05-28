import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from '@components/layout/Layout'
import ProtectedRoute from '@components/auth/ProtectedRoute'
import ToastViewport from '@components/shared/ToastViewport'
import { ChatProvider } from './contexts/ChatContext'
import { useAuthStore } from '@store/authStore'

const LoginPage    = lazy(() => import('@pages/LoginPage'))
const RegisterPage = lazy(() => import('@pages/RegisterPage'))
const HistoryPage  = lazy(() => import('@pages/HistoryPage'))
const ProfilePage  = lazy(() => import('@pages/ProfilePage'))
const WorkshopPage = lazy(() => import('@pages/WorkshopPage'))

/** Redirige al home correcto según el rol del usuario autenticado */
function RoleRedirect() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'mecanico' || user.role === 'admin') return <Navigate to="/chat" replace />
  return <Navigate to="/workshop" replace />
}

const Loader = (
  <div className="flex min-h-screen items-center justify-center text-gray-500">Cargando...</div>
)

export default function App() {
  return (
    <BrowserRouter>
      <ToastViewport />
      <Suspense fallback={Loader}>
        {/* WorkshopProvider removed — workshop state is now global via zustand/persist in workshopStore.ts */}
        <ChatProvider>
          <Routes>
            {/* Públicas */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Secretario + Admin: Taller Pegasus completo */}
            <Route element={<ProtectedRoute allowedRoles={['secretario', 'admin']} redirectTo="/chat" />}>
              <Route path="/workshop" element={<WorkshopPage />} />
            </Route>

            {/* Admin + cualquier autenticado: Chat / Historial / Perfil */}
            <Route element={<ProtectedRoute />}>
              <Route path="/chat"    element={<Layout />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Wildcard: redirige al home del rol */}
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </ChatProvider>
      </Suspense>
    </BrowserRouter>
  )
}
