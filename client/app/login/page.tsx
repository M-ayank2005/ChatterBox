"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import axios from 'axios';
import Link from 'next/link';
import { MessageCircle, Lock, Phone } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useStore();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8080/api/login', { phone, password });
      setUser(res.data.user, res.data.token);
      router.push('/');
    } catch (err) {
      setError('Invalid phone number or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111b21] flex flex-col overflow-auto">
      {/* Top Banner */}
      <div className="h-[120px] sm:h-[180px] md:h-[222px] bg-[#00a884] w-full flex-shrink-0" />
      
      <div className="flex-1 flex items-start justify-center -mt-[60px] sm:-mt-[90px] md:-mt-[120px] px-4 pb-10">
        <div className="w-full max-w-[500px] bg-[#202c33] rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-10 pb-6 sm:pb-8 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#00a884] to-[#02735e] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-[#e9edef] text-xl sm:text-2xl font-light mb-2">Sign in to ChatterBox</h1>
            <p className="text-[#8696a0] text-sm">Enter your phone number and password</p>
          </div>

          {error && (
            <div className="mx-8 mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-4 sm:space-y-5">
            <div>
              <label className="text-[#00a884] text-xs uppercase tracking-wider font-medium block mb-2">
                Phone Number
              </label>
              <div className="flex items-center bg-[#2a3942] rounded-lg border-2 border-transparent focus-within:border-[#00a884] transition-all duration-200">
                <span className="pl-3 sm:pl-4 text-[#8696a0]">
                  <Phone className="w-5 h-5" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm sm:text-[15px] pl-3 pr-4 py-3 sm:py-4 outline-none"
                  placeholder="+1 234 567 8900"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="text-[#00a884] text-xs uppercase tracking-wider font-medium block mb-2">
                Password
              </label>
              <div className="flex items-center bg-[#2a3942] rounded-lg border-2 border-transparent focus-within:border-[#00a884] transition-all duration-200">
                <span className="pl-3 sm:pl-4 text-[#8696a0]">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm sm:text-[15px] pl-3 pr-4 py-3 sm:py-4 outline-none"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 sm:py-4 bg-[#00a884] hover:bg-[#06cf9c] text-white text-sm sm:text-[15px] font-medium rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 sm:mt-6"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          <div className="px-6 sm:px-8 py-4 sm:py-6 bg-[#182229] text-center border-t border-[#2a3942]">
            <p className="text-[#8696a0] text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="text-[#00a884] hover:text-[#06cf9c] font-medium transition-all duration-200">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <div className="text-center py-4 text-[#8696a0] text-xs flex-shrink-0">
        ChatterBox • Secure messaging
      </div>
    </div>
  );
}
