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
  
  // Expanded Committees from Screenshot
  const committees = [
    "Audit Committee",
    "Bible Study/Home Cell",
    "Chaplaincy Committee",
    "Children's Ministry",
    "Counselling Committee",
    "Estate Committee",
    "Evangelism Ministry",
    "Executive Committee",
    "Finance Committee",
    "Home and Urban Missions",
    "Marriage Committee",
    "Men's Ministry",
    "Ministerial Committee",
    "Missions Committee",
    "Music Committee",
    "PEMEM",
    "Pensions Committee",
    "PENTSOS Committee",
    "Persons with Disabilities Committee",
    "Prisons Ministry",
    "Transport Committee",
    "Welfare Committee",
    "Women's Ministry",
    "Youth Ministry"
  ];

  // Merged Designations
  const designations = [
    "Chairman",
    "Leader",
    "Assistant Leader",
    "Bible Study Leader",
    "Home Cell Leader",
    "Discipleship Leader",
    "Secretary",
    "Financial Secretary",
    "Bible Study Secretary",
    "Home Cell Secretary",
    "Discipleship Secretary",
    "Treasurer",
    "Organizer",
    "Co-opted",
    "Member"
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

  const inputStyle = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm text-gray-700 shadow-sm font-bold";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto relative pb-10">
        
        {notification.message && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-extrabold">{notification.message}</span>
          </div>
        )}

        <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tight mb-8">Presbytery Command</h1>

        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-200 pb-5">
          <button onClick={() => setActiveTab('ordained')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'ordained' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
            <Shield size={18} /> Ordained Officers ({councilMembers.length})
          </button>
          <button onClick={() => setActiveTab('appointed')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'appointed' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
            <Target size={18} /> Committee Appointments ({appointments.length})
          </button>
        </div>

        {/* ================= TAB 1: ORDAINED OFFICERS ================= */}
        {activeTab === 'ordained' && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-indigo-600 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-indigo-100 text-sm font-bold mb-1 uppercase tracking-wider">Total Officers</p>
                  <h3 className="text-4xl font-extrabold text-white">{councilMembers.length}</h3>
                </div>
                <Shield size={100} className="absolute -bottom-4 -right-4 text-indigo-500/30 transform rotate-12" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 text-blue-600 p-4 rounded-xl"><ShieldCheck size={24} /></div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Elders</p>
                  <h3 className="text-2xl font-extrabold text-gray-800">{eldersCount}</h3>
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 text-amber-600 p-4 rounded-xl"><Users size={24} /></div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Deacons</p>
                  <h3 className="text-2xl font-extrabold text-gray-800">{deaconsCount}</h3>
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl"><Users size={24} /></div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Deaconesses</p>
                  <h3 className="text-2xl font-extrabold text-gray-800">{deaconessCount}</h3>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={18}/>
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

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                 <h2 className="text-lg font-extrabold text-indigo-900 flex items-center gap-2"><Building2 size={20} className="text-indigo-500" /> Ordained Roster</h2>
                 <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">{displayedOfficers.length} Displayed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-white text-gray-500 font-extrabold border-b border-gray-200 uppercase tracking-wider text-xs">
                      <th className="p-5">Officer Name</th><th className="p-5">Office / Rank</th><th className="p-5">Local Assembly</th><th className="p-5 text-right">Direct Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOfficers.map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                        <td className="p-5">
                          <div className="font-extrabold text-gray-900 text-base">{m.name || 'Unknown'}</div>
                          {m.occupation && <div className="text-xs font-bold text-gray-400 mt-0.5">{m.occupation}</div>}
                        </td>
                        <td className="p-5">
                          <span className={`px-3 py-1.5 rounded-lg font-black text-xs border ${m.churchRole.includes('Elder') ? 'bg-blue-50 text-blue-700 border-blue-200' : m.churchRole.includes('Deaconess') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : m.churchRole.includes('Minister') ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {m.churchRole}
                          </span>
                        </td>
                        <td className="p-5 text-gray-700 font-bold flex items-center gap-2"><Building2 size={16} className="text-indigo-400" /> {m.localAssembly}</td>
                        <td className="p-5 text-right">
                          <a href={`tel:${m.phone}`} className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100"><PhoneCall size={16} /> {m.phone}</a>
                        </td>
                      </tr>
                    ))}
                    {displayedOfficers.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-gray-400 font-bold italic">No officers found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: COMMITTEE APPOINTMENTS ================= */}
        {activeTab === 'appointed' && (
          <div className="animate-fade-in space-y-6">
            
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
              <h2 className="text-xl font-extrabold text-blue-900 flex items-center gap-3 mb-6">
                <Shield size={24} className="text-blue-600" /> Appoint Leadership Council
              </h2>
              
              <form onSubmit={handleAppointLeader} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Select Member</label>
                  <select required value={appointMemberId} onChange={e => setAppointMemberId(e.target.value)} className={inputStyle}>
                    <option value="">- Search Name -</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Level</label>
                  <select required value={appointLevel} onChange={e => setAppointLevel(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option>
                    {leadershipLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="bg-blue-50/50 p-2 -m-2 rounded-xl border border-blue-50">
                  <label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Committee / Ministry</label>
                  <select required value={appointCommittee} onChange={e => { setAppointCommittee(e.target.value); setCustomCommittee(''); }} className={inputStyle}>
                    <option value="">- Select -</option>
                    {committees.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="++ Add Custom ++" className="text-blue-600 font-bold">++ Add Custom ++</option>
                  </select>
                  {appointCommittee === '++ Add Custom ++' && (
                    <input required type="text" placeholder="Type new committee name..." value={customCommittee} onChange={(e) => setCustomCommittee(e.target.value)} className={`mt-3 border-blue-400 ring-4 ring-blue-50 ${inputStyle}`} autoFocus />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Designation / Role</label>
                  <select required value={appointDesignation} onChange={e => setAppointDesignation(e.target.value)} className={inputStyle}>
                    <option value="">- Select Role -</option>
                    {designations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5 ml-1">Year Appointed</label>
                  <input type="text" placeholder="YYYY" value={appointYear} onChange={e => setAppointYear(e.target.value)} className={inputStyle} />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><UserPlus size={18} /> Add Leader</>}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-extrabold text-gray-900 mb-4">Official Leadership Directory</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-3 text-gray-400" size={18}/>
                    <input type="text" placeholder="Search leader..." value={appointSearch} onChange={e => setAppointSearch(e.target.value)} className={`pl-10 ${inputStyle} py-2.5`} />
                  </div>
                  <select value={filterAppointLevel} onChange={e => setFilterAppointLevel(e.target.value)} className={`${inputStyle} py-2.5`}>
                    <option value="All Levels">All Levels</option>
                    {leadershipLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={filterAppointCommittee} onChange={e => setFilterAppointCommittee(e.target.value)} className={`${inputStyle} py-2.5`}>
                    <option value="All Committees">All Committees</option>
                    {committees.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={filterAppointRole} onChange={e => setFilterAppointRole(e.target.value)} className={`${inputStyle} py-2.5`}>
                    <option value="All Roles">All Roles</option>
                    {designations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-extrabold border-b border-gray-200">
                      <th className="p-5">Name</th><th className="p-5">Phone</th><th className="p-5">Level</th><th className="p-5">Committee</th><th className="p-5">Designation</th><th className="p-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAppointments.map(a => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                        <td className="p-5 font-extrabold text-gray-900">{a.memberName}</td>
                        <td className="p-5 text-gray-600 font-mono font-bold">{a.memberPhone}</td>
                        <td className="p-5"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">{a.level}</span></td>
                        <td className="p-5 font-bold text-blue-700">{a.committee}</td>
                        <td className="p-5 font-bold text-gray-700">{a.designation}</td>
                        <td className="p-5 text-center">
                          <button onClick={() => handleRemoveAppointment(a.id, a.memberName)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Revoke Appointment">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {displayedAppointments.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-gray-400 font-bold italic">No leaders found. Time to appoint your council!</td></tr>}
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