"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Heart, Trash2, Phone, Calendar, CheckCircle2, ShieldCheck, Cake, Filter, Search, PhoneCall, MessageCircle, MessageSquare, Shield, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where, getDocs } from 'firebase/firestore';

export default function PrayerArchives() {
  const [prayers, setPrayers] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('intercessions'); // intercessions, birthdays
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- BIRTHDAY FILTER STATES ---
  const [birthdayAssemblyFilter, setBirthdayAssemblyFilter] = useState('All Assemblies');
  const [searchCelebrant, setSearchCelebrant] = useState('');

  useEffect(() => {
    // Check Tier Level for SMS Button
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

  const inputStyle = "w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-slate-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <CheckCircle2 size={24} /> {notification.message}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
          <div className="bg-purple-600 p-4 rounded-2xl text-white shadow-lg">
            <Heart size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Pastoral Chamber</h1>
            <p className="font-bold text-gray-500">Secure gateway for intercessory data and birthday milestones.</p>
          </div>
        </div>

        {/* CONTROLLING TABS */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('intercessions')} 
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-sm border-2 transition-all ${activeTab === 'intercessions' ? 'border-purple-600 text-purple-600 shadow-sm bg-purple-50/20' : 'border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}
          >
            <Heart size={18}/> Active Intercessions ({prayers.length})
          </button>
          <button 
            onClick={() => setActiveTab('birthdays')} 
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-sm border-2 transition-all ${activeTab === 'birthdays' ? 'border-pink-600 text-pink-600 shadow-sm bg-pink-50/10' : 'border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}
          >
            <Cake size={18}/> 30-Day Birthday Watch ({filteredCelebrants.length})
          </button>
        </div>

        {/* ========================================== */}
        {/* TAB 1: ACTIVE INTERCESSORY PRAYER FEED     */}
        {/* ========================================== */}
        {activeTab === 'intercessions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
            {prayers.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-[30px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <Heart size={64} className="text-gray-200 mb-4" />
                <h3 className="text-xl font-black text-gray-400">No Pending Intercessions</h3>
              </div>
            ) : (
              prayers.map(prayer => (
                <div key={prayer.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                  
                  <div className="flex justify-between items-start mb-4 pl-2">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        {prayer.name} 
                        {prayer.isMember && <ShieldCheck size={16} className="text-emerald-500" title="Registered Member" />}
                      </h3>
                      <div className="flex gap-4 text-xs font-bold text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Phone size={14} className="text-blue-500"/> {prayer.phone}</span>
                        <span className="flex items-center gap-1"><Calendar size={14} className="text-gray-400"/> {new Date(prayer.archivedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl text-sm font-medium text-gray-800 flex-1 mb-4 pl-2">
                    {prayer.message}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-50 pl-2 mt-auto">
                    <button 
                      onClick={() => handleResolve(prayer.id, prayer.name)}
                      className="px-4 py-2 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm"
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
            
            {/* INLINE CONTROLS */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-center max-w-5xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" placeholder="Search celebrant name..." value={searchCelebrant}
                  onChange={e => setSearchCelebrant(e.target.value)} className={`${inputStyle} pl-10`}
                />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 shadow-inner">
                <Filter size={14} className="text-gray-400 shrink-0" />
                <select 
                  value={birthdayAssemblyFilter} onChange={e => setBirthdayAssemblyFilter(e.target.value)}
                  className="w-full bg-transparent font-black text-xs uppercase tracking-wider text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="All Assemblies">All Assemblies Filter</option>
                  {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* CELEBRANTS CARD LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCelebrants.map((member) => (
                <div key={member.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
                  
                  {member.daysLeft <= 7 && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-amber-500"></div>
                  )}

                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 group-hover:text-pink-600 transition-colors line-clamp-1">{member.name}</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{member.churchRole} • {member.localAssembly}</p>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-1.5 text-center shrink-0">
                        <span className="text-xs font-black tracking-tight block">{member.formattedMonthDay}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider block mt-0.5 text-amber-600">Turns {member.ageTurning}</span>
                      </div>
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-wider ${
                      member.daysLeft === 0 ? 'bg-red-50 border-red-200 text-red-700 animate-pulse' :
                      member.daysLeft <= 7 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-slate-50 border-gray-200 text-slate-600'
                    }`}>
                      <Calendar size={12} />
                      {member.daysLeft === 0 ? "Celebrating Today! 🎉" : `${member.daysLeft} Days Remaining`}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-gray-500">{member.phone || 'No Contact'}</span>
                    
                    <div className="flex gap-2">
                      <a 
                        href={`https://wa.me/${member.phone?.startsWith('0') ? '233' + member.phone.substring(1) : member.phone}?text=${encodeURIComponent(`Happy birthday in advance ${member.name.split(' ')[0]}! We thank God for your life and your service in the kingdom. May your new age bring double favor! - Ketiejili District`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Send WhatsApp Blessing"
                      >
                        <MessageCircle size={14} />
                      </a>

                      <a 
                        href={`tel:${member.phone}`}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                        title="Call Member"
                      >
                        <PhoneCall size={14} />
                      </a>

                      {isTier1 && (
                        <button 
                          onClick={() => handleSendBirthdaySMS(member)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm relative"
                          title="Send Official District Blessing SMS (Tier 1)"
                        >
                          <MessageSquare size={14} />
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            <Shield size={6} className="text-white" />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))}

              {filteredCelebrants.length === 0 && (
                <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-gray-400">
                  <Cake size={48} className="mb-4 opacity-20 text-pink-600" />
                  <p className="font-black uppercase tracking-widest text-sm">No birthdays detected in this assembly scope.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}