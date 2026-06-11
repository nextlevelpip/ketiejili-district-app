"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { UserPlus, UserCog, Trash2, CheckCircle2, AlertCircle, Loader2, Lock, Smartphone, MessageSquare, MessageCircle, Shield, Activity, Clock, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function UserAccounts() {
  const [members, setMembers] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]); // NEW: State for login records
  const [assemblies, setAssemblies] = useState(['Central']);
  const [activeTab, setActiveTab] = useState('manager'); // NEW: Added tabs to Accounts
  
  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(null); 

  // --- NEW USER STATES ---
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [accessRole, setAccessRole] = useState('');
  const [assignedAssembly, setAssignedAssembly] = useState('');

  // --- STRICT TIER 1 SECURITY CHECK ---
  useEffect(() => {
    const checkClearance = () => {
      const userStr = localStorage.getItem('ketiejili_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.tierLevel === 1) {
          setIsAuthorized(true);
          return;
        }
      }
      setIsAuthorized(false); 
    };
    checkClearance();
  }, []);

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    if (!isAuthorized) return;

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setMembers(fetchedMembers);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSystemUsers(fetchedUsers);
    });

    const qAssemblies = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssemblies = onSnapshot(qAssemblies, (snapshot) => {
      if (!snapshot.empty) setAssemblies(snapshot.docs.map(doc => doc.data().name));
    });

    // NEW: Fetch Login History
    const qLogs = query(collection(db, 'login_history'), orderBy('loginTime', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      if (!snapshot.empty) {
        setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });

    return () => { unsubMembers(); unsubUsers(); unsubAssemblies(); unsubLogs(); };
  }, [isAuthorized]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const roles = ["District Minister", "District Secretary", "Presiding Elder", "Group Leader", "Group Secretary"];

  const getTierLevel = (role) => {
    if (['District Minister', 'District Secretary'].includes(role)) return 1;
    if (['Presiding Elder'].includes(role)) return 2;
    return 3;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification({ type: '', message: '' });

    if (!selectedMemberId || !accessRole) {
      showNotification('error', 'Please select a member and an access role.');
      setIsSubmitting(false);
      return;
    }

    const selectedMember = members.find(m => m.id === selectedMemberId);

    if (systemUsers.some(user => user.phone === selectedMember.phone)) {
      showNotification('error', 'This member already has a system account.');
      setIsSubmitting(false);
      return;
    }

    const setupCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tierLevel = getTierLevel(accessRole);
    const isTier1 = tierLevel === 1;

    try {
      await addDoc(collection(db, 'users'), {
        memberId: selectedMember.id,
        name: selectedMember.name || 'Unknown',
        phone: selectedMember.phone || 'No Phone',
        role: accessRole,
        tierLevel: tierLevel,
        assignedAssembly: isTier1 ? 'All Assemblies' : assignedAssembly,
        setupCode: setupCode, 
        authorizedDevice: null,
        localPin: null,
        status: 'Active',
        createdAt: new Date().toISOString()
      });
      
      showNotification('success', `Account created! Setup Code: ${setupCode}`);
      setSelectedMemberId(''); setAccessRole(''); setAssignedAssembly('');
      
    } catch (error) {
      showNotification('error', 'Failed to create account. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDevice = async (id, userName) => {
    if (!window.confirm(`Reset device lock for ${userName}? They will need a new Setup Code to log in.`)) return;
    
    const newSetupCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await updateDoc(doc(db, 'users', id), {
        authorizedDevice: null,
        localPin: null,
        setupCode: newSetupCode
      });
      showNotification('success', `Device Reset. New Setup Code: ${newSetupCode}`);
    } catch (error) {
      showNotification('error', 'Failed to reset device.');
    }
  };

  const handleRevokeAccess = async (id, name, role) => {
    if (role === 'District Minister' && systemUsers.filter(u => u.role === 'District Minister').length <= 1) {
      showNotification('error', 'SYSTEM HALTED: Cannot delete the final District Minister account.');
      return;
    }

    if (window.confirm(`PERMANENTLY Revoke system access for ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'users', id));
        showNotification('success', 'Access permanently revoked.');
      } catch (error) {
        showNotification('error', 'Failed to revoke access.');
      }
    }
  };

  const getWhatsAppLink = (user) => {
    if (!user.phone) return '#';
    let formattedPhone = user.phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '233' + formattedPhone.substring(1);
    
    const msg = `Praise the Lord ${String(user.name).split(' ')[0]}!\n\nYou have been granted official access to the Ketiejili Command Centre.\n\n*Your Setup Code is:* ${user.setupCode}\n\nPlease go to https://tinyurl.com/kddapp to secure your account and set your private PIN. God bless you!`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleSendSetupSMS = async (user) => {
    const message = `Praise the Lord ${String(user.name).split(' ')[0]}! You have been granted access to the Ketiejili Command Centre. Your Setup Code is: ${user.setupCode}. Go to https://tinyurl.com/kddapp to secure your account.`;
    
    if (!window.confirm(`Send this official SMS to ${user.name}?\n\n"${message}"`)) return;

    let formattedPhone = user.phone?.replace(/\D/g, '');
    if (!formattedPhone) return showNotification('error', 'User does not have a valid phone number.');
    if (formattedPhone.startsWith('0')) formattedPhone = '233' + formattedPhone.substring(1);

    try {
      showNotification('success', 'Transmitting Setup Code to network...');
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          recipients: [formattedPhone]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API Connection Failed');

      showNotification('success', `Setup Code delivered to ${user.name}!`);
    } catch (err) {
      showNotification('error', `Transmission Failed: ${err.message}`);
    }
  };

  // PALETTE 2 (MODERN CYAN & GOLD) INPUT STYLE
  const inputStyle = "w-full p-3 bg-[#023047] border border-[#209EBB]/30 rounded-xl font-bold text-xs text-white outline-none focus:border-[#FFB701] transition-all shadow-sm placeholder:text-[#8ECAE6]/50 [&>option]:text-[#023047]";
  const labelStyle = "block text-[9px] font-black text-[#8ECAE6] uppercase tracking-widest mb-2 ml-1";

  // --- ACCESS DENIED SCREEN (PALETTE 2) ---
  if (isAuthorized === false) {
    return (
      <DashboardLayout>
        <div className="min-h-full rounded-[2.5rem] bg-[#023047] border border-red-500/20 flex flex-col items-center justify-center text-center p-6 animate-fade-in relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="bg-[#023047] border border-[#209EBB]/30 p-10 rounded-2xl shadow-2xl relative z-10 flex flex-col items-center max-w-md w-full">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-500/20 shadow-inner">
              <ShieldAlert size={28} />
            </div>
            <h1 className="text-sm font-black text-white uppercase tracking-widest mb-3 border-b border-[#209EBB]/20 pb-3 w-full">Restricted Area</h1>
            <p className="text-[10px] font-bold text-[#8ECAE6] uppercase tracking-widest leading-relaxed">
              The Security Access Manager is strictly reserved for Tier 1 Supreme Command.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- LOADING SCREEN ---
  if (isAuthorized === null) return <DashboardLayout><div className="flex justify-center items-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[#FFB701]" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* PALETTE 2 BACKGROUND GRADIENT */}
      <div className="min-h-full bg-gradient-to-br from-[#023047] via-[#209EBB]/20 to-[#023047] p-4 md:p-8 text-white relative overflow-hidden pb-20">
        
        {/* Ambient background decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8ECAE6]/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFB701]/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in text-[10px] uppercase tracking-widest font-black ${notification.type === 'success' ? 'bg-[#FFB701] text-[#023047]' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY HEADER & TABS (Locks to top when scrolling down) */}
          {/* ========================================================= */}
          <div className="sticky top-0 z-30 bg-[#023047] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-[#209EBB]/20 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#209EBB]/10 p-3 rounded-xl text-[#FFB701] border border-[#FFB701]/20 hidden md:block">
                <UserCog size={24} />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-widest">Secure Access Manager</h1>
                <p className="font-bold text-[#8ECAE6] text-[10px] uppercase tracking-widest mt-1">Grant access and view system audit logs.</p>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTab('manager')} 
                className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-widest border transition-all ${activeTab === 'manager' ? 'bg-[#FFB701] text-[#023047] border-[#FFB701] shadow-lg' : 'bg-[#023047] text-[#8ECAE6] border-[#209EBB]/30 hover:bg-[#209EBB]/10'}`}
              >
                <Shield size={12}/> Access Control
              </button>
              <button 
                onClick={() => setActiveTab('logs')} 
                className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-widest border transition-all ${activeTab === 'logs' ? 'bg-[#FFB701] text-[#023047] border-[#FFB701] shadow-lg' : 'bg-[#023047] text-[#8ECAE6] border-[#209EBB]/30 hover:bg-[#209EBB]/10'}`}
              >
                <Activity size={12}/> System Audit Logs
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* TAB 1: ACCESS MANAGER                      */}
          {/* ========================================== */}
          {activeTab === 'manager' && (
            <div className="animate-fade-in space-y-8">
              <div className="bg-[#023047] rounded-2xl shadow-xl border border-[#209EBB]/30 p-6 md:p-8">
                <h2 className="text-sm font-black text-white flex items-center gap-2 mb-6 uppercase tracking-widest">
                  <Shield size={16} className="text-[#FFB701]" /> Grant Access
                </h2>
                
                <form onSubmit={handleCreateAccount} className="bg-[#023047] border border-[#209EBB]/20 p-6 rounded-xl shadow-inner">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-1">
                      <label className={labelStyle}>Select Member Profile</label>
                      <select required value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} className={inputStyle}>
                        <option value="">- Search Name -</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className={labelStyle}>Access Role</label>
                      <select required value={accessRole} onChange={e => setAccessRole(e.target.value)} className={inputStyle}>
                        <option value="">- Select -</option>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className={labelStyle}>Assigned Assembly</label>
                      <select 
                        required={!['District Minister', 'District Secretary'].includes(accessRole)} 
                        disabled={['District Minister', 'District Secretary'].includes(accessRole)}
                        value={['District Minister', 'District Secretary'].includes(accessRole) ? 'All Assemblies' : assignedAssembly} 
                        onChange={e => setAssignedAssembly(e.target.value)} 
                        className={`${inputStyle} ${['District Minister', 'District Secretary'].includes(accessRole) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">- Select -</option>
                        <option value="All Assemblies">All Assemblies</option>
                        {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-black transition-all shadow-md flex items-center justify-center gap-2 text-[#023047] uppercase tracking-widest text-[10px] border border-[#FFB701] ${isSubmitting ? 'bg-[#209EBB]/10 text-[#8ECAE6] cursor-not-allowed border-[#209EBB]/30' : 'bg-[#FFB701] hover:bg-[#FC8500]'}`}>
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} /> Generate Key</>}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* USERS DIRECTORY */}
              <div className="bg-[#023047] rounded-2xl shadow-xl border border-[#209EBB]/30 overflow-hidden">
                <div className="p-5 border-b border-[#209EBB]/30 bg-[#023047]">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Authorized Personnel</h3>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left whitespace-nowrap text-xs">
                    <thead className="bg-[#023047] border-b border-[#209EBB]/30 text-[9px] uppercase tracking-widest text-[#FFB701] font-black">
                      <tr>
                        <th className="p-5">Name & Phone</th>
                        <th className="p-5">Role & Tier</th>
                        <th className="p-5">Security Status</th>
                        <th className="p-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#209EBB]/10">
                      {systemUsers.map(user => (
                        <tr key={user.id} className="hover:bg-[#209EBB]/10 transition-colors">
                          <td className="p-5">
                            <div className="font-black text-white text-sm drop-shadow-sm">{user.name}</div>
                            <div className="text-[10px] font-bold text-[#8ECAE6] mt-1 font-mono tracking-widest">{user.phone}</div>
                          </td>
                          <td className="p-5">
                            <div className="font-black text-white mb-1.5 text-xs">{user.role}</div>
                            <span className={`px-2 py-0.5 rounded font-black text-[8px] uppercase tracking-widest border inline-block ${
                              user.tierLevel === 1 ? 'bg-[#FC8500]/10 text-[#FC8500] border-[#FC8500]/30' : 
                              user.tierLevel === 2 ? 'bg-[#FFB701]/10 text-[#FFB701] border-[#FFB701]/30' : 
                              'bg-[#8ECAE6]/10 text-[#8ECAE6] border-[#8ECAE6]/30'
                            }`}>
                              Tier {user.tierLevel}
                            </span>
                          </td>
                          <td className="p-5">
                            {user.setupCode ? (
                              <div className="flex items-center gap-3">
                                <div className="bg-[#FFB701]/10 border border-[#FFB701]/30 px-3 py-1.5 rounded-lg inline-block">
                                  <span className="text-[8px] font-black text-[#FFB701] uppercase tracking-widest block mb-0.5">Pending Setup</span>
                                  <span className="text-xs font-black font-mono tracking-widest text-white">{user.setupCode}</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <a href={getWhatsAppLink(user)} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors shadow-sm flex items-center justify-center" title="WhatsApp Setup Code">
                                    <MessageCircle size={14} />
                                  </a>
                                  <button onClick={() => handleSendSetupSMS(user)} className="p-2 bg-[#209EBB]/10 border border-[#209EBB]/30 text-[#8ECAE6] hover:bg-[#209EBB]/20 rounded-lg transition-colors shadow-sm flex items-center justify-center" title="SMS Setup Code">
                                    <MessageSquare size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg inline-flex text-emerald-400">
                                <Lock size={12} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Secured</span>
                              </div>
                            )}
                          </td>
                          <td className="p-5">
                            <div className="flex items-center justify-center gap-2">
                              {!user.setupCode && (
                                <button onClick={() => handleResetDevice(user.id, user.name)} className="px-3 py-1.5 bg-[#023047] border border-[#209EBB]/30 text-[#8ECAE6] hover:bg-[#FFB701]/10 hover:text-[#FFB701] hover:border-[#FFB701]/30 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1 shadow-sm">
                                  <Smartphone size={12}/> Reset
                                </button>
                              )}
                              <button onClick={() => handleRevokeAccess(user.id, user.name, user.role)} className="p-1.5 text-white/30 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Revoke Access">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {systemUsers.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-[#8ECAE6]/50 font-bold italic text-xs">No accounts created.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: SYSTEM AUDIT LOGS                   */}
          {/* ========================================== */}
          {activeTab === 'logs' && (
            <div className="bg-[#023047] rounded-2xl shadow-xl border border-[#209EBB]/30 overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-[#209EBB]/30 bg-[#023047] flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest"><Clock size={16} className="text-[#FFB701]"/> Login Audit Trail</h3>
                  <p className="text-[9px] text-[#8ECAE6] font-bold uppercase tracking-widest mt-1">Monitoring the last 100 system access entries.</p>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap text-xs">
                  <thead className="sticky top-0 bg-[#023047] z-10">
                    <tr className="text-[9px] uppercase tracking-widest text-[#FFB701] font-black border-b border-[#209EBB]/30">
                      <th className="p-5">Timestamp</th>
                      <th className="p-5">User Account</th>
                      <th className="p-5">Tier Level</th>
                      <th className="p-5">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#209EBB]/10">
                    {auditLogs.slice(0, 100).map(log => (
                      <tr key={log.id} className="hover:bg-[#209EBB]/10 transition-colors">
                        <td className="p-5 font-mono text-[10px] text-[#8ECAE6]">
                          {new Date(log.loginTime).toLocaleString()}
                        </td>
                        <td className="p-5">
                          <div className="font-black text-white text-xs">{log.name}</div>
                          <div className="text-[9px] text-white/50 uppercase tracking-widest mt-1 font-bold">{log.role}</div>
                        </td>
                        <td className="p-5">
                          <span className={`px-2 py-0.5 rounded font-black text-[8px] uppercase tracking-widest border ${
                            log.tierLevel === 1 ? 'bg-[#FC8500]/10 text-[#FC8500] border-[#FC8500]/30' : 
                            log.tierLevel === 2 ? 'bg-[#FFB701]/10 text-[#FFB701] border-[#FFB701]/30' : 
                            'bg-[#8ECAE6]/10 text-[#8ECAE6] border-[#8ECAE6]/30'
                          }`}>
                            Tier {log.tierLevel}
                          </span>
                        </td>
                        <td className="p-5">
                           <span className="bg-[#209EBB]/10 border border-[#209EBB]/30 text-[#8ECAE6] px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                             {log.activity || "System Access"}
                           </span>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-[#8ECAE6]/50 font-bold italic text-xs">No login records found yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}