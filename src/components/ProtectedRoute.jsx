import { useAuth } from '../AuthContext'
import { Navigate } from 'react-router-dom'
import Loading from './Loading'
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth() 

  if (loading) {
    return <Loading type="page" /> 
  }

  return user ? children : <Navigate to="/signin" replace />
}

export default ProtectedRoute