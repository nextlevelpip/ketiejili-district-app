"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Target, Droplet, Wind, GraduationCap, FileText, Save, Search, CheckCircle2, AlertCircle, Loader2, MessageCircle, Activity, Lightbulb, RefreshCw, ShieldAlert, TrendingUp, UserMinus } from 'lucide-react';
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

  const graduateToMember = async (id, memberName) => {
    if (window.confirm(`Graduate ${memberName} to full Church Member?`)) {
      try {
        await updateDoc(doc(db, 'members', id), { churchRole: 'Member' });
        showNotification('success', `${memberName} has graduated!`);
      } catch (error) { console.error(error); }
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

  // --- REBUILT PASTORAL REPORT (5 Tags + Note Extraction) ---
  const generatePastorReport = () => {
    const recentLogs = savedLogs.slice(0, 15).filter(log => reportAssembly === 'All Assemblies' || log.assembly === reportAssembly);
    let immediateAttention = [], growthSignals = [], tagCounts = { 'Conviction': 0, 'Putting into practice': 0, 'Confused': 0, 'Avoidance': 0, 'Understood': 0 }, contactedIds = new Set();
    
    recentLogs.forEach(log => {
      Object.entries(log.records).forEach(([memberId, data]) => {
        contactedIds.add(memberId);
        if(tagCounts[data.tag] !== undefined) {
           tagCounts[data.tag] = tagCounts[data.tag] + 1;
        }
        
        if (data.tag === 'Confused' || data.tag === 'Avoidance') {
           if (!immediateAttention.some(m => m.id === memberId)) {
               immediateAttention.push({ 
                 id: memberId, 
                 name: data.name, 
                 tag: data.tag, 
                 issue: data.tag === 'Avoidance' ? 'Avoiding engagement/application' : 'Struggling to understand the Word',
                 notes: data.notes // Pass notes to report
               });
           }
        }
        
        if (data.tag === 'Putting into practice' || data.tag === 'Conviction') {
           if (!growthSignals.some(m => m.id === memberId)) {
             growthSignals.push({ id: memberId, name: data.name, tag: data.tag, notes: data.notes });
           }
        }
      });
    });

    const allFilteredMembers = members.filter(m => reportAssembly === 'All Assemblies' || m.localAssembly === reportAssembly);
    const silentMembers = allFilteredMembers.filter(m => !contactedIds.has(m.id)).slice(0, 10); 
    
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
    if (tag === 'Putting into practice') return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
    if (tag === 'Understood') return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
    if (tag === 'Conviction') return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
    if (tag === 'Confused') return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
    if (tag === 'Avoidance') return 'bg-red-500/20 text-red-300 border-red-400/30';
    return 'bg-white/10 text-white/50 border-white/10';
  };

  const inputStyle = "w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:bg-black/30 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all text-sm text-white font-bold placeholder:text-cyan-200/50 [&>option]:text-gray-900";
  const labelStyle = "block text-[10px] font-black text-cyan-200 uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-cyan-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0c4a6e] via-[#0369a1] to-[#082f49] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Decorative background orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              <CheckCircle2 size={24} /> <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><Target size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Discipleship Command</h1>
              <p className="font-bold text-cyan-100">Tracking daily spiritual progression and pastoral care.</p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex flex-wrap gap-3 mb-8">
            {['converts', 'baptism', 'daily', 'weekly'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-bold transition-all text-sm border backdrop-blur-md ${activeTab === tab ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-cyan-100 border-white/10 hover:bg-white/10'}`}
              >
                {tab === 'converts' && 'New Converts'}
                {tab === 'baptism' && 'Baptisms'}
                {tab === 'daily' && 'Daily Contact'}
                {tab === 'weekly' && 'Pastor Report'}
              </button>
            ))}
          </div>

          {/* ================= TAB 1: NEW CONVERTS ================= */}
          {activeTab === 'converts' && (
            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-xl">
               <div className="p-6 border-b border-white/10 bg-black/10">
                 <div className="relative">
                   <Search className="absolute left-4 top-3.5 text-cyan-200/50" size={16}/>
                   <input type="text" placeholder="Search new converts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${inputStyle} pl-10`} />
                 </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-white whitespace-nowrap">
                   <thead className="bg-black/20 text-cyan-200 uppercase font-black text-[10px] tracking-widest border-b border-white/10">
                     <tr><th className="p-5">Convert Name</th><th className="p-5">Assembly</th><th className="p-5 text-center">Baptisms</th><th className="p-5 text-center">Action</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {members.filter(m => m.churchRole === 'New Convert').map(m => (
                       <tr key={m.id} className="hover:bg-white/5 transition-colors">
                         <td className="p-5 font-black text-white text-base">{m.name}</td>
                         <td className="p-5 text-cyan-100/70 font-bold">{m.localAssembly}</td>
                         <td className="p-5 text-center">
                           <div className="flex gap-2 justify-center">
                             <span className={`px-2 py-1 border rounded-lg text-[9px] font-black uppercase tracking-widest ${m.waterBaptismStatus === 'Yes' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-white/5 text-white/30 border-white/10'}`}>Water</span>
                             <span className={`px-2 py-1 border rounded-lg text-[9px] font-black uppercase tracking-widest ${m.spiritBaptism === 'Yes' ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-white/5 text-white/30 border-white/10'}`}>Spirit</span>
                           </div>
                         </td>
                         <td className="p-5 text-center">
                           <button onClick={() => graduateToMember(m.id, m.name)} disabled={m.waterBaptismStatus !== 'Yes'} className="bg-blue-600 border border-blue-500/50 hover:bg-blue-500 px-4 py-2 rounded-xl font-bold text-xs text-white shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                             Graduate
                           </button>
                         </td>
                       </tr>
                     ))}
                     {members.filter(m => m.churchRole === 'New Convert').length === 0 && <tr><td colSpan="4" className="p-12 text-center text-cyan-200/50 font-bold italic">No new converts currently logged.</td></tr>}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* ================= TAB 2: BAPTISMS ================= */}
          {activeTab === 'baptism' && (
             <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 text-center text-cyan-200/50 font-bold italic">
                <Droplet size={48} className="mx-auto mb-4 opacity-30" />
                Select members from the directory to update their baptism records.
             </div>
          )}

          {/* ================= TAB 3: DAILY CONTACT ================= */}
          {activeTab === 'daily' && (
             <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 p-8 space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
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
                  <div className="space-y-4 pt-4">
                    {membersToLog.map(m => {
                      const currentStage = Math.min(m.discipleshipStage || 0, 6); // 6 Days
                      const stepInfo = sequenceSteps[currentStage];
                      const record = contactRecords[m.id] || { status: 'Not Reached', tag: '', notes: '' };

                      return (
                        <div key={m.id} className="bg-black/20 border border-white/5 p-5 rounded-2xl flex flex-col gap-4 shadow-inner">
                          <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                            <div className="flex-1">
                              <div className="font-black text-white text-lg">{m.name}</div>
                              <div className="text-[10px] font-black text-cyan-200/70 uppercase tracking-widest mt-1">
                                {stepInfo.day}: {stepInfo.prompt}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                              {currentStage < 6 && (
                                <>
                                  <select 
                                    value={record.status} 
                                    onChange={(e) => handleRecordChange(m.id, 'status', e.target.value)} 
                                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-400 [&>option]:text-gray-900"
                                  >
                                    <option value="Not Reached">Not Reached</option>
                                    <option value="Contacted">Contacted</option>
                                  </select>
                                  
                                  <select 
                                    value={record.tag} 
                                    disabled={record.status === 'Not Reached'}
                                    onChange={(e) => handleRecordChange(m.id, 'tag', e.target.value)} 
                                    className={`p-3 border rounded-xl text-xs font-bold outline-none focus:border-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed [&>option]:text-gray-900 ${record.tag ? getTagColor(record.tag) : 'bg-white/5 border-white/10 text-white'}`}
                                  >
                                    <option value="">- Select Tag -</option>
                                    {stepInfo.tags.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </>
                              )}
                              {currentStage === 6 && (
                                <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                                  <CheckCircle2 size={16} /> Completed
                                </div>
                              )}
                            </div>
                          </div>

                          {/* DYNAMIC NOTES FIELD */}
                          {currentStage < 6 && record.status === 'Contacted' && (
                            <div className="animate-fade-in pt-2 border-t border-white/5">
                              <input 
                                type="text"
                                placeholder="Add a pastoral note (e.g., 'Struggling with grace concept')..."
                                value={record.notes || ''}
                                onChange={(e) => handleRecordChange(m.id, 'notes', e.target.value)}
                                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-400 placeholder:text-cyan-200/30"
                              />
                            </div>
                          )}

                        </div>
                      )
                    })}
                    
                    <div className="pt-4 border-t border-white/10">
                      <button onClick={handleSaveLogs} disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/30 rounded-xl font-black uppercase tracking-widest text-sm text-white shadow-lg transition-all flex items-center justify-center gap-3">
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Save & Advance Sequence
                      </button>
                    </div>
                  </div>
                )}
                {assembly && group && membersToLog.length === 0 && (
                  <div className="p-12 text-center text-cyan-200/50 font-bold italic bg-black/10 border border-dashed border-white/10 rounded-2xl">
                    No members found in this Bible Study Group.
                  </div>
                )}
             </div>
          )}

          {/* ================= TAB 4: PASTOR REPORT ================= */}
          {activeTab === 'weekly' && (
             <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 text-white shadow-xl animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6 mb-8">
                  <h2 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md"><Activity className="text-cyan-400" /> Pastoral Intelligence</h2>
                  <select value={reportAssembly} onChange={e => setReportAssembly(e.target.value)} className="p-3 bg-black/30 border border-white/20 rounded-xl font-bold text-sm outline-none text-white shadow-sm [&>option]:text-gray-900">
                    <option value="All Assemblies">All Assemblies</option>
                    {[...new Set(members.map(m => m.localAssembly).filter(Boolean))].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-8 rounded-[2rem] border border-white/10 mb-8 shadow-inner">
                  <p className="text-[10px] text-cyan-200 uppercase font-black tracking-widest mb-2 flex items-center gap-2"><Lightbulb size={14}/> Spiritual Temperature</p>
                  <p className="text-2xl font-black leading-tight drop-shadow-md">{report.temperature}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* IMMEDIATE ATTENTION */}
                  <div className="bg-black/20 p-8 rounded-[2rem] border border-red-500/20 shadow-inner">
                    <h3 className="text-red-400 font-black mb-6 uppercase tracking-widest text-sm flex items-center gap-2"><ShieldAlert size={18}/> Immediate Attention</h3>
                    <div className="space-y-3">
                      {report.immediateAttention.map((m, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm">
                          <div className="font-bold text-white text-base mb-1">{m.name}</div>
                          <div className="text-xs font-bold text-red-300 bg-red-500/10 px-2 py-1 inline-block rounded border border-red-500/20">{m.issue}</div>
                          {/* INJECTED NOTES */}
                          {m.notes && (
                            <div className="mt-3 pl-3 border-l-2 border-red-500/30 text-xs italic text-cyan-100/70">
                              "{m.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                      {report.immediateAttention.length === 0 && <p className="text-cyan-200/40 text-sm italic">No critical issues flagged recently.</p>}
                    </div>
                  </div>

                  {/* GROWTH SIGNALS */}
                  <div className="bg-black/20 p-8 rounded-[2rem] border border-emerald-500/20 shadow-inner">
                    <h3 className="text-emerald-400 font-black mb-6 uppercase tracking-widest text-sm flex items-center gap-2"><TrendingUp size={18}/> Growth Signals</h3>
                    <div className="space-y-3">
                      {report.growthSignals.map((m, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm">
                          <div className="font-bold text-white text-base mb-1">{m.name}</div>
                          <div className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2 py-1 inline-block rounded border border-emerald-500/20">{m.tag}</div>
                          {/* INJECTED NOTES */}
                          {m.notes && (
                            <div className="mt-3 pl-3 border-l-2 border-emerald-500/30 text-xs italic text-cyan-100/70">
                              "{m.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                      {report.growthSignals.length === 0 && <p className="text-cyan-200/40 text-sm italic">No significant growth milestones flagged recently.</p>}
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