"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Download, Database, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, ClipboardCheck, Flame, Shield, History, MessageSquare, BookOpen, HeartHandshake, FileBadge } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function DataExport() {
  const [loadingCard, setLoadingCard] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  
  const [members, setMembers] = useState([]);
  const [visitations, setVisitations] = useState([]); 
  
  const [isGenerating, setIsGenerating] = useState(false);

  // --- MEMBER FILTER STATES ---
  const [filterAssembly, setFilterAssembly] = useState('All Assemblies');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterCategory, setFilterCategory] = useState('All Categories');

  // --- VISITATION FILTER STATES ---
  const [visitAssembly, setVisitAssembly] = useState('All Assemblies');
  const [visitPurpose, setVisitPurpose] = useState('All Purposes');
  const [visitPeriod, setVisitPeriod] = useState('Custom'); 
  const [visitStartDate, setVisitStartDate] = useState('');
  const [visitEndDate, setVisitEndDate] = useState('');

  const visitPurposesList = [
    "Routine / Encouragement", 
    "Sickness / Health Issue", 
    "Bereavement", 
    "Backsliding / Missing Service", 
    "New Convert Follow-up", 
    "Childbirth / Naming",
    "Marriage / Counseling"
  ];

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qVisits = query(collection(db, 'visitations'), orderBy('date', 'desc'));
    const unsubVisits = onSnapshot(qVisits, (snapshot) => {
      setVisitations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubMembers(); unsubVisits(); };
  }, []);

  const allAssemblies = [...new Set(["Central", ...members.map(m => m.localAssembly).filter(Boolean)])].sort();
  const allRolesList = ["All Roles", "Member", "New Convert", "Elder", "Deacon", "Deaconess", "District Minister", "Presiding Elder", "Presiding Deacon"];

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const convertToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showNotification('error', `No data found to export.`);
      return;
    }
    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')]; 

    for (const row of data) {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) val = '';
        else if (typeof val === 'object') val = JSON.stringify(val).replace(/"/g, '""');
        else if (typeof val === 'string') val = val.replace(/"/g, '""');
        return `"${val}"`; 
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- AUTOMATED DATE CALCULATOR ---
  const applyPeriodDates = (period) => {
    setVisitPeriod(period);
    const year = new Date().getFullYear();
    let start = '';
    let end = '';

    switch (period) {
      case 'This Month':
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'Q1 (Jan-Mar)': start = `${year}-01-01`; end = `${year}-03-31`; break;
      case 'Q2 (Apr-Jun)': start = `${year}-04-01`; end = `${year}-06-30`; break;
      case 'Q3 (Jul-Sep)': start = `${year}-07-01`; end = `${year}-09-30`; break;
      case 'Q4 (Oct-Dec)': start = `${year}-10-01`; end = `${year}-12-31`; break;
      case 'H1 (Jan-Jun)': start = `${year}-01-01`; end = `${year}-06-30`; break;
      case 'H2 (Jul-Dec)': start = `${year}-07-01`; end = `${year}-12-31`; break;
      case 'Full Year': start = `${year}-01-01`; end = `${year}-12-31`; break;
      case 'Custom': start = ''; end = ''; break;
      default: break;
    }
    setVisitStartDate(start);
    setVisitEndDate(end);
  };

  const handleCustomMemberExport = () => {
    setIsGenerating(true);
    let filteredData = members;
    if (filterAssembly !== 'All Assemblies') filteredData = filteredData.filter(m => m.localAssembly === filterAssembly);
    if (filterRole !== 'All Roles') filteredData = filteredData.filter(m => m.churchRole === filterRole);
    if (filterCategory === 'Singles') filteredData = filteredData.filter(m => m.maritalStatus === 'Single');
    else if (filterCategory === 'Unemployed') filteredData = filteredData.filter(m => m.occupation && m.occupation.toLowerCase().includes('unemploy'));

    if (filteredData.length === 0) {
      showNotification('error', 'No members match these specific filters.');
      setIsGenerating(false);
      return;
    }
    convertToCSV(filteredData, `Members_Directory_Report`);
    showNotification('success', `Directory report generated for ${filteredData.length} souls.`);
    setIsGenerating(false);
  };

  // --- VISITATION EXTRACTOR ENGINE ---
  const handleCustomVisitationExport = () => {
    setIsGenerating(true);
    let filteredData = visitations;

    if (visitAssembly !== 'All Assemblies') filteredData = filteredData.filter(v => v.assembly === visitAssembly);
    if (visitPurpose !== 'All Purposes') filteredData = filteredData.filter(v => v.purpose === visitPurpose);
    
    if (visitStartDate && visitEndDate) filteredData = filteredData.filter(v => v.date >= visitStartDate && v.date <= visitEndDate);
    else if (visitStartDate) filteredData = filteredData.filter(v => v.date >= visitStartDate);
    else if (visitEndDate) filteredData = filteredData.filter(v => v.date <= visitEndDate);

    if (filteredData.length === 0) {
      showNotification('error', 'No visitations found for the selected criteria.');
      setIsGenerating(false);
      return;
    }

    const exportFormattedData = filteredData.map(v => ({
      Date: v.date,
      Member_Visited: v.memberName,
      Assembly: v.assembly,
      Purpose: v.purpose,
      Visiting_Team: v.visitingTeam,
      Requires_FollowUp: v.requiresFollowUp ? 'YES' : 'NO',
      Pastoral_Notes: v.notes || ''
    }));

    convertToCSV(exportFormattedData, `Pastoral_Visitation_Report`);
    showNotification('success', `Visitation report generated containing ${exportFormattedData.length} records.`);
    setIsGenerating(false);
  };

  const handleExport = async (collectionName, displayName) => {
    setLoadingCard(collectionName);
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const data = snapshot.docs.map(doc => ({ database_id: doc.id, ...doc.data() }));
      convertToCSV(data, displayName);
      showNotification('success', `${displayName} securely downloaded.`);
    } catch (error) {
      showNotification('error', `Failed to connect to the ${displayName} vault.`);
    } finally {
      setLoadingCard(null);
    }
  };

  const exportModules = [
    { id: 'members', name: 'Master Directory', desc: 'All registered members, phone numbers, demographics, and roles.', icon: Users, color: 'text-[#FFC300]' },
    { id: 'certificates', name: 'Certificates Log', desc: 'Registry of all Baptism, Dedication, and Marriage certificates issued.', icon: FileBadge, color: 'text-[#FFC300]' },
    { id: 'visitations', name: 'Pastoral Visitations', desc: 'Raw system dump of all tracked visits and follow-ups.', icon: HeartHandshake, color: 'text-[#FFC300]' },
    { id: 'attendance_logs', name: 'Attendance Registers', desc: 'Historical logs of Sunday services, midweek meetings, and absentees.', icon: ClipboardCheck, color: 'text-[#FFC300]' },
    { id: 'discipleship_logs', name: 'Discipleship Data', desc: 'Daily contact logs, behavioral tags, and pastoral follow-up data.', icon: Database, color: 'text-[#FFC300]' },
    { id: 'evangelism_logs', name: 'Evangelism & Outreach', desc: 'Records of crusades, dawn broadcasts, locations, and souls won.', icon: Flame, color: 'text-[#FFC300]' },
    { id: 'sms_logs', name: 'Bulk SMS Broadcasts', desc: 'System ledger of all transmitted text messages and recipient counts.', icon: MessageSquare, color: 'text-[#FFC300]' },
    { id: 'heritage_timeline', name: 'District Heritage (Timeline)', desc: 'Historical milestones, assembly foundings, and dedications.', icon: History, color: 'text-[#FFC300]' },
  ];

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec)
  const selectStyle = "w-full p-3 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:text-[#000814] [&>optgroup>option]:text-[#000814]";

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-xs uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER (Locks to top when scrolling down)          */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><Database size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Data Export Command</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Securely extract cloud database to Excel/CSV.</p>
              </div>
            </div>
          </div>

          <div className="bg-[#000814] rounded-[2rem] shadow-xl border border-[#003566] p-6 md:p-8 mb-8">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2 mb-6 uppercase tracking-widest">
              <Download size={18} className="text-[#FFC300]" /> Custom Report Generator
            </h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* MEMBERSHIP EXTRACTOR */}
              <div className="bg-[#001D3D] rounded-2xl border border-[#003566] p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#FFC300] flex items-center gap-2 mb-5 uppercase tracking-widest">
                    <Users size={16} /> Members Directory Extract
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">Assembly</label>
                      <select value={filterAssembly} onChange={e => setFilterAssembly(e.target.value)} className={selectStyle}>
                        <option value="All Assemblies">All Assemblies</option>
                        {allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">Church Role</label>
                      <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={selectStyle}>
                        {allRolesList.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">Category</label>
                      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectStyle}>
                        <option value="All Categories">All Categories</option>
                        <option value="Singles">Singles</option>
                        <option value="Unemployed">Unemployed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleCustomMemberExport} 
                  disabled={isGenerating}
                  className={`py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest w-full border ${isGenerating ? 'bg-white/10 text-white/50 border-[#003566] cursor-not-allowed' : 'bg-[#FFC300] text-[#000814] border-[#FFC300] hover:bg-[#FFD60A]'}`}
                >
                  {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Compiling...</> : <><Download size={16} /> Download Directory CSV</>}
                </button>
              </div>

              {/* VISITATION EXTRACTOR */}
              <div className="bg-[#001D3D] rounded-2xl border border-[#003566] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xs font-black text-[#FFC300] flex items-center gap-2 uppercase tracking-widest">
                      <HeartHandshake size={16} /> Pastoral Visitations Extract
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">Quick Time Period</label>
                      <select value={visitPeriod} onChange={e => applyPeriodDates(e.target.value)} className={selectStyle}>
                        <option value="Custom">Custom Date Range</option>
                        <option value="This Month">This Month</option>
                        <option value="Q1 (Jan-Mar)">Q1 (Jan-Mar)</option>
                        <option value="Q2 (Apr-Jun)">Q2 (Apr-Jun)</option>
                        <option value="Q3 (Jul-Sep)">Q3 (Jul-Sep)</option>
                        <option value="Q4 (Oct-Dec)">Q4 (Oct-Dec)</option>
                        <option value="H1 (Jan-Jun)">First Half (Jan-Jun)</option>
                        <option value="H2 (Jul-Dec)">Second Half (Jul-Dec)</option>
                        <option value="Full Year">Full Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">Start Date</label>
                      <input type="date" value={visitStartDate} onChange={e => { setVisitStartDate(e.target.value); setVisitPeriod('Custom'); }} className={selectStyle} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">End Date</label>
                      <input type="date" value={visitEndDate} onChange={e => { setVisitEndDate(e.target.value); setVisitPeriod('Custom'); }} className={selectStyle} />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">Visit Purpose</label>
                      <select value={visitPurpose} onChange={e => setVisitPurpose(e.target.value)} className={selectStyle}>
                        <option value="All Purposes">All Purposes</option>
                        {visitPurposesList.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1 mb-1.5 block">Assembly</label>
                      <select value={visitAssembly} onChange={e => setVisitAssembly(e.target.value)} className={selectStyle}>
                        <option value="All Assemblies">All Assemblies</option>
                        {allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                  <button 
                    onClick={handleCustomVisitationExport} 
                    disabled={isGenerating}
                    className={`flex-1 py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border ${isGenerating ? 'bg-white/10 text-white/50 border-[#003566] cursor-not-allowed' : 'bg-[#FFC300] text-[#000814] border-[#FFC300] hover:bg-[#FFD60A]'}`}
                  >
                    {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Compiling...</> : <><FileSpreadsheet size={16} /> Export Visitations</>}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-[#000814] border border-[#003566] p-5 rounded-2xl mb-8">
            <h3 className="font-black text-red-400 flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-widest">
              <AlertCircle size={14} /> Administrative Security Notice
            </h3>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-relaxed">Exported files contain sensitive personal data and confidential pastoral records. Store these files securely.</p>
          </div>

          <h2 className="text-sm font-black text-white mb-6 uppercase tracking-widest">Complete Database Vaults</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {exportModules.map((module) => {
              const Icon = module.icon;
              const isCurrentlyLoading = loadingCard === module.id;
              return (
                <div key={module.id} className="bg-[#000814] rounded-2xl border border-[#003566] p-6 shadow-xl flex flex-col hover:border-[#FFC300]/50 transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#001D3D] border border-[#003566] ${module.color}`}>
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-black text-white mb-2 uppercase tracking-widest">{module.name}</h3>
                  <p className="text-[9px] font-bold text-white/50 leading-relaxed flex-1 mb-6 uppercase tracking-widest">{module.desc}</p>
                  
                  <button 
                    onClick={() => handleExport(module.id, module.name)}
                    disabled={loadingCard !== null}
                    className={`w-full py-3 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-[9px] border ${isCurrentlyLoading ? 'bg-white/5 text-white/50 border-[#003566] cursor-not-allowed' : 'bg-[#001D3D] border-[#003566] text-[#FFC300] hover:bg-[#003566]'}`}
                  >
                    {isCurrentlyLoading ? <><Loader2 size={14} className="animate-spin" /> Extracting...</> : <><Download size={14} /> Download CSV</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}