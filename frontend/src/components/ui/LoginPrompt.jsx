import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPrompt({ message = 'Sign in to dispatch emergency resources' }) {
  const { openLoginModal } = useAuth();

  return (
    <button
      onClick={() => openLoginModal()}
     
     }
    >
      <Lock />
      {message}
    </button>
  );
}
