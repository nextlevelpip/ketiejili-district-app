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

  const sequenceSteps = [
    { day: 'Sunday', prompt: "Which part of today’s sermon stayed with you the most?", tags: ['Conviction', 'Confusion'] },
    { day: 'Monday', prompt: "How did the message challenge you personally?", tags: ['Conviction', 'Action', 'Confusion'] },
    { day: 'Tuesday', prompt: "What is one step you can take this week to live it out?", tags: ['Action', 'Avoidance'] },
    { day: 'Wednesday', prompt: "Have you taken any step you planned?", tags: ['Action', 'Avoidance'] },
    { day: 'Thursday', prompt: "What is making it difficult to apply the message?", tags: ['Confusion', 'Avoidance'] },
    { day: 'Friday', prompt: "What did you do this week to follow the message?", tags: ['Action', 'Avoidance'] },
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

  const updateMemberStatus = async (id, field, value, memberName) => {
    try {
      await updateDoc(doc(db, 'members', id), { [field]: value });
      showNotification('success', `Hallelujah! ${memberName}'s record has been updated.`);
    } catch (error) { showNotification('error', "Connection Error."); }
  };

  const graduateToMember = async (id, memberName) => {
    if (window.confirm(`Graduate ${memberName} to full Church Member?`)) {
      try {
        await updateDoc(doc(db, 'members', id), { churchRole: 'Member', discipleshipGroup: 'General' });
        showNotification('success', `${memberName} has graduated!`);
      } catch (error) { console.error(error); }
    }
  };

  const membersToLog = members.filter(m => m.localAssembly === assembly && m.discipleshipGroup === group);

  const handleRecordChange = (id, field, value) => {
    setContactRecords(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSaveLogs = async () => {
    if (!assembly || !group) { showNotification('error', "Select Assembly and Group."); return; }
    setIsSubmitting(true);
    const activeRecords = {}; let contactCount = 0; const batch = writeBatch(db); 
    membersToLog.forEach(m => {
      const record = contactRecords[m.id];
      if (record.status !== 'Not Reached' && record.tag !== '') {
        const currentStage = m.discipleshipStage || 0;
        const stepInfo = sequenceSteps[Math.min(currentStage, 5)];
        activeRecords[m.id] = { name: m.name || 'Unknown', role: m.churchRole || 'Member', status: record.status, tag: record.tag, questionAsked: stepInfo.prompt, notes: record.notes };
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

  const generatePastorReport = () => {
    const recentLogs = savedLogs.slice(0, 15).filter(log => reportAssembly === 'All Assemblies' || log.assembly === reportAssembly);
    let immediateAttention = [], growthSignals = [], tagCounts = { Conviction: 0, Action: 0, Confusion: 0, Avoidance: 0 }, contactedIds = new Set();
    recentLogs.forEach(log => {
      Object.entries(log.records).forEach(([memberId, data]) => {
        contactedIds.add(memberId);
        tagCounts[data.tag] = (tagCounts[data.tag] || 0) + 1;
        if (data.tag === 'Confusion' || data.tag === 'Avoidance') {
           if (!immediateAttention.some(m => m.id === memberId)) immediateAttention.push({ id: memberId, name: data.name, tag: data.tag, issue: data.tag === 'Avoidance' ? 'Avoided midweek check or silent' : 'Confused about message' });
        }
        if (data.tag === 'Action' || data.tag === 'Conviction') {
           if (!growthSignals.some(m => m.id === memberId)) growthSignals.push({ id: memberId, name: data.name, tag: data.tag });
        }
      });
    });
    const allFilteredMembers = members.filter(m => reportAssembly === 'All Assemblies' || m.localAssembly === reportAssembly);
    const silentMembers = allFilteredMembers.filter(m => !contactedIds.has(m.id)).slice(0, 10); 
    let temperature = "The spiritual temperature is mixed; requires consistent pastoral follow-up.";
    const totalTags = tagCounts.Conviction + tagCounts.Action + tagCounts.Confusion + tagCounts.Avoidance;
    if (totalTags > 0) {
      if (tagCounts.Action > totalTags * 0.4) temperature = "Strong momentum: Members are actively practicing the Word.";
      else if (tagCounts.Confusion > totalTags * 0.3) temperature = "Warning: High levels of confusion. Pastoral clarification required.";
      else if (tagCounts.Avoidance > totalTags * 0.3) temperature = "Caution: Members are hesitant and avoiding deep engagement.";
    }
    return { immediateAttention, growthSignals, silentMembers, temperature };
  };

  const report = generatePastorReport();
  const getTagColor = (tag) => {
    if (tag === 'Action') return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30';
    if (tag === 'Conviction') return 'bg-blue-500/20 text-blue-200 border-blue-400/30';
    if (tag === 'Confusion') return 'bg-amber-500/20 text-amber-200 border-amber-400/30';
    if (tag === 'Avoidance') return 'bg-red-500/20 text-red-200 border-red-400/30';
    return 'bg-white/10 text-white/50 border-white/10';
  };

  const inputStyle = "w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:bg-black/30 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all text-sm text-white font-bold placeholder:text-cyan-200/50";
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

          <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
             <div>
               <h1 className="text-3xl font-black uppercase tracking-tight">Discipleship Command</h1>
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

          {/* TABLE AND CONTENT WRAPPER */}
          {activeTab === 'converts' && (
            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden">
               <div className="p-6 border-b border-white/10">
                 <input type="text" placeholder="Search members..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputStyle} />
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-white">
                   <thead className="bg-black/20 text-cyan-200 uppercase font-black text-[10px] tracking-widest">
                     <tr><th className="p-5">Convert Name</th><th className="p-5">Assembly</th><th className="p-5 text-center">Baptisms</th><th className="p-5 text-center">Action</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {members.filter(m => m.churchRole === 'New Convert').map(m => (
                       <tr key={m.id} className="hover:bg-white/5">
                         <td className="p-5 font-black">{m.name}</td>
                         <td className="p-5 text-cyan-200 font-bold">{m.localAssembly}</td>
                         <td className="p-5 text-center">
                           <div className="flex gap-2 justify-center">
                             <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${m.waterBaptismStatus === 'Yes' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-white/30'}`}>Water</span>
                             <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${m.spiritBaptism === 'Yes' ? 'bg-purple-500/20 text-purple-200' : 'bg-white/5 text-white/30'}`}>Spirit</span>
                           </div>
                         </td>
                         <td className="p-5 text-center">
                           <button onClick={() => graduateToMember(m.id, m.name)} disabled={m.waterBaptismStatus !== 'Yes'} className="bg-blue-500/20 hover:bg-blue-500/40 px-3 py-1 rounded-lg font-bold text-xs text-blue-200 disabled:opacity-30">Graduate</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'daily' && (
             <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                  <div><label className={labelStyle}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputStyle} /></div>
                  <div><label className={labelStyle}>Assembly</label><select value={assembly} onChange={(e) => setAssembly(e.target.value)} className={inputStyle}><option value="">Select...</option>{members.map(m => m.localAssembly).filter((v, i, a) => a.indexOf(v) === i).map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  <div><label className={labelStyle}>Group</label><select value={group} onChange={(e) => setGroup(e.target.value)} className={inputStyle}><option value="">Select...</option></select></div>
                </div>
                {assembly && group && (
                  <div className="space-y-4">
                    {members.filter(m => m.localAssembly === assembly && m.discipleshipGroup === group).map(m => (
                      <div key={m.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 font-bold">{m.name}</div>
                        <select value={contactRecords[m.id]?.status || 'Not Reached'} onChange={(e) => handleRecordChange(m.id, 'status', e.target.value)} className="p-2 bg-black/20 rounded-lg text-xs font-bold text-white"><option value="Not Reached">Not Reached</option><option value="Contacted">Contacted</option></select>
                        <select value={contactRecords[m.id]?.tag || ''} onChange={(e) => handleRecordChange(m.id, 'tag', e.target.value)} className={`p-2 rounded-lg text-xs font-bold ${getTagColor(contactRecords[m.id]?.tag)}`}>
                          <option value="">- Tag -</option>
                          {sequenceSteps[Math.min(m.discipleshipStage || 0, 5)].tags.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ))}
                    <button onClick={handleSaveLogs} className="w-full bg-cyan-600 hover:bg-cyan-700 py-4 rounded-xl font-black uppercase tracking-widest text-sm text-white shadow-lg shadow-cyan-900/30">Save & Advance</button>
                  </div>
                )}
             </div>
          )}

          {activeTab === 'weekly' && (
             <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 text-white">
                <h2 className="text-xl font-black mb-6">Pastoral Intelligence Report</h2>
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-6 rounded-2xl border border-white/10 mb-8">
                  <p className="text-sm text-blue-200 font-bold mb-1">Spiritual Temperature</p>
                  <p className="text-lg font-black">{report.temperature}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5"><h3 className="text-red-300 font-black mb-4">Immediate Attention</h3>{report.immediateAttention.map((m, i) => <div key={i} className="mb-2 font-bold bg-white/5 p-2 rounded">{m.name}: {m.issue}</div>)}</div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5"><h3 className="text-emerald-300 font-black mb-4">Growth Signals</h3>{report.growthSignals.map((m, i) => <div key={i} className="mb-2 font-bold bg-white/5 p-2 rounded">{m.name}: {m.tag}</div>)}</div>
                </div>
             </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}