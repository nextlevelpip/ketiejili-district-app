"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { HeartHandshake, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Save, Filter, Wallet, CalendarDays, Users, WifiOff, FileText, Briefcase, Baby } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function SocialInterventions() {
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('log'); 
  const [demoSubTab, setDemoSubTab] = useState('occupations'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // --- CUSTOM MODAL STATE ---
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '', cat: '' });

  // --- LOG FORM STATES ---
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fCategory, setFCategory] = useState('All Categories');

  // --- DEMOGRAPHICS FILTER STATES ---
  const [demoSearch, setDemoSearch] = useState('');
  const [demoAssembly, setDemoAssembly] = useState('All Assemblies');
  const [demoGender, setDemoGender] = useState('All Genders');
  const [demoMarital, setDemoMarital] = useState('All Statuses');
  const [demoOccupation, setDemoOccupation] = useState('All Occupations'); 

  const welfareCategories = [
    "Tertiary Sponsorship", 
    "Pre-Tertiary Sponsorship", 
    "Health Support", 
    "Apprenticeship Support", 
    "Community Transformation", 
    "Environmental Care",
    "General Member Welfare"
  ];

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    if (typeof window !== 'undefined' && !navigator.onLine) setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const qLogs = query(collection(db, 'welfare_logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(fetched.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubLogs();
      unsubMembers();
    };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";
  
  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))].sort();
  const uniqueOccupations = [...new Set(members.map(m => m.occupation).filter(o => o && o.trim() !== ''))].sort();

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const resetForm = () => {
    setBeneficiary(''); setAmount(''); setCategory(''); setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!amount || isNaN(amount) || amount <= 0) {
      showNotification('error', 'Please enter a valid numeric amount.');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'welfare_logs'), { 
        beneficiary: beneficiary.trim(),
        amount: parseFloat(amount),
        category,
        date,
        notes: notes.trim(),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.name || 'System Admin'
      });
      showNotification('success', isOffline ? 'Saved to Offline Vault. Will sync soon.' : 'Intervention logged successfully.');
      resetForm(); 
      setActiveTab('history');
    } catch (err) {
      showNotification('error', 'Critical Error: Data Not Saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CUSTOM DELETE MODAL LOGIC ---
  const triggerDelete = (id, name, cat) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    setDeleteModal({ isOpen: true, id, name, cat });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'welfare_logs', deleteModal.id));
      showNotification('success', isOffline ? 'Purge queued in Offline Vault.' : 'Financial log deleted.');
    } catch (err) { 
      showNotification('error', 'Purge Failed.'); 
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '', cat: '' });
    }
  };

  // --- HISTORY FILTERS ---
  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.beneficiary || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = fCategory === 'All Categories' || log.category === fCategory;
    return matchesSearch && matchesCategory;
  });

  const totalDisbursed = filteredLogs.reduce((sum, log) => sum + (log.amount || 0), 0);

  // --- DEMOGRAPHICS FILTERS ---
  const filteredDemographics = members.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(demoSearch.toLowerCase()) || 
                          (m.occupation || '').toLowerCase().includes(demoSearch.toLowerCase());
    const matchesAssem = demoAssembly === 'All Assemblies' || m.localAssembly === demoAssembly;
    const matchesGender = demoGender === 'All Genders' || m.gender === demoGender;
    
    const matchesMarital = demoSubTab !== 'families' || demoMarital === 'All Statuses' || m.maritalStatus === demoMarital;
    const matchesOccupation = demoSubTab !== 'occupations' || demoOccupation === 'All Occupations' || m.occupation === demoOccupation;

    return matchesSearch && matchesAssem && matchesGender && matchesMarital && matchesOccupation;
  });

  // PREMIUM SOLID INPUT STYLE (Navy & Gold spec) WITH DROPDOWN FIX
  const inputStyle = "w-full p-3.5 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none transition-all text-xs text-white font-bold placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white [&>optgroup>option]:bg-[#001D3D] [&>optgroup>option]:text-white";
  const labelStyle = "text-[9px] font-black text-white/50 uppercase ml-1 mb-2 block tracking-widest";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative">
        
        {/* CUSTOM DELETE MODAL OVERLAY */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#000814]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">System Purge</h3>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest">
                  Delete this {deleteModal.cat} record for <span className="text-white">{deleteModal.name}</span>? This alters financial history permanently.
                </p>
              </div>
              <div className="flex border-t border-[#003566]">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, id: null, name: '', cat: '' })}
                  className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-xl shadow-2xl font-black flex items-center gap-3 animate-bounce text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {notification.message}
            </div>
          )}

          {isOffline && (
            <div className="bg-[#FFC300]/10 border border-[#FFC300]/30 text-[#FFC300] px-6 py-4 rounded-xl flex items-center gap-3 shadow-lg animate-fade-in mb-6">
              <WifiOff size={20} className="animate-pulse" />
              <div>
                <p className="font-black text-xs uppercase tracking-widest">Offline Mode Active</p>
                <p className="text-[10px] font-bold mt-0.5 text-[#FFC300]/70">You can safely log disbursements. Records are secured in your local vault and will sync automatically.</p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block"><HeartHandshake size={24} /></div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Social Interventions</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Track welfare disbursements & community support.</p>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'log', label: 'Log Disbursement', icon: Wallet },
                { id: 'history', label: `Intervention History (${logs.length})`, icon: FileText },
                { id: 'demographics', label: 'Demographics Radar', icon: Users }
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
          {/* TAB 1: LOG DISBURSEMENT                            */}
          {/* ================================================== */}
          {activeTab === 'log' && (
            <div className="bg-[#000814] p-6 md:p-10 rounded-2xl shadow-xl border border-[#003566] max-w-4xl mx-auto animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFC300] to-[#FCA311]"></div>
              
              <form onSubmit={handleSave} className="space-y-6 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelStyle}>Category *</label>
                    <select required value={category} onChange={e => setCategory(e.target.value)} className={inputStyle}>
                      <option value="">- Select Reporting Category -</option>
                      {welfareCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Date of Disbursement *</label>
                    <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputStyle} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#001D3D] p-6 rounded-xl border border-[#003566]">
                  <div>
                    <label className={labelStyle}>Beneficiary Name / Organization *</label>
                    <input 
                      required type="text" list="membersList" 
                      placeholder="Type name or select member..." 
                      value={beneficiary} onChange={e => setBeneficiary(e.target.value)} 
                      className={inputStyle} 
                    />
                    <datalist id="membersList">
                      {members.map(m => <option key={m.id} value={m.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelStyle}>Amount Disbursed (GHS) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 font-black text-[#FFC300]">₵</span>
                      <input 
                        required type="number" step="0.01" min="0" placeholder="0.00" 
                        value={amount} onChange={e => setAmount(e.target.value)} 
                        className={`${inputStyle} pl-10 text-[#FFC300]`} 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Additional Notes / Specifics (Optional)</label>
                  <textarea rows="3" placeholder="e.g. Paid directly to KNUST for Level 200 fees..." value={notes} onChange={e => setNotes(e.target.value)} className={inputStyle} />
                </div>

                <div className="pt-4 border-t border-[#003566] flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-3.5 bg-[#FFC300] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#FFD60A] transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Record Intervention</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 2: INTERVENTION HISTORY                        */}
          {/* ================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#000814] p-5 rounded-2xl shadow-xl border border-[#003566] grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-4 flex items-center gap-4 bg-[#001D3D] p-4 rounded-xl border border-[#003566]">
                  <div className="bg-[#FFC300]/10 text-[#FFC300] p-3 rounded-lg border border-[#FFC300]/30"><Wallet size={24} /></div>
                  <div>
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Filtered Total</p>
                    <h3 className="text-xl font-black text-white">₵ {totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                  </div>
                </div>

                <div className="lg:col-span-4 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16}/>
                  <input 
                    placeholder="Search beneficiaries or notes..." 
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full pl-11 p-3.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs outline-none focus:border-[#FFC300] text-white placeholder:text-white/30 transition-all" 
                  />
                </div>
                
                <div className="lg:col-span-4 flex items-center gap-2 bg-[#001D3D] px-4 py-3.5 rounded-xl border border-[#003566]">
                  <Filter size={14} className="text-[#FFC300] shrink-0" />
                  <select 
                    value={fCategory} onChange={e => setFCategory(e.target.value)} 
                    className="w-full bg-transparent font-black text-[10px] uppercase tracking-widest text-white focus:outline-none cursor-pointer [&>option]:bg-[#001D3D] [&>option]:text-white"
                  >
                    <option value="All Categories">All Categories Overview</option>
                    {welfareCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-[#000814] rounded-2xl shadow-xl border border-[#003566] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#001D3D] z-10 text-[9px] font-black text-[#FFC300] uppercase tracking-widest border-b border-[#003566]">
                      <tr>
                        <th className="p-5 w-40">Date</th>
                        <th className="p-5">Beneficiary & Category</th>
                        <th className="p-5">Details</th>
                        <th className="p-5 text-right">Amount Disbursed</th>
                        {isTier1 && <th className="p-5 text-center w-24">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#003566]">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#001D3D]/50 transition-colors">
                          <td className="p-5">
                            <div className="flex items-center gap-2 font-black text-white/70 text-[10px] uppercase tracking-widest">
                              <CalendarDays size={12} className="text-[#FFC300]" />
                              {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-black text-white text-sm">{log.beneficiary}</div>
                            <div className="text-[8px] font-black text-[#FFC300] bg-[#003566] px-2 py-0.5 rounded border border-[#FFC300]/30 inline-block mt-1.5 uppercase tracking-widest">
                              {log.category}
                            </div>
                          </td>
                          <td className="p-5">
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest line-clamp-2">{log.notes || <span className="italic text-white/30">No notes provided</span>}</p>
                          </td>
                          <td className="p-5 text-right">
                            <span className="font-black text-[#FFC300] text-sm">₵ {parseFloat(log.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </td>
                          {isTier1 && (
                            <td className="p-5 text-center">
                              <button onClick={() => triggerDelete(log.id, log.beneficiary, log.category)} className="p-1.5 text-white/30 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
                                <Trash2 size={14}/>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-12 text-center text-white/50 font-bold italic text-xs">No intervention records match your search parameters.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 3: DEMOGRAPHICS RADAR (JOBS & FAMILY)          */}
          {/* ================================================== */}
          {activeTab === 'demographics' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* SUB-TABS (Jobs vs Family) */}
              <div className="flex gap-4 border-b border-[#003566] pb-px">
                <button 
                  onClick={() => setDemoSubTab('occupations')} 
                  className={`pb-3 text-[10px] uppercase font-black tracking-widest transition-colors ${demoSubTab === 'occupations' ? 'text-[#FFC300] border-b-2 border-[#FFC300]' : 'text-white/50 hover:text-white'}`}
                >
                  <Briefcase size={14} className="inline mr-1.5 -mt-0.5"/> Occupational Watch
                </button>
                <button 
                  onClick={() => setDemoSubTab('families')} 
                  className={`pb-3 text-[10px] uppercase font-black tracking-widest transition-colors ${demoSubTab === 'families' ? 'text-[#FFC300] border-b-2 border-[#FFC300]' : 'text-white/50 hover:text-white'}`}
                >
                  <Baby size={14} className="inline mr-1.5 -mt-0.5"/> Family & Dependents
                </button>
              </div>

              {/* DEMOGRAPHICS FILTERS ENGINE */}
              <div className="bg-[#000814] p-4 md:p-6 rounded-2xl shadow-xl border border-[#003566] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-white/30" size={14}/>
                  <input 
                    placeholder={demoSubTab === 'occupations' ? "Search names or jobs..." : "Search families..."}
                    value={demoSearch} onChange={e => setDemoSearch(e.target.value)} 
                    className="w-full pl-9 p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs outline-none focus:border-[#FFC300] text-white placeholder:text-white/30" 
                  />
                </div>
                
                <select value={demoAssembly} onChange={e => setDemoAssembly(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-[10px] uppercase tracking-widest outline-none focus:border-[#FFC300] text-white [&>option]:bg-[#001D3D] [&>option]:text-white">
                  <option value="All Assemblies">All Assemblies</option>
                  {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                
                <select value={demoGender} onChange={e => setDemoGender(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-[10px] uppercase tracking-widest outline-none focus:border-[#FFC300] text-white [&>option]:bg-[#001D3D] [&>option]:text-white">
                  <option value="All Genders">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                {/* DYNAMIC 4TH FILTER COLUMN */}
                {demoSubTab === 'occupations' ? (
                  <select value={demoOccupation} onChange={e => setDemoOccupation(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-[10px] uppercase tracking-widest outline-none focus:border-[#FFC300] text-white [&>option]:bg-[#001D3D] [&>option]:text-white">
                    <option value="All Occupations">All Occupations</option>
                    {uniqueOccupations.map(occ => <option key={occ} value={occ}>{occ}</option>)}
                  </select>
                ) : (
                  <select value={demoMarital} onChange={e => setDemoMarital(e.target.value)} className="p-2.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-[10px] uppercase tracking-widest outline-none focus:border-[#FFC300] text-white [&>option]:bg-[#001D3D] [&>option]:text-white">
                    <option value="All Statuses">All Marital Statuses</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                )}
              </div>

              {/* DEMOGRAPHICS TABLE */}
              <div className="bg-[#000814] rounded-2xl shadow-xl border border-[#003566] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#001D3D] border-b border-[#003566] text-[9px] font-black text-[#FFC300] uppercase tracking-widest">
                        <th className="p-5">Member Name</th>
                        <th className="p-5">Local Assembly</th>
                        <th className="p-5">Gender</th>
                        {demoSubTab === 'occupations' ? (
                          <th className="p-5 text-white">Occupation / Job Field</th>
                        ) : (
                          <>
                            <th className="p-5 text-white">Marital Status</th>
                            <th className="p-5 text-white">Dependents / Children</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#003566]">
                      {filteredDemographics.map(m => (
                        <tr key={m.id} className="hover:bg-[#001D3D]/50 transition-colors">
                          <td className="p-5 font-black text-white text-sm">{m.name}</td>
                          <td className="p-5 font-bold text-[10px] uppercase tracking-widest text-white/50">{m.localAssembly}</td>
                          <td className="p-5 font-bold text-white/70">{m.gender}</td>
                          
                          {demoSubTab === 'occupations' ? (
                            <td className="p-5">
                              <span className="font-bold text-[10px] uppercase tracking-widest text-[#FFC300] bg-[#003566] px-3 py-1 rounded-md border border-[#FFC300]/30">
                                {m.occupation || 'Not Specified'}
                              </span>
                            </td>
                          ) : (
                            <>
                              <td className="p-5 font-black text-white">{m.maritalStatus || '-'}</td>
                              <td className="p-5">
                                {(m.maritalStatus === 'Married' || m.maritalStatus === 'Widowed' || m.maritalStatus === 'Divorced') ? (
                                  <span className={`font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-md border ${m.childrenCount > 3 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-[#003566] text-[#FFC300] border-[#FFC300]/30'}`}>
                                    {m.childrenCount || 0} Children
                                  </span>
                                ) : (
                                  <span className="text-white/30 font-bold italic">N/A</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {filteredDemographics.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-white/50 font-bold italic text-xs">No demographic records match your criteria.</td></tr>}
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