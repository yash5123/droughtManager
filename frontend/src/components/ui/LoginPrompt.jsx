import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPrompt({ message = 'Sign in to dispatch emergency resources' }) {
  const { openLoginModal } = useAuth();

  return (
    <button
      onClick={() => openLoginModal()}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 hover:border-[var(--color-cyan)]"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-card)',
        color: 'var(--color-cyan)',
      }}
    >
      <Lock className="w-4 h-4" />
      {message}
    </button>
  );
}
