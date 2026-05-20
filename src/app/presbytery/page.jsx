"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Shield, ShieldCheck, Users, Search, PhoneCall, Building2, Target, UserPlus, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

export default function Presbytery() {
  const [members, setMembers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('ordained'); 

  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ORDAINED ROSTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All Offices');
  const [filterAssembly, setFilterAssembly] = useState('All Assemblies');

  // --- APPOINTMENT FORM STATES ---
  const [appointMemberId, setAppointMemberId] = useState('');
  const [appointLevel, setAppointLevel] = useState('');
  const [appointCommittee, setAppointCommittee] = useState('');
  const [customCommittee, setCustomCommittee] = useState('');
  const [appointDesignation, setAppointDesignation] = useState('');
  const [appointYear, setAppointYear] = useState('');

  // --- APPOINTMENT DIRECTORY STATES ---
  const [appointSearch, setAppointSearch] = useState('');
  const [filterAppointLevel, setFilterAppointLevel] = useState('All Levels');
  const [filterAppointCommittee, setFilterAppointCommittee] = useState('All Committees');
  const [filterAppointRole, setFilterAppointRole] = useState('All Roles');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMembers(fetchedMembers);
    });

    const unsubAppointments = onSnapshot(collection(db, 'leadership_appointments'), (snapshot) => {
      const fetchedAppts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(fetchedAppts);
    });

    return () => { unsubMembers(); unsubAppointments(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- DYNAMIC DEFINITIONS ---
  const presbyteryRoles = ["Elder", "Deacon", "Deaconess", "Presiding Elder", "Presiding Deacon", "District Minister", "District Minister's Wife"];
  const councilMembers = members.filter(m => presbyteryRoles.includes(m.churchRole));
  const allAssemblies = [...new Set(["Central", ...members.map(m => m.localAssembly).filter(Boolean)])].sort();

  const leadershipLevels = ["District", "Local"];
  
  const committees = [
    "Audit Committee", "Bible Study/Home Cell", "Chaplaincy Committee", "Children's Ministry",
    "Counselling Committee", "Estate Committee", "Evangelism Ministry", "Executive Committee",
    "Finance Committee", "Home and Urban Missions", "Marriage Committee", "Men's Ministry",
    "Ministerial Committee", "Missions Committee", "Music Committee", "PEMEM",
    "Pensions Committee", "PENTSOS Committee", "Persons with Disabilities Committee",
    "Prisons Ministry", "Transport Committee", "Welfare Committee", "Women's Ministry", "Youth Ministry"
  ];

  const designations = [
    "Chairman", "Leader", "Assistant Leader", "Bible Study Leader", "Home Cell Leader",
    "Discipleship Leader", "Secretary", "Financial Secretary", "Bible Study Secretary",
    "Home Cell Secretary", "Discipleship Secretary", "Treasurer", "Organizer", "Co-opted", "Member"
  ];

  // --- ORDAINED FILTERING LOGIC ---
  const safeSearch = (searchTerm || '').toLowerCase();
  const displayedOfficers = councilMembers.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(safeSearch) || (m.phone || '').includes(safeSearch);
    const matchesRole = filterRole === 'All Offices' || m.churchRole === filterRole;
    const matchesAssembly = filterAssembly === 'All Assemblies' || m.localAssembly === filterAssembly;
    return matchesSearch && matchesRole && matchesAssembly;
  });

  // --- APPOINTMENT FILTERING LOGIC ---
  const safeAppointSearch = (appointSearch || '').toLowerCase();
  const displayedAppointments = appointments.filter(a => {
    const matchesSearch = (a.memberName || '').toLowerCase().includes(safeAppointSearch);
    const matchesLevel = filterAppointLevel === 'All Levels' || a.level === filterAppointLevel;
    const matchesCommittee = filterAppointCommittee === 'All Committees' || a.committee === filterAppointCommittee;
    const matchesRole = filterAppointRole === 'All Roles' || a.designation === filterAppointRole;
    return matchesSearch && matchesLevel && matchesCommittee && matchesRole;
  });

  // --- APPOINTMENT ACTIONS ---
  const handleAppointLeader = async (e) => {
    e.preventDefault();
    
    const finalCommittee = appointCommittee === '++ Add Custom ++' ? customCommittee : appointCommittee;

    if (!appointMemberId || !appointLevel || !finalCommittee || !appointDesignation) {
      showNotification('error', 'Please fill in all required leadership fields.');
      return;
    }

    setIsSubmitting(true);
    const selectedMember = members.find(m => m.id === appointMemberId);

    try {
      await addDoc(collection(db, 'leadership_appointments'), {
        memberId: selectedMember.id,
        memberName: selectedMember.name || 'Unknown',
        memberPhone: selectedMember.phone || 'N/A',
        level: appointLevel,
        committee: finalCommittee,
        designation: appointDesignation,
        yearAppointed: appointYear || new Date().getFullYear().toString(),
        timestamp: new Date().toISOString()
      });
      
      showNotification('success', `${selectedMember.name} has been appointed to the council!`);
      
      setAppointMemberId(''); setAppointLevel(''); setAppointCommittee(''); 
      setCustomCommittee(''); setAppointDesignation(''); setAppointYear('');
      
    } catch (error) {
      showNotification('error', 'Failed to secure appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAppointment = async (id, name) => {
    if (window.confirm(`Remove ${name} from this leadership position?`)) {
      try {
        await deleteDoc(doc(db, 'leadership_appointments', id));
        showNotification('success', 'Appointment successfully revoked.');
      } catch (error) { showNotification('error', 'Failed to revoke appointment.'); }
    }
  };

  // --- KPI CALCULATIONS ---
  const eldersCount = councilMembers.filter(m => m.churchRole === 'Elder' || m.churchRole === 'Presiding Elder').length;
  const deaconsCount = councilMembers.filter(m => m.churchRole === 'Deacon' || m.churchRole === 'Presiding Deacon').length;
  const deaconessCount = councilMembers.filter(m => m.churchRole === 'Deaconess').length;

  // PREMIUM GLASS INPUT STYLE
  const inputStyle = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all text-sm text-white shadow-sm font-bold placeholder:text-purple-300 [&>option]:text-gray-900";

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#6b21a8] via-[#4c1d95] to-[#312e81] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Decorative ambient glowing orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/30 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/30 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-8 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><Shield size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Presbytery Command</h1>
              <p className="font-bold text-purple-200">Official Directory & Leadership Appointments</p>
            </div>
          </div>

          {/* MASTER TABS */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button onClick={() => setActiveTab('ordained')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm border backdrop-blur-md ${activeTab === 'ordained' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-purple-200 border-white/10 hover:bg-white/10'}`}>
              <Shield size={18} /> Ordained Officers ({councilMembers.length})
            </button>
            <button onClick={() => setActiveTab('appointed')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm border backdrop-blur-md ${activeTab === 'appointed' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-purple-200 border-white/10 hover:bg-white/10'}`}>
              <Target size={18} /> Committee Appointments ({appointments.length})
            </button>
          </div>

          {/* ================= TAB 1: ORDAINED OFFICERS ================= */}
          {activeTab === 'ordained' && (
            <div className="animate-fade-in space-y-6">
              
              {/* GLASS KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-indigo-500/20 backdrop-blur-xl border border-indigo-400/30 rounded-[2rem] p-6 shadow-xl flex flex-col relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Total Officers</p>
                    <h3 className="text-4xl font-extrabold text-white">{councilMembers.length}</h3>
                  </div>
                  <Shield size={100} className="absolute -bottom-4 -right-4 text-indigo-400/20 transform rotate-12" />
                </div>
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl flex items-center gap-4 hover:bg-white/15 transition-colors">
                  <div className="bg-blue-500/30 text-blue-200 p-4 rounded-xl border border-blue-400/20"><ShieldCheck size={24} /></div>
                  <div>
                    <p className="text-purple-200 text-[10px] font-black uppercase tracking-widest">Elders</p>
                    <h3 className="text-3xl font-black text-white">{eldersCount}</h3>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl flex items-center gap-4 hover:bg-white/15 transition-colors">
                  <div className="bg-amber-500/30 text-amber-200 p-4 rounded-xl border border-amber-400/20"><Users size={24} /></div>
                  <div>
                    <p className="text-purple-200 text-[10px] font-black uppercase tracking-widest">Deacons</p>
                    <h3 className="text-3xl font-black text-white">{deaconsCount}</h3>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl flex items-center gap-4 hover:bg-white/15 transition-colors">
                  <div className="bg-emerald-500/30 text-emerald-200 p-4 rounded-xl border border-emerald-400/20"><Users size={24} /></div>
                  <div>
                    <p className="text-purple-200 text-[10px] font-black uppercase tracking-widest">Deaconesses</p>
                    <h3 className="text-3xl font-black text-white">{deaconessCount}</h3>
                  </div>
                </div>
              </div>

              {/* FILTERS */}
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-purple-300" size={18}/>
                    <input type="text" placeholder="Search officer name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`pl-10 ${inputStyle}`} />
                  </div>
                  <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={inputStyle}>
                    <option value="All Offices">All Offices</option>
                    {presbyteryRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select value={filterAssembly} onChange={e => setFilterAssembly(e.target.value)} className={inputStyle}>
                    <option value="All Assemblies">All Assemblies</option>
                    {allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* TABLE */}
              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/10">
                   <h2 className="text-lg font-extrabold text-white flex items-center gap-2"><Building2 size={20} className="text-purple-300" /> Ordained Roster</h2>
                   <span className="bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">{displayedOfficers.length} Displayed</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead>
                      <tr className="bg-white/5 text-purple-200 font-extrabold border-b border-white/10 uppercase tracking-wider text-xs">
                        <th className="p-5">Officer Name</th><th className="p-5">Office / Rank</th><th className="p-5">Local Assembly</th><th className="p-5 text-right">Direct Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {displayedOfficers.map(m => (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-5">
                            <div className="font-extrabold text-white text-base">{m.name || 'Unknown'}</div>
                            {m.occupation && <div className="text-xs font-bold text-purple-300 mt-0.5">{m.occupation}</div>}
                          </td>
                          <td className="p-5">
                            <span className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider border ${m.churchRole.includes('Elder') ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' : m.churchRole.includes('Deaconess') ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : m.churchRole.includes('Minister') ? 'bg-purple-500/20 text-purple-200 border-purple-400/30' : 'bg-amber-500/20 text-amber-200 border-amber-400/30'}`}>
                              {m.churchRole}
                            </span>
                          </td>
                          <td className="p-5 text-purple-100 font-bold flex items-center gap-2"><Building2 size={16} className="text-purple-300" /> {m.localAssembly}</td>
                          <td className="p-5 text-right">
                            <a href={`tel:${m.phone}`} className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition-colors shadow-sm border border-white/10"><PhoneCall size={16} /> {m.phone}</a>
                          </td>
                        </tr>
                      ))}
                      {displayedOfficers.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-purple-300 font-bold italic">No officers found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: COMMITTEE APPOINTMENTS ================= */}
          {activeTab === 'appointed' && (
            <div className="animate-fade-in space-y-6">
              
              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 p-6 md:p-8">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-3 mb-6">
                  <Shield size={24} className="text-purple-300" /> Appoint Leadership Council
                </h2>
                
                <form onSubmit={handleAppointLeader} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-purple-200 mb-2 ml-1">Select Member</label>
                    <select required value={appointMemberId} onChange={e => setAppointMemberId(e.target.value)} className={inputStyle}>
                      <option value="">- Search Name -</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-purple-200 mb-2 ml-1">Level</label>
                    <select required value={appointLevel} onChange={e => setAppointLevel(e.target.value)} className={inputStyle}>
                      <option value="">- Select -</option>
                      {leadershipLevels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="bg-black/20 p-4 -m-4 rounded-[1.5rem] border border-white/5">
                    <label className="block text-xs font-black uppercase tracking-widest text-purple-200 mb-2 ml-1">Committee / Ministry</label>
                    <select required value={appointCommittee} onChange={e => { setAppointCommittee(e.target.value); setCustomCommittee(''); }} className={inputStyle}>
                      <option value="">- Select -</option>
                      {committees.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="++ Add Custom ++" className="text-blue-600 font-bold">++ Add Custom ++</option>
                    </select>
                    {appointCommittee === '++ Add Custom ++' && (
                      <input required type="text" placeholder="Type new committee name..." value={customCommittee} onChange={(e) => setCustomCommittee(e.target.value)} className={`mt-3 border-purple-400 ring-4 ring-purple-500/20 ${inputStyle}`} autoFocus />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-purple-200 mb-2 ml-1">Designation / Role</label>
                    <select required value={appointDesignation} onChange={e => setAppointDesignation(e.target.value)} className={inputStyle}>
                      <option value="">- Select Role -</option>
                      {designations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-purple-200 mb-2 ml-1">Year Appointed</label>
                    <input type="text" placeholder="YYYY" value={appointYear} onChange={e => setAppointYear(e.target.value)} className={inputStyle} />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white border border-white/20 ${isSubmitting ? 'bg-white/10 cursor-not-allowed' : 'bg-[#4f46e5] hover:bg-[#4338ca] shadow-indigo-500/20'}`}>
                      {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><UserPlus size={18} /> Add Leader</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-lg font-extrabold text-white mb-6">Official Leadership Directory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 text-purple-300" size={18}/>
                      <input type="text" placeholder="Search leader..." value={appointSearch} onChange={e => setAppointSearch(e.target.value)} className={`pl-10 ${inputStyle}`} />
                    </div>
                    <select value={filterAppointLevel} onChange={e => setFilterAppointLevel(e.target.value)} className={inputStyle}>
                      <option value="All Levels">All Levels</option>
                      {leadershipLevels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select value={filterAppointCommittee} onChange={e => setFilterAppointCommittee(e.target.value)} className={inputStyle}>
                      <option value="All Committees">All Committees</option>
                      {committees.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterAppointRole} onChange={e => setFilterAppointRole(e.target.value)} className={inputStyle}>
                      <option value="All Roles">All Roles</option>
                      {designations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead>
                      <tr className="bg-white/5 text-purple-200 font-extrabold border-b border-white/10 text-xs uppercase tracking-wider">
                        <th className="p-5">Name</th><th className="p-5">Phone</th><th className="p-5">Level</th><th className="p-5">Committee</th><th className="p-5">Designation</th><th className="p-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {displayedAppointments.map(a => (
                        <tr key={a.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-5 font-extrabold text-white">{a.memberName}</td>
                          <td className="p-5 text-purple-200 font-mono font-bold">{a.memberPhone}</td>
                          <td className="p-5"><span className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">{a.level}</span></td>
                          <td className="p-5 font-bold text-indigo-300">{a.committee}</td>
                          <td className="p-5 font-bold text-white">{a.designation}</td>
                          <td className="p-5 text-center">
                            <button onClick={() => handleRemoveAppointment(a.id, a.memberName)} className="p-2 text-purple-300 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Revoke Appointment">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {displayedAppointments.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-purple-300 font-bold italic">No leaders found. Time to appoint your council!</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}