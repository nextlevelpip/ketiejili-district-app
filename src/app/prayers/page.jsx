"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Heart, Trash2, Phone, Calendar, CheckCircle2, ShieldCheck, Cake, Filter, Search, PhoneCall, MessageCircle, MessageSquare, Shield, Loader2, Mic, X, Send } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export default function PrayerArchives() {
  const [prayers, setPrayers] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('intercessions'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- CUSTOM MODAL STATES ---
  const [resolveModal, setResolveModal] = useState({ isOpen: false, id: null, name: '' });
  const [smsModal, setSmsModal] = useState({ isOpen: false, member: null, message: '', mode: 'text', audioFile: null });

  // --- BIRTHDAY FILTER STATES ---
  const [birthdayAssemblyFilter, setBirthdayAssemblyFilter] = useState('All Assemblies');
  const [searchCelebrant, setSearchCelebrant] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    // 1. Fetch live prayer archives
    const qPrayers = query(collection(db, 'prayer_archives'), orderBy('archivedAt', 'desc'));
    const unsubPrayers = onSnapshot(qPrayers, (snapshot) => {
      setPrayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch live members directory for the birthday radar
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetched.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setMembers(fetched);
      setIsLoading(false);
    });

    return () => {
      unsubPrayers();
      unsubMembers();
    };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- CUSTOM RESOLVE PRAYER MODAL LOGIC ---
  const triggerResolve = (id, name) => {
    setResolveModal({ isOpen: true, id, name });
  };

  const confirmResolve = async () => {
    try {
      await deleteDoc(doc(db, 'prayer_archives', resolveModal.id));
      showNotification('success', 'Prayer request resolved and cleared.');
    } catch (error) {
      showNotification('error', 'Failed to clear request.');
    } finally {
      setResolveModal({ isOpen: false, id: null, name: '' });
    }
  };

  // ==========================================
  // THE 30-DAY BIRTHDAY RADAR CORE LOGIC
  // ==========================================
  const getUpcomingCelebrants = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    return members.filter(m => {
      if (!m.dob) return false;
      
      const birthDate = new Date(m.dob);
      if (isNaN(birthDate.getTime())) return false;

      let birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
      
      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(currentYear + 1);
      }

      const diffTime = birthdayThisYear - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= 30;
    });
  };

  const upcomingCelebrantsList = getUpcomingCelebrants().map(m => {
    const today = new Date();
    const birthDate = new Date(m.dob);
    
    let ageTurning = today.getFullYear() - birthDate.getFullYear();
    const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (birthdayThisYear < today) {
      ageTurning += 1;
    }

    const currentYear = today.getFullYear();
    let nextBday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
    if (nextBday < today) nextBday.setFullYear(currentYear + 1);
    const daysLeft = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24));

    return {
      ...m,
      ageTurning,
      daysLeft,
      formattedMonthDay: birthDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  // --- FILTER CELEBRANTS ---
  const filteredCelebrants = upcomingCelebrantsList.filter(c => {
    const matchesAssembly = birthdayAssemblyFilter === 'All Assemblies' || c.localAssembly === birthdayAssemblyFilter;
    const matchesSearch = String(c.name || '').toLowerCase().includes(searchCelebrant.toLowerCase()) || String(c.phone || '').includes(searchCelebrant);
    return matchesAssembly && matchesSearch;
  });

  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))];

  // --- OMNI-CHANNEL BIRTHDAY SMS METHOD ---
  const triggerSMS = (member) => {
    const defaultMsg = `Calvary greetings ${String(member.name).split(' ')[0]}! Happy birthday in advance from the COP Ketiejili District. As you turn ${member.ageTurning}, we pray that the Lord strengthens your faith and opens new doors of grace for you. God bless you!`;
    setSmsModal({ isOpen: true, member, message: defaultMsg, mode: 'text', audioFile: null });
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { 
        return showNotification('error', 'Audio file must be under 5MB.');
      }
      setSmsModal({ ...smsModal, audioFile: file });
    }
  };

  const confirmSendSMS = async () => {
    const { member, message, mode, audioFile } = smsModal;
    
    if (mode === 'text' && !message.trim()) return showNotification('error', 'Message cannot be empty.');
    if (mode === 'voice' && !audioFile) return showNotification('error', 'Please upload a valid audio file.');

    setSmsModal({ isOpen: false, member: null, message: '', mode: 'text', audioFile: null });
    
    let formattedPhone = String(member.phone || '').replace(/\D/g, '');
    if (!formattedPhone) return showNotification('error', 'Member does not have a valid phone number.');
    if (formattedPhone.startsWith('0')) formattedPhone = '233' + formattedPhone.substring(1);

    try {
      showNotification('success', `Transmitting prophetic ${mode === 'voice' ? 'Voice Blessing' : 'Text Blessing'}...`);
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, recipients: [formattedPhone], type: mode })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API Transmission Fault');
      showNotification('success', `Birthday Blessing delivered to ${member.name}!`);
    } catch (err) {
      showNotification('error', `Network Error: ${err.message}`);
    }
  };

  // PALETTE 2 (MODERN CYAN & GOLD) INPUT STYLE WITH DROPDOWN FIX
  const inputStyle = "w-full p-3 bg-[#023047] border border-[#209EBB]/30 rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFB701] transition-all shadow-sm placeholder:text-[#8ECAE6]/50 [&>option]:bg-[#023047] [&>option]:text-white";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFB701]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* PALETTE 2 BACKGROUND GRADIENT */}
      <div className="min-h-full bg-gradient-to-br from-[#023047] via-[#209EBB]/20 to-[#023047] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        {/* Ambient background decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8ECAE6]/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFB701]/10 blur-[120px] rounded-full pointer-events-none"></div>

        {/* CUSTOM RESOLVE PRAYER MODAL */}
        {resolveModal.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#023047]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#023047] border border-[#209EBB]/30 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-400">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Resolve Prayer Request</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  Mark <span className="text-white">{resolveModal.name}'s</span> prayer request as fully resolved and remove it from the active feed?
                </p>
              </div>
              <div className="flex border-t border-[#209EBB]/20">
                <button 
                  onClick={() => setResolveModal({ isOpen: false, id: null, name: '' })}
                  className="flex-1 py-4 text-[10px] font-black text-[#8ECAE6] uppercase tracking-widest hover:bg-[#209EBB]/10 transition-colors border-r border-[#209EBB]/20"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmResolve}
                  className="flex-1 py-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/10 transition-colors"
                >
                  Confirm Resolved
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM OMNI-CHANNEL SMS MODAL (PALETTE 2) */}
        {smsModal.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#023047]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#023047] border border-[#209EBB]/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#209EBB]/20 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-[#FFB701] uppercase tracking-widest flex items-center gap-2"><MessageSquare size={16}/> Prophetic Blessing</h3>
                  <p className="text-[10px] text-[#8ECAE6]/50 font-bold mt-1 uppercase tracking-widest">To: <span className="text-white">{smsModal.member?.name}</span> ({smsModal.member?.phone})</p>
                </div>
                <div className="flex bg-[#001D3D] p-1 rounded-lg border border-[#209EBB]/20">
                   <button onClick={() => setSmsModal({ ...smsModal, mode: 'text' })} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all ${smsModal.mode === 'text' ? 'bg-[#FFB701] text-[#023047]' : 'text-[#8ECAE6]/40 hover:text-[#8ECAE6]'}`}>Text</button>
                   <button onClick={() => setSmsModal({ ...smsModal, mode: 'voice' })} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${smsModal.mode === 'voice' ? 'bg-[#FFB701] text-[#023047]' : 'text-[#8ECAE6]/40 hover:text-[#8ECAE6]'}`}><Mic size={10} /> Voice</button>
                </div>
              </div>
              
              <div className="p-6">
                {smsModal.mode === 'text' ? (
                  <textarea rows="4" value={smsModal.message} onChange={(e) => setSmsModal({ ...smsModal, message: e.target.value })} className="w-full p-4 bg-[#001D3D] border border-[#209EBB]/30 rounded-xl text-xs font-bold text-white outline-none focus:border-[#FFB701] transition-all resize-none shadow-inner leading-relaxed"/>
                ) : (
                  <div className="w-full flex-1 min-h-[150px] flex flex-col items-center justify-center bg-[#001D3D] border border-[#209EBB]/30 border-dashed rounded-xl relative group hover:border-[#FFB701]/50 transition-colors p-6">
                    <Mic size={32} className={`${smsModal.audioFile ? 'text-[#FFB701]' : 'text-[#8ECAE6]/20'} mb-3`} />
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">{smsModal.audioFile ? 'Audio File Attached' : 'Upload Voice Blessing'}</h4>
                    <p className="text-[9px] font-bold text-[#8ECAE6]/40 uppercase tracking-widest text-center">{smsModal.audioFile ? smsModal.audioFile.name : 'MP3 or WAV files only (Max 5MB)'}</p>
                    {smsModal.audioFile && (
                      <button type="button" onClick={(e) => { e.preventDefault(); setSmsModal({ ...smsModal, audioFile: null }); }} className="mt-4 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors flex items-center gap-1 z-20 relative"><X size={12} /> Remove File</button>
                    )}
                    <input type="file" accept="audio/mp3, audio/wav" onChange={handleAudioUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="" />
                  </div>
                )}
              </div>
              <div className="flex border-t border-[#209EBB]/20">
                <button onClick={() => setSmsModal({ isOpen: false, member: null, message: '', mode: 'text', audioFile: null })} className="flex-1 py-4 text-[10px] font-black text-[#8ECAE6] uppercase tracking-widest hover:bg-[#209EBB]/10 transition-colors border-r border-[#209EBB]/20">Cancel</button>
                <button onClick={confirmSendSMS} className="flex-1 py-4 text-[10px] font-black text-[#023047] bg-[#FFB701] hover:bg-[#FFB701]/80 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><Send size={14} /> Send Blessing</button>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in bg-emerald-500 text-white">
              <CheckCircle2 size={20} /> <span className="font-black uppercase tracking-widest text-[10px]">{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#023047] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#209EBB]/20 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#209EBB]/10 p-3 rounded-xl text-[#FFB701] border border-[#FFB701]/20 hidden md:block">
                <Heart size={24} />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Pastoral Chamber</h1>
                <p className="font-bold text-[#8ECAE6] text-[10px] uppercase tracking-widest mt-1">Secure gateway for intercessory data and birthdays.</p>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTab('intercessions')} 
                className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-widest border transition-all ${activeTab === 'intercessions' ? 'bg-[#FFB701] text-[#023047] border-[#FFB701] shadow-lg' : 'bg-[#023047] text-[#8ECAE6] border-[#209EBB]/30 hover:bg-[#209EBB]/10'}`}
              >
                <Heart size={12}/> Active Intercessions ({prayers.length})
              </button>
              <button 
                onClick={() => setActiveTab('birthdays')} 
                className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-widest border transition-all ${activeTab === 'birthdays' ? 'bg-[#FFB701] text-[#023047] border-[#FFB701] shadow-lg' : 'bg-[#023047] text-[#8ECAE6] border-[#209EBB]/30 hover:bg-[#209EBB]/10'}`}
              >
                <Cake size={12}/> 30-Day Birthday Watch ({filteredCelebrants.length})
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* TAB 1: ACTIVE INTERCESSORY PRAYER FEED     */}
          {/* ========================================== */}
          {activeTab === 'intercessions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
              {prayers.length === 0 ? (
                <div className="col-span-full bg-[#023047] border border-[#209EBB]/20 p-12 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
                  <Heart size={48} className="text-[#8ECAE6]/20 mb-4" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#8ECAE6]/40">No Pending Intercessions</h3>
                </div>
              ) : (
                prayers.map(prayer => (
                  <div key={prayer.id} className="bg-[#023047] p-5 rounded-2xl shadow-xl border border-[#209EBB]/30 flex flex-col h-full relative overflow-hidden hover:border-[#FFB701]/50 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#FC8500]"></div>
                    
                    <div className="flex justify-between items-start mb-4 pl-3">
                      <div>
                        <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                          {prayer.name} 
                          {prayer.isMember && <ShieldCheck size={14} className="text-emerald-400" title="Registered Member" />}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-[10px] font-bold text-[#8ECAE6] mt-1.5 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Phone size={12} className="text-[#FFB701]"/> {prayer.phone}</span>
                          <span className="flex items-center gap-1"><Calendar size={12} className="text-[#FFB701]"/> {new Date(prayer.archivedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#023047] border border-[#209EBB]/10 p-4 rounded-xl text-xs font-bold text-white flex-1 mb-4 pl-3 leading-relaxed shadow-inner">
                      {prayer.message}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[#209EBB]/20 pl-2 mt-auto">
                      <button 
                        onClick={() => triggerResolve(prayer.id, prayer.name)}
                        className="px-4 py-2 bg-[#209EBB]/10 hover:bg-emerald-500/20 border border-[#209EBB]/30 hover:border-emerald-500/50 text-[#8ECAE6] hover:text-emerald-300 font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 text-[9px] shadow-sm"
                      >
                        <CheckCircle2 size={12} /> Mark Resolved
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: PROPHETIC BIRTHDAY RADAR CONTROL    */}
          {/* ========================================== */}
          {activeTab === 'birthdays' && (
            <div className="space-y-6">
              
              {/* FILTERS PANEL */}
              <div className="bg-[#023047] p-5 rounded-2xl border border-[#209EBB]/30 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center max-w-5xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8ECAE6]/50" size={14} />
                  <input 
                    type="text" placeholder="Search celebrant name..." value={searchCelebrant}
                    onChange={e => setSearchCelebrant(e.target.value)} className={`${inputStyle} pl-9`}
                  />
                </div>

                <div className="flex items-center gap-2 bg-[#023047] px-3 py-2 rounded-xl border border-[#209EBB]/30 shadow-inner">
                  <Filter size={12} className="text-[#FFB701] shrink-0" />
                  <select 
                    value={birthdayAssemblyFilter} onChange={e => setBirthdayAssemblyFilter(e.target.value)}
                    className="w-full bg-transparent font-black text-[9px] uppercase tracking-widest text-white focus:outline-none cursor-pointer [&>option]:bg-[#023047] [&>option]:text-white"
                  >
                    <option value="All Assemblies">All Assemblies Filter</option>
                    {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* CELEBRANTS RADAR CONTAINER */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredCelebrants.map((member) => (
                  <div key={member.id} className="bg-[#023047] rounded-2xl border border-[#209EBB]/30 p-5 shadow-xl hover:border-[#FFB701]/50 transition-all flex flex-col justify-between relative overflow-hidden group">
                    
                    {member.daysLeft <= 7 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FC8500] to-[#FFB701]"></div>
                    )}

                    <div className="mb-5">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div>
                          <h2 className="text-sm font-black text-white group-hover:text-[#FFB701] transition-colors line-clamp-1 uppercase tracking-widest">{member.name}</h2>
                          <p className="text-[8px] font-black text-[#8ECAE6] uppercase tracking-widest mt-1">{member.churchRole} • {member.localAssembly}</p>
                        </div>
                        
                        <div className="bg-[#209EBB]/10 border border-[#209EBB]/30 text-white rounded-xl p-2 text-center shrink-0 min-w-[70px] shadow-inner">
                          <span className="text-[10px] font-black tracking-widest uppercase block text-[#FFB701]">{member.formattedMonthDay}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest block mt-0.5 text-white/50">Turns {member.ageTurning}</span>
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-black text-[8px] uppercase tracking-widest ${
                        member.daysLeft === 0 ? 'bg-[#FC8500]/20 border-[#FC8500]/50 text-[#FFB701] animate-pulse' :
                        member.daysLeft <= 7 ? 'bg-[#FFB701]/10 border border-[#FFB701]/30 text-[#FFB701]' :
                        'bg-[#209EBB]/10 border-[#209EBB]/30 text-[#8ECAE6]'
                      }`}>
                        <Calendar size={10} />
                        {member.daysLeft === 0 ? "Celebrating Today! 🎉" : `${member.daysLeft} Days Remaining`}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#209EBB]/20 flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#8ECAE6]">{member.phone || 'No Contact'}</span>
                      
                      <div className="flex gap-2">
                        <a 
                          href={`https://wa.me/${member.phone?.startsWith('0') ? '233' + member.phone.substring(1) : member.phone}?text=${encodeURIComponent(`Happy birthday in advance ${String(member.name).split(' ')[0]}! We thank God for your life and your service in the kingdom. May your new age bring double favor! - Ketiejili District`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-[#209EBB]/10 border border-[#209EBB]/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 hover:text-white transition-all shadow-sm"
                          title="Send WhatsApp Blessing"
                        >
                          <MessageCircle size={14} />
                        </a>

                        <a 
                          href={`tel:${member.phone}`}
                          className="p-2 bg-[#209EBB]/10 border border-[#209EBB]/30 text-[#8ECAE6] rounded-lg hover:bg-[#209EBB]/30 hover:text-white transition-all shadow-sm"
                          title="Call Member"
                        >
                          <PhoneCall size={14} />
                        </a>

                        {isTier1 && (
                          <button 
                            onClick={() => triggerSMS(member)}
                            className="p-2 bg-[#FFB701]/10 border border-[#FFB701]/30 text-[#FFB701] rounded-lg hover:bg-[#FFB701]/30 hover:text-white transition-all shadow-sm relative"
                            title="Send Official District Blessing SMS (Tier 1)"
                          >
                            <MessageSquare size={14} />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#FC8500] rounded-full border border-[#023047] shadow-sm"></div>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                ))}

                {filteredCelebrants.length === 0 && (
                  <div className="col-span-full py-16 text-center flex flex-col items-center justify-center text-[#8ECAE6]/40 bg-[#023047] rounded-2xl border border-[#209EBB]/20">
                    <Cake size={36} className="mb-3 opacity-30 text-[#FFB701]" />
                    <p className="font-black uppercase tracking-widest text-[10px]">No birthdays detected in this assembly scope.</p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}