import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function AuthConfirmHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    console.log('Auth Confirm - Token:', token);
    console.log('Auth Confirm - Type:', type);
    
    if (type === 'recovery' && token) {
      // Redirect to update password page with the token
      navigate(`/update-password?token=${token}`, { replace: true });
    } else if (type === 'signup' && token) {
      // Handle email verification if needed
      navigate('/signin?message=Email verified successfully', { replace: true });
    } else {
      // Invalid or missing parameters
      navigate('/signin?message=Invalid confirmation link', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-500">Processing authentication...</div>
    </div>
  );
}