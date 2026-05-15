"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../firebase'; 
import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Shield, Lock, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

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
      
      router.push('/');
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
      
      router.push('/');
    } catch (err) {
      setError('Login failed.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10 border border-slate-100">
        
        {/* BRANDING HEADER */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={logoPreview} 
            alt="District Logo" 
            className="w-20 h-20 rounded-full object-cover shadow-md border-4 border-slate-50 mb-4"
            onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
          />
          <h1 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tight">
            {districtName}
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
            Secure Access Gateway
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-black text-center mb-6 border border-red-100 animate-fade-in flex items-center justify-center gap-2">
            <Shield size={16} /> {error}
          </div>
        )}

        {/* STEP 1: PHONE NUMBER */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6 animate-fade-in">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Registered Mobile</label>
              <input 
                type="tel" 
                value={phone}
                onChange={handlePhoneChange}
                placeholder="024XXXXXXX"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none font-black text-xl text-center tracking-widest transition-all text-slate-800"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Continue <ArrowRight size={20} /></>}
            </button>
          </form>
        )}

        {/* STEP 2: MASTER SETUP CODE */}
        {step === 'setup' && (
          <form onSubmit={handleSetupSubmit} className="space-y-6 animate-fade-in">
            <div className="text-center mb-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
              <Shield size={24} className="text-orange-500 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-800">New device detected.</p>
              <p className="text-xs font-bold text-slate-500 mt-1">Enter the 6-digit authorization code provided by the Master Admin.</p>
            </div>
            <div>
              <input 
                type="text" 
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                placeholder="000000"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none font-black text-3xl text-center tracking-[0.3em] transition-all text-slate-800"
                required
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/30">
              Verify Device <CheckCircle2 size={20} />
            </button>
          </form>
        )}

        {/* STEP 3 & 4: PIN CREATION / ENTRY */}
        {(step === 'createPin' || step === 'enterPin') && (
          <form onSubmit={step === 'createPin' ? handleCreatePin : handleEnterPin} className="space-y-6 animate-fade-in">
            <div className="text-center mb-4">
              <Lock size={24} className="text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-800">
                {step === 'createPin' ? 'Create your permanent 4-digit PIN.' : 'Enter your 4-digit PIN to unlock.'}
              </p>
            </div>
            <div>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0,4))}
                placeholder="••••"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none font-black text-4xl text-center tracking-[0.5em] transition-all text-slate-800"
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Unlock <Lock size={20} /></>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}