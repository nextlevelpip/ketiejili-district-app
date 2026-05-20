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

  const totalPrograms = filteredLogs.length;
  const totalAdultCop = filteredLogs.reduce((sum, log) => sum + (log.adultSoulsCop || 0), 0);
  const totalOtherNonCop = filteredLogs.reduce((sum, log) => sum + (log.otherSoulsNonCop || 0), 0);
  const totalGospelSunday = filteredLogs.reduce((sum, log) => sum + (log.gospelSundaySouls || 0), 0);
  const totalChildren = filteredLogs.reduce((sum, log) => sum + (log.childrenWon || 0), 0);

  const inputStyle = "w-full p-3.5 bg-black/20 border border-white/10 focus:bg-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/20 rounded-xl font-bold text-white outline-none transition-all text-sm placeholder:text-orange-200/50";
  const labelStyle = "text-[10px] font-black text-orange-200 uppercase ml-1 mb-2 block tracking-widest";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-orange-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#c2410c] via-[#991b1b] to-[#450a0a] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Ambient background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
              {notification.message}
            </div>
          )}

          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><Flame size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight">Evangelism & Souls</h1>
              <p className="font-bold text-orange-200">Track outreach efforts perfectly aligned with reporting.</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
            <button onClick={() => setActiveTab('log')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border backdrop-blur-md ${activeTab === 'log' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-orange-200 border-white/10 hover:bg-white/10'}`}>
              <Megaphone size={16}/> Log Outreach
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border backdrop-blur-md ${activeTab === 'history' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-orange-200 border-white/10 hover:bg-white/10'}`}>
              <FileSpreadsheet size={16}/> Reports ({logs.length})
            </button>
            <button onClick={() => setActiveTab('souls')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border backdrop-blur-md ${activeTab === 'souls' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-orange-200 border-white/10 hover:bg-white/10'}`}>
              <Users size={16}/> Harvested Souls ({converts.length})
            </button>
          </div>

          {activeTab === 'log' && (
            <div className="bg-white/10 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-xl border border-white/10 max-w-4xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-red-400"></div>
              
              <div className="mb-6 border-b border-white/10 pb-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-orange-100">Record Evangelism Event</h2>
                <p className="text-xs font-bold text-orange-200/70">Inputs are strictly aligned with the Headquarters portal.</p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className={labelStyle}>Date of Outreach *</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyle} /></div>
                  <div><label className={labelStyle}>Executing Assembly *</label><select required value={localAssembly} onChange={e => setLocalAssembly(e.target.value)} className={inputStyle}>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  <div><label className={labelStyle}>Strategy / Type *</label><select required value={outreachType} onChange={e => setOutreachType(e.target.value)} className={inputStyle}><option value="">- Select Type -</option>{outreachTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className={labelStyle}>Target Demographic *</label><select required value={targetDemographic} onChange={e => setTargetDemographic(e.target.value)} className={inputStyle}>{pentChmsDemographics.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                </div>

                <div><label className={labelStyle}>Specific Location / Community *</label><input required type="text" placeholder="e.g. Katanga Market Square" value={location} onChange={e => setLocation(e.target.value)} className={inputStyle} /></div>

                <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-orange-200 mb-4 flex items-center gap-2"><Target size={16}/> Souls Won Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelStyle}>Adult Souls Won (COP)</label><input type="number" min="0" placeholder="0" value={adultSoulsCop} onChange={e => setAdultSoulsCop(e.target.value)} className={inputStyle} /></div>
                    <div><label className={labelStyle}>Other Souls Won (Non-COP)</label><input type="number" min="0" placeholder="0" value={otherSoulsNonCop} onChange={e => setOtherSoulsNonCop(e.target.value)} className={inputStyle} /></div>
                    <div><label className={labelStyle}>Gospel Sunday Souls</label><input type="number" min="0" placeholder="0" value={gospelSundaySouls} onChange={e => setGospelSundaySouls(e.target.value)} className={inputStyle} /></div>
                    <div><label className={labelStyle}>Children Won And Retained</label><input type="number" min="0" placeholder="0" value={childrenWon} onChange={e => setChildrenWon(e.target.value)} className={inputStyle} /></div>
                  </div>
                </div>

                <div><label className={labelStyle}>Testimonies & Notes</label><textarea rows="3" placeholder="Any notable miracles?" value={testimonies} onChange={e => setTestimonies(e.target.value)} className={inputStyle} /></div>

                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-900/30 transition-all flex justify-center items-center gap-3 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Save Outreach Log</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden">
                <div className="bg-black/20 border-b border-white/10 p-6">
                  <h2 className="text-lg font-black text-white tracking-tight">Auto-Generated Report</h2>
                </div>
                <div className="p-8 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center"><p className="text-[10px] font-black text-orange-200 uppercase">Programs</p><p className="text-2xl font-black">{totalPrograms}</p></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center"><p className="text-[10px] font-black text-orange-200 uppercase">Adult COP</p><p className="text-2xl font-black">{totalAdultCop}</p></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center"><p className="text-[10px] font-black text-orange-200 uppercase">Gospel</p><p className="text-2xl font-black">{totalGospelSunday}</p></div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center"><p className="text-[10px] font-black text-orange-200 uppercase">Children</p><p className="text-2xl font-black">{totalChildren}</p></div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative"><Search className="absolute left-4 top-3.5 text-orange-200/50" size={18}/><input placeholder="Search locations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-sm outline-none text-white transition-all" /></div>
                <select value={fDemographic} onChange={e => setFDemographic(e.target.value)} className="p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-xs text-white focus:outline-none"><option value="All Categories">All Demographics</option>{pentChmsDemographics.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-xs text-white focus:outline-none"><option value="All Assemblies">All Assemblies</option>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-black/20 border-b border-white/10 text-[10px] font-black text-orange-200 uppercase tracking-widest"><th className="p-5">Date</th><th className="p-5">Location & Strategy</th><th className="p-5">Demographic</th><th className="p-5 text-center">Total Souls</th>{isTier1 && <th className="p-5 text-center">Action</th>}</tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-5 font-bold text-white"><CalendarDays size={14} className="inline mr-2 text-orange-400" />{new Date(log.date).toLocaleDateString()}</td>
                        <td className="p-5 font-black text-white">{log.location}<br/><span className="text-[10px] font-bold text-orange-200/60 uppercase">{log.outreachType}</span></td>
                        <td className="p-5 font-bold text-orange-300">{log.targetDemographic}</td>
                        <td className="p-5 text-center font-black text-lg text-red-300">{log.totalSoulsWon || 0}</td>
                        {isTier1 && <td className="p-5 text-center"><button onClick={() => handleDeleteLog(log.id, log.location)} className="p-2 text-white/40 hover:text-red-400"><Trash2 size={16}/></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'souls' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white/10 backdrop-blur-xl p-5 rounded-2xl flex items-center gap-4 border border-white/10">
                <div className="bg-blue-500/20 text-blue-200 p-3 rounded-xl border border-blue-400/20"><Target size={24}/></div>
                <div><p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Discipleship Radar</p><h3 className="text-lg font-bold text-white">Tracking all members registered as "New Converts"</h3></div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative"><Search className="absolute left-4 top-3.5 text-orange-200/50" size={18}/><input placeholder="Search convert names..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-sm outline-none text-white transition-all" /></div>
                <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="p-3 bg-black/20 border border-white/10 rounded-xl font-bold text-xs text-white focus:outline-none"><option value="All Assemblies">All Assemblies</option>{assemblies.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-black/20 border-b border-white/10 text-[10px] font-black text-orange-200 uppercase tracking-widest"><th className="p-5">Convert Name</th><th className="p-5">Assembly</th><th className="p-5">HQ Category</th><th className="p-5 text-center">Status</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredConverts.map(convert => (
                      <tr key={convert.id} className="hover:bg-white/5">
                        <td className="p-5 font-black text-white">{convert.name}</td>
                        <td className="p-5 font-bold text-emerald-300">{convert.localAssembly}</td>
                        <td className="p-5"><span className="text-[10px] font-black uppercase px-3 py-1 rounded-lg border bg-orange-500/20 text-orange-200 border-orange-400/20">{convert.soulWinner || 'General'}</span></td>
                        <td className="p-5"><div className="flex justify-center gap-3"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${convert.waterBaptized === 'Yes' ? 'bg-blue-500/20 text-blue-200 border-blue-400/20' : 'bg-white/5 text-white/30 border-white/5'}`}>Water</span><span className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${convert.spiritBaptism === 'Yes' ? 'bg-purple-500/20 text-purple-200 border-purple-400/20' : 'bg-white/5 text-white/30 border-white/5'}`}>Spirit</span></div></td>
                      </tr>
                    ))}
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