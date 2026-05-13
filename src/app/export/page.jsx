"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Download, Database, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, ClipboardCheck, Flame, Shield, History, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

export default function DataExport() {
  const [loadingCard, setLoadingCard] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // --- CUSTOM REPORT STATES ---
  const [members, setMembers] = useState([]);
  const [filterAssembly, setFilterAssembly] = useState('All Assemblies');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    // Fetch members to power the Custom Report Generator dropdowns and data
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubMembers();
  }, []);

  const allAssemblies = [...new Set(["Central", ...members.map(m => m.localAssembly).filter(Boolean)])].sort();
  const allRolesList = ["All Roles", "Member", "New Convert", "Elder", "Deacon", "Deaconess", "District Minister", "Presiding Elder", "Presiding Deacon"];

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- CSV GENERATION ENGINE ---
  const convertToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showNotification('error', `No data found in the ${filename} database.`);
      return;
    }

    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);

    const csvRows = [];
    csvRows.push(headers.join(',')); 

    for (const row of data) {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) { val = ''; } 
        else if (typeof val === 'object') { val = JSON.stringify(val).replace(/"/g, '""'); } 
        else if (typeof val === 'string') { val = val.replace(/"/g, '""'); }
        return `"${val}"`; 
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- CUSTOM REPORT EXTRACTION ---
  const handleCustomExport = () => {
    setIsGenerating(true);
    let filteredData = members;

    if (filterAssembly !== 'All Assemblies') {
      filteredData = filteredData.filter(m => m.localAssembly === filterAssembly);
    }
    if (filterRole !== 'All Roles') {
      filteredData = filteredData.filter(m => m.churchRole === filterRole);
    }
    if (filterCategory === 'Singles') {
      filteredData = filteredData.filter(m => m.maritalStatus === 'Single');
    } else if (filterCategory === 'Unemployed') {
      filteredData = filteredData.filter(m => m.occupation && m.occupation.toLowerCase().includes('unemploy'));
    }

    if (filteredData.length === 0) {
      showNotification('error', 'No members match these specific filters.');
      setIsGenerating(false);
      return;
    }

    convertToCSV(filteredData, `Custom_Members_Report`);
    showNotification('success', `Custom report generated for ${filteredData.length} souls.`);
    setIsGenerating(false);
  };

  // --- STANDARD VAULT EXTRACTION ---
  const handleExport = async (collectionName, displayName) => {
    setLoadingCard(collectionName);
    setNotification({ type: '', message: '' });

    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const data = snapshot.docs.map(doc => ({ database_id: doc.id, ...doc.data() }));
      convertToCSV(data, displayName);
      showNotification('success', `${displayName} securely downloaded to your device.`);
    } catch (error) {
      showNotification('error', `Failed to connect to the ${displayName} vault.`);
    } finally {
      setLoadingCard(null);
    }
  };

  const exportModules = [
    { id: 'members', name: 'Master Directory', desc: 'All registered members, phone numbers, demographics, and roles.', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'attendance_logs', name: 'Attendance Registers', desc: 'Historical logs of Sunday services, midweek meetings, and absentees.', icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { id: 'discipleship_logs', name: 'Discipleship & Behaviors', desc: 'Daily contact logs, behavioral tags, and pastoral follow-up data.', icon: Database, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { id: 'evangelism_logs', name: 'Evangelism & Outreach', desc: 'Records of crusades, dawn broadcasts, locations, and souls won.', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { id: 'leadership_appointments', name: 'Presbytery Appointments', desc: 'Appointed committee leaders, levels, and designation history.', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { id: 'sms_logs', name: 'Bulk SMS Broadcasts', desc: 'System ledger of all transmitted text messages and recipient counts.', icon: MessageSquare, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
    { id: 'heritage_timeline', name: 'District Heritage (Timeline)', desc: 'Historical milestones, assembly foundings, and dedications.', icon: History, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { id: 'heritage_roll', name: 'District Heritage (Ministers)', desc: 'Roll of Honor containing all past and present District Ministers.', icon: FileSpreadsheet, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  ];

  const selectStyle = "w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm text-gray-700 shadow-sm font-bold";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto relative pb-10">
        
        {/* NOTIFICATION BANNER */}
        {notification.message && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-extrabold">{notification.message}</span>
          </div>
        )}

        <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-6">
          <div className="bg-slate-800 p-4 rounded-2xl text-slate-100 shadow-lg"><Database size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Data Export Command</h1>
            <p className="font-bold text-gray-500">Securely extract your cloud database into Excel-ready CSV files.</p>
          </div>
        </div>

        {/* ================= CUSTOM REPORT GENERATOR ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-extrabold text-emerald-700 flex items-center gap-3 mb-6">
            <Download size={24} className="text-emerald-500" /> Custom Report Generator
          </h2>
          
          <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6">
            <h3 className="text-lg font-black text-blue-900 flex items-center gap-2 mb-4">
               <Users size={20} className="text-blue-600"/> Members Directory Filter
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

            <button 
              onClick={handleCustomExport} 
              disabled={isGenerating}
              className={`px-8 py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white text-sm w-full md:w-auto
                ${isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Compiling Data...</> : <><Download size={18} /> Download Custom CSV</>}
            </button>
          </div>
        </div>

        {/* SECURITY WARNING */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-8">
          <h3 className="font-extrabold text-amber-900 flex items-center gap-2 mb-1">
            <AlertCircle size={18} /> Administrative Security Notice
          </h3>
          <p className="text-sm font-bold text-amber-800">
            Exported files contain sensitive personal data and confidential pastoral records. Ensure these files are stored securely.
          </p>
        </div>

        {/* ================= FULL VAULT EXPORTS ================= */}
        <h2 className="text-xl font-extrabold text-slate-800 mb-6">Complete Database Vaults</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exportModules.map((module) => {
            const Icon = module.icon;
            const isCurrentlyLoading = loadingCard === module.id;

            return (
              <div key={module.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-6 flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${module.bg} ${module.color} border ${module.border}`}>
                    <Icon size={28} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">{module.name}</h3>
                  <p className="text-sm font-bold text-gray-500 leading-relaxed">{module.desc}</p>
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button 
                    onClick={() => handleExport(module.id, module.name)}
                    disabled={loadingCard !== null}
                    className={`w-full py-3 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 text-sm
                      ${isCurrentlyLoading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : loadingCard !== null ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 text-white shadow-md'}`}
                  >
                    {isCurrentlyLoading ? <><Loader2 size={18} className="animate-spin" /> Extracting Vault...</> : <><Download size={18} /> Download CSV</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </DashboardLayout>
  );
}