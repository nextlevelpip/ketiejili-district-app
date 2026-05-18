"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Coins, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Save, Filter, Landmark, CalendarDays, ArrowDownToLine, ArrowUpFromLine, FileText, TrendingUp, Building2, Plus, Trash, WalletCards, Receipt, Scale, ShieldCheck, Users } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function DistrictTreasury() {
  const [logs, setLogs] = useState([]);
  const [assemblies, setAssemblies] = useState(['Central']);
  const [activeTab, setActiveTab] = useState('income'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- BATCH FORM STATES ---
  const [globalData, setGlobalData] = useState({
    localAssembly: 'Central',
    date: new Date().toISOString().split('T')[0],
    entity: 'General Congregation', 
    notes: ''
  });

  const [entries, setEntries] = useState([
    { id: Date.now(), category: '', customCategory: '', amount: '', paymentMethod: 'Cash' }
  ]);

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fType, setFType] = useState('All Transactions');
  const [fCategory, setFCategory] = useState('All Categories');
  const [fAssembly, setFAssembly] = useState('All Assemblies');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // --- STANDARD CATEGORIES ---
  const incomeCategories = [
    "Tithes", "Mission Offering (M.O.)", "Area Week Offering", "Missions Week Offering", 
    "Area Prayers", "District Week Offering", "Children ministry offering", 
    "Youth ministry offering", "Evangelism ministry offering", "Women ministry offering", 
    "Pentecost Men Ministry Offerings", "Other / Add Custom..." 
  ];

  // UPGRADED EXPENSE CATEGORIES FOR EXACT FUND ACCOUNTING
  const expenseCategories = [
    "Headquarters / Area Remittance", "Pastoral Allowance", "District Admin & Utilities", 
    "Church Building & Projects", "Welfare & Relief", "Children Ministry Expense", 
    "Youth Ministry Expense", "Evangelism Ministry Expense", "Women Ministry Expense", 
    "PEMEM Expense", "Other / Add Custom..."
  ];

  const paymentMethods = ["Cash", "Mobile Money (MoMo)", "Bank Transfer", "Cheque"];
  const activeCategoryList = activeTab === 'income' ? incomeCategories : expenseCategories;

  const dynamicCategories = [...new Set([
    ...incomeCategories.filter(c => c !== "Other / Add Custom..."),
    ...expenseCategories.filter(c => c !== "Other / Add Custom..."),
    ...logs.map(l => l.category)
  ])].sort();

  useEffect(() => {
    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(fetched);
        setGlobalData(prev => ({ ...prev, localAssembly: fetched[0] }));
      }
    });

    const qLogs = query(collection(db, 'treasury_logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    return () => { unsubAssem(); unsubLogs(); };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setEntries([{ id: Date.now(), category: '', customCategory: '', amount: '', paymentMethod: 'Cash' }]);
    setGlobalData(prev => ({ ...prev, entity: tab === 'income' ? 'General Congregation' : '', notes: '' }));
  };

  const handleAddEntry = () => setEntries([...entries, { id: Date.now(), category: '', customCategory: '', amount: '', paymentMethod: 'Cash' }]);
  const handleRemoveEntry = (idToRemove) => { if (entries.length > 1) setEntries(entries.filter(e => e.id !== idToRemove)); };
  
  const handleEntryChange = (id, field, value) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        if (field === 'category' && value !== "Other / Add Custom...") updatedEntry.customCategory = '';
        return updatedEntry;
      }
      return entry;
    }));
  };

  const batchTotal = entries.reduce((sum, entry) => {
    const amt = parseFloat(entry.amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validEntries = entries.filter(entry => {
      const amt = parseFloat(entry.amount);
      return !isNaN(amt) && amt > 0 && entry.category !== '';
    });

    if (validEntries.length === 0) {
      showNotification('error', 'Please enter at least one valid category and amount.');
      setIsSubmitting(false);
      return;
    }

    try {
      const promises = validEntries.map(entry => {
        const finalCategory = entry.category === "Other / Add Custom..." ? entry.customCategory.trim() : entry.category;
        if (!finalCategory) throw new Error("Missing Category Name");

        return addDoc(collection(db, 'treasury_logs'), { 
          transactionType: activeTab === 'income' ? 'Income' : 'Expense',
          localAssembly: globalData.localAssembly,
          amount: parseFloat(entry.amount),
          category: finalCategory,
          paymentMethod: entry.paymentMethod,
          contributor: globalData.entity.trim() || 'Not Specified',
          date: globalData.date,
          notes: globalData.notes.trim(),
          recordedAt: new Date().toISOString(),
          recordedBy: currentUser?.fullName || 'System Admin',
          batchId: Date.now().toString() 
        });
      });

      await Promise.all(promises);
      const actionTxt = activeTab === 'income' ? 'secured' : 'dispatched';
      showNotification('success', `Successfully ${actionTxt} ${validEntries.length} entries for ₵${batchTotal.toLocaleString()}`);
      handleTabSwitch('history');
    } catch (err) {
      showNotification('error', 'Error processing batch. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, cat, amt, type) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    if (window.confirm(`Delete ${type} record for ${cat} (₵${amt})? This permanently alters the master ledger.`)) {
      try {
        await deleteDoc(doc(db, 'treasury_logs', id));
        showNotification('success', 'Transaction successfully purged.');
      } catch (err) { showNotification('error', 'Purge Failed.'); }
    }
  };

  // --- FILTERS ---
  const filteredLogs = logs.filter(log => {
    const logType = log.transactionType || 'Income';
    const matchesSearch = (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.contributor || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = fType === 'All Transactions' || logType === fType;
    const matchesCategory = fCategory === 'All Categories' || log.category === fCategory;
    const matchesAssembly = fAssembly === 'All Assemblies' || log.localAssembly === fAssembly;
    
    let matchesDate = true;
    if (dateFrom && dateTo) matchesDate = log.date >= dateFrom && log.date <= dateTo;
    else if (dateFrom) matchesDate = log.date >= dateFrom;
    else if (dateTo) matchesDate = log.date <= dateTo;

    return matchesSearch && matchesType && matchesCategory && matchesAssembly && matchesDate;
  });

  // --- FUND ACCOUNTING ENGINE ---
  const calcFund = (incCats, expCats) => {
    const inc = filteredLogs.filter(l => (l.transactionType || 'Income') === 'Income' && incCats.includes(l.category)).reduce((sum, l) => sum + (l.amount || 0), 0);
    const exp = filteredLogs.filter(l => l.transactionType === 'Expense' && expCats.includes(l.category)).reduce((sum, l) => sum + (l.amount || 0), 0);
    return inc - exp;
  };

  const youthBal = calcFund(["Youth ministry offering"], ["Youth Ministry Expense"]);
  const womenBal = calcFund(["Women ministry offering"], ["Women Ministry Expense"]);
  const pememBal = calcFund(["Pentecost Men Ministry Offerings"], ["PEMEM Expense"]);
  const childBal = calcFund(["Children ministry offering"], ["Children Ministry Expense"]);
  const evangBal = calcFund(["Evangelism ministry offering"], ["Evangelism Ministry Expense"]);
  
  const pendingRemittances = calcFund(
    ["Tithes", "Mission Offering (M.O.)", "Area Week Offering", "Missions Week Offering", "Area Prayers"], 
    ["Headquarters / Area Remittance"]
  );

  const totalIncome = filteredLogs.filter(l => (l.transactionType || 'Income') === 'Income').reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalExpense = filteredLogs.filter(l => l.transactionType === 'Expense').reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalNetBalance = totalIncome - totalExpense;

  const districtMainAccount = totalNetBalance - (youthBal + womenBal + pememBal + childBal + evangBal + pendingRemittances);

  const inputStyle = "w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 rounded-xl font-bold text-slate-800 outline-none transition-all text-sm placeholder:text-slate-400";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-slate-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20 relative">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
          <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg shadow-slate-900/20"><Landmark size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">District Treasury</h1>
            <p className="font-bold text-slate-500">Fund Accounting: Track segregated balances for Ministries, Remittances, and District Admin.</p>
          </div>
        </div>

        {/* MASTER TABS */}
        <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
          <button onClick={() => handleTabSwitch('income')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'income' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-emerald-600 hover:bg-slate-50 border border-slate-200'}`}>
            <ArrowDownToLine size={16}/> Receive Funds
          </button>
          <button onClick={() => handleTabSwitch('expense')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'expense' ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-rose-600 hover:bg-slate-50 border border-slate-200'}`}>
            <ArrowUpFromLine size={16}/> Dispatch Expenses
          </button>
          <button onClick={() => handleTabSwitch('history')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all text-sm ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            <FileText size={16}/> Master Ledger ({logs.length})
          </button>
        </div>

        {/* ================================================== */}
        {/* TAB 1 & 2: DYNAMIC BATCH FORM (INCOME OR EXPENSE)  */}
        {/* ================================================== */}
        {(activeTab === 'income' || activeTab === 'expense') && (
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-slate-100 max-w-5xl mx-auto animate-fade-in relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${activeTab === 'income' ? 'from-emerald-400 to-teal-500' : 'from-rose-500 to-orange-500'}`}></div>
            
            <div className="mb-8 border-b border-slate-100 pb-4">
              <h2 className={`text-xl font-black uppercase tracking-widest ${activeTab === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {activeTab === 'income' ? 'Log Incoming Funds' : 'Log Dispatched Expenses'}
              </h2>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className={labelStyle}>Date of {activeTab === 'income' ? 'Income' : 'Dispatch'} *</label>
                  <input required type="date" value={globalData.date} onChange={e => setGlobalData({...globalData, date: e.target.value})} className={`${inputStyle} focus:border-slate-400 focus:ring-slate-500/10`} />
                </div>
                <div>
                  <label className={labelStyle}>Allocated Assembly *</label>
                  <select required value={globalData.localAssembly} onChange={e => setGlobalData({...globalData, localAssembly: e.target.value})} className={`${inputStyle} focus:border-slate-400 focus:ring-slate-500/10`}>
                    {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>{activeTab === 'income' ? 'Specific Contributor / Source' : 'Payee / Recipient'}</label>
                  <input type="text" placeholder={activeTab === 'income' ? "e.g. General Congregation" : "e.g. ECG Ghana or Bro. Builder"} value={globalData.entity} onChange={e => setGlobalData({...globalData, entity: e.target.value})} className={`${inputStyle} focus:border-slate-400 focus:ring-slate-500/10`} />
                </div>
                <div>
                  <label className={labelStyle}>Batch Reference / Notes</label>
                  <input type="text" placeholder={activeTab === 'income' ? "e.g. Sunday Service" : "e.g. June Utilities & Salary"} value={globalData.notes} onChange={e => setGlobalData({...globalData, notes: e.target.value})} className={`${inputStyle} focus:border-slate-400 focus:ring-slate-500/10`} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800">{activeTab === 'income' ? 'Income Breakdown' : 'Expense Breakdown'}</h3>
                  <button type="button" onClick={handleAddEntry} className={`text-sm font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${activeTab === 'income' ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-600 hover:text-rose-700 bg-rose-50 border-rose-100'}`}>
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                {entries.map((entry, index) => (
                  <div key={entry.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="w-full md:flex-1">
                      <select required value={entry.category} onChange={e => handleEntryChange(entry.id, 'category', e.target.value)} className={`${inputStyle} ${activeTab === 'income' ? 'focus:border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-rose-500 focus:ring-rose-500/10'}`}>
                        <option value="">- Select Category -</option>
                        {activeCategoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      {entry.category === "Other / Add Custom..." && (
                        <input required type="text" placeholder="Specify Custom Category..." value={entry.customCategory} onChange={e => handleEntryChange(entry.id, 'customCategory', e.target.value)} className={`${inputStyle} mt-2 ${activeTab === 'income' ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`} autoFocus />
                      )}
                    </div>

                    <div className="w-full md:w-56">
                      <select required value={entry.paymentMethod} onChange={e => handleEntryChange(entry.id, 'paymentMethod', e.target.value)} className={`${inputStyle} text-slate-600 ${activeTab === 'income' ? 'focus:border-emerald-500 focus:ring-emerald-500/10' : 'focus:border-rose-500 focus:ring-rose-500/10'}`}>
                        {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                      </select>
                    </div>

                    <div className="w-full md:w-48 relative">
                      <span className="absolute left-4 top-3.5 font-black text-slate-400">₵</span>
                      <input required type="number" step="0.01" min="0" placeholder="0.00" value={entry.amount} onChange={e => handleEntryChange(entry.id, 'amount', e.target.value)} className={`${inputStyle} pl-10 ${activeTab === 'income' ? 'text-emerald-700 focus:border-emerald-500 focus:ring-emerald-500/10' : 'text-rose-700 focus:border-rose-500 focus:ring-rose-500/10'}`} />
                    </div>

                    {entries.length > 1 && (
                      <button type="button" onClick={() => handleRemoveEntry(entry.id)} className="p-3.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                        <Trash size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className={`px-6 py-3 rounded-2xl flex items-center gap-4 w-full md:w-auto border ${activeTab === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <div className={`text-[10px] font-black uppercase tracking-widest text-right ${activeTab === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>Batch<br/>Total</div>
                  <div className={`text-3xl font-black ${activeTab === 'income' ? 'text-emerald-800' : 'text-rose-800'}`}>₵ {batchTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>

                <button type="submit" disabled={isSubmitting || batchTotal === 0} className={`w-full md:w-auto px-10 py-4 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex justify-center items-center gap-3 disabled:opacity-50 ${activeTab === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'}`}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Process {activeTab === 'income' ? 'Income' : 'Expense'} to Ledger</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 3: FUND ACCOUNTING MASTER LEDGER               */}
        {/* ================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* FUND BALANCES DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Main District Account */}
              <div className={`p-6 rounded-[2rem] shadow-xl border flex flex-col justify-between ${districtMainAccount >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-red-900 border-red-800'}`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white/10 p-2 rounded-xl text-white"><Building2 size={20}/></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Main District Fund</p>
                  </div>
                  <p className="text-sm font-bold text-slate-400 mb-4 line-clamp-2">Available funds after reserving Headquarters Remittances and all Ministry balances.</p>
                </div>
                <h3 className="text-4xl font-black text-white">₵ {districtMainAccount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              </div>

              {/* Pending Remittances Vault */}
              <div className="p-6 rounded-[2rem] shadow-sm border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-600 p-2 rounded-xl text-white"><ShieldCheck size={20}/></div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pending HQ Remittances</p>
                  </div>
                  <p className="text-sm font-bold text-blue-700/70 mb-4 line-clamp-2">Unremitted Tithes, M.O., and Area Offerings waiting to be dispatched.</p>
                </div>
                <h3 className="text-4xl font-black text-blue-900">₵ {pendingRemittances.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              </div>

              {/* Ministries Sub-Ledgers */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Users size={14}/> Ministry Vaults</p>
                
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Youth Ministry</span>
                  <span className={`text-sm font-black ${youthBal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>₵ {youthBal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Women's Ministry</span>
                  <span className={`text-sm font-black ${womenBal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>₵ {womenBal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">PEMEM (Men)</span>
                  <span className={`text-sm font-black ${pememBal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>₵ {pememBal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Children's Ministry</span>
                  <span className={`text-sm font-black ${childBal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>₵ {childBal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Evangelism Ministry</span>
                  <span className={`text-sm font-black ${evangBal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>₵ {evangBal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* LEDGER FILTERS ENGINE */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-4 top-3.5 text-slate-300" size={18}/>
                  <input placeholder="Search entities, notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-500" />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  <Receipt size={16} className="text-slate-400 shrink-0" />
                  <select value={fType} onChange={e => setFType(e.target.value)} className="w-full bg-transparent font-bold text-xs uppercase tracking-wider text-slate-700 outline-none cursor-pointer">
                    <option value="All Transactions">All Transactions</option>
                    <option value="Income">Income Only</option>
                    <option value="Expense">Expenses Only</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  <Filter size={16} className="text-slate-400 shrink-0" />
                  <select value={fCategory} onChange={e => setFCategory(e.target.value)} className="w-full bg-transparent font-bold text-xs uppercase tracking-wider text-slate-700 outline-none cursor-pointer">
                    <option value="All Categories">All Categories</option>
                    {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">From:</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none text-slate-600" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">To:</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none text-slate-600" />
                </div>
              </div>
            </div>

            {/* MASTER LEDGER TABLE */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-5 w-40">Date</th>
                      <th className="p-5">Transaction Details</th>
                      <th className="p-5">Reference / Notes</th>
                      <th className="p-5 text-right">Amount (₵)</th>
                      {isTier1 && <th className="p-5 text-center w-24">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map(log => {
                      const isExpense = log.transactionType === 'Expense';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-5">
                            <div className="flex items-center gap-2 font-bold text-slate-500">
                              <CalendarDays size={14} className={isExpense ? "text-rose-400" : "text-emerald-400"} />
                              {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-black text-slate-900 text-sm mb-1">{log.localAssembly} <span className="text-slate-300 mx-1">→</span> <span className={isExpense ? "text-rose-700" : "text-emerald-700"}>{log.contributor}</span></div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded inline-block border ${isExpense ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                {isExpense ? 'EXP' : 'INC'} • {log.category}
                              </span>
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                <WalletCards size={10} /> {log.paymentMethod || 'Cash'}
                              </span>
                            </div>
                          </td>
                          <td className="p-5">
                            <p className="text-xs font-bold text-slate-500 line-clamp-2">{log.notes || <span className="italic text-slate-300">No notes</span>}</p>
                          </td>
                          <td className="p-5 text-right">
                            <span className={`font-black text-lg flex items-center justify-end gap-1 ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {isExpense ? '-' : '+'} {(log.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          {isTier1 && (
                            <td className="p-5 text-center">
                              <button onClick={() => handleDelete(log.id, log.category, log.amount, log.transactionType || 'Income')} className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                <Trash2 size={16}/>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-12 text-center text-slate-400 font-bold italic">No transactions found.</td></tr>}
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