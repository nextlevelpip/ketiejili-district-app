"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, KeyRound, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { db, auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState(1); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- BRANDING STATE ---
  const [globalName, setGlobalName] = useState('KETIEJILI');
  const [globalLogo, setGlobalLogo] = useState('/logo.jpg');

  // Fetch Settings and Initialize Recaptcha
  useEffect(() => {
    // 1. Fetch the Logo and Name from Database
    const fetchBranding = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'general'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.districtName) setGlobalName(data.districtName);
          if (data.logoBase64) setGlobalLogo(data.logoBase64);
        }
      } catch (err) {
        console.log("Could not fetch custom logo, using default.");
      }
    };
    fetchBranding();

    // 2. Initialize invisible reCAPTCHA
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, []);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let cleaned = phoneNumber.replace(/\D/g, ''); 
    let formattedNumber = cleaned;
    if (cleaned.startsWith('0')) {
      formattedNumber = '+233' + cleaned.substring(1);
    } else if (!cleaned.startsWith('233')) {
      formattedNumber = '+233' + cleaned;
    } else {
      formattedNumber = '+' + cleaned;
    }

    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep(2); 
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/billing-not-enabled' || err.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded. Please use a registered Test Number.');
      } else {
        setError('Failed to send SMS. Make sure you enter a valid 10-digit number.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await confirmationResult.confirm(verificationCode);
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Invalid security code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = "w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-800 shadow-sm font-bold text-lg text-center tracking-widest";

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Styling */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600 rounded-full blur-[100px] opacity-20"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        
        {/* HEADER WITH DYNAMIC LOGO */}
        <div className="bg-blue-50 p-8 text-center border-b border-blue-100">
          <div className="w-24 h-24 bg-white rounded-full shadow-md mx-auto mb-4 flex items-center justify-center border-4 border-blue-100 overflow-hidden">
             <img src={globalLogo} alt="District Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-blue-950 uppercase tracking-tight">{globalName} Command</h1>
          <p className="text-xs font-extrabold text-blue-600 uppercase tracking-widest mt-1">Authorized Access Only</p>
        </div>

        {error && (
          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3 text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <div className="p-8">
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-6 animate-fade-in">
              <div className="text-center mb-6">
                <p className="text-gray-500 font-bold text-sm">Enter your registered mobile number to receive your secure login code.</p>
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-4 text-gray-400" size={20}/>
                <input type="tel" required placeholder="024 123 4567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputStyle} autoFocus />
              </div>

              <button type="submit" disabled={isLoading} className={`w-full py-4 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-3 text-white text-lg ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isLoading ? <><Loader2 size={24} className="animate-spin" /> Connecting...</> : <>Send Security Code <ArrowRight size={20}/></>}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-6 animate-fade-in">
              <div className="text-center mb-6">
                <p className="text-gray-500 font-bold text-sm">A 6-digit code has been sent to <span className="text-gray-900">{phoneNumber}</span>.</p>
              </div>

              <div className="relative">
                <KeyRound className="absolute left-4 top-4 text-gray-400" size={20}/>
                <input type="text" required maxLength="6" placeholder="• • • • • •" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className={inputStyle} autoFocus />
              </div>

              <button type="submit" disabled={isLoading || verificationCode.length !== 6} className={`w-full py-4 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-3 text-white text-lg ${(isLoading || verificationCode.length !== 6) ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {isLoading ? <><Loader2 size={24} className="animate-spin" /> Verifying...</> : <>Verify & Access Command</>}
              </button>

              <div className="text-center pt-4">
                <button type="button" onClick={() => setStep(1)} className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors">
                  Wrong number? Go back.
                </button>
              </div>
            </form>
          )}
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}