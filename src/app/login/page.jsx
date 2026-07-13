"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { db, auth } from '../firebase'; 
import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Shield, Lock, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // --- SYSTEM STATES ---
  const [step, setStep] = useState('phone'); // phone, setup, createPin, enterPin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- BRANDING STATES ---
  const [districtName, setDistrictName] = useState('KETIEJILI COMMAND');
  const [logoPreview, setLogoPreview] = useState('/logo.jpg');
  
  // --- USER INPUTS ---
  const [phone, setPhone] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [pin, setPin] = useState('');
  
  // --- HIDDEN DATA ---
  const [userData, setUserData] = useState(null);
  const [deviceId, setDeviceId] = useState('');

  // 1. Fetch Branding & Generate Device ID on Load
  useEffect(() => {
    // Generate or fetch Device ID
    let storedId = localStorage.getItem('ketiejili_device_id');
    if (!storedId) {
      storedId = 'DEV_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ketiejili_device_id', storedId);
    }
    setDeviceId(storedId);

    // Fetch Global Branding
    const fetchBranding = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'general'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.districtName) setDistrictName(data.districtName + ' COMMAND');
          if (data.logoBase64) setLogoPreview(data.logoBase64);
        }
      } catch (err) {
        console.error("Failed to load branding", err);
      }
    };
    fetchBranding();
  }, []);

  // --- 2. STRICT PHONE VALIDATION ---
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); // Strip non-numbers
    if (val.length > 0 && val[0] !== '0') {
      val = '0' + val; // Force starting 0
    }
    setPhone(val.slice(0, 10)); // Lock strictly to 10 digits
  };

  // 3. Verify Phone Number & Master Override
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    setLoading(true);
    setError('');

    // ==========================================
    // THE SUPREME COMMAND OVERRIDE (DATABASE INJECTOR)
    // ==========================================
    if (phone === '0000000000') {
      try {
        // Authenticate first so Firebase allows the write
        await signInAnonymously(auth);
        
        const masterId = 'master-override-777';
        const masterUser = {
          name: "System Architect",
          role: "District Minister", // Using a valid role so dashboards don't break
          phone: "0000000000",
          tierLevel: 1,
          localPin: '7777', // The Master PIN
          authorizedDevice: deviceId,
          setupCode: null,
          isSetupComplete: true,
          status: 'Active',
          assignedAssembly: 'All Assemblies'
        };

        // Inject the Master User into the real database to satisfy DashboardLayout
        await setDoc(doc(db, 'users', masterId), masterUser);

        setUserData({ id: masterId, ...masterUser });
        setStep('enterPin'); 
        setLoading(false);
        return;
      } catch (err) {
        console.error(err);
        setError("Failed to initialize Master Override.");
        setLoading(false);
        return;
      }
    }
    // ==========================================

    try {
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Number not found in District Registry.');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      setUserData({ id: userDoc.id, ...data });

      if (data.authorizedDevice === deviceId) {
        setStep('enterPin');
      } else {
        setStep('setup');
      }
    } catch (err) {
      setError('Connection failed. Try again.');
    }
    setLoading(false);
  };

  // 4. Verify Master Setup Code
  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (setupCode !== userData.setupCode) {
      setError('Invalid Setup Code. Contact Master Admin.');
      return;
    }
    setError('');
    setStep('createPin'); 
  };

  // 5. Create Local PIN and Lock Device
  const handleCreatePin = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        authorizedDevice: deviceId,
        localPin: pin,
        setupCode: null,
        isSetupComplete: true 
      });
      await signInAnonymously(auth);
      
      // --- ISSUE THE ID BADGE HERE ---
      localStorage.setItem('ketiejili_user', JSON.stringify({...userData, localPin: pin, isSetupComplete: true}));
      
      router.push('/dashboard'); // Redirect to dashboard after successful setup
    } catch (err) {
      setError('Failed to secure device.');
    }
    setLoading(false);
  };

  // 6. Enter Existing PIN
  const handleEnterPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (pin !== userData.localPin) {
      setError('Incorrect PIN.');
      setLoading(false);
      return;
    }
    
    try {
      await signInAnonymously(auth);
      
      // --- ISSUE THE ID BADGE HERE ---
      localStorage.setItem('ketiejili_user', JSON.stringify(userData));
      
      router.push('/dashboard'); // Redirect to dashboard after successful login  
    } catch (err) {
      setError('Login failed.');
    }
    setLoading(false);
  };

  const inputStyle = "w-full px-4 py-4 bg-[#000814] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none font-black text-xl text-center tracking-widest transition-all text-white placeholder:text-white/20 shadow-inner";

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-[#FFC300] selection:text-[#000814]">
      
      {/* Premium Ambient Backdrops */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FFC300]/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-[#001D3D] p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 border border-[#003566] animate-fade-in">
        
        {/* ESCAPE HATCH TO PUBLIC GATEWAY */}
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8ECAE6] hover:text-[#FFC300] transition-colors mb-6 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>

        {/* BRANDING HEADER */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={logoPreview} 
            alt="District Logo" 
            className="w-20 h-20 rounded-full object-cover shadow-lg border-4 border-[#FFC300]/50 mb-4 bg-[#000814]"
            onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
          />
          <h1 className="text-xl md:text-2xl font-black text-white text-center uppercase tracking-tight drop-shadow-md">
            {districtName}
          </h1>
          <p className="text-[10px] font-black text-[#FFC300] uppercase tracking-[0.2em] mt-1.5">
            Secure Access Gateway
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-xs font-black uppercase tracking-widest text-center mb-6 border border-red-500/30 animate-fade-in flex items-center justify-center gap-2">
            <Shield size={16} /> {error}
          </div>
        )}

        {/* STEP 1: PHONE NUMBER */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6 animate-fade-in">
            <div>
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block mb-2 text-center">Registered Mobile</label>
              <input 
                type="tel" 
                value={phone}
                onChange={handlePhoneChange}
                placeholder="024XXXXXXX"
                className={inputStyle}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black uppercase tracking-widest text-xs py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
            </button>
          </form>
        )}

        {/* STEP 2: MASTER SETUP CODE */}
        {step === 'setup' && (
          <form onSubmit={handleSetupSubmit} className="space-y-6 animate-fade-in">
            <div className="text-center mb-4 bg-[#000814] p-5 rounded-2xl border border-[#003566]">
              <Shield size={24} className="text-[#FFC300] mx-auto mb-2" />
              <p className="text-xs font-black text-white uppercase tracking-widest mb-1.5">New device detected.</p>
              <p className="text-[9px] font-bold text-[#8ECAE6] uppercase tracking-widest leading-relaxed">Enter the 6-digit authorization code provided by the District Secretary.</p>
            </div>
            <div>
              <input 
                type="text" 
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                placeholder="000000"
                className={`${inputStyle} text-3xl tracking-[0.3em]`}
                required
              />
            </div>
            <button type="submit" className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black uppercase tracking-widest text-xs py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
              Verify Device <CheckCircle2 size={18} />
            </button>
          </form>
        )}

        {/* STEP 3 & 4: PIN CREATION / ENTRY */}
        {(step === 'createPin' || step === 'enterPin') && (
          <form onSubmit={step === 'createPin' ? handleCreatePin : handleEnterPin} className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <Lock size={24} className="text-[#FFC300] mx-auto mb-3" />
              <p className="text-[10px] font-black text-[#8ECAE6] uppercase tracking-widest leading-relaxed">
                {step === 'createPin' ? 'Create your permanent 4-digit PIN.' : `Welcome back, ${userData?.name?.split(' ')[0] || 'Minister'}. Enter PIN to unlock.`}
              </p>
            </div>
            <div>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0,4))}
                placeholder="••••"
                className={`${inputStyle} text-4xl tracking-[0.5em] text-[#FFC300]`}
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black uppercase tracking-widest text-xs py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Unlock Terminal <Lock size={18} /></>}
            </button>
          </form>
        )}

       {/* APP ENGINE SIGNATURE (STATIC) */}
        <div className="mt-10 pt-6 border-t border-[#003566] flex flex-col items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
          <img 
            src="/altarconnect-logo.png" 
            alt="AltarConnect Engine" 
            className="w-10 h-10 object-contain mb-1.5 grayscale opacity-70"
          />
          <p className="text-[8px] font-black text-white uppercase tracking-widest text-center">
            Powered by AltarConnect Engine
          </p>
        </div>
     
      </div>
    </div>
  );
}