"use client";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from './firebase'; 
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { 
  Flame, UserCheck, Loader2, CheckCircle2, AlertCircle, Sparkles, 
  Phone, MapPin, Heart, Globe, Users, User, Shield, 
  ArrowLeft, Calendar, BookOpen, Clock, ChevronRight
} from 'lucide-react';

export default function PublicGateway() {
  const router = useRouter();
 
  // --- SUPABASE ENGINE CONNECTION ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
  const supabase = createClient(supabaseUrl, supabaseKey);  
 
  // --- SYSTEM STATES ---
  const [activeForm, setActiveForm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [successPopup, setSuccessPopup] = useState(false);
  const [assemblies, setAssemblies] = useState([]);
  
  // --- DYNAMIC SETTINGS & ACTIVITIES STATES ---
  const [areaName, setAreaName] = useState('Kete-Krachi Area'); 
  const [districtName, setDistrictName] = useState('Ketiejili District');
  const [districtSlogan, setDistrictSlogan] = useState('Possessing the Nations: Transforming our World.');
  const [pastorContact, setPastorContact] = useState('+233 54 143 7815 / +233 20 409 2129');
  const [logoBase64, setLogoBase64] = useState('/logo.jpg');
  const [schedules, setSchedules] = useState([]);

  // --- ALTARCONNECT SOUL FORM STATE ---
  const [soulData, setSoulData] = useState({
    counselorName: '', fullName: '', phone: '', gender: '', language: '', category: 'General Prayer', customPrayer: ''
  });
  const availableLanguages = ["English", "Twi", "Konkomba", "Ga", "Ewe"];

  // --- OFFICIAL 8 THEMATIC TOPICS ---
  const thematicTopics = [
    { num: "01", title: "Spiritual Living in a Secular World", desc: "Lessons from the Exploits of Daniel in a Pagan World." },
    { num: "02", title: "My Job, My Kingdom Assignment", desc: "Authenticating Conversion into Credible Testimony in the Public Sphere." },
    { num: "03", title: "Raising Spirit-Filled Disciples", desc: "The Role of The Local Church in the Unleashing Agenda." },
    { num: "04", title: "Baptism & Infilling of the Holy Spirit", desc: "Divine Sources of Strength and Empowerment." },
    { num: "05", title: "Living in Anticipation of Christ", desc: "The Second Coming as Motivation for the Agenda." },
    { num: "06", title: "Sharing the Love of Christ", desc: "Members Serving Beyond the Church Walls." },
    { num: "07", title: "The Godly Home", desc: "Raising God-Fearing Families to Strengthen the Church." },
    { num: "08", title: "Prayer and Fasting", desc: "Engaging Divine Power for National Transformation." }
  ];

  const pillarsLeft = thematicTopics.slice(0, 4);
  const pillarsRight = thematicTopics.slice(4, 8);

  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'system_settings', 'general'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.areaName) setAreaName(data.areaName); 
          if (data.districtName) setDistrictName(data.districtName);
          if (data.districtSlogan) setDistrictSlogan(data.districtSlogan);
          if (data.pastorContact) setPastorContact(data.pastorContact);
          if (data.logoBase64) setLogoBase64(data.logoBase64);
        }
      },
      (error) => console.log("Settings snapshot notice:", error.message)
    );

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(
      qAssem, 
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(doc => doc.data().name);
          setAssemblies(fetched);
        }
      },
      (error) => console.log("Assemblies snapshot notice:", error.message)
    );

    const defaultSchedules = [
      { id: '1', day: 'Sundays', time: '8:00 AM - 10:30 AM', event: 'Divine Encounter Worship Service', tag: 'Featured Today' },
      { id: '2', day: 'Tuesdays', time: '6:30 PM - 8:00 PM', event: 'District Bible Study & Discipleship', tag: 'Midweek' },
      { id: '3', day: 'Fridays', time: '7:00 PM - 9:00 PM', event: 'Atmosphere of Miracle Prayer Service', tag: 'Prayer' },
      { id: '4', day: 'Saturdays', time: '4:00 PM - 6:00 PM', event: 'Evangelistic Outreach & Follow-up', tag: 'Outreach' }
    ];

    const qSchedules = query(collection(db, 'scheduled_activities'), orderBy('order', 'asc'));
    const unsubSchedules = onSnapshot(
      qSchedules, 
      (snapshot) => {
        if (!snapshot.empty) {
          setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setSchedules(defaultSchedules);
        }
      },
      (error) => {
        console.log("Schedules snapshot fallback:", error.message);
        setSchedules(defaultSchedules);
      }
    );

    return () => { unsubSettings(); unsubAssem(); unsubSchedules(); };
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

  const handleSoulSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const cleanPhone = soulData.phone;
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      showNotification('error', 'Phone number must be exactly 10 digits starting with 0.');
      setIsSubmitting(false);
      return;
    }
    
    const finalSpiritualNeed = soulData.category === "Other" ? soulData.customPrayer : soulData.category;

    try {
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

  const inputStyle = "w-full pl-11 pr-4 py-3 bg-[#001D3D]/80 border border-white/10 rounded-xl font-medium text-xs text-white outline-none focus:border-[#FFC300] transition-all placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white";
  const labelStyle = "text-[10px] font-bold text-[#FFC300] uppercase ml-1 mb-1.5 block tracking-wider";
  const iconStyle = "absolute left-3.5 top-3.5 h-4 w-4 text-[#FFC300]";

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col relative overflow-x-hidden text-white font-sans">
      
      {/* EXECUTIVE PASTORAL MARQUEE */}
      <div className="bg-[#FFC300] text-[#000814] py-1.5 overflow-hidden shadow-md z-50 shrink-0">
        <div className="whitespace-nowrap animate-marquee flex items-center gap-12 text-[10px] font-black uppercase tracking-widest">
          <span><Phone size={11} className="inline mr-1.5 -mt-0.5"/> For Prayers & Counseling, Contact the District Minister: {pastorContact}</span>
          <span><Sparkles size={11} className="inline mr-1.5 -mt-0.5"/> God richly bless you for visiting the District Portal</span>
          <span><Phone size={11} className="inline mr-1.5 -mt-0.5"/> For Prayers & Counseling, Contact the District Minister: {pastorContact}</span>
          <span><Sparkles size={11} className="inline mr-1.5 -mt-0.5"/> God richly bless you for visiting the District Portal</span>
        </div>
      </div>

      {/* REFINED NAVIGATION BAR */}
      <header className="px-8 py-4 flex flex-wrap justify-between items-center z-40 bg-[#000814]/90 backdrop-blur-md border-b border-white/10 gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/altarconnect-logo.png" 
            alt="AltarConnect Engine" 
            className="w-8 h-8 object-contain"
            onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=COP&background=001D3D&color=FFC300'; }}
          />
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-widest">AltarConnect</h2>
            <p className="text-[9px] font-bold text-[#FFC300] uppercase tracking-widest mt-0.5">Kingdom Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => setActiveForm('soul')}
            className="flex items-center gap-2 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:scale-105"
          >
            <Flame size={14} className="fill-current" /> Register a Soul
          </button>

          <button 
            onClick={() => router.push('/connect')} 
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <UserCheck size={14} className="text-[#8ECAE6]" /> Update Member Info
          </button>

          <button 
            onClick={() => router.push('/login')} 
            className="flex items-center gap-2 bg-[#001D3D] hover:bg-[#002855] border border-[#FFC300]/40 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
          >
            <Shield size={13} className="text-[#FFC300]" /> Sign In
          </button>
        </div>
      </header>

      {/* GLOBAL NOTIFICATIONS */}
      {notification.message && (
        <div className={`fixed top-24 right-6 z-[99999] px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${
          notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 
          notification.type === 'info' ? 'bg-[#8ECAE6] text-[#000814]' : 
          'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          {notification.message}
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-[#001D3D] rounded-[2rem] shadow-2xl w-full max-w-md border border-white/10 text-center p-8">
            <div className="w-16 h-16 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-full flex items-center justify-center mx-auto mb-5 text-[#FFC300]">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2">Soul Registered</h2>
            <p className="text-xs font-medium text-white/80 leading-relaxed mb-6">
              The soul has been securely logged into the AltarConnect Engine for discipleship follow-up.
            </p>
            <div className="bg-[#000814] p-4 rounded-xl border border-white/10 mb-6">
              <p className="text-[10px] font-bold text-[#FFC300] uppercase tracking-widest mb-2">Pastoral Office Contact</p>
              <div className="flex items-center justify-center gap-2 text-base font-black text-white font-mono">
                <Phone size={16} className="text-[#FFC300]" /> {pastorContact}
              </div>
            </div>
            <button 
              onClick={() => setSuccessPopup(false)}
              className="w-full bg-[#FFC300] text-[#000814] font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* SOUL REGISTRATION MODAL */}
      {activeForm === 'soul' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[90] animate-fade-in overflow-y-auto">
          <div className="bg-[#001D3D] border border-white/10 p-8 rounded-2xl max-w-xl w-full text-left shadow-2xl relative my-auto">
            <button 
              onClick={() => setActiveForm(null)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8ECAE6] hover:text-[#FFC300] transition-colors mb-6"
            >
              <ArrowLeft size={14} /> Close Registration
            </button>

            <div className="mb-6 border-b border-white/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#FFC300] flex items-center gap-2"><Flame size={18}/> AltarConnect Engine</h3>
              <p className="text-[10px] font-medium text-white/60 mt-1">Register new convert for automated discipleship</p>
            </div>

            <form onSubmit={handleSoulSubmit} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className={labelStyle}>Phone Number</label>
                  <Phone className={iconStyle} />
                  <input required type="tel" placeholder="024XXXXXXX" value={soulData.phone} onChange={e => setSoulData({...soulData, phone: handlePhoneFormat(e.target.value)})} className={inputStyle} />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <option value="Other">Other (Type Specific)</option>
                  </select>
                </div>
              </div>

              {soulData.category === 'Other' && (
                <div className="relative pt-1">
                  <input required type="text" placeholder="Specify spiritual need..." value={soulData.customPrayer} onChange={e => setSoulData({...soulData, customPrayer: e.target.value})} className={inputStyle} />
                </div>
              )}

              <div className="pt-3 border-t border-white/10 mt-4">
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-[#FFC300] text-[#000814] text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#FFD60A] transition-all flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : 'Register Soul & Deploy Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ZONE 1: UNIFIED, EDGE-TO-EDGE SUPREME COMMAND HEADER */}
      <section className="w-full bg-gradient-to-r from-[#001D3D] via-[#002855] to-[#001D3D] border-b border-white/10 p-6 md:p-10 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#FFC300]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* LEFT: ENGLISH 2026 THEME (4 SPANS) */}
          <div className="lg:col-span-4 space-y-3 text-left">
            <span className="inline-block px-2.5 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow">
              2026 THEME
            </span>
            <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-white leading-snug">
              The Church Unleashed to Transform Society through the Gospel and the Power of the Holy Spirit
            </h2>
            <p className="text-xs font-bold text-[#FFC300] font-mono">
              Acts 8:4-8, Acts 13:1-3, Colossians 1:4-6
            </p>
            <p className="text-xs font-medium text-white/70 italic border-l-2 border-[#8ECAE6] pl-3">
              "Possessing the Nations: I am an Agent of Transformation. Possessing the Nations: Transforming my World."
            </p>
          </div>

          {/* CENTER: DISTRICT WELCOME & OFFICIAL SEAL (4 SPANS) */}
          <div className="lg:col-span-4 text-center space-y-3 lg:border-x border-white/10 px-4 py-2">
            <img 
              src={logoBase64} 
              alt="District Official Seal" 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full mx-auto border-2 border-[#FFC300] shadow-[0_0_25px_rgba(255,195,0,0.3)] object-cover bg-[#001D3D]"
              onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=COP&background=001D3D&color=FFC300'; }}
            />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white">
              Welcome to <span className="text-[#FFC300]">{districtName}</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8ECAE6]">
              Under {areaName}
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-black/40 border border-white/10 rounded-full text-[10px] font-medium text-white/70 uppercase">
              <MapPin size={11} className="text-[#FFC300]" /> A Ministry of The Church of Pentecost with {assemblies.length > 0 ? assemblies.length : '11'} Locals
            </div>
            <p className="text-xs font-semibold text-white/60 max-w-sm mx-auto pt-1">
              {districtSlogan}
            </p>
          </div>

          {/* RIGHT: TWI 2026 THEME (4 SPANS) */}
          <div className="lg:col-span-4 space-y-3 text-left lg:text-right">
            <span className="inline-block px-2.5 py-1 bg-[#FFC300] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded shadow lg:ml-auto">
              AFE 2026 BOTAEƐ
            </span>
            <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-white leading-snug">
              Asafo a Apue Namyɛ so de Asɛmpa no ne Honhom Kronkron tumi ahoɔden resakra wiase
            </h2>
            <p className="text-xs font-bold text-[#FFC300] font-mono">
              Asomafoɔ 8:4-8, Asomafoɔ 13:1-3, Kolosefoɔ 1:4-6
            </p>
            <p className="text-xs font-medium text-white/70 italic lg:border-r-2 lg:border-l-0 border-l-2 border-[#8ECAE6] lg:pr-3 pl-3 lg:pl-0">
              "Yɛrefa Aman: Meyɛ Nsakyeraeɛ Bɔfoɔ. Yɛrefa Aman: Meresakyera Me Wiase."
            </p>
          </div>

        </div>
      </section>

      {/* LOWER SECTION: SYMMETRICAL 3-COLUMN DASHBOARD GRID */}
      <main className="w-full flex-1 flex flex-col p-6 lg:p-10 max-w-[1600px] mx-auto gap-8">
        
        {/* ROW 1: THEMATIC PILLARS ON SIDES & CENTER SCHEDULE OF THE DAY */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: THEMATIC PILLARS 01 - 04 (4 SPANS) */}
          <div className="lg:col-span-4 bg-[#001D3D]/30 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-[#8ECAE6] uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-3">
              <BookOpen size={15} /> Thematic Pillars (01 - 04)
            </h3>
            <div className="space-y-3">
              {pillarsLeft.map((pillar) => (
                <div key={pillar.num} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-start gap-3 hover:border-white/15 transition-all">
                  <span className="text-xs font-black text-[#FFC300] bg-[#001D3D] px-2 py-0.5 rounded">
                    {pillar.num}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{pillar.title}</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed mt-1">{pillar.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: SCHEDULE OF THE DAY COMMAND CONSOLE (4 SPANS) */}
          <div className="lg:col-span-4 bg-gradient-to-b from-[#1B5E20]/40 to-[#266210]/10 border border-[#FFC300]/30 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-[#FFC300] flex items-center gap-2">
                <Clock size={24} /> Schedule of the Day
              </span>
              <span className="text-[9px] font-black bg-[#FFC300]/10 text-[#FFC300] px-2 py-0.5 rounded uppercase">
                Today's Focus
              </span>
            </div>

            <div className="bg-[#1B4EF5]/90 border border-white/10 rounded-xl p-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8ECAE6]">
                Sunday Worship Encounter
              </p>
              <h3 className="text-base font-bold text-white">
                Divine Encounter Worship Service
              </h3>
              <p className="text-xs text-white/70 font-mono">
                8:00 AM - 10:30 AM across all local assemblies
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-white/50">Next Midweek Service:</span>
                <span className="text-white font-semibold">Tuesday @ 6:30 PM</span>
              </div>
            </div>

            <p className="text-xs text-center text-white/60 italic font-medium">
              "{districtSlogan}"
            </p>
          </div>

          {/* RIGHT: THEMATIC PILLARS 05 - 08 (4 SPANS) */}
          <div className="lg:col-span-4 bg-[#001D3D]/30 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-[#8ECAE6] uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-3">
              <BookOpen size={15} /> Thematic Pillars (05 - 08)
            </h3>
            <div className="space-y-3">
              {pillarsRight.map((pillar) => (
                <div key={pillar.num} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-start gap-3 hover:border-white/15 transition-all">
                  <span className="text-xs font-black text-[#FFC300] bg-[#001D3D] px-2 py-0.5 rounded">
                    {pillar.num}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{pillar.title}</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed mt-1">{pillar.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* ROW 2: EVANGELISM, COMPLETE WEEKLY DIRECTORY & PASTORAL DESK */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: EVANGELISTIC INVITATION (4 SPANS) */}
          <div className="lg:col-span-4 bg-[#001D3D]/20 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-[#FFC300] font-bold text-xs uppercase tracking-widest border-b border-white/10 pb-3">
              <Flame size={16} /> Evangelistic Invitation
            </div>
            
            <h3 className="text-sm font-bold text-white">
              Jesus Christ is Calling You Today
            </h3>
            
            <p className="text-xs text-white/70 leading-relaxed">
              Jesus Christ is the same yesterday, today, and forever. No matter your past, His blood has the power to wash you clean and transform your destiny. Come to Him as you are.
            </p>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
              <h4 className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest flex items-center gap-1">
                <Heart size={12} /> The Sinner's Prayer
              </h4>
              <p className="text-xs text-white/80 italic leading-relaxed border-l-2 border-[#FFC300] pl-3">
                "Lord Jesus, I confess that I am a sinner. I believe You died for me and rose again. Wash me with Your precious blood. I accept You today as my Lord and personal Savior. Amen."
              </p>
            </div>

            <button 
              onClick={() => setActiveForm('soul')}
              className="w-full py-3.5 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black text-xs uppercase tracking-widest rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <Flame size={14} className="fill-current" /> Surrender & Register Soul
            </button>
          </div>

          {/* CENTER: COMPLETE WEEKLY SCHEDULE (4 SPANS) */}
          <div className="lg:col-span-4 bg-[#001D3D]/20 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#FFC300] font-bold text-xs uppercase tracking-widest">
                <Calendar size={16} /> Complete Weekly Schedule
              </div>
              <span className="text-[9px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded">
                Live Directory
              </span>
            </div>

            <div className="space-y-3">
              {schedules.map((item) => (
                <div key={item.id} className="bg-black/30 border border-white/5 p-3.5 rounded-xl space-y-1 hover:border-[#8ECAE6]/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#FFC300] uppercase tracking-wider">
                      {item.day}
                    </span>
                    <span className="text-[10px] font-mono text-[#8ECAE6]">
                      {item.time}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">
                    {item.event}
                  </h4>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: PASTORAL DESK & LOCAL ASSEMBLY DIRECTORY (4 SPANS) */}
          <div className="lg:col-span-4 bg-[#001D3D]/20 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-[#FFC300] font-bold text-xs uppercase tracking-widest border-b border-white/10 pb-3">
              <Phone size={16} /> Pastoral Counseling & Help Desk
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Our District Pastoral team is available for spiritual counseling, prayer support, child dedications, and pastoral care.
            </p>

            <div className="bg-gradient-to-br from-[#001D3D] to-black/60 p-5 rounded-xl border border-white/10 space-y-3">
              <span className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest">
                Direct Pastoral Lines
              </span>
              <div className="text-sm font-bold text-white font-mono">
                {pastorContact}
              </div>
              <a 
                href={`tel:${(pastorContact || '+233000000000').split('/')[0].trim()}`} 
                className="block text-center w-full py-2.5 bg-[#8ECAE6] hover:bg-white text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
              >
                Call District Minister
              </a>
            </div>

            <div className="pt-3 border-t border-white/10 text-center space-y-2">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Looking for your nearest assembly?
              </p>
              <button 
                onClick={() => router.push('/connect')} 
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Find Assembly Address</span> <ChevronRight size={14}/>
              </button>
            </div>
          </div>

        </section>

      </main>

      {/* MARQUEE INLINE STYLE */}
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
      `}</style>
    </div>
  );
}