import { useState } from 'react';
import { Trophy, Eye, EyeOff } from 'lucide-react';
import * as DB from '../api.ts';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(() => localStorage.getItem('gpga_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('gpga_remembered_email') !== null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await DB.authenticateUser(email, password);
      if (user) {
        DB.setAuthenticated(true);
        DB.setCurrentUserId(user.id);
        if (rememberMe) {
          localStorage.setItem('gpga_remembered_email', email);
        } else {
          localStorage.removeItem('gpga_remembered_email');
        }
        onLogin(user);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-full">
                <Trophy size={48} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">GPGA</h1>
            <p className="text-emerald-100">Golf Pro Golf Association</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Sign In</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input id="login-email" name="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="your.email@example.com" required autoFocus />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input id="login-password" name="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Enter your password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center mt-4">
              <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2" />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-700">Remember my email</label>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 text-center mb-2 font-semibold">Demo Credentials</p>
              <p className="text-xs text-slate-500 text-center">
                Use any player's email with password: <span className="font-mono font-semibold">password</span>
              </p>
            </div>
          </form>
        </div>
        <p className="text-center text-slate-500 text-sm mt-6">Manage scores, fines, and leaderboards for your golf league</p>
      </div>
    </div>
  );
}
