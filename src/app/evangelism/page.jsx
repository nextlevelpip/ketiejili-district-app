"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Flame, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Save, Filter, MapPin, CalendarDays, Users, Megaphone, Target, FileSpreadsheet, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function EvangelismAndSouls() {
  const [logs, setLogs] = useState([]);
  const [converts, setConverts] = useState([]);
  const [assemblies, setAssemblies] = useState(['Central']);
  const [activeTab, setActiveTab] = useState('log'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- CUSTOM MODAL STATE ---
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, location: '' });

  // --- FORM STATES ---
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [localAssembly, setLocalAssembly] = useState('Central');
  const [location, setLocation] = useState('');
  const [outreachType, setOutreachType] = useState('');
  const [targetDemographic, setTargetDemographic] = useState('');
  const [testimonies, setTestimonies] = useState('');
  
  const [adultSoulsCop, setAdultSoulsCop] = useState('');
  const [otherSoulsNonCop, setOtherSoulsNonCop] = useState('');
  const [gospelSundaySouls, setGospelSundaySouls] = useState('');
  const [childrenWon, setChildrenWon] = useState('');

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fAssembly, setFAssembly] = useState('All Assemblies');
  const [fDemographic, setFDemographic] = useState('All Categories');

  // ALIGNED WITH HEADQUARTERS CATEGORIES
  const outreachTypes = [
    "Crusades", 
    "Rallies & Campaigns", 
    "House-to-House Outreach", 
    "Traditional Ministries Outreaches", 
    "HUM, MPWDs & Specialized Ministries", 
    "Other Organized Evangelistic Activities"
  ];

  const pentChmsDemographics = [
    "General Church", "HUM (Home & Urban Missions)", "MPWD (Persons With Disabilities)", 
    "Chaplaincy", "Chieftaincy", "SOM (Schools Outreach)", "TOSM", "Digital Space", "Marketplace", "Prisons", "Children Ministry", "Youth Ministry", "Women's Ministry", "Men's Ministry", "Other"
  ];

  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetched);
        setLocalAssembly(fetched[0]);
      }
    });

    const qLogs = query(collection(db, 'evangelism_logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const allMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const newConverts = allMembers.filter(m => m.churchRole === 'New Convert');
      setConverts(newConverts.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')));
      setIsLoading(false);
    });

    return () => { unsubAssem(); unsubLogs(); unsubMembers(); };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const resetForm = () => {
    setLocation(''); setOutreachType(''); setTargetDemographic(''); 
    setAdultSoulsCop(''); setOtherSoulsNonCop(''); setGospelSundaySouls(''); setChildrenWon('');
    setTestimonies('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const aCop = parseInt(adultSoulsCop) || 0;
    const oNonCop = parseInt(otherSoulsNonCop) || 0;
    const gSunday = parseInt(gospelSundaySouls) || 0;
    const cWon = parseInt(childrenWon) || 0;
    const totalSouls = aCop + oNonCop + gSunday + cWon;

    try {
      await addDoc(collection(db, 'evangelism_logs'), { 
        date,
        localAssembly,
        location: location.trim(),
        outreachType,
        targetDemographic,
        adultSoulsCop: aCop,
        otherSoulsNonCop: oNonCop,
        gospelSundaySouls: gSunday,
        childrenWon: cWon,
        totalSoulsWon: totalSouls,
        testimonies: testimonies.trim(),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.fullName || 'System Admin'
      });
      showNotification('success', 'Outreach event logged successfully.');
      resetForm(); 
      setActiveTab('history');
    } catch (err) {
      showNotification('error', 'Critical Error: Data Not Saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- REPLACED BROWSER POPUP WITH CUSTOM MODAL ---
  const triggerDelete = (id, location) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    setDeleteModal({ isOpen: true, id, location });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'evangelism_logs', deleteModal.id));
      showNotification('success', 'Outreach log successfully purged.');
    } catch (err) { 
      showNotification('error', 'Purge Failed.'); 
    } finally {
      setDeleteModal({ isOpen: false, id: null, location: '' });
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssembly = fAssembly === 'All Assemblies' || log.localAssembly === fAssembly;
    const matchesDemo = fDemographic === 'All Categories' || log.targetDemographic === fDemographic;
    return matchesSearch && matchesAssembly && matchesDemo;
  });

  const filteredConverts = converts.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssembly = fAssembly === 'All Assemblies' || c.localAssembly === fAssembly;
    return matchesSearch && matchesAssembly;
  });

  // --- ENHANCED COMPUTATIONS ---
  const totalPrograms = filteredLogs.length;
  const totalAdultCop = filteredLogs.reduce((sum, log) => sum + (log.adultSoulsCop || 0), 0);
  const totalOtherNonCop = filteredLogs.reduce((sum, log) => sum + (log.otherSoulsNonCop || 0), 0);
  const totalGospelSunday = filteredLogs.reduce((sum, log) => sum + (log.gospelSundaySouls || 0), 0);
  const totalChildren = filteredLogs.reduce((sum, log) => sum + (log.childrenWon || 0), 0);
  
  const totalAllSouls = totalAdultCop + totalOtherNonCop + totalGospelSunday + totalChildren;

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec)
  const inputStyle = "w-full px-4 py-3 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:text-[#000814]";
  const labelStyle = "block text-[9px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        {/* CUSTOM DELETE MODAL OVERLAY */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Purge Record</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  Are you sure you want to permanently delete the outreach log for <span className="text-white">{deleteModal.location}</span>?
                </p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, id: null, location: '' })}
                  className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              {notification.message}
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><Flame size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Evangelism & Souls</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Track outreach efforts & harvested souls.</p>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'log', label: 'Log Outreach', icon: Megaphone },
                { id: 'history', label: `Reports (${logs.length})`, icon: FileSpreadsheet },
                { id: 'souls', label: `Harvested Souls (${converts.length})`, icon: Users }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}
                  >
                    <Icon size={12}/> {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ================= TAB 1: LOG OUTREACH ================= */}
          {activeTab === 'log' && (
            <div className="bg-[#000814] p-6 md:p-10 rounded-2xl shadow-xl border border-[#003566] max-w-5xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FCA311]"></div>
              
              <div className="mb-6 border-b border-[#003566] pb-4 flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Record Evangelism Event</h2>
                  <p className="text-[9px] font-bold text-[#FFC300] uppercase tracking-widest mt-1.5">Inputs are strictly aligned with the Headquarters portal.</p>
                </div>
              </div>

              {/* HEADQUARTERS COUNTING RULE BANNER */}
              <div className="bg-[#001D3D] border border-[#003566] p-4 rounded-xl mb-6 flex items-start gap-3">
                <Info size={16} className="text-[#FFC300] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mb-1">Counting Rule Notice</h4>
                  <p className="text-[10px] font-bold text-white/70 leading-relaxed uppercase tracking-widest">
                    If a particular outreach is held for two or three continuous days, it should be counted as two or three separate events — not as one event.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className={labelStyle}>Date of Outreach *</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyle} /></div>
                  <div><label className={labelStyle}>Executing Assembly *</label><select required value={localAssembly} onChange={e => setLocalAssembly(e.target.value)} className={inputStyle}>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  <div><label className={labelStyle}>Strategy / Type *</label><select required value={outreachType} onChange={e => setOutreachType(e.target.value)} className={inputStyle}><option value="">- Select Type -</option>{outreachTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className={labelStyle}>Target Demographic *</label><select required value={targetDemographic} onChange={e => setTargetDemographic(e.target.value)} className={inputStyle}>{pentChmsDemographics.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                </div>

                <div><label className={labelStyle}>Specific Location / Community *</label><input required type="text" placeholder="e.g. Katanga Market Square" value={location} onChange={e => setLocation(e.target.value)} className={inputStyle} /></div>

                <div className="bg-[#001D3D] p-6 rounded-xl border border-[#003566]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FFC300] mb-5 flex items-center gap-2"><Target size={14}/> Souls Won Breakdown</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <div>
                      <label className={labelStyle}>Adult Souls Won (COP)</label>
                      <input type="number" min="0" placeholder="0" value={adultSoulsCop} onChange={e => setAdultSoulsCop(e.target.value)} className={inputStyle} />
                      <p className="text-[8px] font-bold text-white/40 mt-2 uppercase tracking-widest leading-relaxed">Souls won who accepted Christ and decided to fellowship with the local assembly from outreach programs.</p>
                    </div>
                    
                    <div>
                      <label className={labelStyle}>Other Souls Won (Non-COP)</label>
                      <input type="number" min="0" placeholder="0" value={otherSoulsNonCop} onChange={e => setOtherSoulsNonCop(e.target.value)} className={inputStyle} />
                      <p className="text-[8px] font-bold text-white/40 mt-2 uppercase tracking-widest leading-relaxed">Souls won who accepted Christ but opted to fellowship with other denominations.</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className={labelStyle}>Gospel Sunday Souls</label>
                      <input type="number" min="0" placeholder="0" value={gospelSundaySouls} onChange={e => setGospelSundaySouls(e.target.value)} className={inputStyle} />
                      <p className="text-[8px] font-bold text-white/40 mt-2 uppercase tracking-widest leading-relaxed">Observed on the last Sunday of every month. All adult souls and children won for Christ during the Gospel Sunday morning through any form of outreach are recorded here.</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelStyle}>Children Won And Retained</label>
                      <input type="number" min="0" placeholder="0" value={childrenWon} onChange={e => setChildrenWon(e.target.value)} className={inputStyle} />
                    </div>
                  </div>
                </div>

                <div><label className={labelStyle}>Testimonies & Notes</label><textarea rows="3" placeholder="Any notable miracles or occurrences?" value={testimonies} onChange={e => setTestimonies(e.target.value)} className={inputStyle} /></div>

                <div className="pt-4 border-t border-[#003566] flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-3.5 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Save Outreach Log</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 2: REPORTS ================= */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#000814] rounded-2xl border border-[#003566] overflow-hidden shadow-2xl">
                <div className="bg-[#001D3D] border-b border-[#003566] p-5">
                  <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Auto-Generated Report</h2>
                </div>
                
                {/* 5-COLUMN TOTALS ROW */}
                <div className="p-6 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[#001D3D] p-4 rounded-xl border border-[#003566] text-center"><p className="text-[8px] font-black text-[#FFC300] uppercase tracking-widest">Programs</p><p className="text-base font-black text-white mt-1">{totalPrograms}</p></div>
                  <div className="bg-[#001D3D] p-4 rounded-xl border border-[#003566] text-center"><p className="text-[8px] font-black text-[#FFC300] uppercase tracking-widest">Adult COP</p><p className="text-base font-black text-white mt-1">{totalAdultCop}</p></div>
                  <div className="bg-[#001D3D] p-4 rounded-xl border border-[#003566] text-center"><p className="text-[8px] font-black text-[#FFC300] uppercase tracking-widest">Gospel</p><p className="text-base font-black text-white mt-1">{totalGospelSunday}</p></div>
                  <div className="bg-[#001D3D] p-4 rounded-xl border border-[#003566] text-center"><p className="text-[8px] font-black text-[#FFC300] uppercase tracking-widest">Children</p><p className="text-base font-black text-white mt-1">{totalChildren}</p></div>
                  <div className="bg-[#FFC300]/10 p-4 rounded-xl border border-[#FFC300]/50 text-center"><p className="text-[8px] font-black text-[#FFC300] uppercase tracking-widest">Total Souls</p><p className="text-xl font-black text-white mt-1">{totalAllSouls}</p></div>
                </div>
              </div>

              <div className="bg-[#000814] p-5 rounded-2xl border border-[#003566] grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative"><Search className="absolute left-3 top-3 text-white/30" size={14}/><input placeholder="Search locations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs outline-none text-white focus:border-[#FFC300] transition-all placeholder:text-white/30" /></div>
                <select value={fDemographic} onChange={e => setFDemographic(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-[10px] uppercase tracking-widest text-white focus:outline-none focus:border-[#FFC300] [&>option]:text-[#000814]"><option value="All Categories">All Demographics</option>{pentChmsDemographics.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-[10px] uppercase tracking-widest text-white focus:outline-none focus:border-[#FFC300] [&>option]:text-[#000814]"><option value="All Assemblies">All Assemblies</option>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>

              <div className="bg-[#000814] rounded-2xl shadow-2xl border border-[#003566] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead><tr className="bg-[#001D3D] border-b border-[#003566] text-[9px] font-black text-[#FFC300] uppercase tracking-widest"><th className="p-5">Date</th><th className="p-5">Location & Strategy</th><th className="p-5">Demographic</th><th className="p-5 text-center">Total Souls</th>{isTier1 && <th className="p-5 text-center">Action</th>}</tr></thead>
                  <tbody className="divide-y divide-[#003566]">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#001D3D]/50 transition-colors">
                        <td className="p-5 font-bold text-white"><CalendarDays size={12} className="inline mr-2 text-[#FFC300]" />{new Date(log.date).toLocaleDateString()}</td>
                        <td className="p-5 font-black text-white text-xs">{log.location}<br/><span className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">{log.outreachType}</span></td>
                        <td className="p-5 font-bold text-white/70">{log.targetDemographic}</td>
                        <td className="p-5 text-center font-black text-sm text-emerald-400">{log.totalSoulsWon || 0}</td>
                        {isTier1 && <td className="p-5 text-center"><button onClick={() => triggerDelete(log.id, log.location)} className="p-2 text-white/30 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14}/></button></td>}
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-10 text-center text-white/50 font-bold italic text-xs">No outreach records found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 3: HARVESTED SOULS ================= */}
          {activeTab === 'souls' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#000814] p-5 rounded-2xl flex items-center gap-4 border border-[#003566] shadow-md">
                <div className="bg-[#001D3D] text-[#FFC300] p-3 rounded-xl border border-[#003566]"><Target size={20}/></div>
                <div><p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Discipleship Radar</p><h3 className="text-xs font-black text-white mt-0.5 uppercase tracking-widest">Tracking all members registered as "New Converts"</h3></div>
              </div>

              <div className="bg-[#000814] p-5 rounded-2xl border border-[#003566] grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative"><Search className="absolute left-3 top-3 text-white/30" size={14}/><input placeholder="Search convert names..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs outline-none text-white focus:border-[#FFC300] transition-all placeholder:text-white/30" /></div>
                <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-black text-[9px] uppercase tracking-widest text-white focus:outline-none focus:border-[#FFC300] [&>option]:text-[#000814]"><option value="All Assemblies">All Assemblies</option>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>

              <div className="bg-[#000814] rounded-2xl shadow-2xl border border-[#003566] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead><tr className="bg-[#001D3D] border-b border-[#003566] text-[9px] font-black text-[#FFC300] uppercase tracking-widest"><th className="p-5">Convert Name</th><th className="p-5">Assembly</th><th className="p-5">HQ Category</th><th className="p-5 text-center">Status</th></tr></thead>
                  <tbody className="divide-y divide-[#003566]">
                    {filteredConverts.map(convert => (
                      <tr key={convert.id} className="hover:bg-[#001D3D]/50 transition-colors">
                        <td className="p-5 font-black text-white text-xs">{convert.name}</td>
                        <td className="p-5 font-bold text-white/70 text-[10px] uppercase tracking-widest">{convert.localAssembly}</td>
                        <td className="p-5"><span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border bg-[#001D3D] text-[#FFC300] border-[#003566]">{convert.soulWinner || 'General'}</span></td>
                        <td className="p-5">
                          <div className="flex justify-center gap-2">
                            <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${convert.waterBaptized === 'Yes' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#001D3D] text-white/30 border-[#003566]'}`}>Water</span>
                            <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${convert.spiritBaptism === 'Yes' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-[#001D3D] text-white/30 border-[#003566]'}`}>Spirit</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredConverts.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-white/50 font-bold italic text-xs">No converts found matching your criteria.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}