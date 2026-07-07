"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Target, Droplet, Wind, GraduationCap, FileText, Save, Search, CheckCircle2, AlertCircle, Loader2, MessageCircle, Activity, Lightbulb, RefreshCw, ShieldAlert, TrendingUp, UserMinus, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';

export default function DiscipleshipTracker() {
  const [members, setMembers] = useState([]);
  const [savedLogs, setSavedLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('converts'); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- CUSTOM MODAL STATE ---
  const [graduateModal, setGraduateModal] = useState({ isOpen: false, id: null, memberName: '' });

  // --- DAILY LOG STATES ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [assembly, setAssembly] = useState('');
  const [group, setGroup] = useState('');
  const [contactRecords, setContactRecords] = useState({});
  const [reportAssembly, setReportAssembly] = useState('All Assemblies');

  // --- REBUILT 6-DAY TRACKER LOGIC ---
  const sequenceSteps = [
    { day: 'Day 1 (Mon)', prompt: "Did you understand the core message of yesterday's sermon?", tags: ['Understood', 'Confused'] },
    { day: 'Day 2 (Tue)', prompt: "How did the message challenge you personally?", tags: ['Conviction', 'Avoidance'] },
    { day: 'Day 3 (Wed)', prompt: "What is one specific step you can take this week to apply it?", tags: ['Putting into practice', 'Confused'] },
    { day: 'Day 4 (Thu)', prompt: "What obstacles are making it difficult to apply the message?", tags: ['Avoidance', 'Conviction'] },
    { day: 'Day 5 (Fri)', prompt: "Have you been able to take the step you planned on Wednesday?", tags: ['Putting into practice', 'Avoidance'] },
    { day: 'Day 6 (Sat)', prompt: "How has practicing the Word impacted your week?", tags: ['Putting into practice', 'Understood'] },
    { day: 'Completed', prompt: "Weekly sequence completed. Awaiting Sunday reset.", tags: [] }
  ];

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMembers(fetchedMembers);

      const initialRecords = {};
      fetchedMembers.forEach(m => { initialRecords[m.id] = { status: 'Not Reached', tag: '', notes: '' }; });
      setContactRecords(initialRecords);
      setIsLoading(false);
    });

    const unsubLogs = onSnapshot(collection(db, 'discipleship_logs'), (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavedLogs(fetchedLogs);
    });

    return () => { unsubMembers(); unsubLogs(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- CUSTOM GRADUATION MODAL LOGIC ---
  const triggerGraduate = (id, memberName) => {
    setGraduateModal({ isOpen: true, id, memberName });
  };

  const confirmGraduate = async () => {
    const { id, memberName } = graduateModal;
    try {
      await updateDoc(doc(db, 'members', id), { churchRole: 'Member' });
      showNotification('success', `${memberName} has graduated!`);
    } catch (error) { 
      console.error(error); 
      showNotification('error', 'Graduation failed.');
    } finally {
      setGraduateModal({ isOpen: false, id: null, memberName: '' });
    }
  };

  const membersToLog = members.filter(m => m.localAssembly === assembly && m.bibleStudy === group);

  const handleRecordChange = (id, field, value) => {
    setContactRecords(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSaveLogs = async () => {
    if (!assembly || !group) { showNotification('error', "Select Assembly and Bible Study Group."); return; }
    setIsSubmitting(true);
    const activeRecords = {}; let contactCount = 0; const batch = writeBatch(db); 
    
    membersToLog.forEach(m => {
      const record = contactRecords[m.id];
      if (record.status !== 'Not Reached' && record.tag !== '') {
        const currentStage = m.discipleshipStage || 0;
        const stepInfo = sequenceSteps[Math.min(currentStage, 6)]; // Adjusted for 6 days
        activeRecords[m.id] = { 
          name: m.name || 'Unknown', 
          role: m.churchRole || 'Member', 
          status: record.status, 
          tag: record.tag, 
          questionAsked: stepInfo.prompt, 
          notes: record.notes // NOW SAVING THE NOTES
        };
        contactCount++;
        batch.update(doc(db, 'members', m.id), { discipleshipStage: Math.min(currentStage + 1, 6) });
      }
    });

    if (contactCount === 0) { showNotification('error', "No behavioral tags selected."); setIsSubmitting(false); return; }
    
    try {
      await addDoc(collection(db, 'discipleship_logs'), { date, assembly, group, records: activeRecords, totalContacted: contactCount, timestamp: new Date().toISOString() });
      await batch.commit(); 
      showNotification('success', `Logs secured and members advanced to next step!`);
      
      const resetRecords = { ...contactRecords };
      membersToLog.forEach(m => { resetRecords[m.id] = { status: 'Not Reached', tag: '', notes: '' }; });
      setContactRecords(resetRecords);
    } catch (error) { showNotification('error', "Connection Error."); } finally { setIsSubmitting(false); }
  };

  // --- REBUILT PASTORAL REPORT (Fixed Cloning & Ghosting Issues) ---
  const generatePastorReport = () => {
    const recentLogs = savedLogs.slice(0, 15).filter(log => reportAssembly === 'All Assemblies' || log.assembly === reportAssembly);
    
    let immediateAttention = [];
    let growthSignals = [];
    let tagCounts = { 'Conviction': 0, 'Putting into practice': 0, 'Confused': 0, 'Avoidance': 0, 'Understood': 0 };
    
    let contactedIds = new Set();
    let categorizedMembers = new Set(); // Tracks members already placed in a column based on newest log
    
    recentLogs.forEach(log => {
      Object.entries(log.records).forEach(([memberId, data]) => {
        contactedIds.add(memberId);
        
        // 1. GHOST FIX: Check the live database to ensure they haven't graduated or been deleted
        const currentMember = members.find(m => m.id === memberId);
        if (!currentMember || currentMember.churchRole !== 'New Convert') return;

        if(tagCounts[data.tag] !== undefined) {
           tagCounts[data.tag] = tagCounts[data.tag] + 1;
        }
        
        // 2. CLONE FIX: If they haven't been added to a column yet (processing newest log first)
        if (!categorizedMembers.has(memberId)) {
          if (data.tag === 'Confused' || data.tag === 'Avoidance') {
             immediateAttention.push({ 
               id: memberId, 
               name: currentMember.name, // Display current name
               tag: data.tag, 
               issue: data.tag === 'Avoidance' ? 'Avoiding engagement/application' : 'Struggling to understand the Word',
               notes: data.notes 
             });
             categorizedMembers.add(memberId);
          }
          else if (data.tag === 'Putting into practice' || data.tag === 'Conviction') {
             growthSignals.push({ 
               id: memberId, 
               name: currentMember.name, 
               tag: data.tag, 
               notes: data.notes 
             });
             categorizedMembers.add(memberId);
          }
        }
      });
    });

    const allFilteredConverts = members.filter(m => m.churchRole === 'New Convert' && (reportAssembly === 'All Assemblies' || m.localAssembly === reportAssembly));
    const silentMembers = allFilteredConverts.filter(m => !contactedIds.has(m.id)).slice(0, 10); 
    
    let temperature = "The spiritual temperature is mixed; requires consistent pastoral follow-up.";
    const totalTags = tagCounts['Conviction'] + tagCounts['Putting into practice'] + tagCounts['Confused'] + tagCounts['Avoidance'] + tagCounts['Understood'];
    
    if (totalTags > 0) {
      if (tagCounts['Putting into practice'] > totalTags * 0.4) temperature = "Strong momentum: Members are actively putting the Word into practice.";
      else if (tagCounts['Confused'] > totalTags * 0.3) temperature = "Warning: High levels of confusion. Further teaching and clarification is needed.";
      else if (tagCounts['Avoidance'] > totalTags * 0.3) temperature = "Caution: Members are avoiding deep spiritual engagement.";
    }
    return { immediateAttention, growthSignals, silentMembers, temperature };
  };

  const report = generatePastorReport();
  
  const getTagColor = (tag) => {
    if (tag === 'Putting into practice') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (tag === 'Understood') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (tag === 'Conviction') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (tag === 'Confused') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (tag === 'Avoidance') return 'bg-red-500/10 text-red-400 border-red-500/30';
    return 'bg-[#001D3D] text-white/50 border-[#003566]';
  };

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec) WITH DROPDOWN FIX
  const inputStyle = "w-full px-4 py-3 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white";
  const labelStyle = "block text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative">
        
        {/* CUSTOM GRADUATION MODAL */}
        {graduateModal.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-full flex items-center justify-center mx-auto mb-5 text-[#FFC300]">
                  <GraduationCap size={28} />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Confirm Graduation</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  Are you sure you want to graduate <span className="text-white">{graduateModal.memberName}</span> to full Church Member? They will be removed from this tracking dashboard.
                </p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button 
                  onClick={() => setGraduateModal({ isOpen: false, id: null, memberName: '' })}
                  className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmGraduate}
                  className="flex-1 py-4 text-[10px] font-black text-[#000814] bg-[#FFC300] hover:bg-[#FFD60A] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <GraduationCap size={14} /> Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              <CheckCircle2 size={18} /> {notification.message}
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><Target size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Discipleship</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Tracking daily spiritual progression.</p>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2">
              {['converts', 'baptism', 'daily', 'weekly'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-widest transition-all text-[9px] border ${activeTab === tab ? 'bg-[#FFC300] text-[#000814] shadow-md border-transparent' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}
                >
                  {tab === 'converts' && 'New Converts'}
                  {tab === 'baptism' && 'Baptisms'}
                  {tab === 'daily' && 'Daily Contact'}
                  {tab === 'weekly' && 'Pastor Report'}
                </button>
              ))}
            </div>
          </div>

          {/* ================= TAB 1: NEW CONVERTS ================= */}
          {activeTab === 'converts' && (
            <div className="bg-[#000814] rounded-2xl border border-[#003566] overflow-hidden shadow-2xl">
               <div className="p-5 border-b border-[#003566] bg-[#001D3D]">
                 <div className="relative">
                   <Search className="absolute left-3 top-2.5 text-white/30" size={14}/>
                   <input type="text" placeholder="Search new converts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${inputStyle} pl-9`} />
                 </div>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left text-xs text-white whitespace-nowrap">
                   <thead className="bg-[#001D3D] text-[#FFC300] uppercase font-black text-[9px] tracking-widest border-b border-[#003566]">
                     <tr><th className="p-4">Convert Name</th><th className="p-4">Assembly</th><th className="p-4 text-center">Baptisms</th><th className="p-4 text-center">Action</th></tr>
                   </thead>
                   <tbody className="divide-y divide-[#003566]">
                     {members.filter(m => m.churchRole === 'New Convert').map(m => (
                       <tr key={m.id} className="hover:bg-[#001D3D]/50 transition-colors">
                         <td className="p-4 font-black text-white text-xs">{m.name}</td>
                         <td className="p-4 text-white/50 font-bold text-[9px] uppercase tracking-widest">{m.localAssembly}</td>
                         <td className="p-4 text-center">
                           <div className="flex gap-2 justify-center">
                             <span className={`px-2 py-0.5 border rounded text-[8px] font-black uppercase tracking-widest ${m.waterBaptismStatus === 'Yes' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#001D3D] text-white/30 border-[#003566]'}`}>Water</span>
                             <span className={`px-2 py-0.5 border rounded text-[8px] font-black uppercase tracking-widest ${m.spiritBaptism === 'Yes' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-[#001D3D] text-white/30 border-[#003566]'}`}>Spirit</span>
                           </div>
                         </td>
                         <td className="p-4 text-center">
                           <button 
                             onClick={() => triggerGraduate(m.id, m.name)} 
                             disabled={m.waterBaptismStatus !== 'Yes'} 
                             className="bg-[#FFC300] border border-[#FFC300] hover:bg-[#FFD60A] px-4 py-1.5 rounded-lg font-black uppercase tracking-widest text-[9px] text-[#000814] shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                           >
                             Graduate
                           </button>
                         </td>
                       </tr>
                     ))}
                     {members.filter(m => m.churchRole === 'New Convert').length === 0 && <tr><td colSpan="4" className="p-10 text-center text-white/50 font-bold italic text-xs">No new converts currently logged.</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* ================= TAB 2: BAPTISMS ================= */}
          {activeTab === 'baptism' && (
             <div className="bg-[#000814] rounded-2xl border border-[#003566] p-10 text-center text-white/50 font-bold italic text-xs shadow-2xl">
                <Droplet size={36} className="mx-auto mb-4 opacity-30 text-[#FFC300]" />
                Select members from the directory to update their baptism records.
             </div>
          )}

          {/* ================= TAB 3: DAILY CONTACT ================= */}
          {activeTab === 'daily' && (
             <div className="bg-[#000814] rounded-2xl shadow-2xl border border-[#003566] p-6 md:p-8 space-y-6 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FCA311]"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-[#001D3D] p-5 rounded-xl border border-[#003566]">
                  <div>
                    <label className={labelStyle}>Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Assembly</label>
                    <select value={assembly} onChange={(e) => setAssembly(e.target.value)} className={inputStyle}>
                      <option value="">Select...</option>
                      {[...new Set(members.map(m => m.localAssembly).filter(Boolean))].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Bible Study Group</label>
                    <select value={group} onChange={(e) => setGroup(e.target.value)} className={inputStyle}>
                      <option value="">Select...</option>
                      {[...new Set(members.filter(m => m.localAssembly === assembly).map(m => m.bibleStudy).filter(Boolean))].sort().map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                {assembly && group && membersToLog.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {membersToLog.map(m => {
                      const currentStage = Math.min(m.discipleshipStage || 0, 6); // 6 Days
                      const stepInfo = sequenceSteps[currentStage];
                      const record = contactRecords[m.id] || { status: 'Not Reached', tag: '', notes: '' };

                      return (
                        <div key={m.id} className="bg-[#001D3D] border border-[#003566] p-5 rounded-xl flex flex-col gap-4">
                          <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                            <div className="flex-1">
                              <div className="font-black text-white text-sm">{m.name}</div>
                              <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-1.5">
                                <span className="text-[#FFC300]">{stepInfo.day}:</span> {stepInfo.prompt}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                              {currentStage < 6 && (
                                <>
                                  <select 
                                    value={record.status} 
                                    onChange={(e) => handleRecordChange(m.id, 'status', e.target.value)} 
                                    className="p-2.5 bg-[#000814] border border-[#003566] rounded-lg text-[10px] uppercase tracking-widest font-black text-white outline-none focus:border-[#FFC300] [&>option]:bg-[#001D3D] [&>option]:text-white"
                                  >
                                    <option value="Not Reached">Not Reached</option>
                                    <option value="Contacted">Contacted</option>
                                  </select>
                                  
                                  <select 
                                    value={record.tag} 
                                    disabled={record.status === 'Not Reached'}
                                    onChange={(e) => handleRecordChange(m.id, 'tag', e.target.value)} 
                                    className={`p-2.5 border rounded-lg text-[10px] uppercase tracking-widest font-black outline-none focus:border-[#FFC300] disabled:opacity-30 disabled:cursor-not-allowed [&>option]:bg-[#001D3D] [&>option]:text-white ${record.tag ? getTagColor(record.tag) : 'bg-[#000814] border-[#003566] text-white'}`}
                                  >
                                    <option value="">- Select Tag -</option>
                                    {stepInfo.tags.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </>
                              )}
                              {currentStage === 6 && (
                                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                  <CheckCircle2 size={14} /> Completed
                                </div>
                              )}
                            </div>
                          </div>

                          {/* DYNAMIC NOTES FIELD */}
                          {currentStage < 6 && record.status === 'Contacted' && (
                            <div className="animate-fade-in pt-3 border-t border-[#003566]">
                              <input 
                                type="text"
                                placeholder="Add a pastoral note (e.g., 'Struggling with grace concept')..."
                                value={record.notes || ''}
                                onChange={(e) => handleRecordChange(m.id, 'notes', e.target.value)}
                                className="w-full p-2.5 bg-[#000814] border border-[#003566] rounded-lg text-xs font-bold text-white outline-none focus:border-[#FFC300] placeholder:text-white/30"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    
                    <div className="pt-4 border-t border-[#003566]">
                      <button onClick={handleSaveLogs} disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save & Advance Sequence
                      </button>
                    </div>
                  </div>
                )}
                {assembly && group && membersToLog.length === 0 && (
                  <div className="p-12 text-center text-white/50 font-bold italic bg-[#001D3D] border border-dashed border-[#003566] rounded-xl text-xs">
                    No active New Converts found in this Bible Study Group.
                  </div>
                )}
             </div>
          )}

          {/* ================= TAB 4: PASTOR REPORT ================= */}
          {activeTab === 'weekly' && (
             <div className="bg-[#000814] p-6 md:p-8 rounded-2xl border border-[#003566] text-white shadow-2xl animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-[#003566] pb-5 mb-6">
                  <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 drop-shadow-md"><Activity size={16} className="text-[#FFC300]" /> Pastoral Intelligence</h2>
                  <select value={reportAssembly} onChange={e => setReportAssembly(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-black text-[9px] uppercase tracking-widest outline-none text-white shadow-sm [&>option]:bg-[#001D3D] [&>option]:text-white">
                    <option value="All Assemblies">All Assemblies</option>
                    {[...new Set(members.map(m => m.localAssembly).filter(Boolean))].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="bg-[#001D3D] p-6 rounded-xl border border-[#003566] mb-6 shadow-inner">
                  <p className="text-[9px] text-[#FFC300] uppercase font-black tracking-widest mb-1.5 flex items-center gap-2"><Lightbulb size={12}/> Spiritual Temperature</p>
                  <p className="text-base font-black leading-tight drop-shadow-md">{report.temperature}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* IMMEDIATE ATTENTION */}
                  <div className="bg-[#001D3D] p-6 rounded-xl border border-red-500/20 shadow-inner">
                    <h3 className="text-red-400 font-black mb-5 uppercase tracking-widest text-[10px] flex items-center gap-2"><ShieldAlert size={14}/> Immediate Attention</h3>
                    <div className="space-y-3">
                      {report.immediateAttention.map((m, i) => (
                        <div key={i} className="bg-[#000814] border border-[#003566] p-4 rounded-lg shadow-sm">
                          <div className="font-black text-white text-xs mb-1">{m.name}</div>
                          <div className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 inline-block rounded border border-red-500/20">{m.issue}</div>
                          {m.notes && (
                            <div className="mt-3 pl-2.5 border-l-2 border-red-500/30 text-[10px] italic font-bold text-white/50">
                              "{m.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                      {report.immediateAttention.length === 0 && <p className="text-white/30 text-xs italic font-bold">No critical issues flagged recently.</p>}
                    </div>
                  </div>

                  {/* GROWTH SIGNALS */}
                  <div className="bg-[#001D3D] p-6 rounded-xl border border-emerald-500/20 shadow-inner">
                    <h3 className="text-emerald-400 font-black mb-5 uppercase tracking-widest text-[10px] flex items-center gap-2"><TrendingUp size={14}/> Growth Signals</h3>
                    <div className="space-y-3">
                      {report.growthSignals.map((m, i) => (
                        <div key={i} className="bg-[#000814] border border-[#003566] p-4 rounded-lg shadow-sm">
                          <div className="font-black text-white text-xs mb-1">{m.name}</div>
                          <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 inline-block rounded border border-emerald-500/20">{m.tag}</div>
                          {m.notes && (
                            <div className="mt-3 pl-2.5 border-l-2 border-emerald-500/30 text-[10px] italic font-bold text-white/50">
                              "{m.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                      {report.growthSignals.length === 0 && <p className="text-white/30 text-xs italic font-bold">No significant growth milestones flagged recently.</p>}
                    </div>
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}