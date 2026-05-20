"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { UserPlus, UserCog, Trash2, CheckCircle2, AlertCircle, Loader2, Lock, Smartphone, MessageSquare, MessageCircle, Shield, Activity, Clock } from 'lucide-react';
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

  // --- NEW USER STATES ---
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [accessRole, setAccessRole] = useState('');
  const [assignedAssembly, setAssignedAssembly] = useState('');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
  }, []);

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
    
    const msg = `Praise the Lord ${user.name.split(' ')[0]}!\n\nYou have been granted official access to the Ketiejili Command Centre.\n\n*Your Setup Code is:* ${user.setupCode}\n\nPlease go to https://tinyurl.com/kddapp to secure your account and set your private PIN. God bless you!`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleSendSetupSMS = async (user) => {
    const message = `Praise the Lord ${user.name.split(' ')[0]}! You have been granted access to the Ketiejili Command Centre. Your Setup Code is: ${user.setupCode}. Go to https://tinyurl.com/kddapp to secure your account.`;
    
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

  // PREMIUM GLASS INPUT STYLE
  const inputStyle = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-sm text-white shadow-sm font-bold placeholder:text-blue-200/50 [&>option]:text-gray-900";
  const labelStyle = "block text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2 ml-1";

  return (
    <DashboardLayout>
      <div className="min-h-full rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl pb-20">
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-6 animate-fade-in max-w-7xl mx-auto">
          
          {notification.message && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-extrabold">{notification.message}</span>
            </div>
          )}

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="bg-white/10 p-4 rounded-2xl text-white shadow-lg backdrop-blur-md border border-white/20"><UserCog size={32} /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Secure Access Manager</h1>
              <p className="font-bold text-blue-200">Grant access and view system audit logs.</p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
            <button onClick={() => setActiveTab('manager')} className={`px-6 py-3 rounded-xl font-bold transition-all text-sm border backdrop-blur-md ${activeTab === 'manager' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-blue-200/60 border-white/10 hover:bg-white/10 hover:text-white'}`}>
              <Shield size={18} className="inline mr-2"/> Access Control
            </button>
            <button onClick={() => setActiveTab('logs')} className={`px-6 py-3 rounded-xl font-bold transition-all text-sm border backdrop-blur-md ${activeTab === 'logs' ? 'bg-white/20 text-white border-white/30 shadow-lg' : 'bg-white/5 text-blue-200/60 border-white/10 hover:bg-white/10 hover:text-white'}`}>
              <Activity size={18} className="inline mr-2"/> System Audit Logs
            </button>
          </div>

          {/* TAB 1: ACCESS MANAGER */}
          {activeTab === 'manager' && (
            <div className="animate-fade-in space-y-8">
              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 p-6 md:p-8">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-3 mb-6">
                  <Shield size={24} className="text-blue-400" /> Grant Access
                </h2>
                
                <form onSubmit={handleCreateAccount} className="bg-black/20 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md">
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
                        className={`${inputStyle} ${['District Minister', 'District Secretary'].includes(accessRole) ? 'bg-white/5 text-white/40 cursor-not-allowed border-white/5' : ''}`}
                      >
                        <option value="">- Select -</option>
                        <option value="All Assemblies">All Assemblies</option>
                        {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white uppercase tracking-widest text-xs border border-white/20 ${isSubmitting ? 'bg-white/10 cursor-not-allowed' : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-500/20'}`}>
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={16} /> Generate Key</>}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* USERS DIRECTORY */}
              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-black/10">
                  <h3 className="text-lg font-extrabold text-white">Authorized Personnel</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-blue-200 font-black border-b border-white/10">
                        <th className="p-5">Name & Phone</th>
                        <th className="p-5">Role & Tier</th>
                        <th className="p-5">Security Status</th>
                        <th className="p-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {systemUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-5">
                            <div className="font-black text-white text-base drop-shadow-sm">{user.name}</div>
                            <div className="text-xs font-bold text-blue-200/70 mt-1 font-mono">{user.phone}</div>
                          </td>
                          <td className="p-5">
                            <div className="font-extrabold text-white mb-1">{user.role}</div>
                            <span className={`px-2 py-1 rounded font-black text-[10px] uppercase tracking-widest border ${
                              user.tierLevel === 1 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 
                              user.tierLevel === 2 ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 
                              'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                              Tier {user.tierLevel}
                            </span>
                          </td>
                          <td className="p-5">
                            {user.setupCode ? (
                              <div className="flex items-center gap-3">
                                <div className="bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg inline-block">
                                  <span className="text-[10px] font-black text-amber-200 uppercase block">Pending Setup</span>
                                  <span className="text-sm font-black font-mono tracking-widest text-amber-400">{user.setupCode}</span>
                                </div>
                                <div className="flex gap-2">
                                  <a href={getWhatsAppLink(user)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 hover:text-white rounded-lg transition-colors shadow-sm flex items-center justify-center" title="WhatsApp Setup Code">
                                    <MessageCircle size={16} />
                                  </a>
                                  <button onClick={() => handleSendSetupSMS(user)} className="p-2.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/40 hover:text-white rounded-lg transition-colors shadow-sm flex items-center justify-center" title="SMS Setup Code">
                                    <MessageSquare size={16} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 rounded-lg inline-flex text-emerald-300">
                                <Lock size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Secured</span>
                              </div>
                            )}
                          </td>
                          <td className="p-5">
                            <div className="flex items-center justify-center gap-2">
                              {!user.setupCode && (
                                <button onClick={() => handleResetDevice(user.id, user.name)} className="px-3 py-2 bg-white/5 border border-white/10 text-white/50 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/30 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1 shadow-sm">
                                  <Smartphone size={14}/> Reset
                                </button>
                              )}
                              <button onClick={() => handleRevokeAccess(user.id, user.name, user.role)} className="p-2 text-white/30 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Revoke Access">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {systemUsers.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-blue-200/50 font-bold italic">No accounts created.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/10 overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-white/10 bg-black/10 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2"><Clock size={20} className="text-blue-400"/> Login Audit Trail</h3>
                  <p className="text-xs text-blue-200/60 mt-1">Monitoring the last 100 system access entries.</p>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead className="sticky top-0 bg-[#0f172a] z-10">
                    <tr className="text-[10px] uppercase tracking-widest text-blue-200 font-black border-b border-white/10">
                      <th className="p-5">Timestamp</th>
                      <th className="p-5">User Account</th>
                      <th className="p-5">Tier Level</th>
                      <th className="p-5">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.slice(0, 100).map(log => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-5 font-mono text-xs text-blue-200/70">
                          {new Date(log.loginTime).toLocaleString()}
                        </td>
                        <td className="p-5">
                          <div className="font-black text-white">{log.name}</div>
                          <div className="text-[10px] text-blue-300 uppercase tracking-widest mt-1">{log.role}</div>
                        </td>
                        <td className="p-5">
                          <span className={`px-2 py-1 rounded font-black text-[10px] uppercase tracking-widest border ${
                            log.tierLevel === 1 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 
                            log.tierLevel === 2 ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 
                            'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            Tier {log.tierLevel}
                          </span>
                        </td>
                        <td className="p-5">
                           <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold">
                             {log.activity || "System Access"}
                           </span>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-blue-200/50 font-bold italic">No login records found yet.</td></tr>}
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