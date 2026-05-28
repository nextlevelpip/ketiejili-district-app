"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Coins, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Save, Filter, Landmark, CalendarDays, ArrowDownToLine, ArrowUpFromLine, FileText, TrendingUp, Building2, Plus, Trash, WalletCards, Receipt, Scale, ShieldCheck, Users, Edit3, X, ArrowRightLeft } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

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
    notes: '',
    totalVoucherAmount: '' 
  });

  const [entries, setEntries] = useState([
    { id: Date.now(), category: '', customCategory: '', amount: '', paymentMethod: 'Cash in Hand', documentNo: '', chequeNo: '' }
  ]);

  // --- TRANSFER / BANK DEPOSIT STATES ---
  const [transferData, setTransferData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    fromAccount: 'Cash in Hand',
    toAccount: 'GCB PLC Bank',
    documentNo: '',
    notes: 'Cash deposit to bank'
  });

  // --- EDIT MODAL STATES ---
  const [editingTx, setEditingTx] = useState(null);

  // --- RECONCILIATION STATES ---
  const [actualBalances, setActualBalances] = useState({
    'GCB PLC Bank': '',
    'Rural Bank': '',
    'Mobile Money': '',
    'Cash in Hand': ''
  });

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

  const expenseCategories = [
    "Headquarters / Area Remittance", "Pastoral Allowance", "District Admin & Utilities", 
    "Church Building & Projects", "Welfare & Relief", "Children Ministry Expense", 
    "Youth Ministry Expense", "Evangelism Ministry Expense", "Women Ministry Expense", 
    "PEMEM Expense", "Other / Add Custom..."
  ];

  const paymentMethods = ["Cash in Hand", "GCB PLC Bank", "Rural Bank", "Mobile Money"];
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
    setEntries([{ id: Date.now(), category: '', customCategory: '', amount: '', paymentMethod: 'Cash in Hand', documentNo: '', chequeNo: '' }]);
    setGlobalData(prev => ({ ...prev, entity: tab === 'income' ? 'General Congregation' : '', notes: '', totalVoucherAmount: '' }));
  };

  const handleAddEntry = () => setEntries([...entries, { id: Date.now(), category: '', customCategory: '', amount: '', paymentMethod: 'Cash in Hand', documentNo: '', chequeNo: '' }]);
  const handleRemoveEntry = (idToRemove) => { if (entries.length > 1) setEntries(entries.filter(e => e.id !== idToRemove)); };
  
  const handleEntryChange = (id, field, value) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        if (field === 'category' && value !== "Other / Add Custom...") updatedEntry.customCategory = '';
        if (field === 'paymentMethod' && !['GCB PLC Bank', 'Rural Bank', 'Mobile Money'].includes(value)) {
          updatedEntry.chequeNo = '';
        }
        return updatedEntry;
      }
      return entry;
    }));
  };

  // --- FUND ACCOUNTING ENGINE ---
  const calcFund = (incCats, expCats) => {
    const inc = logs.filter(l => (l.transactionType || 'Income') === 'Income' && incCats.includes(l.category)).reduce((sum, l) => sum + (l.amount || 0), 0);
    const exp = logs.filter(l => l.transactionType === 'Expense' && expCats.includes(l.category)).reduce((sum, l) => sum + (l.amount || 0), 0);
    return inc - exp;
  };

  const youthBal = calcFund(["Youth ministry offering"], ["Youth Ministry Expense"]);
  const womenBal = calcFund(["Women ministry offering"], ["Women Ministry Expense"]);
  const pememBal = calcFund(["Pentecost Men Ministry Offerings"], ["PEMEM Expense"]);
  const childBal = calcFund(["Children ministry offering"], ["Children Ministry Expense"]);
  const evangBal = calcFund(["Evangelism ministry offering"], ["Evangelism Ministry Expense"]);
  const pendingRemittances = calcFund(["Tithes", "Mission Offering (M.O.)", "Area Week Offering", "Missions Week Offering", "Area Prayers"], ["Headquarters / Area Remittance"]);

  const totalIncome = logs.filter(l => (l.transactionType || 'Income') === 'Income' && l.category !== 'Bank Deposit / Transfer').reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalExpense = logs.filter(l => l.transactionType === 'Expense' && l.category !== 'Bank Deposit / Transfer').reduce((sum, l) => sum + (l.amount || 0), 0);
  const districtMainAccount = (totalIncome - totalExpense) - (youthBal + womenBal + pememBal + childBal + evangBal + pendingRemittances);

  const getFundBalanceDisplay = (category) => {
    if (!category) return null;
    if (category.includes('Youth')) return { name: "Youth Fund", bal: youthBal };
    if (category.includes('Women')) return { name: "Women's Fund", bal: womenBal };
    if (category.includes('PEMEM')) return { name: "PEMEM Fund", bal: pememBal };
    if (category.includes('Children')) return { name: "Children's Fund", bal: childBal };
    if (category.includes('Evangelism')) return { name: "Evangelism Fund", bal: evangBal };
    if (["Headquarters / Area Remittance", "Tithes", "Mission Offering (M.O.)", "Area Week Offering", "Missions Week Offering", "Area Prayers"].includes(category)) return { name: "HQ Remittance Vault", bal: pendingRemittances };
    if (["District Admin & Utilities", "Pastoral Allowance", "Church Building & Projects", "Welfare & Relief", "District Week Offering"].includes(category)) return { name: "Main District Account", bal: districtMainAccount };
    return null;
  };

  // --- BANK RECONCILIATION ENGINE ---
  const getSystemAccountBalance = (method) => {
    const inc = logs.filter(l => (l.transactionType || 'Income') === 'Income' && l.paymentMethod === method).reduce((sum, l) => sum + (l.amount || 0), 0);
    const exp = logs.filter(l => l.transactionType === 'Expense' && l.paymentMethod === method).reduce((sum, l) => sum + (l.amount || 0), 0);
    return inc - exp;
  };

  const handleActualBalanceChange = (method, value) => {
    setActualBalances(prev => ({ ...prev, [method]: value }));
  };

  // --- SAVE / EDIT / DELETE TRANSACTIONS ---
  const batchTotal = entries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  const expectedTotal = parseFloat(globalData.totalVoucherAmount) || 0;
  const isBalanced = batchTotal === expectedTotal && expectedTotal > 0;

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isBalanced) {
      showNotification('error', 'SYSTEM HALTED: Line items do not match Expected Voucher Total.');
      setIsSubmitting(false);
      return;
    }

    const validEntries = entries.filter(entry => parseFloat(entry.amount) > 0 && entry.category !== '');

    try {
      const promises = validEntries.map(entry => {
        const finalCategory = entry.category === "Other / Add Custom..." ? entry.customCategory.trim() : entry.category;
        
        return addDoc(collection(db, 'treasury_logs'), { 
          transactionType: activeTab === 'income' ? 'Income' : 'Expense',
          localAssembly: globalData.localAssembly,
          amount: parseFloat(entry.amount),
          category: finalCategory,
          paymentMethod: entry.paymentMethod, 
          documentNo: entry.documentNo.trim() || 'N/A',
          chequeNo: entry.chequeNo.trim() || 'N/A', 
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

  // --- BANK DEPOSIT / CONTRA TRANSFER ENGINE ---
  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const amt = parseFloat(transferData.amount);
    if (isNaN(amt) || amt <= 0) {
      showNotification('error', 'Please enter a valid transfer amount.');
      setIsSubmitting(false);
      return;
    }

    if (transferData.fromAccount === transferData.toAccount) {
      showNotification('error', 'Source and Destination accounts must be different.');
      setIsSubmitting(false);
      return;
    }

    // Verify sufficient funds
    const sourceBalance = getSystemAccountBalance(transferData.fromAccount);
    if (amt > sourceBalance) {
      showNotification('error', `Insufficient funds in ${transferData.fromAccount}. Available: ₵${sourceBalance.toLocaleString()}`);
      setIsSubmitting(false);
      return;
    }

    const batchId = Date.now().toString();

    try {
      const p1 = addDoc(collection(db, 'treasury_logs'), { 
        transactionType: 'Expense',
        localAssembly: globalData.localAssembly,
        amount: amt,
        category: 'Bank Deposit / Transfer',
        paymentMethod: transferData.fromAccount, 
        documentNo: transferData.documentNo.trim() || 'N/A',
        chequeNo: 'N/A', 
        contributor: `Transfer to ${transferData.toAccount}`,
        date: transferData.date,
        notes: transferData.notes.trim(),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.fullName || 'System Admin',
        batchId 
      });

      const p2 = addDoc(collection(db, 'treasury_logs'), { 
        transactionType: 'Income',
        localAssembly: globalData.localAssembly,
        amount: amt,
        category: 'Bank Deposit / Transfer',
        paymentMethod: transferData.toAccount, 
        documentNo: transferData.documentNo.trim() || 'N/A',
        chequeNo: 'N/A', 
        contributor: `Transfer from ${transferData.fromAccount}`,
        date: transferData.date,
        notes: transferData.notes.trim(),
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser?.fullName || 'System Admin',
        batchId 
      });

      await Promise.all([p1, p2]);
      showNotification('success', `Successfully transferred ₵${amt.toLocaleString()} from ${transferData.fromAccount} to ${transferData.toAccount}.`);
      setTransferData({...transferData, amount: '', documentNo: '', notes: 'Cash deposit to bank'});
      handleTabSwitch('history');
    } catch (err) {
      showNotification('error', 'Error processing bank deposit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitEditTransaction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'treasury_logs', editingTx.id), {
        date: editingTx.date,
        category: editingTx.category,
        paymentMethod: editingTx.paymentMethod,
        documentNo: editingTx.documentNo,
        chequeNo: editingTx.chequeNo || 'N/A',
        amount: parseFloat(editingTx.amount),
        notes: editingTx.notes,
        contributor: editingTx.contributor
      });
      showNotification('success', 'Transaction successfully updated.');
      setEditingTx(null);
    } catch (error) {
      showNotification('error', 'Failed to update transaction.');
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

  const filteredLogs = logs.filter(log => {
    const logType = log.transactionType || 'Income';
    const matchesSearch = (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.contributor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.documentNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.chequeNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = fType === 'All Transactions' || logType === fType;
    const matchesCategory = fCategory === 'All Categories' || log.category === fCategory;
    const matchesAssembly = fAssembly === 'All Assemblies' || log.localAssembly === fAssembly;
    
    let matchesDate = true;
    if (dateFrom && dateTo) matchesDate = log.date >= dateFrom && log.date <= dateTo;
    else if (dateFrom) matchesDate = log.date >= dateFrom;
    else if (dateTo) matchesDate = log.date <= dateTo;

    return matchesSearch && matchesType && matchesCategory && matchesAssembly && matchesDate;
  });

  const inputStyle = "w-full p-2.5 bg-black/20 border border-white/10 focus:bg-black/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-lg font-bold text-white outline-none transition-all text-xs placeholder:text-emerald-200/50 [&>option]:text-gray-900";
  const labelStyle = "text-[9px] font-black text-emerald-200 uppercase ml-1 mb-1.5 block tracking-widest";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-emerald-400" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#064e3b] via-[#0f766e] to-[#022c22] p-5 md:p-8 text-white relative overflow-hidden shadow-2xl pb-20">
        
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl animate-fade-in text-sm ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          {/* EDIT MODAL (TIER 1 ONLY) */}
          {editingTx && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#022c22] border border-emerald-500/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                <div className="bg-emerald-900/50 p-4 border-b border-emerald-500/30 flex justify-between items-center">
                  <h3 className="font-black text-emerald-200 flex items-center gap-2"><Edit3 size={18}/> Edit Transaction</h3>
                  <button onClick={() => setEditingTx(null)} className="text-white/50 hover:text-white"><X size={20}/></button>
                </div>
                <form onSubmit={submitEditTransaction} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelStyle}>Date</label>
                      <input type="date" value={editingTx.date} onChange={e => setEditingTx({...editingTx, date: e.target.value})} className={inputStyle} required />
                    </div>
                    <div>
                      <label className={labelStyle}>Amount (₵)</label>
                      <input type="number" step="0.01" value={editingTx.amount} onChange={e => setEditingTx({...editingTx, amount: e.target.value})} className={inputStyle} required />
                    </div>
                    <div className="col-span-2">
                      <label className={labelStyle}>Category</label>
                      <select value={editingTx.category} onChange={e => setEditingTx({...editingTx, category: e.target.value})} className={inputStyle} required>
                         {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}>Payment Method</label>
                      <select value={editingTx.paymentMethod} onChange={e => setEditingTx({...editingTx, paymentMethod: e.target.value})} className={inputStyle} required>
                         {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}>Doc No (PV/Receipt)</label>
                      <input type="text" value={editingTx.documentNo} onChange={e => setEditingTx({...editingTx, documentNo: e.target.value})} className={inputStyle} />
                    </div>
                    
                    {/* CONDITIONAL EDIT REF FIELD */}
                    {['GCB PLC Bank', 'Rural Bank', 'Mobile Money'].includes(editingTx.paymentMethod) && (
                      <div className="col-span-2">
                        <label className={labelStyle}>{editingTx.paymentMethod === 'Mobile Money' ? 'MoMo Transaction ID' : 'Cheque / Ref Number'}</label>
                        <input type="text" value={editingTx.chequeNo} onChange={e => setEditingTx({...editingTx, chequeNo: e.target.value})} className={`${inputStyle} bg-blue-900/30`} required />
                      </div>
                    )}
                    
                    <div className="col-span-2">
                      <label className={labelStyle}>Particulars / Entity</label>
                      <input type="text" value={editingTx.contributor} onChange={e => setEditingTx({...editingTx, contributor: e.target.value})} className={inputStyle} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelStyle}>Notes</label>
                      <input type="text" value={editingTx.notes} onChange={e => setEditingTx({...editingTx, notes: e.target.value})} className={inputStyle} />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setEditingTx(null)} className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-white">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center gap-2">
                      {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Update Ledger
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-5">
            <div className="bg-white/10 p-3.5 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><Landmark size={26} /></div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-md">District Treasury</h1>
              <p className="text-xs font-bold text-emerald-100/80 mt-0.5">Fund Accounting & Reconciliation.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <button onClick={() => handleTabSwitch('income')} className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs border backdrop-blur-md ${activeTab === 'income' ? 'bg-emerald-600/80 text-white border-emerald-400/50 shadow-lg' : 'bg-white/5 text-emerald-200/70 border-white/10 hover:bg-white/10'}`}>
              <ArrowDownToLine size={14}/> Receive Funds
            </button>
            <button onClick={() => handleTabSwitch('expense')} className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs border backdrop-blur-md ${activeTab === 'expense' ? 'bg-rose-600/80 text-white border-rose-400/50 shadow-lg' : 'bg-white/5 text-emerald-200/70 border-white/10 hover:bg-white/10'}`}>
              <ArrowUpFromLine size={14}/> Dispatch Expenses
            </button>
            <button onClick={() => handleTabSwitch('transfer')} className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs border backdrop-blur-md ${activeTab === 'transfer' ? 'bg-blue-600/80 text-white border-blue-400/50 shadow-lg' : 'bg-white/5 text-emerald-200/70 border-white/10 hover:bg-white/10'}`}>
              <ArrowRightLeft size={14}/> Bank Deposit
            </button>
            <button onClick={() => handleTabSwitch('history')} className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs border backdrop-blur-md ${activeTab === 'history' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-emerald-200/70 border-white/10 hover:bg-white/10'}`}>
              <FileText size={14}/> Master Ledger
            </button>
            <button onClick={() => handleTabSwitch('recon')} className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-xs border backdrop-blur-md ${activeTab === 'recon' ? 'bg-indigo-600/80 text-white border-indigo-400/50 shadow-lg' : 'bg-white/5 text-emerald-200/70 border-white/10 hover:bg-white/10'}`}>
              <Scale size={14}/> Bank Recon
            </button>
          </div>

          {/* ================================================== */}
          {/* TAB 1 & 2: DYNAMIC BATCH FORM                      */}
          {/* ================================================== */}
          {(activeTab === 'income' || activeTab === 'expense') && (
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 max-w-5xl mx-auto animate-fade-in relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${activeTab === 'income' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`}></div>
              
              <div className="mb-6 border-b border-white/10 pb-3 mt-1">
                <h2 className={`text-lg font-black uppercase tracking-widest ${activeTab === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {activeTab === 'income' ? 'Log Incoming Funds' : 'Log Dispatched Expenses'}
                </h2>
              </div>

              <form onSubmit={handleSaveBatch} className="space-y-5">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 backdrop-blur-md">
                  <div>
                    <label className={labelStyle}>Date *</label>
                    <input required type="date" value={globalData.date} onChange={e => setGlobalData({...globalData, date: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Assembly *</label>
                    <select required value={globalData.localAssembly} onChange={e => setGlobalData({...globalData, localAssembly: e.target.value})} className={inputStyle}>
                      {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <label className={`${labelStyle} text-amber-300`}>Expected Total *</label>
                    <span className="absolute left-3.5 top-[26px] font-black text-amber-400 text-xs">₵</span>
                    <input required type="number" step="0.01" min="0" placeholder="0.00" value={globalData.totalVoucherAmount} onChange={e => setGlobalData({...globalData, totalVoucherAmount: e.target.value})} className={`${inputStyle} pl-8 border-amber-500/30 bg-amber-900/10 text-amber-200 focus:border-amber-400`} />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelStyle}>{activeTab === 'income' ? 'Specific Contributor / Source' : 'Payee / Recipient'}</label>
                    <input type="text" placeholder={activeTab === 'income' ? "e.g. General Congregation" : "e.g. ECG Ghana"} value={globalData.entity} onChange={e => setGlobalData({...globalData, entity: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Batch Notes</label>
                    <input type="text" placeholder="e.g. Sunday Service" value={globalData.notes} onChange={e => setGlobalData({...globalData, notes: e.target.value})} className={inputStyle} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white">{activeTab === 'income' ? 'Income Breakdown' : 'Expense Breakdown'}</h3>
                    <button type="button" onClick={handleAddEntry} className={`text-[10px] uppercase tracking-widest font-black flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${activeTab === 'income' ? 'text-emerald-200 hover:text-white bg-emerald-500/20 border-emerald-400/30' : 'text-rose-200 hover:text-white bg-rose-500/20 border-rose-400/30'}`}>
                      <Plus size={12} /> Add Row
                    </button>
                  </div>

                  {entries.map((entry) => {
                    const balanceInfo = getFundBalanceDisplay(entry.category);
                    const requiresBankRef = ['GCB PLC Bank', 'Rural Bank'].includes(entry.paymentMethod);
                    const requiresMomoRef = entry.paymentMethod === 'Mobile Money';
                    const requiresReference = requiresBankRef || requiresMomoRef;

                    return (
                      <div key={entry.id} className="p-4 rounded-xl border border-white/10 bg-white/5 shadow-inner flex flex-col gap-3 transition-colors">
                        
                        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                          <div className="w-full md:w-[30%]">
                            <select required value={entry.category} onChange={e => handleEntryChange(entry.id, 'category', e.target.value)} className={inputStyle}>
                              <option value="">- Category Fund -</option>
                              {activeCategoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            {balanceInfo && (
                              <p className={`text-[9px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded inline-block ${balanceInfo.bal >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                                {balanceInfo.name}: ₵{balanceInfo.bal.toLocaleString()}
                              </p>
                            )}
                            {entry.category === "Other / Add Custom..." && (
                              <input required type="text" placeholder="Specify..." value={entry.customCategory} onChange={e => handleEntryChange(entry.id, 'customCategory', e.target.value)} className={`${inputStyle} mt-2 ${activeTab === 'income' ? 'bg-emerald-900/40 border-emerald-400/30' : 'bg-rose-900/40 border-rose-400/30'}`} autoFocus />
                            )}
                          </div>

                          <div className="w-full md:w-[22%]">
                            <select required value={entry.paymentMethod} onChange={e => handleEntryChange(entry.id, 'paymentMethod', e.target.value)} className={inputStyle}>
                              {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                            </select>
                          </div>

                          <div className="w-full md:w-[23%]">
                            <input type="text" placeholder={activeTab === 'income' ? "Receipt No (Opt)" : "PV No (Opt)"} value={entry.documentNo} onChange={e => handleEntryChange(entry.id, 'documentNo', e.target.value)} className={inputStyle} />
                          </div>

                          <div className="w-full md:flex-1 relative">
                            <span className={`absolute left-3 top-[11px] font-black text-xs ${activeTab === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>₵</span>
                            <input required type="number" step="0.01" min="0" placeholder="0.00" value={entry.amount} onChange={e => handleEntryChange(entry.id, 'amount', e.target.value)} className={`${inputStyle} pl-7 ${activeTab === 'income' ? 'text-emerald-300' : 'text-rose-300'}`} />
                          </div>

                          {entries.length > 1 && (
                            <button type="button" onClick={() => handleRemoveEntry(entry.id)} className="p-2.5 text-white/30 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                              <Trash size={16} />
                            </button>
                          )}
                        </div>

                        {requiresReference && (
                          <div className="animate-fade-in w-full md:w-1/2 pt-1 border-t border-white/5">
                             <input required type="text" placeholder={requiresMomoRef ? "Enter MoMo Transaction ID *" : "Enter Bank Cheque / Ref Number *"} value={entry.chequeNo} onChange={e => handleEntryChange(entry.id, 'chequeNo', e.target.value)} className={`${inputStyle} bg-blue-900/20 border-blue-500/30 text-blue-200 placeholder:text-blue-200/40`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-5 mt-5 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className={`px-5 py-2.5 rounded-xl flex items-center gap-4 w-full md:w-auto border transition-colors ${isBalanced ? 'bg-emerald-900/50 border-emerald-400/50' : 'bg-red-900/50 border-red-500/50'}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-right text-white/70">Calculated <br/> Match</div>
                    <div className="text-right">
                       <div className="text-[10px] font-bold text-white/50 line-through">Exp: ₵{expectedTotal.toLocaleString()}</div>
                       <div className={`text-xl font-black ${isBalanced ? 'text-emerald-300' : 'text-red-400 animate-pulse'}`}>
                         ₵ {batchTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                       </div>
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting || !isBalanced} className={`w-full md:w-auto px-8 py-3.5 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/30'}`}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Process to Ledger</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 3: BANK DEPOSIT / CONTRA TRANSFER ENGINE       */}
          {/* ================================================== */}
          {activeTab === 'transfer' && (
            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white/10 max-w-3xl mx-auto animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400"></div>
              
              <div className="mb-6 border-b border-white/10 pb-3 mt-1">
                <h2 className="text-lg font-black uppercase tracking-widest text-blue-300 flex items-center gap-2">
                  <ArrowRightLeft size={20} /> Bank Deposit / Internal Transfer
                </h2>
                <p className="text-xs font-bold text-blue-100/70 mt-1">Move funds between Cash, Mobile Money, and Bank accounts without altering ministry balances.</p>
              </div>

              <form onSubmit={handleSaveTransfer} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelStyle}>Transfer Date *</label>
                    <input required type="date" value={transferData.date} onChange={e => setTransferData({...transferData, date: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="relative">
                    <label className={labelStyle}>Amount to Transfer (₵) *</label>
                    <span className="absolute left-3.5 top-[26px] font-black text-blue-400 text-xs">₵</span>
                    <input required type="number" step="0.01" min="0" placeholder="0.00" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} className={`${inputStyle} pl-8 border-blue-500/30 bg-blue-900/10 text-blue-200 focus:border-blue-400`} />
                  </div>

                  {/* OUTFLOW ACCOUNT WITH LIVE BALANCE */}
                  <div className="p-4 bg-rose-900/20 border border-rose-500/30 rounded-xl">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className={`${labelStyle} mb-0 text-rose-300`}>From Account (Outflow) *</label>
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-200 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                        Bal: ₵{getSystemAccountBalance(transferData.fromAccount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <select required value={transferData.fromAccount} onChange={e => setTransferData({...transferData, fromAccount: e.target.value})} className={inputStyle}>
                      {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                    </select>
                  </div>

                  {/* INFLOW ACCOUNT WITH LIVE BALANCE */}
                  <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className={`${labelStyle} mb-0 text-emerald-300`}>To Account (Inflow) *</label>
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                        Bal: ₵{getSystemAccountBalance(transferData.toAccount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <select required value={transferData.toAccount} onChange={e => setTransferData({...transferData, toAccount: e.target.value})} className={inputStyle}>
                      {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelStyle}>Deposit Slip / Document No.</label>
                    <input type="text" placeholder="e.g. Deposit Slip #12345" value={transferData.documentNo} onChange={e => setTransferData({...transferData, documentNo: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelStyle}>Transfer Notes</label>
                    <input type="text" placeholder="e.g. Sunday Service cash deposited to GCB" value={transferData.notes} onChange={e => setTransferData({...transferData, notes: e.target.value})} className={inputStyle} />
                  </div>
                </div>

                <div className="pt-5 mt-2 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 border border-white/20">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Execute Transfer</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 4: FUND ACCOUNTING MASTER LEDGER               */}
          {/* ================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                <div className={`p-5 rounded-2xl shadow-xl border flex flex-col justify-between backdrop-blur-xl ${districtMainAccount >= 0 ? 'bg-black/30 border-white/20' : 'bg-red-900/60 border-red-500/30'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-white/10 p-1.5 rounded-lg text-white"><Building2 size={16}/></div>
                      <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest">Main District Fund</p>
                    </div>
                    <p className="text-xs font-bold text-emerald-100/60 mb-3 line-clamp-2">Available funds after reserving HQ Remittances and Ministry balances.</p>
                  </div>
                  <h3 className="text-2xl font-black text-white">₵ {districtMainAccount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                </div>

                <div className="p-5 rounded-2xl shadow-xl border border-blue-400/30 bg-blue-900/40 backdrop-blur-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-500/30 p-1.5 rounded-lg text-blue-200"><ShieldCheck size={16}/></div>
                      <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Pending HQ Remittances</p>
                    </div>
                    <p className="text-xs font-bold text-blue-200/70 mb-3 line-clamp-2">Unremitted Tithes, M.O., and Area Offerings to be dispatched.</p>
                  </div>
                  <h3 className="text-2xl font-black text-white">₵ {pendingRemittances.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                </div>

                <div className="bg-white/10 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10 flex flex-col gap-2.5">
                  <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><Users size={12}/> Ministry Vaults</p>
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/10">
                    <span className="text-[11px] font-bold text-white">Youth</span>
                    <span className={`text-xs font-black ${youthBal >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>₵ {youthBal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/10">
                    <span className="text-[11px] font-bold text-white">Women</span>
                    <span className={`text-xs font-black ${womenBal >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>₵ {womenBal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/10">
                    <span className="text-[11px] font-bold text-white">PEMEM</span>
                    <span className={`text-xs font-black ${pememBal >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>₵ {pememBal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/10">
                    <span className="text-[11px] font-bold text-white">Children</span>
                    <span className={`text-xs font-black ${childBal >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>₵ {childBal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/10">
                    <span className="text-[11px] font-bold text-white">Evangelism</span>
                    <span className={`text-xs font-black ${evangBal >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>₵ {evangBal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-white/10 flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-3 text-emerald-200/50" size={14}/>
                    <input placeholder="Search entities, notes, PV/Receipt..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2.5 bg-black/20 border border-white/10 rounded-lg font-bold text-xs outline-none focus:border-emerald-400 text-white placeholder:text-emerald-200/50" />
                  </div>
                  <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded-lg border border-white/10">
                    <Receipt size={14} className="text-emerald-300 shrink-0" />
                    <select value={fType} onChange={e => setFType(e.target.value)} className="w-full bg-transparent font-bold text-[10px] uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900">
                      <option value="All Transactions">All Types</option>
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded-lg border border-white/10">
                    <Filter size={14} className="text-emerald-300 shrink-0" />
                    <select value={fCategory} onChange={e => setFCategory(e.target.value)} className="w-full bg-transparent font-bold text-[10px] uppercase tracking-wider text-white outline-none cursor-pointer [&>option]:text-gray-900">
                      <option value="All Categories">All Categories</option>
                      {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black text-emerald-200 uppercase tracking-widest w-8">From:</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full p-2 bg-black/20 border border-white/10 rounded-lg font-bold text-xs outline-none text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black text-emerald-200 uppercase tracking-widest w-8">To:</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full p-2 bg-black/20 border border-white/10 rounded-lg font-bold text-xs outline-none text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-black/20 border-b border-white/10 text-[9px] font-black text-emerald-200 uppercase tracking-widest">
                        <th className="p-4 w-32">Date</th>
                        <th className="p-4">Transaction Details</th>
                        <th className="p-4">Docs / Notes</th>
                        <th className="p-4 text-right">Amount (₵)</th>
                        {isTier1 && <th className="p-4 text-center w-20">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredLogs.map(log => {
                        const isExpense = log.transactionType === 'Expense';
                        return (
                          <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                <CalendarDays size={12} className={isExpense ? "text-rose-400" : "text-emerald-400"} />
                                {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-black text-white text-xs mb-1">{log.localAssembly} <span className="text-white/30 mx-1">→</span> <span className={isExpense ? "text-rose-300" : "text-emerald-300"}>{log.contributor}</span></div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${isExpense ? 'bg-rose-500/20 text-rose-200 border-rose-400/30' : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'}`}>
                                  {isExpense ? 'EXP' : 'INC'} • {log.category}
                                </span>
                                <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-white/70 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                  <WalletCards size={8} /> {log.paymentMethod || 'Cash'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1 mb-1 items-start">
                                {log.documentNo && log.documentNo !== 'N/A' && (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-900/30 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                    {isExpense ? 'PV:' : 'RCT:'} {log.documentNo}
                                  </span>
                                )}
                                {log.chequeNo && log.chequeNo !== 'N/A' && (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-300 bg-blue-900/30 border border-blue-500/20 px-1.5 py-0.5 rounded">
                                    REF: {log.chequeNo}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-bold text-emerald-100/70 line-clamp-2 mt-1">{log.notes || <span className="italic text-white/30">No notes</span>}</p>
                            </td>
                            <td className="p-4 text-right">
                              <span className={`font-black text-sm flex items-center justify-end gap-1 ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isExpense ? '-' : '+'} {(log.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            {isTier1 && (
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-1">
                                  <button onClick={() => setEditingTx(log)} className="p-1.5 text-white/30 hover:bg-blue-500/20 hover:text-blue-400 rounded transition-colors" title="Edit">
                                    <Edit3 size={14}/>
                                  </button>
                                  <button onClick={() => handleDelete(log.id, log.category, log.amount, log.transactionType || 'Income')} className="p-1.5 text-white/30 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors" title="Delete">
                                    <Trash2 size={14}/>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-10 text-center text-emerald-200/50 font-bold italic">No transactions found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 5: BANK RECONCILIATION DASHBOARD               */}
          {/* ================================================== */}
          {activeTab === 'recon' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white/10">
                <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Scale size={20} className="text-indigo-400" /> Bank Reconciliation
                </h2>
                <p className="text-xs font-bold text-emerald-100/70 mb-8">Compare system-calculated balances against your actual bank statements.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {paymentMethods.map(method => {
                    const sysBal = getSystemAccountBalance(method);
                    const actBal = parseFloat(actualBalances[method]) || 0;
                    const variance = actBal - sysBal;
                    const isBalanced = variance === 0 && actualBalances[method] !== '';

                    return (
                      <div key={method} className="bg-black/20 border border-white/5 rounded-2xl p-5 shadow-inner flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                          <WalletCards size={16} className="text-indigo-300" />
                          <h3 className="text-sm font-black text-white uppercase tracking-wide">{method}</h3>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-black text-emerald-200/60 uppercase tracking-widest mb-1">System Ledger</p>
                          <p className="text-xl font-black text-emerald-300">₵ {sysBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-indigo-200/80 uppercase tracking-widest mb-1 block">Actual Statement</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 font-black text-xs text-indigo-300">₵</span>
                            <input 
                              type="number" step="0.01" placeholder="0.00"
                              value={actualBalances[method]}
                              onChange={(e) => handleActualBalanceChange(method, e.target.value)}
                              className="w-full p-2 pl-7 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-xs font-bold text-white outline-none focus:border-indigo-400 transition-all"
                            />
                          </div>
                        </div>

                        <div className={`mt-2 p-3 rounded-xl border ${actualBalances[method] === '' ? 'bg-white/5 border-white/5' : isBalanced ? 'bg-emerald-900/40 border-emerald-500/40' : 'bg-red-900/40 border-red-500/40'}`}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-0.5">Variance</p>
                          <p className={`text-sm font-black ${actualBalances[method] === '' ? 'text-white/40' : isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                             {actualBalances[method] === '' ? '---' : `₵ ${variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}