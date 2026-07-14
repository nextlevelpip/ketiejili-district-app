"use client";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from './firebase'; 
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Flame, UserCheck, Loader2, CheckCircle2, AlertCircle, Sparkles, Phone, MapPin, Heart, Globe, Users, X, User, Shield, ArrowLeft } from 'lucide-react';

export default function PublicGateway() {
  const router = useRouter();
 
  // --- SUPABASE ENGINE CONNECTION ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
  const supabase = createClient(supabaseUrl, supabaseKey);  
 
  // --- SYSTEM STATES ---
  const [activeForm, setActiveForm] = useState(null); // 'soul' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [successPopup, setSuccessPopup] = useState(false);
  const [assemblies, setAssemblies] = useState([]);
  
  // --- DYNAMIC SETTINGS STATES ---
  const [areaName, setAreaName] = useState('The Area'); 
  const [districtName, setDistrictName] = useState('Ketiejili District');
  const [districtSlogan, setDistrictSlogan] = useState('Possessing the Nations, Transforming our World.');
  const [pastorContact, setPastorContact] = useState('+233 24 000 0000');
  const [logoBase64, setLogoBase64] = useState('/logo.jpg');

  // --- ALTARCONNECT SOUL FORM STATE ---
  const [soulData, setSoulData] = useState({
    counselorName: '', fullName: '', phone: '', gender: '', language: '', category: 'General Prayer', customPrayer: ''
  });
  const availableLanguages = ["English", "Twi", "Konkomba", "Ga", "Ewe"];

  useEffect(() => {
    // Fetch General Settings
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.areaName) setAreaName(data.areaName); 
        if (data.districtName) setDistrictName(data.districtName);
        if (data.districtSlogan) setDistrictSlogan(data.districtSlogan);
        if (data.pastorContact) setPastorContact(data.pastorContact);
        if (data.logoBase64) setLogoBase64(data.logoBase64);
      }
    });

    // Fetch Assemblies for Count and Dropdowns
    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetched);
      }
    });

    return () => { unsubSettings(); unsubAssem(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const handlePhoneFormat = (phoneVal) => {
    let val = phoneVal.replace(/\D/g, ''); 
    if (val.length > 0 && val[0] !== '0') val = '0' + val;
    return val.slice(0, 10);
  };

  // --- SUBMIT ALTARCONNECT SOUL (SUPABASE LINKED) ---
  const handleSoulSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Strict Phone Validation
    const cleanPhone = soulData.phone;
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      showNotification('error', 'Phone number must be exactly 10 digits starting with 0.');
      setIsSubmitting(false);
      return;
    }
    
    const finalSpiritualNeed = soulData.category === "Other" ? soulData.customPrayer : soulData.category;

    try {
      // Secure transmission directly to the Supabase Engine
      const { error } = await supabase.from('souls').insert([{
        counselor_name: soulData.counselorName || "Digital Gateway",
        full_name: soulData.fullName,
        phone_number: cleanPhone,
        gender: soulData.gender,
        language: soulData.language || "English",
        spiritual_need: finalSpiritualNeed,
        current_day: 1,
        follow_up_status: "active"
      }]);

      if (error) throw error;
      
      setSoulData({ counselorName: '', fullName: '', phone: '', gender: '', language: '', category: 'General Prayer', customPrayer: '' });
      setActiveForm(null);
      setSuccessPopup(true); 
    } catch (err) {
      console.error("Submission Error: ", err);
      showNotification('error', 'Submission failure. Check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "w-full pl-12 pr-4 py-3.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFC300] transition-all placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white shadow-inner";
  const labelStyle = "text-[9px] font-black text-[#FFC300] uppercase ml-1 mb-2 block tracking-widest";
  const iconStyle = "absolute left-4 top-3.5 h-4 w-4 text-[#FFC300]";

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col relative overflow-hidden text-white selection:bg-[#FFC300] selection:text-[#000814]">
      
      {/* SCROLLING PASTORAL CONTACT MARQUEE */}
      <div className="bg-[#FFC300] text-[#000814] py-1.5 overflow-hidden shadow-md z-50 relative shrink-0">
        <div className="whitespace-nowrap animate-marquee flex items-center gap-12 text-[10px] font-black uppercase tracking-widest">
          <span><Phone size={10} className="inline mr-1 -mt-0.5"/> For Prayers & Counseling, Contact the District Minister: {pastorContact}</span>
          <span><Sparkles size={10} className="inline mr-1 -mt-0.5"/> God richly bless you for visiting the District Portal</span>
          <span><Phone size={10} className="inline mr-1 -mt-0.5"/> For Prayers & Counseling, Contact the District Minister: {pastorContact}</span>
          <span><Sparkles size={10} className="inline mr-1 -mt-0.5"/> God richly bless you for visiting the District Portal</span>
        </div>
      </div>

      {/* TOP NAVBAR WITH LOGIN CORNER */}
      <header className="px-6 py-4 flex justify-between items-center relative z-40 bg-[#000814]/80 backdrop-blur-md border-b border-[#003566]">
          {/* SECURE APP BRANDING */}
          <div className="flex items-center gap-2 mb-1">
            <img 
              src="/altarconnect-logo.png" 
              alt="AltarConnect Engine" 
              className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(255,195,0,0.2)]"
            />
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">AltarConnect</h2>
              <p className="text-[8px] font-bold text-[#FFC300] uppercase tracking-widest mt-0.5">Kingdom Portal</p>
            </div>
          </div>
        <button 
          onClick={() => router.push('/login')} 
          className="flex items-center gap-2 bg-[#001D3D] hover:bg-[#003566] border border-[#003566] hover:border-[#FFC300]/50 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg group"
        >
          <Shield size={12} className="text-[#FFC300] group-hover:scale-110 transition-transform" /> Sign In
        </button>
      </header>

      {/* Ambient Backdrops */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#FFC300]/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* GLOBAL NOTIFICATIONS (Escaped Z-Index) */}
      {notification.message && (
        <div className={`fixed top-28 right-10 z-[99999] px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${
          notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 
          notification.type === 'info' ? 'bg-[#8ECAE6] text-[#000814]' : 
          'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          {notification.message}
        </div>
      )}

      {/* PASTORAL SUCCESS MODAL */}
      {successPopup && (
        <div className="fixed inset-0 bg-[#000814]/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-[#001D3D] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-[#003566] text-center p-8">
            <div className="w-20 h-20 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-full flex items-center justify-center mx-auto mb-6 text-[#FFC300] shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Soul Registered!</h2>
            <p className="text-xs font-bold text-[#8ECAE6] leading-relaxed mb-8">
              Heaven rejoices! The soul has been securely added to the AltarConnect Engine for automated discipleship.
            </p>
            
            <div className="bg-[#000814] p-5 rounded-2xl border border-[#003566] mb-8 shadow-inner">
              <p className="text-[10px] font-black text-[#FFC300] uppercase tracking-widest mb-3">Direct Pastoral Contact</p>
              <p className="text-xs font-bold text-white/70 leading-relaxed mb-4">
                For immediate pastoral counseling or to speak directly with the District Minister & His Wife, please contact:
              </p>
              <div className="flex items-center justify-center gap-2 text-xl font-black text-[#FFC300] font-mono tracking-widest">
                <Phone size={18} /> {pastorContact}
              </div>
            </div>

            <button 
              onClick={() => setSuccessPopup(false)}
              className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-lg"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 w-full">
        
        <div className="w-full max-w-4xl space-y-12 text-center pb-12">
          
          <div className="space-y-3 max-w-2xl mx-auto pt-4">
            
            {/* DYNAMIC DISTRICT LOGO CENTERED HERE */}
            <img 
              src={logoBase64} 
              alt="District Official Seal" 
              className="w-24 h-24 md:w-28 md:h-28 rounded-full mx-auto border-[3px] border-[#FFC300]/50 shadow-[0_0_30px_rgba(255,195,0,0.3)] object-cover bg-[#001D3D] mb-8"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=001D3D&color=FFC300'; }}
            />
            
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg">
              Welcome to </h1>

            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg">
              <span className="text-[#FFC300]">{districtName}</span>
            </h1>
            <h2 className="text-sm md:text-lg font-black uppercase tracking-widest text-[#8ECAE6]">
              Under {areaName}
            </h2>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-[#001D3D]/50 border border-[#003566] rounded-full text-[10px] font-bold text-white/70 tracking-widest uppercase">
              <MapPin size={12} className="text-[#FFC300]" /> A Ministry of The Church of Pentecost with {assemblies.length > 0 ? assemblies.length : 'Multiple'} Locals
            </div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest leading-relaxed max-w-xl mx-auto mt-4 border-t border-[#003566] pt-4">
              {districtSlogan} Choose an operation below to interact with the central database.
            </p>
          </div>

          {/* GATEWAY OPTIONS */}
          {activeForm === null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto animate-fade-in">
              
              <div onClick={() => setActiveForm('soul')} className="bg-[#001D3D]/80 backdrop-blur-xl border border-[#003566] rounded-3xl p-8 text-center cursor-pointer hover:border-[#FFC300]/50 hover:bg-[#001D3D] transition-all group shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                <div className="w-16 h-16 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-2xl flex items-center justify-center text-[#FFC300] mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                  <Flame size={30} className="fill-current" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-3">Register a Soul</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">Log new converts into the AltarConnect Engine to trigger automated daily discipleship follow-ups.</p>
              </div>

              {/* ROUTED DIRECTLY TO /connect */}
              <div onClick={() => router.push('/connect')} className="bg-[#001D3D]/80 backdrop-blur-xl border border-[#003566] rounded-3xl p-8 text-center cursor-pointer hover:border-[#FFC300]/50 hover:bg-[#001D3D] transition-all group shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                <div className="w-16 h-16 bg-[#8ECAE6]/10 border border-[#8ECAE6]/30 rounded-2xl flex items-center justify-center text-[#8ECAE6] mx-auto mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner">
                  <UserCheck size={30} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-3">Update Member Info</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">Submit changes or connect with us. Held securely in the Command Queue for Secretary approval.</p>
              </div>

            </div>
          )}

          {/* FORM 1: ALTARCONNECT SOUL REGISTRATION */}
          {activeForm === 'soul' && (
            <div className="bg-[#001D3D]/90 backdrop-blur-2xl border border-[#003566] p-8 md:p-10 rounded-[2rem] max-w-2xl mx-auto text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FFC300] to-[#FC8500]"></div>
              
              {/* ESCAPE HATCH */}
              <button 
                onClick={() => setActiveForm(null)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8ECAE6] hover:text-[#FFC300] transition-colors mb-6 group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Return to Options
              </button>

              <div className="flex justify-between items-center mb-8 border-b border-[#003566] pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#FFC300] flex items-center gap-2"><Flame size={18}/> AltarConnect Engine</h3>
                  <p className="text-[9px] font-bold text-[#8ECAE6]/60 mt-1 uppercase tracking-widest">Register soul for automated discipleship</p>
                </div>
              </div>

              <form onSubmit={handleSoulSubmit} className="space-y-5">
                <div className="relative">
                  <label className={labelStyle}>Soul Winner's Name</label>
                  <UserCheck className={iconStyle} />
                  <input required type="text" placeholder="Who is registering this soul?" value={soulData.counselorName} onChange={e => setSoulData({...soulData, counselorName: e.target.value})} className={inputStyle} />
                </div>
                
                <div className="relative">
                  <label className={labelStyle}>Soul's Full Name</label>
                  <User className={iconStyle} />
                  <input required type="text" placeholder="Enter soul's name" value={soulData.fullName} onChange={e => setSoulData({...soulData, fullName: e.target.value})} className={inputStyle} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="relative">
                    <label className={labelStyle}>Phone Number</label>
                    <Phone className={iconStyle} />
                    <input required type="tel" placeholder="024XXXXXXX" value={soulData.phone} onChange={e => setSoulData({...soulData, phone: handlePhoneFormat(e.target.value)})} className={`${inputStyle} tracking-widest`} />
                  </div>
                  <div className="relative">
                    <label className={labelStyle}>Gender</label>
                    <Users className={iconStyle} />
                    <select required value={soulData.gender} onChange={e => setSoulData({...soulData, gender: e.target.value})} className={inputStyle}>
                      <option value="" disabled>- Select Gender -</option>
                      <option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="relative">
                    <label className={labelStyle}>Preferred Language</label>
                    <Globe className={iconStyle} />
                    <select required value={soulData.language} onChange={e => setSoulData({...soulData, language: e.target.value})} className={inputStyle}>
                      <option value="" disabled>- Language -</option>
                      {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <label className={labelStyle}>Spiritual Need</label>
                    <Heart className={iconStyle} />
                    <select required value={soulData.category} onChange={e => setSoulData({...soulData, category: e.target.value})} className={inputStyle}>
                      <option value="General Prayer">General Prayer</option>
                      <option value="First Time Salvation">First Time Salvation</option>
                      <option value="Deliverance">Deliverance</option>
                      <option value="Financial Breakthrough">Financial Breakthrough</option>
                      <option value="Healing">Physical Healing</option>
                      <option value="Other" className="text-[#FFC300]">Other (Type Specific)</option>
                    </select>
                  </div>
                </div>

                {soulData.category === 'Other' && (
                  <div className="relative animate-fade-in pt-2">
                    <input required type="text" placeholder="Specify spiritual need..." value={soulData.customPrayer} onChange={e => setSoulData({...soulData, customPrayer: e.target.value})} className={`${inputStyle} pl-4 border-[#FFC300]/50`} />
                  </div>
                )}

                <div className="pt-4 border-t border-[#003566] mt-6">
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#FFC300] text-[#000814] text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#FFD60A] transition-all flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : 'Register Soul & Deploy Automation'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>
      
      {/* Footer CSS animation for marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
      `}} />
    </div>
  );
}