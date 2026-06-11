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
    if (purpose.includes('Sickness')) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (purpose.includes('Backsliding')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (purpose.includes('Bereavement')) return 'text-slate-300 bg-slate-500/10 border-slate-500/30';
    if (purpose.includes('Convert')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30'; 
  };

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec)
  const inputStyle = "w-full p-3.5 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:text-[#000814]";
  const labelStyle = "block text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative">
        
        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {notification.message}
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><HeartHandshake size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Visitation Command</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Tracking pastoral care & follow-ups.</p>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'dashboard', label: 'Analytics Radar', icon: Activity },
                { id: 'log', label: 'Log Visit', icon: Plus },
                { id: 'history', label: 'Visitation Ledger', icon: FileText }
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

          {/* ================================================== */}
          {/* TAB 1: ANALYTICS RADAR                             */}
          {/* ================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* TOP KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-[#000814] p-6 rounded-2xl border border-[#003566] shadow-inner flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2 text-[#FFC300]">
                    <Users size={16}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Flock Coverage</h3>
                  </div>
                  <p className="text-[10px] font-bold text-white/50 mb-4 uppercase tracking-widest">Percentage of total membership visited.</p>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-black text-white">{coveragePercentage}%</span>
                    <span className="text-[10px] font-bold text-white/50 mb-1">({uniqueMembersVisited} of {totalMembers})</span>
                  </div>
                </div>

                <div className="bg-[#000814] p-6 rounded-2xl border border-[#003566] shadow-inner flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2 text-blue-400">
                    <ClipboardList size={16}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Total Visits Logged</h3>
                  </div>
                  <p className="text-[10px] font-bold text-white/50 mb-4 uppercase tracking-widest">Cumulative pastoral visitations recorded.</p>
                  <span className="text-3xl font-black text-white">{visitations.length}</span>
                </div>

                <div className="bg-[#000814] p-6 rounded-2xl border border-red-500/30 shadow-inner flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2 text-red-400">
                    <ShieldAlert size={16}/> <h3 className="text-[10px] font-black uppercase tracking-widest">Urgent Follow-ups</h3>
                  </div>
                  <p className="text-[10px] font-bold text-white/50 mb-4 uppercase tracking-widest">Visits requiring immediate continued care.</p>
                  <span className={`text-3xl font-black ${urgentFollowUps.length > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {urgentFollowUps.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ASSEMBLY COMPARISON */}
                <div className="lg:col-span-2 bg-[#000814] border border-[#003566] rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-[#003566] pb-3 mb-5 flex items-center gap-2">
                    <Activity size={14} className="text-[#FFC300]"/> Assembly Comparison Matrix
                  </h3>
                  <div className="space-y-4">
                    {visitsByAssembly.map(item => {
                      const percentage = item.memberCount > 0 ? Math.min((item.count / item.memberCount) * 100, 100) : 0;
                      return (
                        <div key={item.assembly}>
                          <div className="flex justify-between items-end mb-1 text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-white">{item.assembly}</span>
                            <span className="text-[#FFC300]">{item.count} Visits <span className="text-white/30 text-[8px] ml-1">({percentage.toFixed(0)}% of members)</span></span>
                          </div>
                          <div className="w-full bg-[#001D3D] rounded-full h-2 overflow-hidden border border-[#003566]">
                            <div className="bg-[#FFC300] h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* URGENT CARE PINS */}
                <div className="lg:col-span-1 bg-[#000814] border border-red-500/30 rounded-2xl p-6 shadow-inner overflow-y-auto max-h-[400px]">
                   <h3 className="text-xs font-black text-red-400 uppercase tracking-widest border-b border-red-500/30 pb-3 mb-5 flex items-center gap-2">
                    <Heart size={14}/> Critical Care Radar
                  </h3>
                  <div className="space-y-3">
                    {urgentFollowUps.map(visit => (
                      <div key={visit.id} className="p-4 bg-[#001D3D] border border-red-500/20 rounded-xl">
                        <div className="font-black text-white text-xs">{visit.memberName}</div>
                        <div className="text-[9px] font-bold text-red-300 uppercase tracking-widest mt-1">{visit.purpose} • {visit.assembly}</div>
                        <p className="text-[10px] text-white/60 mt-3 italic leading-relaxed border-l-2 border-red-500/30 pl-2">"{visit.notes}"</p>
                        
                        <button 
                          onClick={() => resolveFollowUp(visit.id, visit.memberName)}
                          className="mt-4 w-full py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/30 transition-colors"
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
            <div className="bg-[#000814] p-6 md:p-10 rounded-[2rem] shadow-xl border border-[#003566] max-w-4xl mx-auto animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FCA311]"></div>
              
              <div className="mb-6 border-b border-[#003566] pb-4 mt-1">
                <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <UserPlus size={16} className="text-[#FFC300]" /> Record Pastoral Visit
                </h2>
              </div>

              <form onSubmit={handleSaveVisit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <div className="md:col-span-2 p-5 bg-[#001D3D] border border-[#003566] rounded-xl">
                    <label className={`${labelStyle} text-[#FFC300]`}>Select Member Visited *</label>
                    <select required value={formData.memberId} onChange={handleMemberSelect} className={inputStyle}>
                      <option value="">- Search Directory -</option>
                      {members.filter(m => m.localAssembly === formData.assembly).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.churchRole || 'Member'})</option>
                      ))}
                    </select>
                    {members.filter(m => m.localAssembly === formData.assembly).length === 0 && (
                      <p className="text-[9px] text-red-400 mt-2 italic font-bold">No members registered in this assembly.</p>
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

                  <div className="md:col-span-2 flex items-center gap-3 p-4 bg-[#001D3D] border border-red-500/30 rounded-xl cursor-pointer hover:bg-[#003566] transition-all" onClick={() => setFormData({...formData, requiresFollowUp: !formData.requiresFollowUp})}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.requiresFollowUp ? 'bg-red-500 border-red-400 text-white' : 'bg-[#000814] border-[#003566] text-transparent'}`}>
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <span className="font-black text-red-400 uppercase tracking-widest text-[10px] block">Requires Continued Follow-up</span>
                      <span className="text-[9px] text-white/50 mt-0.5 block">Pin this member to the Critical Care radar on the dashboard.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-2 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" size={14}/> : <><Heart size={14}/> Log Visit</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 3: VISITATION LEDGER HISTORY                   */}
          {/* ================================================== */}
          {activeTab === 'history' && (
            <div className="bg-[#000814] rounded-2xl overflow-hidden shadow-2xl border border-[#003566] animate-fade-in">
              <div className="p-5 border-b border-[#003566] bg-[#001D3D] flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 text-white/30" size={14}/>
                  <input placeholder="Search member names, notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2.5 rounded-xl bg-[#000814] border border-[#003566] text-xs font-bold outline-none focus:border-[#FFC300] text-white placeholder:text-white/30" />
                </div>
                <div className="flex items-center gap-2 bg-[#000814] px-3 py-1.5 rounded-xl border border-[#003566]">
                  <Filter size={12} className="text-[#FFC300] shrink-0" />
                  <select value={fAssembly} onChange={e => setFAssembly(e.target.value)} className="bg-transparent font-black text-[9px] uppercase tracking-widest text-white/70 outline-none [&>option]:text-[#000814]">
                    <option value="All Assemblies">All Assemblies</option>
                    {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="sticky top-0 bg-[#001D3D] z-10 text-[9px] font-black tracking-widest text-[#FFC300] uppercase border-b border-[#003566]">
                    <tr>
                      <th className="p-5 w-32">Date</th>
                      <th className="p-5">Member Visited</th>
                      <th className="p-5">Purpose & Notes</th>
                      <th className="p-5">Visiting Team</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#003566]">
                    {filteredVisits.map(visit => (
                      <tr key={visit.id} className="hover:bg-[#001D3D]/50 transition-colors">
                        <td className="p-5 font-mono text-[10px] text-white/70">
                          <div className="flex items-center gap-1.5"><CalendarDays size={12} className="text-[#FFC300]"/> {visit.date}</div>
                        </td>
                        <td className="p-5">
                          <div className="font-black text-white text-xs">{visit.memberName}</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">{visit.assembly}</div>
                        </td>
                        <td className="p-5">
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded border inline-block mb-1.5 tracking-widest ${getPurposeColor(visit.purpose)}`}>
                            {visit.purpose}
                          </span>
                          <div className="text-[10px] font-bold text-white/60 max-w-xs truncate" title={visit.notes}>{visit.notes || <span className="italic text-white/30">No notes</span>}</div>
                        </td>
                        <td className="p-5 text-[10px] font-bold text-white/70 uppercase tracking-widest">{visit.visitingTeam}</td>
                        <td className="p-5 text-center">
                           {visit.requiresFollowUp ? (
                             <span className="text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/30">Action Reqd</span>
                           ) : (
                             <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">Cleared</span>
                           )}
                        </td>
                        <td className="p-5 text-center">
                          <button onClick={() => handleDelete(visit.id)} className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    ))}
                    {filteredVisits.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-white/50 font-bold italic text-xs">No visitation records found.</td></tr>}
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