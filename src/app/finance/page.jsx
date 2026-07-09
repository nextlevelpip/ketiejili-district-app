"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Search, Filter, CalendarDays, ArrowDownToLine, ArrowUpFromLine, FileText, Activity, WifiOff, ShieldAlert, Trash2, CheckCircle2, AlertCircle, Loader2, Save, Landmark, Plus, Trash, WalletCards, Receipt, Scale, ShieldCheck, Users, Edit3, X, FileSignature } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function DistrictTreasury() {
  const [logs, setLogs] = useState([]);
  const [assemblies, setAssemblies] = useState(['Central']);
  const [activeTab, setActiveTab] = useState('voucher'); 
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // --- CUSTOM MODAL STATE ---
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, desc: '', amount: 0 });
  const [editingTx, setEditingTx] = useState(null);

  // --- MULTIPLE VOUCHER ENTRY STATES ---
  const [voucherData, setVoucherData] = useState({
    voucherType: 'Receipt', // Receipt (Income) or Payment (Expense)
    date: new Date().toISOString().split('T')[0],
    voucherNo: `VCH-${Date.now().toString().slice(-6)}`,
    paymentMethod: 'Cash',
    bankAccount: '5000 - CASH IN HAND',
    chequeNo: '',
    remark: ''
  });

  const [entries, setEntries] = useState([
    { id: Date.now(), glCode: '', beneficiary: '', description: '', amount: '' }
  ]);

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fType, setFType] = useState('All Transactions');
  const [fCategory, setFCategory] = useState('All Categories');
  const [fAssem, setFAssem] = useState('All Assemblies');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // --- OFFICIAL GL CODES (From District PDF) ---
  const glIncomeCodes = [
    "1030 - FREEWILL OFFERING", "1035 - DDF", "1040 - DISTRICT WEEK", 
    "1055 - CONVENTION PROCEEDS - CHRISTMAS", "1065 - DONATIONS", 
    "1165 - RALLIES & CRUSADES", "1175 - DISTRICT PRAYERS", "1180 - OTHER INCOME",
    "4005 - TITHES AND OFFERING", "4010 - MISSIONS OFFERING",
    "4050 - EVANGELISM MINISTRY", "4055 - WOMEN'S MINISTRY", 
    "4060 - YOUTH MINISTRY", "4065 - PEMEM", "4070 - CHILDREN MINISTRY"
  ];

  const glExpenseCodes = [
    "2000 - EXPENDITURE - ADMINISTRATION", "2005 - SECURITY SERVICES", 
    "2010 - EDUCATIONAL SUPPORT", "2015 - TRAVEL", "2020 - BUILDING MAINTENANCE", 
    "2025 - EQUIPMENT MAINTENANCE", "2030 - TRAINING AND CONFERENCES", 
    "2035 - PRINTING AND STATIONERY", "2040 - MEDICAL EXPENSES", 
    "2060 - DONATION AND SUPPORT", "2065 - UTILITIES", "2085 - MEETING AND CATERING", 
    "2100 - BEREAVEMENT", "2110 - EVANGELISM EXPENSES", "2145 - SPECIALIZED MINISTRIES", 
    "2170 - OFFICE EXPENSES", "2290 - OTHER EXPENSES", "2300 - TITHES EXPENSES",
    "4145 - HEADQUARTERS REMITTANCE"
  ];

  const glBankAccounts = [
    "5000 - CASH IN HAND", "5310 - GCB", "5378 - ARB APEX",
    "5505 - MTN MOBILE MONEY", "5510 - VODAFONE CASH", "5515 - AIRTELTIGO"
  ];

  const beneficiaryTypes = [
    "Area", "Committees & Boards", "Districts", "Local Assemblies", "Ministries", "Individuals", "Vendors"
  ];

  const activeGLList = voucherData.voucherType === 'Receipt' ? glIncomeCodes : glExpenseCodes;

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    if (typeof window !== 'undefined' && !navigator.onLine) setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const userStr = localStorage.getItem('ketiejili_user');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const qAssem = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssem = onSnapshot(qAssem, (snapshot) => {
      if (!snapshot.empty) {
        setAssemblies(snapshot.docs.map(doc => doc.data().name));
      }
    });

    const qLogs = query(collection(db, 'treasury_logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubAssem();
      unsubLogs();
    };
  }, []);

  const isTier1 = currentUser?.tierLevel === 1 || currentUser?.tierLevel === "1";

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === 'voucher') {
      setEntries([{ id: Date.now(), glCode: '', beneficiary: '', description: '', amount: '' }]);
      setVoucherData(prev => ({ ...prev, voucherNo: `VCH-${Date.now().toString().slice(-6)}`, remark: '', chequeNo: '' }));
    }
  };

  // --- VOUCHER ENTRY HANDLERS ---
  const handleAddEntry = () => setEntries([...entries, { id: Date.now(), glCode: '', beneficiary: '', description: '', amount: '' }]);
  const handleRemoveEntry = (idToRemove) => { if (entries.length > 1) setEntries(entries.filter(e => e.id !== idToRemove)); };
  
  const handleEntryChange = (id, field, value) => {
    setEntries(entries.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };

  const voucherTotal = entries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

  const handleSaveVoucher = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validEntries = entries.filter(entry => parseFloat(entry.amount) > 0 && entry.glCode !== '');

    if (validEntries.length === 0) {
      showNotification('error', 'Please add at least one valid voucher item.');
      setIsSubmitting(false);
      return;
    }

    try {
      const batchId = Date.now().toString();
      const promises = validEntries.map(entry => {
        return addDoc(collection(db, 'treasury_logs'), { 
          transactionType: voucherData.voucherType === 'Receipt' ? 'Income' : 'Expense',
          date: voucherData.date,
          documentNo: voucherData.voucherNo,
          paymentMethod: voucherData.paymentMethod,
          bankAccount: voucherData.bankAccount,
          chequeNo: voucherData.chequeNo || 'N/A',
          contributor: voucherData.remark || 'N/A',
          
          category: entry.glCode, 
          beneficiary: entry.beneficiary,
          notes: entry.description,
          amount: parseFloat(entry.amount),
          
          localAssembly: entry.beneficiary && assemblies.includes(entry.beneficiary) ? entry.beneficiary : 'District',
          recordedAt: new Date().toISOString(),
          recordedBy: currentUser?.fullName || 'System Admin',
          batchId: batchId 
        });
      });

      await Promise.all(promises);
      showNotification('success', `${voucherData.voucherType} Voucher saved with ${validEntries.length} line items.`);
      handleTabSwitch('ledger');
    } catch (err) {
      showNotification('error', 'Error processing voucher. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- EDIT / DELETE TRANSACTIONS ---
  const triggerDelete = (id, desc, amt) => {
    if (!isTier1) return showNotification('error', 'Restricted Command: Requires Tier 1 Clearance.');
    setDeleteModal({ isOpen: true, id, desc, amount: amt });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'treasury_logs', deleteModal.id));
      showNotification('success', 'Financial record purged from ledger.');
    } catch (err) {
      showNotification('error', 'Purge Failed.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, desc: '', amount: 0 });
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

  // --- FILTERING & ANALYTICS ---
  const filteredLogs = logs.filter(log => {
    const logType = log.transactionType || 'Income';
    const matchesSearch = (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.contributor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.documentNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = fType === 'All Transactions' || logType === fType;
    const matchesAssembly = fAssem === 'All Assemblies' || log.localAssembly === fAssem;
    
    let matchesDate = true;
    if (dateFrom && dateTo) matchesDate = log.date >= dateFrom && log.date <= dateTo;
    else if (dateFrom) matchesDate = log.date >= dateFrom;
    else if (dateTo) matchesDate = log.date <= dateTo;

    return matchesSearch && matchesType && matchesAssembly && matchesDate;
  });

  const totalIncome = logs.filter(l => (l.transactionType || 'Income') === 'Income').reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalExpense = logs.filter(l => l.transactionType === 'Expense').reduce((sum, l) => sum + (l.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // NAVY & GOLD SOLID INPUT STYLE
  const inputStyle = "w-full p-3.5 bg-[#001D3D] border border-[#003566] rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFC300] transition-all placeholder:text-white/30 [&>option]:bg-[#001D3D] [&>option]:text-white";
  const labelStyle = "block text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 ml-1";

  if (isLoading) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={40} className="animate-spin text-[#FFC300]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#001D3D] p-4 md:p-8 text-white relative pb-20">
        
        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-xs uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFC300] text-[#000814]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* EDIT MODAL (TIER 1 ONLY) */}
          {editingTx && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000814]/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-[#000814] p-6 border-b border-[#003566] flex justify-between items-center">
                  <h3 className="font-black text-[#FFC300] flex items-center gap-2 uppercase tracking-widest text-sm"><Edit3 size={16}/> Edit Transaction</h3>
                  <button onClick={() => setEditingTx(null)} className="text-white/50 hover:text-white"><X size={20}/></button>
                </div>
                <form onSubmit={submitEditTransaction} className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelStyle}>Date</label>
                      <input type="date" value={editingTx.date} onChange={e => setEditingTx({...editingTx, date: e.target.value})} className={inputStyle} required />
                    </div>
                    <div>
                      <label className={labelStyle}>Amount (₵)</label>
                      <input type="number" step="0.01" value={editingTx.amount} onChange={e => setEditingTx({...editingTx, amount: e.target.value})} className={inputStyle} required />
                    </div>
                    <div className="col-span-2">
                      <label className={labelStyle}>GL Code / Category</label>
                      <select value={editingTx.category} onChange={e => setEditingTx({...editingTx, category: e.target.value})} className={inputStyle} required>
                         <optgroup label="Income GLs">
                           {glIncomeCodes.map(c => <option key={c} value={c}>{c}</option>)}
                         </optgroup>
                         <optgroup label="Expense GLs">
                           {glExpenseCodes.map(c => <option key={c} value={c}>{c}</option>)}
                         </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}>Payment Method</label>
                      <select value={editingTx.paymentMethod} onChange={e => setEditingTx({...editingTx, paymentMethod: e.target.value})} className={inputStyle} required>
                         <option value="Cash">Cash</option>
                         <option value="Bank Cheque">Bank Cheque</option>
                         <option value="Mobile Money">Mobile Money</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}>Doc No (PV/Receipt)</label>
                      <input type="text" value={editingTx.documentNo} onChange={e => setEditingTx({...editingTx, documentNo: e.target.value})} className={inputStyle} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelStyle}>Beneficiary / Payee</label>
                      <input type="text" value={editingTx.contributor} onChange={e => setEditingTx({...editingTx, contributor: e.target.value})} className={inputStyle} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelStyle}>Notes</label>
                      <input type="text" value={editingTx.notes} onChange={e => setEditingTx({...editingTx, notes: e.target.value})} className={inputStyle} />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-[#003566]">
                    <button type="button" onClick={() => setEditingTx(null)} className="px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white/50 hover:bg-[#000814] transition-colors border border-transparent hover:border-[#003566]">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] shadow-lg flex items-center gap-2">
                      {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Update Ledger
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE MODAL */}
          {deleteModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000814]/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-[#001D3D] border border-[#003566] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400">
                    <ShieldAlert size={28} />
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Ledger Purge</h3>
                  <p className="text-[10px] font-bold text-white/50 leading-relaxed uppercase tracking-widest mb-2">
                    Delete this financial record permanently?
                  </p>
                  <div className="bg-[#000814] border border-[#003566] p-4 rounded-xl mt-4">
                    <p className="font-black text-white text-xs">"{deleteModal.desc}"</p>
                    <p className="font-mono text-red-400 font-bold text-sm mt-1">₵ {deleteModal.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
                <div className="flex border-t border-[#003566]">
                  <button onClick={() => setDeleteModal({ isOpen: false, id: null, desc: '', amount: 0 })} className="flex-1 py-4 text-[10px] font-black text-white/50 uppercase tracking-widest hover:bg-[#000814] transition-colors border-r border-[#003566]">Cancel</button>
                  <button onClick={confirmDelete} className="flex-1 py-4 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/10 transition-colors">Confirm Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#001D3D] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#003566] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#000814] p-3 rounded-xl text-[#FFC300] border border-[#003566] hidden md:block">
                <Landmark size={24} />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">District Treasury</h1>
                <p className="font-bold text-white/50 text-[10px] uppercase tracking-widest mt-1">Fund Accounting & GL Reconciliation.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => handleTabSwitch('dashboard')} className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all text-[9px] uppercase tracking-widest border ${activeTab === 'dashboard' ? 'bg-[#FFC300] text-[#000814] border-transparent shadow-lg' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <Activity size={12}/> Analytics
              </button>
              <button onClick={() => handleTabSwitch('voucher')} className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all text-[9px] uppercase tracking-widest border ${activeTab === 'voucher' ? 'bg-[#FFC300] text-[#000814] border-transparent shadow-lg' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <FileSignature size={12}/> Voucher Entry
              </button>
              <button onClick={() => handleTabSwitch('ledger')} className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all text-[9px] uppercase tracking-widest border ${activeTab === 'ledger' ? 'bg-[#FFC300] text-[#000814] border-transparent shadow-lg' : 'bg-[#000814] text-white/50 border-[#003566] hover:text-white'}`}>
                <FileText size={12}/> Master Ledger
              </button>
            </div>
          </div>

          {/* ================================================== */}
          {/* TAB 1: FINANCE ANALYTICS                           */}
          {/* ================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-[#000814] p-6 rounded-2xl border border-[#003566] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Total Revenue</p>
                      <h3 className="text-2xl font-black text-white mt-1 font-mono">₵ {totalIncome.toLocaleString('en-US', {minimumFractionDigits: 2})}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                </div>

                <div className="bg-[#000814] p-6 rounded-2xl border border-[#003566] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Total Expenditure</p>
                      <h3 className="text-2xl font-black text-white mt-1 font-mono">₵ {totalExpense.toLocaleString('en-US', {minimumFractionDigits: 2})}</h3>
                    </div>
                    <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform">
                      <TrendingDown size={20} />
                    </div>
                  </div>
                </div>

                <div className="bg-[#000814] p-6 rounded-2xl border border-[#003566] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#FFC300]"></div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Net Balance</p>
                      <h3 className={`text-2xl font-black mt-1 font-mono ${netBalance >= 0 ? 'text-[#FFC300]' : 'text-red-400'}`}>
                        ₵ {netBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                      </h3>
                    </div>
                    <div className="w-12 h-12 bg-[#FFC300]/10 rounded-full flex items-center justify-center text-[#FFC300] border border-[#FFC300]/30 group-hover:scale-110 transition-transform">
                      <Wallet size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 2: MULTIPLE VOUCHER ENTRY                      */}
          {/* ================================================== */}
          {activeTab === 'voucher' && (
            <div className="bg-[#000814] p-6 md:p-10 rounded-[2rem] shadow-xl border border-[#003566] max-w-6xl mx-auto animate-fade-in relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${voucherData.voucherType === 'Receipt' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`}></div>
              
              <div className="flex justify-between items-center mb-8 border-b border-[#003566] pb-4 mt-1">
                <h2 className="text-lg font-black uppercase tracking-widest text-white">Multiple Voucher Entry</h2>
                <div className="flex bg-[#001D3D] rounded-lg p-1 border border-[#003566]">
                  <button onClick={() => setVoucherData({...voucherData, voucherType: 'Payment'})} className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${voucherData.voucherType === 'Payment' ? 'bg-rose-500 text-white shadow-md' : 'text-white/50 hover:text-white'}`}>Payment</button>
                  <button onClick={() => setVoucherData({...voucherData, voucherType: 'Receipt'})} className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${voucherData.voucherType === 'Receipt' ? 'bg-emerald-500 text-white shadow-md' : 'text-white/50 hover:text-white'}`}>Receipt</button>
                </div>
              </div>

              <form onSubmit={handleSaveVoucher} className="space-y-8">
                
                {/* VOUCHER HEADER */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#001D3D] p-6 rounded-2xl border border-[#003566]">
                  <div>
                    <label className={labelStyle}>Date *</label>
                    <input required type="date" value={voucherData.date} onChange={e => setVoucherData({...voucherData, date: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Voucher No# *</label>
                    <input required type="text" value={voucherData.voucherNo} onChange={e => setVoucherData({...voucherData, voucherNo: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Payment Method *</label>
                    <select required value={voucherData.paymentMethod} onChange={e => setVoucherData({...voucherData, paymentMethod: e.target.value})} className={inputStyle}>
                      <option value="Cash">Cash</option>
                      <option value="Bank Cheque">Bank Cheque</option>
                      <option value="Mobile Money">Mobile Money</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Bank / Cash Account *</label>
                    <select required value={voucherData.bankAccount} onChange={e => setVoucherData({...voucherData, bankAccount: e.target.value})} className={inputStyle}>
                      {glBankAccounts.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelStyle}>Remark / Payee</label>
                    <input type="text" placeholder="Enter remark or payee name here" value={voucherData.remark} onChange={e => setVoucherData({...voucherData, remark: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelStyle}>Cheque / Ref No#</label>
                    <input type="text" placeholder="Enter cheque/reference no" disabled={voucherData.paymentMethod === 'Cash'} value={voucherData.chequeNo} onChange={e => setVoucherData({...voucherData, chequeNo: e.target.value})} className={`${inputStyle} disabled:opacity-50 disabled:cursor-not-allowed`} />
                  </div>
                </div>

                {/* VOUCHER ITEMS */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Voucher Items</h3>
                    <button type="button" onClick={handleAddEntry} className="text-[10px] uppercase tracking-widest font-black flex items-center gap-1 px-4 py-2 rounded-lg border bg-[#001D3D] text-[#FFC300] border-[#003566] hover:bg-[#003566] transition-colors">
                      <Plus size={12} /> Add More
                    </button>
                  </div>

                  <div className="bg-[#001D3D] border border-[#003566] rounded-xl overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                      <thead className="bg-[#000814] border-b border-[#003566] text-[9px] font-black text-[#FFC300] uppercase tracking-widest">
                        <tr>
                          <th className="p-4 w-10"></th>
                          <th className="p-4 w-[25%]">GL Code / Account</th>
                          <th className="p-4 w-[20%]">Beneficiary</th>
                          <th className="p-4 w-[35%]">Item Description</th>
                          <th className="p-4 w-[15%]">Amount (₵)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#003566]">
                        {entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="p-4 text-center">
                              {entries.length > 1 && (
                                <button type="button" onClick={() => handleRemoveEntry(entry.id)} className="text-white/30 hover:text-red-400 transition-colors">
                                  <Trash size={14} />
                                </button>
                              )}
                            </td>
                            <td className="p-4">
                              <select required value={entry.glCode} onChange={e => handleEntryChange(entry.id, 'glCode', e.target.value)} className={inputStyle}>
                                <option value="">Select account</option>
                                {activeGLList.map(code => <option key={code} value={code}>{code}</option>)}
                              </select>
                            </td>
                            <td className="p-4">
                              <select value={entry.beneficiary} onChange={e => handleEntryChange(entry.id, 'beneficiary', e.target.value)} className={inputStyle}>
                                <option value="">Select a beneficiary source</option>
                                <optgroup label="System Sources">
                                  {beneficiaryTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </optgroup>
                                <optgroup label="Local Assemblies">
                                  {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                                </optgroup>
                              </select>
                            </td>
                            <td className="p-4">
                              <input required type="text" placeholder="Enter Item Description" value={entry.description} onChange={e => handleEntryChange(entry.id, 'description', e.target.value)} className={inputStyle} />
                            </td>
                            <td className="p-4">
                              <input required type="number" step="0.01" min="0" placeholder="0" value={entry.amount} onChange={e => handleEntryChange(entry.id, 'amount', e.target.value)} className={`${inputStyle} text-right font-mono text-[#FFC300]`} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#000814] border-t border-[#003566]">
                          <td colSpan="3"></td>
                          <td className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-white/50">Total</td>
                          <td className="p-4 text-right font-mono font-black text-lg text-[#FFC300]">₵ {voucherTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-[#003566] flex justify-center gap-4">
                  <button type="submit" disabled={isSubmitting || voucherTotal === 0} className="px-12 py-3.5 bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save Voucher
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 3: MASTER LEDGER HISTORY                       */}
          {/* ================================================== */}
          {activeTab === 'ledger' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#000814] p-5 rounded-xl shadow-xl border border-[#003566] flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 text-[#FFC300]/50" size={14}/>
                  <input placeholder="Search entries..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputStyle + " pl-10"} />
                </div>
                <div className="flex items-center gap-2 bg-[#001D3D] px-3 py-1 rounded-xl border border-[#003566]">
                  <Filter size={14} className="text-[#FFC300] shrink-0" />
                  <select value={fType} onChange={e => setFType(e.target.value)} className="w-full bg-transparent font-black text-[9px] uppercase tracking-widest text-white outline-none cursor-pointer [&>option]:bg-[#001D3D] [&>option]:text-white">
                    <option value="All Transactions">All Types</option>
                    <option value="Income">Receipts (Income)</option>
                    <option value="Expense">Payments (Expense)</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#000814] rounded-2xl shadow-xl border border-[#003566] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="sticky top-0 bg-[#001D3D] z-10">
                      <tr className="text-[9px] font-black text-[#FFC300] uppercase tracking-widest border-b border-[#003566]">
                        <th className="p-5 w-40">Date & PV No.</th>
                        <th className="p-5">Transaction Details</th>
                        <th className="p-5">GL Code / Account</th>
                        <th className="p-5 text-right">Amount (₵)</th>
                        {isTier1 && <th className="p-5 text-center w-20">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#003566]">
                      {filteredLogs.map(log => {
                        const isExpense = log.transactionType === 'Expense';
                        return (
                          <tr key={log.id} className="hover:bg-[#001D3D]/50 transition-colors">
                            <td className="p-5">
                              <div className="flex items-center gap-1.5 font-bold text-white mb-1.5">
                                <CalendarDays size={12} className={isExpense ? "text-rose-400" : "text-emerald-400"} />
                                {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div className="text-[9px] font-mono text-white/50">{log.documentNo}</div>
                            </td>
                            <td className="p-5">
                              <div className="font-black text-white text-xs mb-1.5 truncate max-w-xs">{log.notes || log.contributor}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${isExpense ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                                  {isExpense ? 'PYMT' : 'RECPT'}
                                </span>
                                <span className="text-[8px] font-bold text-white/50 bg-[#001D3D] px-1.5 py-0.5 rounded border border-[#003566]">{log.bankAccount}</span>
                              </div>
                            </td>
                            <td className="p-5">
                              <span className="text-[10px] font-black text-white/80">{log.category}</span>
                            </td>
                            <td className="p-5 text-right">
                              <span className={`font-black text-sm flex items-center justify-end gap-1 ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isExpense ? '-' : '+'} {(log.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            {isTier1 && (
                              <td className="p-5 text-center">
                                <div className="flex justify-center gap-1">
                                  <button onClick={() => setEditingTx(log)} className="p-1.5 text-white/30 hover:bg-[#FFC300]/20 hover:text-[#FFC300] rounded transition-colors" title="Edit">
                                    <Edit3 size={14}/>
                                  </button>
                                  <button onClick={() => triggerDelete(log.id, log.notes || log.category, log.amount)} className="p-1.5 text-white/30 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors" title="Delete">
                                    <Trash2 size={14}/>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {filteredLogs.length === 0 && <tr><td colSpan={isTier1 ? "5" : "4"} className="p-12 text-center text-white/50 font-bold italic text-xs">No transactions found.</td></tr>}
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