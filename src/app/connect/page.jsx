"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { User, Phone, MapPin, Heart, Send, CheckCircle2, Calendar, Users, Loader2, ArrowLeft } from 'lucide-react';

export default function ConnectKiosk() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // --- DYNAMIC SETTINGS STATES ---
  const [districtName, setDistrictName] = useState('Ketiejili District');
  const [logoBase64, setLogoBase64] = useState('/logo.jpg');
  const [pastorContact, setPastorContact] = useState('+233 24 000 0000');
  
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

  useEffect(() => {
    // Fetch General Settings
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.districtName) setDistrictName(data.districtName);
        if (data.logoBase64) setLogoBase64(data.logoBase64);
        if (data.pastorContact) setPastorContact(data.pastorContact);
      }
    });

    // Fetch Assemblies
    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        const assemblyList = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(assemblyList);
        
        if (assemblyList.length > 0 && formData.localAssembly === 'Central') {
          setFormData(prev => ({ ...prev, localAssembly: assemblyList[0] }));
        }
      }
    });

    return () => {
      unsubSettings();
      unsubAssem();
    };
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

    if (formData.phone.length !== 10) {
      alert("Please ensure your phone number is exactly 10 digits.");
      setLoading(false);
      return;
    }

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
      setFormData({ 
        fullName: '', phone: '', localAssembly: assemblies[0] || 'Central', 
        gender: '', dob: '', connectionType: '', message: '' 
      });

    } catch (error) {
      alert("Submission failed. Please check your connection.");
    }
    setLoading(false);
  };

  // NAVY & GOLD SOLID INPUT STYLE
  const inputStyle = "w-full pl-12 pr-4 py-3.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFC300] transition-all placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white shadow-inner";
  const iconStyle = "text-[#FFC300]";

  // --- PASTORAL SUCCESS SCREEN ---
  if (success) {
    return (
      <div className="min-h-screen bg-[#000814] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-[#FFC300]/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="bg-[#001D3D]/80 backdrop-blur-2xl border border-[#003566] p-8 md:p-10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full max-w-md text-center relative z-10 animate-fade-in">
          <div className="w-24 h-24 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-full flex items-center justify-center mx-auto mb-6 text-[#FFC300] shadow-inner">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Connection Received!</h2>
          <p className="text-[#8ECAE6] font-bold text-xs uppercase tracking-widest leading-relaxed mb-8">
            Thank you for connecting with {districtName}. Your information has been securely transmitted.
          </p>

          <div className="bg-[#000814] p-5 rounded-2xl border border-[#003566] mb-8 shadow-inner">
            <p className="text-[10px] font-black text-[#FFC300] uppercase tracking-widest mb-3">Direct Pastoral Contact</p>
            <p className="text-xs font-bold text-white/70 leading-relaxed mb-4">
              If you need immediate prayers or wish to speak with the District Minister & His Wife, please call:
            </p>
            <div className="flex items-center justify-center gap-2 text-xl font-black text-[#FFC300] font-mono tracking-widest">
              <Phone size={18} /> {pastorContact}
            </div>
          </div>

          <button 
            onClick={() => router.push('/')}
            className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-lg"
          >
            Return to Gateway
          </button>
        </div>
      </div>
    );
  }

  // --- ENTRY SCREEN ---
  return (
    <div className="min-h-screen bg-[#000814] flex flex-col items-center pt-10 px-4 relative overflow-hidden selection:bg-[#FFC300] selection:text-[#000814]">
      
      {/* --- DECORATIVE GLOWING ORBS --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FFC300]/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER SECTION */}
      <div className="flex flex-col items-center mb-8 relative z-10 text-center animate-fade-in">
        <img 
          src={logoBase64} 
          alt="Church Logo" 
          className="w-24 h-24 rounded-full mb-4 border-2 border-[#FFC300]/50 shadow-[0_0_20px_rgba(255,195,0,0.2)] object-cover bg-[#001D3D]"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=001D3D&color=FFC300'; }}
        />
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">{districtName}</h1>
        <p className="text-[10px] font-bold text-[#FFC300] tracking-widest uppercase mt-2">Digital Connect Card</p>
      </div>

      {/* FORM CARD */}
      <div className="w-full max-w-lg bg-[#001D3D]/90 backdrop-blur-2xl border border-[#003566] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden mb-10 relative z-10 animate-fade-in p-6 md:p-10">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FFC300] to-[#FC8500]"></div>

        {/* ESCAPE HATCH */}
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8ECAE6] hover:text-[#FFC300] transition-colors mb-6 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Return to Gateway
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={16} className={iconStyle} />
            </div>
            <input 
              type="text" name="fullName" value={formData.fullName} onChange={handleChange} required
              placeholder="Your Full Name *"
              className={inputStyle}
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone size={16} className={iconStyle} />
            </div>
            <input 
              type="tel" name="phone" value={formData.phone} onChange={handleChange} required
              placeholder="Phone Number (e.g. 024XXXXXXX) *"
              className={`${inputStyle} tracking-widest`}
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MapPin size={16} className={iconStyle} />
            </div>
            <select 
              name="localAssembly" value={formData.localAssembly} onChange={handleChange} required
              className={inputStyle}
            >
              {assemblies.map((assemblyName, index) => (
                <option key={index} value={assemblyName}>
                  {assemblyName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users size={16} className={iconStyle} />
              </div>
              <select 
                name="gender" value={formData.gender} onChange={handleChange} required
                className={inputStyle}
              >
                <option value="" disabled>- Gender -</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar size={16} className={iconStyle} />
              </div>
              <input 
                type="date" name="dob" value={formData.dob} onChange={handleChange} required
                className={`${inputStyle} text-white/70`}
              />
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Heart size={16} className={iconStyle} />
            </div>
            <select 
              name="connectionType" value={formData.connectionType} onChange={handleChange} required
              className={inputStyle}
            >
              <option value="" disabled>- Why are you connecting today? -</option>
              <option value="I am a First-Time Visitor">I am a First-Time Visitor</option>
              <option value="I recently gave my life to Christ">I recently gave my life to Christ</option>
              <option value="I am a member updating my info">I am a member updating my info</option>
              <option value="I need Pastoral Prayer">I need Pastoral Prayer</option>
            </select>
          </div>

          <div className="pt-2 border-t border-[#003566]">
            <textarea 
              name="message" value={formData.message} onChange={handleChange} rows="3"
              placeholder="Any prayer requests or details to update? (Optional)"
              className={`${inputStyle} pl-4 resize-none leading-relaxed`}
            ></textarea>
          </div>

          <div className="pt-2">
            <button 
              type="submit" disabled={loading} 
              className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Transmitting...</> : <><Send size={16} /> Submit Connection</>} 
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}