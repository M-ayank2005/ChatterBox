"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { MessageCircle, Lock, Phone, User, FileText } from 'lucide-react';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:8080/api/signup', { username, phone, bio, password });
      router.push('/login');
    } catch (err) {
      setError('Registration failed. Phone number might be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111b21] flex flex-col overflow-auto">
      {/* Top Banner */}
      <div className="h-[100px] sm:h-[140px] md:h-[180px] bg-[#00a884] w-full flex-shrink-0" />
      
      <div className="flex-1 flex items-start justify-center -mt-[50px] sm:-mt-[70px] md:-mt-[90px] px-4 pb-10">
        <div className="w-full max-w-[500px] bg-[#202c33] rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#00a884] to-[#02735e] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6 shadow-lg">
              <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-[#e9edef] text-lg sm:text-xl md:text-2xl font-light mb-1 sm:mb-2">Create your account</h1>
            <p className="text-[#8696a0] text-xs sm:text-sm">Join ChatterBox and start messaging</p>
          </div>

          {error && (
            <div className="mx-8 mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-3 sm:space-y-4">
            <div>
              <label className="text-[#00a884] text-xs uppercase tracking-wider font-medium block mb-1.5 sm:mb-2">
                Display Name
              </label>
              <div className="flex items-center bg-[#2a3942] rounded-lg border-2 border-transparent focus-within:border-[#00a884] transition-all duration-200">
                <span className="pl-3 sm:pl-4 text-[#8696a0]">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm sm:text-[15px] pl-3 pr-4 py-2.5 sm:py-3 md:py-4 outline-none"
                  placeholder="Your name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[#00a884] text-xs uppercase tracking-wider font-medium block mb-1.5 sm:mb-2">
                Phone Number
              </label>
              <div className="flex items-center bg-[#2a3942] rounded-lg border-2 border-transparent focus-within:border-[#00a884] transition-all duration-200">
                <span className="pl-3 sm:pl-4 text-[#8696a0]">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm sm:text-[15px] pl-3 pr-4 py-2.5 sm:py-3 md:py-4 outline-none"
                  placeholder="+1 234 567 8900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[#00a884] text-xs uppercase tracking-wider font-medium block mb-1.5 sm:mb-2">
                Bio (Optional)
              </label>
              <div className="flex items-start bg-[#2a3942] rounded-lg border-2 border-transparent focus-within:border-[#00a884] transition-all duration-200">
                <span className="pl-3 sm:pl-4 pt-2.5 sm:pt-3 md:pt-4 text-[#8696a0]">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm sm:text-[15px] pl-3 pr-4 py-2.5 sm:py-3 md:py-4 outline-none resize-none"
                  placeholder="Hey there! I am using ChatterBox"
                  rows={2}
                />
              </div>
            </div>
            
            <div>
              <label className="text-[#00a884] text-xs uppercase tracking-wider font-medium block mb-1.5 sm:mb-2">
                Password
              </label>
              <div className="flex items-center bg-[#2a3942] rounded-lg border-2 border-transparent focus-within:border-[#00a884] transition-all duration-200">
                <span className="pl-3 sm:pl-4 text-[#8696a0]">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm sm:text-[15px] pl-3 pr-4 py-2.5 sm:py-3 md:py-4 outline-none"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 sm:py-3 md:py-4 bg-[#00a884] hover:bg-[#06cf9c] text-white text-sm sm:text-[15px] font-medium rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3 sm:mt-4 md:mt-6"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="px-6 sm:px-8 py-4 sm:py-5 bg-[#182229] text-center border-t border-[#2a3942]">
            <p className="text-[#8696a0] text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-[#00a884] hover:text-[#06cf9c] font-medium transition-all duration-200">
                Sign in
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
