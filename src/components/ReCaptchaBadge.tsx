import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Shield, AlertCircle } from 'lucide-react';

interface ReCaptchaProps {
  onVerify: (token: string) => void;
}

export function useReCaptcha() {
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');

  const refreshRecaptchaToken = () => {
    // Generates a simulated Google reCAPTCHA v3 verified cryptographic token
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const mockToken = `03ANYolqtu8Z8_rc3_${randomHex}`;
    setRecaptchaToken(mockToken);
    return mockToken;
  };

  useEffect(() => {
    refreshRecaptchaToken();
  }, []);

  return { recaptchaToken, refreshRecaptchaToken };
}

export default function ReCaptchaBadge() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      id="recaptcha-float-badge"
      className="fixed bottom-4 right-4 z-50 flex items-center shadow-lg bg-white border border-neutral-200 rounded-md py-1.5 px-3 select-none transition-all duration-300 overflow-hidden font-sans text-[11px] text-zinc-500 hover:shadow-xl group"
      style={{
        maxWidth: expanded ? '280px' : '65px',
        maxHeight: '40px',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-center gap-2 whitespace-nowrap min-w-[260px]">
        {/* Recaptcha Logo Icon */}
        <div className="relative p-1 bg-zinc-50 rounded border border-neutral-100 flex items-center justify-center">
          <Shield className="w-4 h-4 text-emerald-600 font-bold" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        <div className="flex flex-col select-none">
          <span className="font-semibold text-zinc-700 flex items-center gap-1">
            reCAPTCHA <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded">v3 Secure</span>
          </span>
          <span className="text-[10px] text-zinc-400">Privacy & Terms protected</span>
        </div>
      </div>
    </div>
  );
}
