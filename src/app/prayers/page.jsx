"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Heart, Trash2, Phone, Calendar, CheckCircle2, ShieldCheck, Cake, Filter, Search, PhoneCall, MessageCircle, MessageSquare, Shield, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export default function PrayerArchives() {
  const [prayers, setPrayers] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('intercessions'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
      fetched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

  const handleResolve = async (id, name) => {
    if (window.confirm(`Mark ${name}'s prayer request as fully resolved and remove?`)) {
      try {
        await deleteDoc(doc(db, 'prayer_archives', id));
        showNotification('success', 'Prayer request resolved and cleared.');
      } catch (error) {
        alert("Failed to clear request.");
      }
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
    const matchesSearch = c.name?.toLowerCase().includes(searchCelebrant.toLowerCase()) || c.phone?.includes(searchCelebrant);
    return matchesAssembly && matchesSearch;
  });

  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))];

  // --- BIRTHDAY SMS METHOD ---
  const handleSendBirthdaySMS = async (member) => {
    const defaultMsg = `Calvary greetings ${member.name.split(' ')[0]}! Happy birthday in advance from the COP Ketiejili District. As you turn ${member.ageTurning}, we pray that the Lord strengthens your faith and opens new doors of grace for you. God bless you!`;
    const message = window.prompt(`[TIER 1 OVERRIDE] Send Birthday Blessing SMS to ${member.name}:`, defaultMsg);
    
    if (!message) return;

    let formattedPhone = member.phone?.replace(/\D/g, '');
    if (!formattedPhone) return showNotification('error', 'Member does not have a valid phone number.');
    if (formattedPhone.startsWith('0')) formattedPhone = '233' + formattedPhone.substring(1);

    try {
      showNotification('success', 'Transmitting prophetic blessing text message...');
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, recipients: [formattedPhone] })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API Transmission Fault');
      showNotification('success', `Birthday SMS delivered to ${member.name}!`);
    } catch (err) {
      showNotification('error', `Network Error: ${err.message}`);
    }
  };

  // PREMIUM GLASS INPUT STYLE
  const inputStyle = "w-full p-3.5 bg-black/20 border border-white/10 rounded-xl font-bold text-sm text-white outline-none focus:border-purple-400 focus:bg-black/30 transition-all shadow-sm placeholder:text-purple-200/40 [&>option]:text-gray-900";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-purple-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* PASTORAL CHAMBER AMETHYST GRADIENT WRAPPER */}
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#4a044e] via-[#6d28d9] to-[#1e1b4b] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Ambient background decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-fuchsia-500/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in bg-emerald-500 text-white">
              <CheckCircle2 size={24} /> <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          {/* SECTION HEADER */}
          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20">
              <Heart size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Pastoral Chamber</h1>
              <p className="font-bold text-purple-200">Secure gateway for intercessory data and birthday milestones.</p>
            </div>
          </div>

          {/* NAVIGATION NAVIGATION TABS */}
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
            <button 
              onClick={() => setActiveTab('intercessions')} 
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-sm border backdrop-blur-md transition-all ${activeTab === 'intercessions' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-purple-200 border-white/10 hover:bg-white/10'}`}
            >
              <Heart size={18}/> Active Intercessions ({prayers.length})
            </button>
            <button 
              onClick={() => setActiveTab('birthdays')} 
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-sm border backdrop-blur-md transition-all ${activeTab === 'birthdays' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-purple-200 border-white/10 hover:bg-white/10'}`}
            >
              <Cake size={18}/> 30-Day Birthday Watch ({filteredCelebrants.length})
            </button>
          </div>

          {/* ========================================== */}
          {/* TAB 1: ACTIVE INTERCESSORY PRAYER FEED     */}
          {/* ========================================== */}
          {activeTab === 'intercessions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
              {prayers.length === 0 ? (
                <div className="col-span-full bg-white/5 backdrop-blur-xl p-12 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center text-center">
                  <Heart size={64} className="text-purple-300/20 mb-4" />
                  <h3 className="text-xl font-black text-purple-200/40">No Pending Intercessions</h3>
                </div>
              ) : (
                prayers.map(prayer => (
                  <div key={prayer.id} className="bg-white/10 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white/10 flex flex-col h-full relative overflow-hidden hover:bg-white/15 transition-colors">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-400"></div>
                    
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          {prayer.name} 
                          {prayer.isMember && <ShieldCheck size={16} className="text-emerald-400 animate-pulse" title="Registered Member" />}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-xs font-bold text-purple-200 mt-1">
                          <span className="flex items-center gap-1"><Phone size={14} className="text-purple-300"/> {prayer.phone}</span>
                          <span className="flex items-center gap-1"><Calendar size={14} className="text-purple-300/60"/> {new Date(prayer.archivedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl text-sm font-medium text-purple-100 flex-1 mb-4 pl-3 leading-relaxed shadow-inner">
                      {prayer.message}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/5 pl-2 mt-auto">
                      <button 
                        onClick={() => handleResolve(prayer.id, prayer.name)}
                        className="px-4 py-2 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-purple-200 hover:text-emerald-300 font-bold rounded-xl transition-all flex items-center gap-2 text-sm shadow-sm"
                      >
                        <CheckCircle2 size={16} /> Mark Resolved
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
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center max-w-5xl">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-300" size={16} />
                  <input 
                    type="text" placeholder="Search celebrant name..." value={searchCelebrant}
                    onChange={e => setSearchCelebrant(e.target.value)} className={`${inputStyle} pl-10`}
                  />
                </div>

                <div className="flex items-center gap-2 bg-black/20 px-3 py-2.5 rounded-xl border border-white/10 shadow-inner">
                  <Filter size={14} className="text-purple-300 shrink-0" />
                  <select 
                    value={birthdayAssemblyFilter} onChange={e => setBirthdayAssemblyFilter(e.target.value)}
                    className="w-full bg-transparent font-black text-xs uppercase tracking-wider text-white focus:outline-none cursor-pointer [&>option]:text-gray-900"
                  >
                    <option value="All Assemblies">All Assemblies Filter</option>
                    {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* CELEBRANTS RADAR CONTAINER */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCelebrants.map((member) => (
                  <div key={member.id} className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 shadow-xl hover:bg-white/15 transition-all flex flex-col justify-between relative overflow-hidden group">
                    
                    {member.daysLeft <= 7 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-amber-500"></div>
                    )}

                    <div className="mb-6">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div>
                          <h2 className="text-lg font-black text-white group-hover:text-pink-300 transition-colors line-clamp-1 drop-shadow-sm">{member.name}</h2>
                          <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest mt-0.5">{member.churchRole} • {member.localAssembly}</p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 text-white rounded-2xl p-2 text-center shrink-0 min-w-[70px] backdrop-blur-md shadow-sm">
                          <span className="text-xs font-black tracking-tight block text-pink-300">{member.formattedMonthDay}</span>
                          <span className="text-[9px] font-black uppercase tracking-wider block mt-0.5 text-amber-300">Turns {member.ageTurning}</span>
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-wider backdrop-blur-sm ${
                        member.daysLeft === 0 ? 'bg-red-500/20 border-red-500/40 text-red-200 animate-pulse shadow-lg shadow-red-500/10' :
                        member.daysLeft <= 7 ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200' :
                        'bg-white/5 border-white/10 text-purple-100'
                      }`}>
                        <Calendar size={12} />
                        {member.daysLeft === 0 ? "Celebrating Today! 🎉" : `${member.daysLeft} Days Remaining`}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-200/60">{member.phone || 'No Contact'}</span>
                      
                      <div className="flex gap-2">
                        <a 
                          href={`https://wa.me/${member.phone?.startsWith('0') ? '233' + member.phone.substring(1) : member.phone}?text=${encodeURIComponent(`Happy birthday in advance ${member.name.split(' ')[0]}! We thank God for your life and your service in the kingdom. May your new age bring double favor! - Ketiejili District`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-2.5 bg-white/5 border border-white/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:text-white transition-all shadow-sm"
                          title="Send WhatsApp Blessing"
                        >
                          <MessageCircle size={14} />
                        </a>

                        <a 
                          href={`tel:${member.phone}`}
                          className="p-2.5 bg-white/5 border border-white/10 text-purple-200 rounded-xl hover:bg-white/20 hover:text-white transition-all shadow-sm"
                          title="Call Member"
                        >
                          <PhoneCall size={14} />
                        </a>

                        {isTier1 && (
                          <button 
                            onClick={() => handleSendBirthdaySMS(member)}
                            className="p-2.5 bg-white/5 border border-white/10 text-blue-400 rounded-xl hover:bg-blue-600/30 hover:text-white transition-all shadow-sm relative"
                            title="Send Official District Blessing SMS (Tier 1)"
                          >
                            <MessageSquare size={14} />
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-purple-900 shadow-sm">
                              <Shield size={6} className="text-white" />
                            </div>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                ))}

                {filteredCelebrants.length === 0 && (
                  <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-purple-300/40">
                    <Cake size={48} className="mb-4 opacity-20 text-pink-400" />
                    <p className="font-black uppercase tracking-widest text-sm">No birthdays detected in this assembly scope.</p>
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