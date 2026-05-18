"use client";
import { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { User, Phone, MapPin, Heart, Send, CheckCircle2, Calendar, Users } from 'lucide-react';

export default function ConnectKiosk() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // --- DYNAMIC ASSEMBLIES STATE ---
  const [assemblies, setAssemblies] = useState(['Central']); 

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    localAssembly: 'Central', 
    gender: '',
    dob: '',
    connectionType: '',
    message: ''
  });

  // --- FETCH ASSEMBLIES FROM FIREBASE ---
  useEffect(() => {
    const q = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const assemblyList = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(assemblyList);
        
        if (assemblyList.length > 0 && formData.localAssembly === 'Central') {
          setFormData(prev => ({ ...prev, localAssembly: assemblyList[0] }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === 'phone') {
      let onlyNums = e.target.value.replace(/[^0-9]/g, '');
      if (onlyNums.length > 0 && onlyNums[0] !== '0') {
        onlyNums = '0' + onlyNums;
      }
      onlyNums = onlyNums.substring(0, 10);
      setFormData({ ...formData, phone: onlyNums });
      return;
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'pending_connections'), {
        name: formData.fullName, 
        phone: formData.phone,
        localAssembly: formData.localAssembly,
        gender: formData.gender,
        dateOfBirth: formData.dob,
        connectionType: formData.connectionType,
        message: formData.message,
        timestamp: serverTimestamp(),
        status: 'Pending'
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({ 
          fullName: '', phone: '', localAssembly: assemblies[0] || 'Central', 
          gender: '', dob: '', connectionType: '', message: '' 
        });
      }, 4000);

    } catch (error) {
      alert("Submission failed. Please check your connection.");
    }
    setLoading(false);
  };

  const glassInputStyle = "w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-400/50 focus:border-white/30 focus:bg-white/10 outline-none font-medium text-white transition-all placeholder:text-white/40 backdrop-blur-sm shadow-inner";
  const iconStyle = "text-white/50";
  const selectOptionStyle = "text-slate-900 bg-white font-medium";

  // --- SUCCESS SCREEN (GLASSMORPHISM) ---
  if (success) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing Orbs */}
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-emerald-600/30 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] w-full max-w-md text-center relative z-10">
          <div className="w-24 h-24 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-lg">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Connection Received!</h2>
          <p className="text-white/70 font-medium">Thank you for connecting with Ketiejili District. God richly bless you.</p>
        </div>
      </div>
    );
  }

  // --- CLASSIC ENTRY SCREEN (GLASSMORPHISM) ---
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center pt-10 px-4 relative overflow-hidden">
      
      {/* --- DECORATIVE GLOWING ORBS FOR BACKDROP BLUR CONTRAST --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[60%] w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none"></div>

      {/* HEADER SECTION */}
      <div className="flex flex-col items-center mb-8 relative z-10">
        <img 
          src="/logo.jpg" 
          alt="Church of Pentecost" 
          className="w-24 h-24 rounded-full mb-4 border-2 border-white/20 shadow-2xl object-cover p-1 bg-white/5 backdrop-blur-sm"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=fff&color=1e2749'; }}
        />
        <h1 className="text-3xl font-black text-white tracking-widest uppercase text-shadow-sm drop-shadow-md">Ketiejili District</h1>
        <p className="text-sm font-bold text-blue-300 tracking-widest uppercase mt-1">Digital Connect Card</p>
      </div>

      {/* GLASSMORPHISM FORM CARD */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden mb-10 relative z-10">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500"></div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className={iconStyle} />
            </div>
            <input 
              type="text" name="fullName" value={formData.fullName} onChange={handleChange} required
              placeholder="Your Full Name"
              className={glassInputStyle}
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone size={18} className={iconStyle} />
            </div>
            <input 
              type="tel" name="phone" value={formData.phone} onChange={handleChange} required
              pattern="^0[0-9]{9}$" maxLength="10" title="Phone number must be exactly 10 digits and start with 0"
              placeholder="Phone Number (e.g. 024...)"
              className={`${glassInputStyle} tracking-widest`}
            />
          </div>

          {/* DYNAMIC LOCAL ASSEMBLY DROPDOWN */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MapPin size={18} className={iconStyle} />
            </div>
            <select 
              name="localAssembly" value={formData.localAssembly} onChange={handleChange} required
              className={`${glassInputStyle} appearance-none [&>option]:text-slate-900`}
            >
              {assemblies.map((assemblyName, index) => (
                <option key={index} value={assemblyName} className={selectOptionStyle}>
                  {assemblyName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users size={16} className={iconStyle} />
              </div>
              <select 
                name="gender" value={formData.gender} onChange={handleChange} required
                className={`${glassInputStyle} pl-10 pr-2 appearance-none text-sm [&>option]:text-slate-900`}
              >
                <option value="" disabled className={selectOptionStyle}>Gender</option>
                <option value="Male" className={selectOptionStyle}>Male</option>
                <option value="Female" className={selectOptionStyle}>Female</option>
              </select>
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className={iconStyle} />
              </div>
              <input 
                type="date" name="dob" value={formData.dob} onChange={handleChange} required
                className={`${glassInputStyle} pl-10 pr-2 text-sm [color-scheme:dark]`}
              />
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Heart size={18} className={iconStyle} />
            </div>
            <select 
              name="connectionType" value={formData.connectionType} onChange={handleChange} required
              className={`${glassInputStyle} appearance-none [&>option]:text-slate-900`}
            >
              <option value="" disabled className={selectOptionStyle}>- Why are you connecting today? -</option>
              <option value="I am a First-Time Visitor" className={selectOptionStyle}>I am a First-Time Visitor</option>
              <option value="I recently gave my life to Christ" className={selectOptionStyle}>I recently gave my life to Christ</option>
              <option value="I am a member updating my info" className={selectOptionStyle}>I am a member updating my info</option>
              <option value="I need Pastoral Prayer" className={selectOptionStyle}>I need Pastoral Prayer</option>
            </select>
          </div>

          <div className="pt-1">
            <textarea 
              name="message" value={formData.message} onChange={handleChange} rows="3"
              placeholder="Any prayer requests or messages for the Pastor? (Optional)"
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-400/50 focus:border-white/30 focus:bg-white/10 outline-none font-medium text-sm text-white transition-all resize-none placeholder:text-white/40 backdrop-blur-sm shadow-inner"
            ></textarea>
          </div>

          <div className="pt-4">
            <button 
              type="submit" disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border border-white/20 text-white font-black tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)] disabled:opacity-50 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
            >
              {loading ? 'TRANSMITTING...' : 'SUBMIT CONNECTION'} 
              {!loading && <Send size={18} />}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}