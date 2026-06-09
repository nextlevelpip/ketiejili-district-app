"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Heart, HeartHandshake, Users, ClipboardList, Plus, Search, Filter, AlertCircle, CheckCircle2, Loader2, CalendarDays, UserPlus, Activity, ShieldAlert, FileText, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function VisitationTracker() {
  const [visitations, setVisitations] = useState([]);
  const [members, setMembers] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- LOG VISIT FORM STATES ---
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    assembly: '',
    memberId: '',
    memberName: '',
    visitingTeam: '',
    purpose: '',
    customPurpose: '',
    notes: '',
    requiresFollowUp: false
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [fAssembly, setFAssembly] = useState('All Assemblies');

  const visitPurposes = [
    "Routine / Encouragement", 
    "Sickness / Health Issue", 
    "Bereavement", 
    "Backsliding / Missing Service", 
    "New Convert Follow-up", 
    "Childbirth / Naming",
    "Marriage / Counseling",
    "Other / Custom..."
  ];

  useEffect(() => {
    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetched);
        setFormData(prev => ({ ...prev, assembly: fetched[0] }));
      }
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qVisits = query(collection(db, 'visitations'), orderBy('date', 'desc'));
    const unsubVisits = onSnapshot(qVisits, (snapshot) => {
      setVisitations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    return () => { unsubAssem(); unsubMembers(); unsubVisits(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- ANALYTICS ENGINE ---
  const totalMembers = members.length;
  // Count unique members visited
  const uniqueMembersVisited = new Set(visitations.map(v => v.memberId)).size;
  const coveragePercentage = totalMembers > 0 ? ((uniqueMembersVisited / totalMembers) * 100).toFixed(1) : 0;
  
  const urgentFollowUps = visitations.filter(v => v.requiresFollowUp);

  // Calculate Visits Per Assembly
  const visitsByAssembly = assemblies.map(assembly => {
    return {
      assembly,
      count: visitations.filter(v => v.assembly === assembly).length,
      memberCount: members.filter(m => m.localAssembly === assembly).length
    };
  }).sort((a, b) => b.count - a.count);

  const handleMemberSelect = (e) => {
    const id = e.target.value;
    const member = members.find(m => m.id === id);
    setFormData({ ...formData, memberId: id, memberName: member ? member.name : '' });
  };

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalPurpose = formData.purpose === "Other / Add Custom..." ? formData.customPurpose.trim() : formData.purpose;
    
    if (!formData.memberId || !finalPurpose) {
      showNotification('error', 'Please select a member and a purpose.');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'visitations'), {
        date: formData.date,
        assembly: formData.assembly,
        memberId: formData.memberId,
        memberName: formData.memberName,
        visitingTeam: formData.visitingTeam.trim(),
        purpose: finalPurpose,
        notes: formData.notes.trim(),
        requiresFollowUp: formData.requiresFollowUp,
        recordedAt: new Date().toISOString()
      });
      showNotification('success', 'Pastoral visit successfully logged.');
      setFormData({
        ...formData, memberId: '', memberName: '', visitingTeam: '', purpose: '', customPurpose: '', notes: '', requiresFollowUp: false
      });
      setActiveTab('dashboard');
    } catch (err) {
      showNotification('error', 'Failed to log visit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveFollowUp = async (id, memberName) => {
    if (window.confirm(`Mark follow-up for ${memberName} as resolved?`)) {
      try {
        await updateDoc(doc(db, 'visitations', id), { requiresFollowUp: false });
        showNotification('success', 'Follow-up marked as resolved.');
      } catch (error) {
        showNotification('error', 'Failed to update record.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Delete this visitation record permanently?`)) {
      try {
        await deleteDoc(doc(db, 'visitations', id));
        showNotification('success', 'Record removed.');
      } catch (err) { showNotification('error', 'Failed to delete.'); }
    }
  };

  const filteredVisits = visitations.filter(v => {
    const matchesSearch = (v.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (v.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAssembly = fAssembly === 'All Assemblies' || v.assembly === fAssembly;
    return matchesSearch && matchesAssembly;
  });

  const getPurposeColor = (purpose) => {
    if (purpose.includes('Sickness')) return 'text-rose-300 bg-rose-500/20 border-rose-500/30';
    if (purpose.includes('Backsliding')) return 'text-amber-300 bg-amber-500/20 border-amber-500/30';
    if (purpose.includes('Bereavement')) return 'text-slate-300 bg-slate-500/20 border-slate-500/30';
    if (purpose.includes('Convert')) return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
    return 'text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/30'; // Default Routine
  };

  const inputStyle = "w-full p-3 bg-black/20 border border-white/10 focus:bg-black/30 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/20 rounded-xl font-bold text-white outline-none transition-all text-xs placeholder:text-fuchsia-200/50 [&>option]:text-gray-900";
  const labelStyle = "text-[9px] font-black text-fuchsia-200 uppercase ml-1 mb-1.5 block tracking-widest";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-fuchsia-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#4c1d95] via-[#701a75] to-[#2e1065] p-5 md:p-8 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-400/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl animate-fade-in text-sm ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-5">
            <div className="bg-white/10 p-3.5 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><HeartHandshake size={26} /></div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">Visitation Command</h1>
              <p className="text-xs font-bold text-fuchsia-100/80 mt-0.5">Tracking pastoral care, home visits, and spiritual follow-ups.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-[10px] border backdrop-blur-md ${activeTab === 'dashboard' ? 'bg-fuchsia-600/80 text-white border-fuchsia-400/50 shadow-lg' : 'bg-white/5 text-fuchsia-200/70 border-white/10 hover:bg-white/10'}`}>
              <Activity size={14} className="inline mr-1.5"/> Analytics Radar
            </button>
            <button onClick={() => setActiveTab('log')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-[10px] border backdrop-blur-md ${activeTab === 'log' ? 'bg-purple-600/80 text-white border-purple-400/50 shadow-lg' : 'bg-white/5 text-fuchsia-200/70 border-white/10 hover:bg-white/10'}`}>
              <Plus size={14} className="inline mr-1.5"/> Log Visit
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-[10px] border backdrop-blur-md ${activeTab === 'history' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-fuchsia-200/70 border-white/10 hover:bg-white/10'}`}>
              <FileText size={14} className="inline mr-1.5"/> Visitation Ledger
            </button>
          </div>

          {/* ================================================== */}
          {/* TAB 1: ANALYTICS RADAR                             */}
          {/* ================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* TOP KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-black/20 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-inner flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2 text-fuchsia-300">
                    <Users size={18}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Flock Coverage</h3>
                  </div>
                  <p className="text-xs font-bold text-fuchsia-100/60 mb-4">Percentage of total district membership visited.</p>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-white">{coveragePercentage}%</span>
                    <span className="text-xs font-bold text-fuchsia-200/50 mb-1">({uniqueMembersVisited} of {totalMembers})</span>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-inner flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2 text-purple-300">
                    <ClipboardList size={18}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Total Visits Logged</h3>
                  </div>
                  <p className="text-xs font-bold text-purple-100/60 mb-4">Cumulative number of pastoral visitations recorded.</p>
                  <span className="text-4xl font-black text-white">{visitations.length}</span>
                </div>

                <div className="bg-rose-900/30 backdrop-blur-md p-6 rounded-2xl border border-rose-500/30 shadow-inner flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2 text-rose-300">
                    <ShieldAlert size={18}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Urgent Follow-ups</h3>
                  </div>
                  <p className="text-xs font-bold text-rose-200/60 mb-4">Visits marked as requiring immediate continued care.</p>
                  <span className={`text-4xl font-black ${urgentFollowUps.length > 0 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                    {urgentFollowUps.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ASSEMBLY COMPARISON */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-3 mb-5 flex items-center gap-2">
                    <Activity size={16} className="text-fuchsia-400"/> Assembly Comparison Matrix
                  </h3>
                  <div className="space-y-4">
                    {visitsByAssembly.map(item => {
                      const percentage = item.memberCount > 0 ? Math.min((item.count / item.memberCount) * 100, 100) : 0;
                      return (
                        <div key={item.assembly}>
                          <div className="flex justify-between items-end mb-1 text-xs font-bold">
                            <span className="text-white">{item.assembly}</span>
                            <span className="text-fuchsia-300">{item.count} Visits <span className="text-white/30 text-[9px] ml-1">({percentage.toFixed(0)}% of members)</span></span>
                          </div>
                          <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5">
                            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-400 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* URGENT CARE PINS */}
                <div className="lg:col-span-1 bg-black/30 border border-rose-500/20 rounded-2xl p-6 shadow-inner overflow-y-auto max-h-[400px]">
                   <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest border-b border-rose-500/20 pb-3 mb-5 flex items-center gap-2">
                    <Heart size={16}/> Critical Care Radar
                  </h3>
                  <div className="space-y-3">
                    {urgentFollowUps.map(visit => (
                      <div key={visit.id} className="p-3 bg-white/5 border border-white/10 rounded-xl relative group">
                        <div className="font-black text-white text-xs">{visit.memberName}</div>
                        <div className="text-[9px] font-bold text-rose-300 uppercase mt-0.5">{visit.purpose} • {visit.assembly}</div>
                        <p className="text-[10px] text-white/60 mt-2 italic leading-snug">"{visit.notes}"</p>
                        
                        <button 
                          onClick={() => resolveFollowUp(visit.id, visit.memberName)}
                          className="mt-3 w-full py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/30 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    ))}
                    {urgentFollowUps.length === 0 && (
                      <div className="text-center py-8 text-white/30 italic text-xs font-bold">No pending follow-ups.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 2: LOG VISIT FORM                              */}
          {/* ================================================== */}
          {activeTab === 'log' && (
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 max-w-4xl mx-auto animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-400 to-purple-400"></div>
              
              <div className="mb-6 border-b border-white/10 pb-4 mt-1">
                <h2 className="text-lg font-black uppercase tracking-widest text-fuchsia-300 flex items-center gap-2">
                  <UserPlus size={20} /> Record Pastoral Visit
                </h2>
              </div>

              <form onSubmit={handleSaveVisit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelStyle}>Date of Visit *</label>
                    <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Local Assembly *</label>
                    <select required value={formData.assembly} onChange={e => setFormData({...formData, assembly: e.target.value, memberId: '', memberName: ''})} className={inputStyle}>
                      {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2 p-4 bg-black/20 border border-white/5 rounded-xl">
                    <label className={`${labelStyle} text-blue-300`}>Select Member Visited *</label>
                    <select required value={formData.memberId} onChange={handleMemberSelect} className={inputStyle}>
                      <option value="">- Search Directory -</option>
                      {members.filter(m => m.localAssembly === formData.assembly).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.churchRole || 'Member'})</option>
                      ))}
                    </select>
                    {members.filter(m => m.localAssembly === formData.assembly).length === 0 && (
                      <p className="text-[9px] text-rose-300 mt-2 italic">No members registered in this assembly.</p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>Visiting Team / Personnel *</label>
                    <input required type="text" placeholder="e.g. Pastor Prince & Elder John" value={formData.visitingTeam} onChange={e => setFormData({...formData, visitingTeam: e.target.value})} className={inputStyle} />
                  </div>

                  <div>
                    <label className={labelStyle}>Primary Purpose *</label>
                    <select required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className={inputStyle}>
                      <option value="">- Select Category -</option>
                      {visitPurposes.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {formData.purpose === "Other / Custom..." && (
                      <input required type="text" placeholder="Specify..." value={formData.customPurpose} onChange={e => setFormData({...formData, customPurpose: e.target.value})} className={`${inputStyle} mt-2`} autoFocus />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelStyle}>Pastoral Notes & Observations</label>
                    <textarea rows="3" placeholder="Condition of the member, scriptures shared, prayer requests..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={`${inputStyle} resize-none`}></textarea>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3 p-4 bg-rose-900/10 border border-rose-500/20 rounded-xl cursor-pointer" onClick={() => setFormData({...formData, requiresFollowUp: !formData.requiresFollowUp})}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.requiresFollowUp ? 'bg-rose-500 border-rose-400 text-white' : 'bg-black/30 border-white/20 text-transparent'}`}>
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <span className="font-black text-rose-300 uppercase tracking-widest text-[10px] block">Requires Continued Follow-up</span>
                      <span className="text-[9px] text-white/50">Pin this member to the Critical Care radar on the dashboard.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-2 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-fuchsia-500/30 transition-all flex justify-center items-center gap-2 border border-white/20">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Heart size={16}/> Log Visit</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 3: VISITATION LEDGER HISTORY                   */}
          {/* ================================================== */}
          {activeTab === 'history' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg animate-fade-in">
              <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 items-center bg-black/20">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 text-fuchsia-200/50" size={14}/>
                  <input placeholder="Search member names, notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2 rounded-lg bg-white/5 border border-white/10 text-xs outline-none focus:border-fuchsia-500 text-white" />
                </div>
                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                  <Filter size={14} className="text-fuchsia-300 shrink-0" />
                  <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="bg-transparent font-bold text-[10px] uppercase tracking-wider text-white outline-none [&>option]:text-black">
                    <option value="All Assemblies">All Assemblies</option>
                    {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="sticky top-0 bg-black/80 backdrop-blur z-10 text-[9px] font-black tracking-widest text-fuchsia-300 uppercase border-b border-white/10">
                    <tr>
                      <th className="p-4 w-32">Date</th>
                      <th className="p-4">Member Visited</th>
                      <th className="p-4">Purpose & Notes</th>
                      <th className="p-4">Visiting Team</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredVisits.map(visit => (
                      <tr key={visit.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-[11px] text-white/70">
                          <div className="flex items-center gap-1.5"><CalendarDays size={12} className="text-fuchsia-400"/> {visit.date}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-black text-white text-xs">{visit.memberName}</div>
                          <div className="text-[9px] uppercase tracking-wider text-white/50 mt-0.5">{visit.assembly}</div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border inline-block mb-1 ${getPurposeColor(visit.purpose)}`}>
                            {visit.purpose}
                          </span>
                          <div className="text-[10px] text-white/60 max-w-xs truncate" title={visit.notes}>{visit.notes || <span className="italic text-white/30">No notes</span>}</div>
                        </td>
                        <td className="p-4 text-[10px] font-bold text-white/80">{visit.visitingTeam}</td>
                        <td className="p-4 text-center">
                           {visit.requiresFollowUp ? (
                             <span className="text-[9px] font-black uppercase text-rose-300 bg-rose-500/20 px-2 py-1 rounded border border-rose-500/30">Action Reqd</span>
                           ) : (
                             <span className="text-[9px] font-black uppercase text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/30">Cleared</span>
                           )}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDelete(visit.id)} className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    ))}
                    {filteredVisits.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-fuchsia-200/50 font-bold italic">No visitation records found.</td></tr>}
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