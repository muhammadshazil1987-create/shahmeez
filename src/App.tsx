import React, { useState, useEffect, useRef } from 'react';
import ShopPage from './components/ShopPage';
import AdminDashboard from './components/AdminDashboard';
import ReCaptchaBadge, { useReCaptcha } from './components/ReCaptchaBadge';
import { checkAdminSession } from './middleware';
import { Shield, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'shop' | 'admin' | 'login'>('shop');
  const isLoggedInRef = useRef(false);
  const [token, setToken] = useState<string>('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  const { recaptchaToken, refreshRecaptchaToken } = useReCaptcha();

  // Route & Hash Guardian Middleware protection
  useEffect(() => {
    // Overwrite the initial state on mount if not authenticated, ensuring home page is the default loaded route
    if (!isLoggedInRef.current) {
      if (window.location.hash) {
        window.location.hash = '';
      }
      setCurrentView('shop');
    }

    const handleRouteCheck = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      const isAdminRoute = hash === '#admin' || hash === '#dashboard' || pathname === '/admin' || pathname === '/dashboard';
      const isLoginRoute = hash === '#login' || pathname === '/login';

      if (isAdminRoute && !isLoggedInRef.current) {
        // ALWAYS force login in this stateless mode
        window.location.hash = '#login';
        setCurrentView('login');
      } else if (isAdminRoute && isLoggedInRef.current) {
        setCurrentView('admin');
      } else if (isLoginRoute) {
        setCurrentView('login');
      } else {
        setCurrentView('shop');
      }
    };

    window.addEventListener('hashchange', handleRouteCheck);
    window.addEventListener('popstate', handleRouteCheck);

    return () => {
      window.removeEventListener('hashchange', handleRouteCheck);
      window.removeEventListener('popstate', handleRouteCheck);
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthenticating(true);

    const tokenPayload = recaptchaToken || refreshRecaptchaToken();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          recaptchaToken: tokenPayload
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setLoginError(errorData.error || 'Identity token rejected.');
        refreshRecaptchaToken();
        return;
      }

      const data = await res.json();
      isLoggedInRef.current = true;
      setToken(data.token);
      setCurrentView('admin');
      window.location.hash = '#admin';
    } catch (err) {
      setLoginError('Authentication gateway failure.');
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 relative selection:bg-neutral-900 selection:text-white" id="main-application-frame">
      {/* Active layout switcher */}
      <div className="transition-all duration-300">
        {currentView === 'shop' ? (
          <ShopPage onGoToAdmin={() => {
            setCurrentView('login');
            window.location.hash = '#login';
          }} />
        ) : currentView === 'login' ? (
          /* High-quality standalone dedicated login page */
          <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-6 relative overflow-hidden" id="secure-admin-login-fullscreen">
            {/* Background Image Accent */}
            <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
              <img 
                src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=1200"
                alt="Traditional clothes background"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="w-full max-w-md bg-white border-2 border-[#484b96]/25 rounded-2xl shadow-xl p-8 space-y-6 relative z-10 overflow-hidden text-zinc-900">
              {/* Blue stripe */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#484b96]" />

              <div className="text-center space-y-2 pt-2">
                <span className="inline-block text-[9px] uppercase font-mono tracking-widest text-[#484b96] bg-[#484b96]/15 border border-[#484b96]/20 px-3.5 py-1 rounded-full font-bold">
                  Secured Middleware Gated
                </span>
                <h1 className="text-2xl font-bold font-display tracking-tight text-[#484b96] flex items-center justify-center gap-2">
                  <Shield className="w-6 h-6 text-[#484b96]" />
                  شاہ میز • Admin Gate
                </h1>
                <p className="text-[10px] text-[#484b96]/75 font-mono tracking-wider uppercase">NIMBUS POS SYNCHRONIZER • JWT ROUTE MIDDLEWARE ACTIVE</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded flex items-center gap-2" id="login-error-msg">
                    <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[#484b96] uppercase tracking-widest mb-1.5">
                    Administrative Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs bg-white border border-[#484b96]/30 focus:border-[#484b96] rounded-md px-3.5 py-2.5 outline-none font-mono tracking-wide transition-all text-zinc-900 focus:ring-1 focus:ring-[#484b96]"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#484b96] uppercase tracking-widest mb-1.5">
                    Secure Password
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs bg-white border border-[#484b96]/30 focus:border-[#484b96] rounded-md pl-3.5 pr-10 py-2.5 outline-none font-mono tracking-wide transition-all text-zinc-900 focus:ring-1 focus:ring-[#484b96]"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-[#484b96]/70 hover:text-[#484b96] transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* reCAPTCHA validation info card */}
                <div className="bg-[#484b96]/5 p-3.5 rounded-lg border border-[#484b96]/15 flex items-start gap-2.5 text-[10px] text-[#484b96]/95 leading-normal">
                  <Shield className="w-5 h-5 text-[#484b96] shrink-0 mt-0.5" />
                  <div>
                    <span>Client verified via Google <strong className="text-[#484b96] font-bold">reCAPTCHA v3</strong> token evaluation. Unauthorized /admin queries are strictly banned.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-full bg-[#484b96] hover:bg-[#393b76] text-white font-semibold text-xs py-3 rounded-md transition-colors cursor-pointer shadow-sm disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                >
                  <KeyRound className="w-4 h-4" />
                  {authenticating ? 'Verifying Credentials...' : 'Authenticate & Open Workspace'}
                </button>
              </form>

              {/* Back to Shop Interface Helper Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '';
                    setCurrentView('shop');
                  }}
                  className="text-xs text-[#484b96]/70 hover:text-[#484b96] hover:underline font-semibold transition-colors cursor-pointer"
                >
                  ← Return to Boutique Store
                </button>
              </div>
            </div>
          </div>
        ) : (
          <AdminDashboard token={token} onBackToShop={() => {
            isLoggedInRef.current = false;
            setToken('');
            setCurrentView('shop');
            window.location.hash = '';
          }} />
        )}
      </div>

      {/* Persistent Simulated Google reCAPTCHA v3 float badge */}
      <ReCaptchaBadge />
    </div>
  );
}
