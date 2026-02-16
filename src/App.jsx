import { Navigate, Route, Routes } from 'react-router-dom'
import SignInPage from './features/auth/pages/SignInPage'
import SignUpPage from './features/auth/pages/SignUpPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
    </Routes>
  )
}

export default App
