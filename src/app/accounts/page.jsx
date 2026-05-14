"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { UserPlus, UserCog, Trash2, CheckCircle2, AlertCircle, Loader2, Lock, Smartphone } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function UserAccounts() {
  const [members, setMembers] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [assemblies, setAssemblies] = useState(['Central']);
  
  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW USER STATES ---
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [accessRole, setAccessRole] = useState('');
  const [assignedAssembly, setAssignedAssembly] = useState('');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    // 1. Fetch all members for the dropdown
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMembers(fetchedMembers);
    });

    // 2. Fetch existing authorized users from the 'users' collection (Used by Login Gateway)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSystemUsers(fetchedUsers);
    });

    // 3. Fetch Master Assemblies
    const qAssemblies = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubAssemblies = onSnapshot(qAssemblies, (snapshot) => {
      if (!snapshot.empty) setAssemblies(snapshot.docs.map(doc => doc.data().name));
    });

    return () => { unsubMembers(); unsubUsers(); unsubAssemblies(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- DYNAMIC DEFINITIONS ---
  const roles = ["District Minister", "District Secretary", "Presiding Elder", "Group Leader", "Group Secretary"];

  const getTierLevel = (role) => {
    if (['District Minister', 'District Secretary'].includes(role)) return 1;
    if (['Presiding Elder'].includes(role)) return 2;
    return 3;
  };

  // --- ADD NEW SYSTEM USER ---
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

    // Check if member's phone is already authorized
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
        setupCode: setupCode, // Temporary 6-digit code for first login
        authorizedDevice: null,
        localPin: null,
        status: 'Active',
        createdAt: new Date().toISOString()
      });
      
      showNotification('success', `Account created! Give ${selectedMember.name} this Setup Code: ${setupCode}`);
      setSelectedMemberId(''); setAccessRole(''); setAssignedAssembly('');
      
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to create account. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RESET DEVICE LOCK ---
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

  // --- REVOKE ACCESS ---
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

  const inputStyle = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm text-gray-700 shadow-sm font-bold";
  const labelStyle = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1";

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

        <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tight mb-8">Secure Access Manager</h1>

        {/* ================= USER MANAGEMENT FORM ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-extrabold text-blue-900 flex items-center gap-3 mb-6">
            <UserCog size={24} className="text-blue-600" /> Grant Access
          </h2>
          
          <form onSubmit={handleCreateAccount} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
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
                  className={`${inputStyle} ${['District Minister', 'District Secretary'].includes(accessRole) ? 'bg-gray-100 text-gray-400' : ''}`}
                >
                  <option value="">- Select -</option>
                  <option value="All Assemblies">All Assemblies</option>
                  {assemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="md:col-span-1">
                <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white uppercase tracking-widest text-xs ${isSubmitting ? 'bg-gray-400' : 'bg-slate-900 hover:bg-black'}`}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={16} /> Generate Key</>}
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* ================= AUTHORIZED PERSONNEL TABLE ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-extrabold text-gray-900">Authorized Personnel</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-200">
                  <th className="p-5">Name & Phone</th>
                  <th className="p-5">Role & Tier</th>
                  <th className="p-5">Security Status</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {systemUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="p-5">
                      <div className="font-black text-gray-900 text-base">{user.name}</div>
                      <div className="text-xs font-bold text-gray-500 mt-1 font-mono">{user.phone}</div>
                    </td>
                    <td className="p-5">
                      <div className="font-extrabold text-slate-800 mb-1">{user.role}</div>
                      <span className={`px-2 py-1 rounded font-black text-[10px] uppercase tracking-widest border ${
                        user.tierLevel === 1 ? 'bg-red-50 text-red-700 border-red-200' : 
                        user.tierLevel === 2 ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        Tier {user.tierLevel}
                      </span>
                    </td>
                    <td className="p-5">
                      {user.setupCode ? (
                        <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg inline-block">
                          <span className="text-[10px] font-black text-orange-600 uppercase block">Pending Setup</span>
                          <span className="text-sm font-black font-mono tracking-widest text-orange-800">{user.setupCode}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg inline-flex text-emerald-700">
                          <Lock size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Secured</span>
                        </div>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-center gap-2">
                        {!user.setupCode && (
                          <button onClick={() => handleResetDevice(user.id, user.name)} className="px-3 py-2 bg-gray-50 text-gray-600 hover:bg-orange-100 hover:text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1">
                            <Smartphone size={14}/> Reset
                          </button>
                        )}
                        <button onClick={() => handleRevokeAccess(user.id, user.name, user.role)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Revoke Access">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {systemUsers.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-gray-400 font-bold italic">No accounts created.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}