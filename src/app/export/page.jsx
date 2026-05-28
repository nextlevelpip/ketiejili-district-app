"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Download, Database, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, ClipboardCheck, Flame, Shield, History, MessageSquare, Landmark, BookOpen, Scale } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function DataExport() {
  const [loadingCard, setLoadingCard] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  
  const [members, setMembers] = useState([]);
  const [treasuryLogs, setTreasuryLogs] = useState([]); 
  
  const [isGenerating, setIsGenerating] = useState(false);

  // --- MEMBER FILTER STATES ---
  const [filterAssembly, setFilterAssembly] = useState('All Assemblies');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterCategory, setFilterCategory] = useState('All Categories');

  // --- TREASURY FILTER STATES ---
  const [treasuryType, setTreasuryType] = useState('All Transactions');
  const [treasuryAssembly, setTreasuryAssembly] = useState('All Assemblies');
  const [treasuryPeriod, setTreasuryPeriod] = useState('Custom'); // NEW: Quick Period Selector
  const [treasuryStartDate, setTreasuryStartDate] = useState('');
  const [treasuryEndDate, setTreasuryEndDate] = useState('');

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qLogs = query(collection(db, 'treasury_logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setTreasuryLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubMembers(); unsubLogs(); };
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
    setTreasuryPeriod(period);
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
    setTreasuryStartDate(start);
    setTreasuryEndDate(end);
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

  // --- TREASURY MASTER LEDGER EXPORT ---
  const handleCustomTreasuryExport = () => {
    setIsGenerating(true);
    let filteredData = treasuryLogs;

    if (treasuryType !== 'All Transactions') filteredData = filteredData.filter(log => log.transactionType === treasuryType);
    if (treasuryAssembly !== 'All Assemblies') filteredData = filteredData.filter(log => log.localAssembly === treasuryAssembly);
    if (treasuryStartDate && treasuryEndDate) filteredData = filteredData.filter(log => log.date >= treasuryStartDate && log.date <= treasuryEndDate);
    else if (treasuryStartDate) filteredData = filteredData.filter(log => log.date >= treasuryStartDate);
    else if (treasuryEndDate) filteredData = filteredData.filter(log => log.date <= treasuryEndDate);

    if (filteredData.length === 0) {
      showNotification('error', 'No transactions found for the selected criteria.');
      setIsGenerating(false);
      return;
    }

    const exportFormattedData = filteredData.map(log => ({
      Date: log.date,
      Type: log.transactionType,
      Category: log.category,
      Amount: log.amount,
      Assembly: log.localAssembly,
      Payment_Method: log.paymentMethod || 'Cash in Hand',
      Doc_Number: log.documentNo || 'N/A',
      Cheque_Number: log.chequeNo || 'N/A',
      Particulars: log.contributor || 'N/A',
      Notes: log.notes || '',
      Recorded_By: log.recordedBy || 'System Admin'
    }));

    convertToCSV(exportFormattedData, `Treasury_Ledger_Report`);
    showNotification('success', `Ledger generated containing ${exportFormattedData.length} transactions.`);
    setIsGenerating(false);
  };

  // --- BANK RECONCILIATION EXPORT ---
  const handleReconExport = () => {
    setIsGenerating(true);
    let filteredData = treasuryLogs;

    // Recon needs both Income and Expenses to calculate net balance, so we only apply date and assembly filters
    if (treasuryAssembly !== 'All Assemblies') filteredData = filteredData.filter(log => log.localAssembly === treasuryAssembly);
    if (treasuryStartDate && treasuryEndDate) filteredData = filteredData.filter(log => log.date >= treasuryStartDate && log.date <= treasuryEndDate);
    else if (treasuryStartDate) filteredData = filteredData.filter(log => log.date >= treasuryStartDate);
    else if (treasuryEndDate) filteredData = filteredData.filter(log => log.date <= treasuryEndDate);

    const getBal = (method) => {
      const inc = filteredData.filter(l => (l.transactionType || 'Income') === 'Income' && l.paymentMethod === method).reduce((s, l) => s + (l.amount || 0), 0);
      const exp = filteredData.filter(l => l.transactionType === 'Expense' && l.paymentMethod === method).reduce((s, l) => s + (l.amount || 0), 0);
      return inc - exp;
    };

    const exportFormattedData = [
      { Account_Type: 'NIB Bank', System_Balance_GHS: getBal('NIB Bank'), Period_Start: treasuryStartDate || 'All Time', Period_End: treasuryEndDate || 'All Time', Assembly: treasuryAssembly },
      { Account_Type: 'Omnibank', System_Balance_GHS: getBal('Omnibank'), Period_Start: treasuryStartDate || 'All Time', Period_End: treasuryEndDate || 'All Time', Assembly: treasuryAssembly },
      { Account_Type: 'Mobile Money', System_Balance_GHS: getBal('Mobile Money'), Period_Start: treasuryStartDate || 'All Time', Period_End: treasuryEndDate || 'All Time', Assembly: treasuryAssembly },
      { Account_Type: 'Cash in Hand', System_Balance_GHS: getBal('Cash in Hand'), Period_Start: treasuryStartDate || 'All Time', Period_End: treasuryEndDate || 'All Time', Assembly: treasuryAssembly },
    ];

    convertToCSV(exportFormattedData, `Bank_Reconciliation_Report`);
    showNotification('success', `Bank Reconciliation generated successfully.`);
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
    { id: 'treasury_logs', name: 'Raw Treasury Ledger', desc: 'Raw system dump of every financial transaction processed.', icon: Landmark, color: 'text-emerald-300' },
    { id: 'members', name: 'Master Directory', desc: 'All registered members, phone numbers, demographics, and roles.', icon: Users, color: 'text-blue-300' },
    { id: 'attendance_logs', name: 'Attendance Registers', desc: 'Historical logs of Sunday services, midweek meetings, and absentees.', icon: ClipboardCheck, color: 'text-emerald-300' },
    { id: 'discipleship_logs', name: 'Discipleship Data', desc: 'Daily contact logs, behavioral tags, and pastoral follow-up data.', icon: Database, color: 'text-purple-300' },
    { id: 'evangelism_logs', name: 'Evangelism & Outreach', desc: 'Records of crusades, dawn broadcasts, locations, and souls won.', icon: Flame, color: 'text-orange-300' },
    { id: 'sms_logs', name: 'Bulk SMS Broadcasts', desc: 'System ledger of all transmitted text messages and recipient counts.', icon: MessageSquare, color: 'text-sky-300' },
    { id: 'heritage_timeline', name: 'District Heritage (Timeline)', desc: 'Historical milestones, assembly foundings, and dedications.', icon: History, color: 'text-amber-300' },
    { id: 'heritage_roll', name: 'District Heritage (Ministers)', desc: 'Roll of Honor containing all past and present District Ministers.', icon: BookOpen, color: 'text-amber-300' },
  ];

  const selectStyle = "w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:bg-black/30 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-500/20 outline-none transition-all text-sm text-white shadow-sm font-bold placeholder:text-yellow-200/40 [&>option]:text-gray-900";

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><Database size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Data Export Command</h1>
              <p className="font-bold text-slate-300">Securely extract your cloud database into Excel-ready CSV files.</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 p-8 mb-8">
            <h2 className="text-xl font-extrabold text-yellow-400 flex items-center gap-3 mb-6">
              <Download size={24} /> Custom Report Generator
            </h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* MEMBERSHIP EXTRACTOR */}
              <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2 mb-6">
                    <Users size={20} className="text-blue-300"/> Members Directory Extract
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 mb-8">
                    <select value={filterAssembly} onChange={e => setFilterAssembly(e.target.value)} className={selectStyle}>
                      <option value="All Assemblies">All Assemblies</option>
                      {allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={selectStyle}>
                      {allRolesList.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectStyle}>
                      <option value="All Categories">All Categories</option>
                      <option value="Singles">Singles</option>
                      <option value="Unemployed">Unemployed</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleCustomMemberExport} 
                  disabled={isGenerating}
                  className={`py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white text-sm w-full border border-white/20
                    ${isGenerating ? 'bg-white/10 cursor-not-allowed' : 'bg-[#0ea5e9] hover:bg-[#0284c7] shadow-blue-500/30'}`}
                >
                  {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Compiling...</> : <><Download size={18} /> Download Directory CSV</>}
                </button>
              </div>

              {/* TREASURY LEDGER EXTRACTOR */}
              <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2 mb-6">
                    <Landmark size={20} className="text-emerald-300"/> Treasury Ledger Extract
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <select value={treasuryType} onChange={e => setTreasuryType(e.target.value)} className={selectStyle}>
                        <option value="All Transactions">All Transactions</option>
                        <option value="Income">Income (Receipts)</option>
                        <option value="Expense">Expenses (PVs)</option>
                      </select>
                      <select value={treasuryAssembly} onChange={e => setTreasuryAssembly(e.target.value)} className={selectStyle}>
                        <option value="All Assemblies">All Assemblies</option>
                        {allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    {/* NEW QUICK PERIOD SELECTOR */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <select value={treasuryPeriod} onChange={e => applyPeriodDates(e.target.value)} className={selectStyle}>
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

                    <div className="flex items-center gap-4">
                      <div className="w-full">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 mb-1 block">From</label>
                        <input type="date" value={treasuryStartDate} onChange={e => { setTreasuryStartDate(e.target.value); setTreasuryPeriod('Custom'); }} className={selectStyle} />
                      </div>
                      <div className="w-full">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 mb-1 block">To</label>
                        <input type="date" value={treasuryEndDate} onChange={e => { setTreasuryEndDate(e.target.value); setTreasuryPeriod('Custom'); }} className={selectStyle} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button 
                    onClick={handleCustomTreasuryExport} 
                    disabled={isGenerating}
                    className={`flex-1 py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white text-xs border border-white/20
                      ${isGenerating ? 'bg-white/10 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30'}`}
                  >
                    {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Compiling...</> : <><FileSpreadsheet size={16} /> Export Ledger</>}
                  </button>
                  <button 
                    onClick={handleReconExport} 
                    disabled={isGenerating}
                    className={`flex-1 py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white text-xs border border-white/20
                      ${isGenerating ? 'bg-white/10 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'}`}
                  >
                    {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Compiling...</> : <><Scale size={16} /> Export Recon</>}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-amber-900/40 border border-amber-500/30 p-5 rounded-2xl mb-8 backdrop-blur-md">
            <h3 className="font-extrabold text-amber-100 flex items-center gap-2 mb-1">
              <AlertCircle size={18} /> Administrative Security Notice
            </h3>
            <p className="text-sm font-bold text-amber-200/70">Exported files contain sensitive personal data and confidential pastoral records. Store these files securely.</p>
          </div>

          <h2 className="text-xl font-extrabold text-white mb-6">Complete Database Vaults</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {exportModules.map((module) => {
              const Icon = module.icon;
              const isCurrentlyLoading = loadingCard === module.id;
              return (
                <div key={module.id} className="bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 shadow-xl flex flex-col hover:bg-white/10 transition-all">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-white/5 border border-white/5 ${module.color}`}>
                    <Icon size={28} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2">{module.name}</h3>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed flex-1 mb-6">{module.desc}</p>
                  
                  <button 
                    onClick={() => handleExport(module.id, module.name)}
                    disabled={loadingCard !== null}
                    className={`w-full py-3 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 text-xs border border-white/10
                      ${isCurrentlyLoading ? 'bg-white/5 text-white/50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white shadow-sm'}`}
                  >
                    {isCurrentlyLoading ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : <><Download size={16} /> Download CSV</>}
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