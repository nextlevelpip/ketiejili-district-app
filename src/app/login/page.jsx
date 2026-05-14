"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../firebase'; 
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Shield, Smartphone, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // System States
  const [step, setStep] = useState('phone'); // phone, setup, createPin, enterPin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // User Inputs
  const [phone, setPhone] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [pin, setPin] = useState('');
  
  // Hidden Data
  const [userData, setUserData] = useState(null);
  const [deviceId, setDeviceId] = useState('');

  // 1. Generate or grab the Device ID when the app opens
  useEffect(() => {
    let storedId = localStorage.getItem('ketiejili_device_id');
    if (!storedId) {
      storedId = 'DEV_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ketiejili_device_id', storedId);
    }
    setDeviceId(storedId);
  }, []);

  // 2. Check the phone number
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

      // The Gatekeeper Logic
      if (data.authorizedDevice === deviceId) {
        // Phone is recognized. Ask for local PIN.
        setStep('enterPin');
      } else {
        // Phone is NOT recognized. Demand Master Setup Code.
        setStep('setup');
      }
    } catch (err) {
      setError('Connection failed. Try again.');
    }
    setLoading(false);
  };

  // 3. Verify Master Setup Code
  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (setupCode !== userData.setupCode) {
      setError('Invalid Setup Code. Contact Master Admin.');
      return;
    }
    setError('');
    setStep('createPin'); // Move to let them create their own PIN
  };

  // 4. Create Local PIN and Lock Device
  const handleCreatePin = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    setLoading(true);
    try {
      // Save the new Device ID and their personal PIN to the database
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        authorizedDevice: deviceId,
        localPin: pin,
        setupCode: null // Destroy the Master Setup Code so it cannot be reused
      });
      
      // Log them into Firebase silently
      await signInAnonymously(auth);
      router.push('/');
    } catch (err) {
      setError('Failed to secure device.');
    }
    setLoading(false);
  };

  // 5. Enter Existing PIN
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
      router.push('/');
    } catch (err) {
      setError('Login failed.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-900">
            {step === 'phone' && <Smartphone size={32} />}
            {step === 'setup' && <Shield size={32} />}
            {(step === 'createPin' || step === 'enterPin') && <Lock size={32} />}
          </div>
          <h1 className="text-2xl font-black text-blue-950 text-center uppercase tracking-tight">
            Ketiejili Command
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Secure Access Gateway
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center mb-6 border border-red-100">
            {error}
          </div>
        )}

        {/* STEP 1: PHONE NUMBER */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Registered Mobile</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0241234567"
                className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-lg text-center"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {loading ? 'Scanning...' : 'Continue'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* STEP 2: MASTER SETUP CODE */}
        {step === 'setup' && (
          <form onSubmit={handleSetupSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-gray-600">New device detected.</p>
              <p className="text-xs text-gray-500 mt-1">Please enter the 6-digit authorization code provided by the Master Admin.</p>
            </div>
            <div>
              <input 
                type="text" 
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                placeholder="000000"
                maxLength="6"
                className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-black text-2xl text-center tracking-[0.5em]"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              Verify Device <CheckCircle2 size={18} />
            </button>
          </form>
        )}

        {/* STEP 3 & 4: PIN CREATION / ENTRY */}
        {(step === 'createPin' || step === 'enterPin') && (
          <form onSubmit={step === 'createPin' ? handleCreatePin : handleEnterPin} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-gray-600">
                {step === 'createPin' ? 'Create your permanent 4-digit PIN.' : 'Enter your 4-digit PIN to unlock.'}
              </p>
            </div>
            <div>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength="4"
                className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-black text-3xl text-center tracking-[0.5em]"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {loading ? 'Securing...' : 'Unlock Command Centre'} <Lock size={18} />
            </button>
          </form>
        )}

      </div>
    </div>
  );
}