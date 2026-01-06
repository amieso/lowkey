'use client'

import { useAuth } from '@/contexts/auth-context'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

export function AuthToast() {
  const { authMessage, clearAuthMessage } = useAuth()

  if (!authMessage) return null

  const isError = authMessage.toLowerCase().includes('failed') || authMessage.toLowerCase().includes('error')

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${
        isError
          ? 'bg-red-500/10 border-red-500/20 text-red-400'
          : 'bg-green-500/10 border-green-500/20 text-green-400'
      }`}>
        {isError ? (
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="text-sm font-medium">{authMessage}</span>
        <button
          onClick={clearAuthMessage}
          className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
