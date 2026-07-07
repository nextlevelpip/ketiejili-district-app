"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Shield, ShieldCheck, Users, Search, PhoneCall, Building2, Target, UserPlus, CheckCircle2, AlertCircle, Loader2, Trash2, FileText, CalendarDays } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

export default function Presbytery() {
  const [members, setMembers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('ordained'); 

  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CUSTOM MODAL STATE ---
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

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
  const [appointTenureExpiry, setAppointTenureExpiry] = useState(''); // NEW: Tenure Tracking

  // --- APPOINTMENT DIRECTORY STATES ---
  const [appointSearch, setAppointSearch] = useState('');
  const [filterAppointLevel, setFilterAppointLevel] = useState('All Levels');
  const [filterAppointCommittee, setFilterAppointCommittee] = useState('All Committees');
  const [filterAppointRole, setFilterAppointRole] = useState('All Roles');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
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
  
  const activeMembers = members.filter(m => m.membershipStatus === 'Active Member' || m.membershipStatus === 'Active' || !m.membershipStatus);

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
    const matchesSearch = String(m.name || '').toLowerCase().includes(safeSearch) || String(m.phone || '').includes(safeSearch);
    const matchesRole = filterRole === 'All Offices' || m.churchRole === filterRole;
    const matchesAssembly = filterAssembly === 'All Assemblies' || m.localAssembly === filterAssembly;
    return matchesSearch && matchesRole && matchesAssembly;
  });

  // --- APPOINTMENT FILTERING LOGIC ---
  const safeAppointSearch = (appointSearch || '').toLowerCase();
  const displayedAppointments = appointments.filter(a => {
    const matchesSearch = String(a.memberName || '').toLowerCase().includes(safeAppointSearch);
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
        tenureExpiry: appointTenureExpiry || '', // INJECTED TENURE TRACKING
        timestamp: new Date().toISOString()
      });
      
      showNotification('success', `${selectedMember.name} has been appointed to the council!`);
      
      setAppointMemberId(''); setAppointLevel(''); setAppointCommittee(''); 
      setCustomCommittee(''); setAppointDesignation(''); setAppointYear(''); setAppointTenureExpiry('');
      
    } catch (error) {
      showNotification('error', 'Failed to secure appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CUSTOM DELETE MODAL LOGIC ---
  const triggerDeleteAppointment = (id, name) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const confirmDeleteAppointment = async () => {
    try {
      await deleteDoc(doc(db, 'leadership_appointments', deleteModal.id));
      showNotification('success', 'Appointment successfully revoked.');
    } catch (error) { 
      showNotification('error', 'Failed to revoke appointment.'); 
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  // --- KPI CALCULATIONS ---
  const eldersCount = councilMembers.filter(m => m.churchRole === 'Elder' || m.churchRole === 'Presiding Elder').length;
  const deaconsCount = councilMembers.filter(m => m.churchRole === 'Deacon' || m.churchRole === 'Presiding Deacon').length;
  const deaconessCount = councilMembers.filter(m => m.churchRole === 'Deaconess').length;

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec) WITH DROPDOWN FIX
  const inputStyle = "w-full px-4 py-3 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white [&>optgroup>option]:bg-[#001D3D] [&>optgroup>option]:text-white";

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
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Revoke Appointment</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  Are you sure you want to remove <span className="text-white">{deleteModal.name}</span> from this leadership position?
                </p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                  className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteAppointment}
                  className="flex-1 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                >
                  Confirm Removal
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-xs uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><Shield size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Presbytery Command</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Official Directory & Leadership Appointments.</p>
              </div>
            </div>

            {/* MASTER TABS */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('ordained')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border ${activeTab === 'ordained' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <Shield size={12} /> Ordained Officers ({councilMembers.length})
              </button>
              <button onClick={() => setActiveTab('appointed')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border ${activeTab === 'appointed' ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <Target size={12} /> Committee Appointments ({appointments.length})
              </button>
            </div>
          </div>

          {/* ================= TAB 1: ORDAINED OFFICERS ================= */}
          {activeTab === 'ordained' && (
            <div className="animate-fade-in space-y-6">
              
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                <div className="bg-[#000814] border border-[#003566] rounded-2xl p-6 shadow-inner flex flex-col relative overflow-hidden justify-center">
                  <div className="relative z-10">
                    <p className="text-[#FFC300] text-[9px] font-black uppercase tracking-widest mb-1.5">Total Officers</p>
                    <h3 className="text-3xl font-extrabold text-white">{councilMembers.length}</h3>
                  </div>
                  <Shield size={80} className="absolute -bottom-4 -right-4 text-[#FFC300]/10 transform rotate-12" />
                </div>
                <div className="bg-[#000814] border border-[#003566] rounded-2xl p-6 shadow-inner flex items-center gap-4 hover:border-[#FFC300]/30 transition-colors">
                  <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl border border-blue-500/30"><ShieldCheck size={20} /></div>
                  <div>
                    <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1">Elders</p>
                    <h3 className="text-2xl font-black text-white">{eldersCount}</h3>
                  </div>
                </div>
                <div className="bg-[#000814] border border-[#003566] rounded-2xl p-6 shadow-inner flex items-center gap-4 hover:border-[#FFC300]/30 transition-colors">
                  <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl border border-amber-500/30"><Users size={20} /></div>
                  <div>
                    <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1">Deacons</p>
                    <h3 className="text-2xl font-black text-white">{deaconsCount}</h3>
                  </div>
                </div>
                <div className="bg-[#000814] border border-[#003566] rounded-2xl p-6 shadow-inner flex items-center gap-4 hover:border-[#FFC300]/30 transition-colors">
                  <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/30"><Users size={20} /></div>
                  <div>
                    <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1">Deaconesses</p>
                    <h3 className="text-2xl font-black text-white">{deaconessCount}</h3>
                  </div>
                </div>
              </div>

              {/* FILTERS */}
              <div className="bg-[#000814] p-5 rounded-2xl border border-[#003566] mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-white/30" size={16}/>
                    <input type="text" placeholder="Search officer name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`pl-9 ${inputStyle}`} />
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
              <div className="bg-[#000814] rounded-2xl shadow-2xl border border-[#003566] overflow-hidden">
                <div className="p-5 border-b border-[#003566] flex items-center justify-between bg-[#001D3D]">
                   <h2 className="text-xs font-extrabold text-white uppercase tracking-widest flex items-center gap-2"><Building2 size={16} className="text-[#FFC300]" /> Ordained Roster</h2>
                   <span className="bg-[#000814] border border-[#003566] text-[#FFC300] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{displayedOfficers.length} Displayed</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left whitespace-nowrap text-xs">
                    <thead className="bg-[#001D3D] text-[#FFC300] font-extrabold border-b border-[#003566] uppercase tracking-widest text-[9px]">
                      <tr>
                        <th className="p-5">Officer Name</th><th className="p-5">Office / Rank</th><th className="p-5">Local Assembly</th><th className="p-5 text-right">Direct Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#003566]">
                      {displayedOfficers.map(m => (
                        <tr key={m.id} className="hover:bg-[#001D3D]/50 transition-colors">
                          <td className="p-5">
                            <div className="font-extrabold text-white text-sm">{m.name || 'Unknown'}</div>
                            {m.occupation && <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">{m.occupation}</div>}
                          </td>
                          <td className="p-5">
                            <span className={`px-2 py-1 rounded border font-black text-[8px] uppercase tracking-widest ${m.churchRole.includes('Elder') ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : m.churchRole.includes('Deaconess') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : m.churchRole.includes('Minister') ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                              {m.churchRole}
                            </span>
                          </td>
                          <td className="p-5 text-white/70 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"><Building2 size={14} className="text-[#FFC300]" /> {m.localAssembly}</td>
                          <td className="p-5 text-right">
                            <a href={`tel:${m.phone}`} className="inline-flex items-center gap-2 bg-[#001D3D] text-white px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-[#003566] transition-colors shadow-sm border border-[#003566]"><PhoneCall size={14} className="text-[#FFC300]" /> {m.phone}</a>
                          </td>
                        </tr>
                      ))}
                      {displayedOfficers.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-white/50 font-bold italic text-xs">No officers found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: COMMITTEE APPOINTMENTS ================= */}
          {activeTab === 'appointed' && (
            <div className="animate-fade-in space-y-6">
              
              <div className="bg-[#000814] rounded-2xl shadow-xl border border-[#003566] p-6 md:p-8">
                <h2 className="text-sm uppercase tracking-widest font-extrabold text-white flex items-center gap-2 mb-6">
                  <Shield size={18} className="text-[#FFC300]" /> Appoint Leadership Council
                </h2>
                
                <form onSubmit={handleAppointLeader} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Select Member</label>
                      <select required value={appointMemberId} onChange={e => setAppointMemberId(e.target.value)} className={inputStyle}>
                        <option value="">- Search Name -</option>
                        {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.churchRole || 'Member'})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Level</label>
                      <select required value={appointLevel} onChange={e => setAppointLevel(e.target.value)} className={inputStyle}>
                        <option value="">- Select -</option>
                        {leadershipLevels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="bg-[#001D3D] p-5 -m-5 rounded-[1.5rem] border border-[#003566]">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-[#FFC300] mb-2 ml-1">Committee / Ministry</label>
                      <select required value={appointCommittee} onChange={e => { setAppointCommittee(e.target.value); setCustomCommittee(''); }} className={inputStyle}>
                        <option value="">- Select -</option>
                        {committees.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="++ Add Custom ++" className="text-blue-600 font-bold">++ Add Custom ++</option>
                      </select>
                      {appointCommittee === '++ Add Custom ++' && (
                        <input required type="text" placeholder="Type new committee name..." value={customCommittee} onChange={(e) => setCustomCommittee(e.target.value)} className={`mt-3 ${inputStyle}`} autoFocus />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Designation / Role</label>
                      <select required value={appointDesignation} onChange={e => setAppointDesignation(e.target.value)} className={inputStyle}>
                        <option value="">- Select Role -</option>
                        {designations.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Year Appointed</label>
                      <input type="text" placeholder="YYYY" value={appointYear} onChange={e => setAppointYear(e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-[#FFC300] mb-2 ml-1 flex items-center gap-1">
                        <CalendarDays size={12} /> Tenure Expiry / Review Date
                      </label>
                      <input type="date" value={appointTenureExpiry} onChange={e => setAppointTenureExpiry(e.target.value)} className={inputStyle} />
                    </div>
                  </div>

                  <div className="flex items-end justify-end border-t border-[#003566] pt-4 mt-2">
                    <button type="submit" disabled={isSubmitting} className={`w-full md:w-auto px-10 py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-[#000814] text-[10px] uppercase tracking-widest ${isSubmitting ? 'bg-white/10 text-white/50 cursor-not-allowed border border-[#003566]' : 'bg-[#FFC300] hover:bg-[#FFD60A] border border-[#FFC300]'}`}>
                      {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><UserPlus size={16} /> Add Leader</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-[#000814] rounded-2xl shadow-xl border border-[#003566] overflow-hidden">
                <div className="p-5 border-b border-[#003566]">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-white mb-5 flex items-center gap-2"><FileText size={16} className="text-[#FFC300]" /> Official Leadership Directory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-white/30" size={14}/>
                      <input type="text" placeholder="Search leader..." value={appointSearch} onChange={e => setAppointSearch(e.target.value)} className={`pl-9 ${inputStyle}`} />
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

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left whitespace-nowrap text-xs">
                    <thead className="bg-[#001D3D] text-[#FFC300] font-extrabold border-b border-[#003566] text-[9px] uppercase tracking-widest">
                      <tr>
                        <th className="p-5">Name</th><th className="p-5">Phone</th><th className="p-5">Level</th><th className="p-5">Committee</th><th className="p-5">Designation</th><th className="p-5">Tenure / Review</th><th className="p-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#003566]">
                      {displayedAppointments.map(a => {
                        const isExpired = a.tenureExpiry ? new Date(a.tenureExpiry) < new Date() : false;
                        return (
                          <tr key={a.id} className="hover:bg-[#001D3D]/50 transition-colors">
                            <td className="p-5 font-extrabold text-white text-sm">{a.memberName}</td>
                            <td className="p-5 text-[#FFC300] font-mono font-bold">{a.memberPhone}</td>
                            <td className="p-5"><span className="bg-[#000814] border border-[#003566] text-white/70 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">{a.level}</span></td>
                            <td className="p-5 font-bold text-blue-300 uppercase tracking-widest text-[10px]">{a.committee}</td>
                            <td className="p-5 font-bold text-white/70">{a.designation}</td>
                            <td className="p-5">
                              {a.tenureExpiry ? (
                                <span className={`px-2 py-1 rounded border text-[8px] font-black uppercase tracking-widest ${isExpired ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                                  {new Date(a.tenureExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              ) : (
                                <span className="text-white/30 italic text-[10px] font-bold">No Date Set</span>
                              )}
                            </td>
                            <td className="p-5 text-center">
                              <button onClick={() => triggerDeleteAppointment(a.id, a.memberName)} className="p-2 text-white/30 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Revoke Appointment">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {displayedAppointments.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-white/50 font-bold italic text-xs">No leaders found. Time to appoint your council!</td></tr>}
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