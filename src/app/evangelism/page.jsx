"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Flame, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Save, Filter, MapPin, CalendarDays, Users, Megaphone, Droplet, Wind, Target, FileSpreadsheet } from 'lucide-react';
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

  // --- FORM STATES (PENTCHMS ALIGNED) ---
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [localAssembly, setLocalAssembly] = useState('Central');
  const [location, setLocation] = useState('');
  const [outreachType, setOutreachType] = useState('');
  const [targetDemographic, setTargetDemographic] = useState('');
  const [testimonies, setTestimonies] = useState('');
  
  // Specific PentChMS Soul Categories
  const [adultSoulsCop, setAdultSoulsCop] = useState('');
  const [otherSoulsNonCop, setOtherSoulsNonCop] = useState('');
  const [gospelSundaySouls, setGospelSundaySouls] = useState('');
  const [childrenWon, setChildrenWon] = useState('');

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fAssembly, setFAssembly] = useState('All Assemblies');
  const [fDemographic, setFDemographic] = useState('All Categories');

   const outreachTypes = [
    "House to House", "Mass Rally / Crusade", "Street Evangelism", "Dawn Broadcast", 
    "Hospital / Healing Ministry", "Prison Ministry", "Digital / Media Outreach", 
    "Schools / Campus Outreach", "Tract Distribution", "Personal Evangelism"
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

  const handleDeleteLog = async (id, loc) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (window.confirm(`Delete the outreach record for ${loc}?`)) {
      try {
        await deleteDoc(doc(db, 'evangelism_logs', id));
        showNotification('success', 'Outreach log purged.');
      } catch (err) { showNotification('error', 'Purge Failed.'); }
    }
  };

  // --- FILTERS & PENTCHMS AGGREGATIONS ---
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

  // KPI Calculations for the PentChMS Auto-Report
  const totalPrograms = filteredLogs.length;
  const totalAdultCop = filteredLogs.reduce((sum, log) => sum + (log.adultSoulsCop || 0), 0);
  const totalOtherNonCop = filteredLogs.reduce((sum, log) => sum + (log.otherSoulsNonCop || 0), 0);
  const totalGospelSunday = filteredLogs.reduce((sum, log) => sum + (log.gospelSundaySouls || 0), 0);
  const totalChildren = filteredLogs.reduce((sum, log) => sum + (log.childrenWon || 0), 0);
  const masterTotalSouls = totalAdultCop + totalOtherNonCop + totalGospelSunday + totalChildren;

  const inputStyle = "w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl font-bold text-slate-800 outline-none transition-all text-sm placeholder:text-slate-400";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-slate-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20 relative">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
          <div className="bg-orange-600 p-4 rounded-2xl text-white shadow-lg shadow-orange-600/20"><Flame size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Evangelism & Souls</h1>
            <p className="font-bold text-slate-500">Track outreach efforts perfectly aligned with reporting.</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
          <button onClick={() => setActiveTab('log')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'log' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-orange-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Megaphone size={16}/> Log Outreach
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'history' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            <FileSpreadsheet size={16}/> Reports ({logs.length})
          </button>
          <button onClick={() => setActiveTab('souls')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'souls' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            <Users size={16}/> Harvested Souls ({converts.length})
          </button>
        </div>

        {/* ================================================== */}
        {/* TAB 1: LOG OUTREACH (PENTCHMS FIELDS)              */}
        {/* ================================================== */}
        {activeTab === 'log' && (
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-slate-100 max-w-4xl mx-auto animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
            
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-orange-700">Record Evangelism Event</h2>
              <p className="text-sm font-bold text-slate-500">Inputs are strictly aligned with the Headquarters portal.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyle}>Date of Outreach *</label>
                  <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Executing Assembly *</label>
                  <select required value={localAssembly} onChange={e => setLocalAssembly(e.target.value)} className={inputStyle}>
                    {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Strategy / Type of Evangelism *</label>
                  <select required value={outreachType} onChange={e => setOutreachType(e.target.value)} className={inputStyle}>
                    <option value="">- Select Type -</option>
                    {outreachTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Target Demographic *</label>
                  <select required value={targetDemographic} onChange={e => setTargetDemographic(e.target.value)} className={`${inputStyle} text-orange-700`}>
                    <option value="">- Select Focus Area -</option>
                    {pentChmsDemographics.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelStyle}>Specific Location / Community *</label>
                <input required type="text" placeholder="e.g. Katanga Market Square or Nsawam Prisons" value={location} onChange={e => setLocation(e.target.value)} className={inputStyle} />
              </div>

              {/* PENTCHMS SOULS BREAKDOWN SECTION */}
              <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                <h3 className="text-sm font-black uppercase tracking-widest text-orange-800 mb-4 flex items-center gap-2"><Target size={16}/> Souls Won Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelStyle}>Adult Souls Won (COP)</label>
                    <input type="number" min="0" placeholder="0" value={adultSoulsCop} onChange={e => setAdultSoulsCop(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Other Souls Won (Non-COP)</label>
                    <input type="number" min="0" placeholder="0" value={otherSoulsNonCop} onChange={e => setOtherSoulsNonCop(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Gospel Sunday Souls</label>
                    <input type="number" min="0" placeholder="0" value={gospelSundaySouls} onChange={e => setGospelSundaySouls(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Children Won And Retained</label>
                    <input type="number" min="0" placeholder="0" value={childrenWon} onChange={e => setChildrenWon(e.target.value)} className={inputStyle} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelStyle}>Testimonies & Notes</label>
                <textarea rows="3" placeholder="Any notable miracles, resistance, or general observations?" value={testimonies} onChange={e => setTestimonies(e.target.value)} className={inputStyle} />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-600/30 transition-all flex justify-center items-center gap-3 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Save Outreach Log</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 2: PENTCHMS AUTO-REPORT HISTORY                */}
        {/* ================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* PENTCHMS REPORT GENERATOR CARD */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden relative">
              <div className="bg-slate-50 border-b border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-2 rounded-lg"><FileSpreadsheet size={20}/></div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Auto-Generated Report</h2>
                    <p className="text-xs font-bold text-slate-500">Totals below automatically adjust based on your search filters.</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8 max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-600">Total Outreach Programs</span>
                  <span className="bg-white px-6 py-2 rounded-lg border border-slate-200 font-black text-slate-800 shadow-sm w-24 text-center">{totalPrograms}</span>
                </div>
                
                <div className="border border-slate-200 rounded-xl p-6 space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Adult Souls Won (COP)</span>
                    <span className="bg-white px-6 py-2 rounded-lg border border-slate-200 font-black text-slate-800 shadow-sm w-24 text-center">{totalAdultCop}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Other Souls Won (Non-COP)</span>
                    <span className="bg-white px-6 py-2 rounded-lg border border-slate-200 font-black text-slate-800 shadow-sm w-24 text-center">{totalOtherNonCop}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Gospel Sunday Souls</span>
                    <span className="bg-white px-6 py-2 rounded-lg border border-slate-200 font-black text-slate-800 shadow-sm w-24 text-center">{totalGospelSunday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-600">Children Won And Retained</span>
                    <span className="bg-white px-6 py-2 rounded-lg border border-slate-200 font-black text-slate-800 shadow-sm w-24 text-center">{totalChildren}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTERS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-300" size={18}/>
                <input placeholder="Search locations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 transition-all" />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                <Filter size={16} className="text-slate-400 shrink-0" />
                <select value={fDemographic} onChange={e => setFDemographic(e.target.value)} className="w-full bg-transparent font-bold text-xs uppercase tracking-wider text-slate-700 outline-none cursor-pointer">
                  <option value="All Categories">All Demographics</option>
                  {pentChmsDemographics.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="w-full bg-transparent font-bold text-xs uppercase tracking-wider text-slate-700 outline-none cursor-pointer">
                  <option value="All Assemblies">All Assemblies</option>
                  {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* DETAILED LOGS TABLE */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-5 w-40">Date</th>
                      <th className="p-5">Location & Strategy</th>
                      <th className="p-5">Demographic</th>
                      <th className="p-5 text-center">Total Souls</th>
                      {isTier1 && <th className="p-5 text-center w-24">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-2 font-bold text-slate-500">
                            <CalendarDays size={14} className="text-orange-400" />
                            {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="font-black text-slate-900 text-sm mb-1">{log.location}</div>
                          <div className="text-[9px] font-black uppercase px-2 py-0.5 rounded inline-block border bg-slate-100 text-slate-600 border-slate-200">
                            {log.localAssembly} • {log.outreachType}
                          </div>
                        </td>
                        <td className="p-5 font-bold text-orange-700">{log.targetDemographic}</td>
                        <td className="p-5 text-center font-black text-lg text-red-600">{log.totalSoulsWon || 0}</td>
                        {isTier1 && (
                          <td className="p-5 text-center">
                            <button onClick={() => handleDeleteLog(log.id, log.location)} className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-12 text-center text-slate-400 font-bold italic">No outreach records match your criteria.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 3: HARVESTED SOULS                             */}
        {/* ================================================== */}
        {activeTab === 'souls' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="bg-blue-500 text-white p-3 rounded-xl"><Target size={24}/></div>
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Discipleship Radar</p>
                <h3 className="text-lg font-bold text-blue-900">Tracking all members registered as "New Converts"</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-300" size={18}/>
                <input placeholder="Search convert names..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 transition-all" />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="w-full bg-transparent font-bold text-xs uppercase tracking-wider text-slate-700 outline-none cursor-pointer">
                  <option value="All Assemblies">All Assemblies</option>
                  {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-5">Convert Name</th>
                      <th className="p-5">Assembly</th>
                      <th className="p-5">HQ Category</th>
                      <th className="p-5 text-center">Discipleship Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredConverts.map(convert => (
                      <tr key={convert.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                          <div className="font-black text-slate-900 text-base">{convert.name}</div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5">{convert.phone || 'No Phone'}</div>
                        </td>
                        <td className="p-5 font-bold text-emerald-700">{convert.localAssembly}</td>
                        <td className="p-5">
                          <span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg border bg-orange-50 text-orange-700 border-orange-200">
                            {convert.soulWinner || 'General Event'}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex justify-center gap-3">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${convert.waterBaptized === 'Yes' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              <Droplet size={12} className={convert.waterBaptized === 'Yes' ? 'fill-current' : ''}/> Water
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${convert.spiritBaptism === 'Yes' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              <Wind size={12} className={convert.spiritBaptism === 'Yes' ? 'fill-current' : ''}/> Spirit
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredConverts.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-slate-400 font-bold italic">No converts found in the Directory.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}