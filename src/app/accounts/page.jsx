"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { UserPlus, UserCog, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

export default function UserAccounts() {
  const [members, setMembers] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  
  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW USER STATES ---
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [accessRole, setAccessRole] = useState('');
  const [assignedAssembly, setAssignedAssembly] = useState('');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    // Fetch all members for the dropdown
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMembers(fetchedMembers);
    });

    // Fetch existing authorized users
    const unsubUsers = onSnapshot(collection(db, 'system_admins'), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSystemUsers(fetchedUsers);
    });

    return () => { unsubMembers(); unsubUsers(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- DYNAMIC DEFINITIONS ---
  const allAssemblies = [...new Set(["Central", ...members.map(m => m.localAssembly).filter(Boolean)])].sort();
  const roles = ["District Minister", "Presiding Elder", "Secretary", "Discipleship Leader"];

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

    // Check if member already has an account
    if (systemUsers.some(user => user.memberId === selectedMember.id)) {
      showNotification('error', 'This member already has a system account.');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'system_admins'), {
        memberId: selectedMember.id,
        fullName: selectedMember.name || 'Unknown',
        phone: selectedMember.phone || 'No Phone',
        accessRole: accessRole,
        assignedAssembly: accessRole === 'District Minister' ? 'All Assemblies' : assignedAssembly,
        status: 'Active',
        dateAdded: new Date().toISOString()
      });
      
      showNotification('success', `Account created successfully for ${selectedMember.name}.`);
      setSelectedMemberId(''); setAccessRole(''); setAssignedAssembly('');
      
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to create account. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- REVOKE ACCESS ---
  const handleRevokeAccess = async (id, name, role) => {
    if (role === 'District Minister' && systemUsers.filter(u => u.accessRole === 'District Minister').length <= 1) {
      showNotification('error', 'SYSTEM HALTED: Cannot delete the final District Minister account.');
      return;
    }

    if (window.confirm(`Revoke system access for ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'system_admins', id));
        showNotification('success', 'Access permanently revoked.');
      } catch (error) {
        showNotification('error', 'Failed to revoke access.');
      }
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm text-gray-700 shadow-sm font-bold";
  const labelStyle = "block text-sm font-bold text-gray-700 mb-2 ml-1";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto relative pb-10">
        
        {/* NOTIFICATION BANNER */}
        {notification.message && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-extrabold">{notification.message}</span>
          </div>
        )}

        <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tight mb-8">Users</h1>

        {/* ================= USER MANAGEMENT FORM ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-extrabold text-blue-900 flex items-center gap-3 mb-6">
            <UserCog size={24} className="text-blue-600" /> System User Management
          </h2>
          
          <form onSubmit={handleCreateAccount} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              <div className="md:col-span-1">
                <label className={labelStyle}>User's Name</label>
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
                  required={accessRole !== 'District Minister'} 
                  disabled={accessRole === 'District Minister'}
                  value={accessRole === 'District Minister' ? 'All Assemblies' : assignedAssembly} 
                  onChange={e => setAssignedAssembly(e.target.value)} 
                  className={`${inputStyle} ${accessRole === 'District Minister' ? 'bg-gray-100 text-gray-400' : ''}`}
                >
                  <option value="">- Select -</option>
                  <option value="All Assemblies">All Assemblies</option>
                  {allAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="md:col-span-1">
                <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> Create Account</>}
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
                <tr className="bg-gray-50 text-gray-500 font-extrabold border-b border-gray-200">
                  <th className="p-5">Name</th>
                  <th className="p-5">Role</th>
                  <th className="p-5">Assigned Assembly</th>
                  <th className="p-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {systemUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="p-5">
                      <div className="font-extrabold text-gray-900">{user.fullName}</div>
                      <div className="text-xs font-bold text-gray-400 mt-0.5">{user.phone}</div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-lg font-black text-xs border ${
                        user.accessRole === 'District Minister' ? 'bg-red-50 text-red-700 border-red-200' : 
                        user.accessRole === 'Presiding Elder' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        user.accessRole === 'Discipleship Leader' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {user.accessRole}
                      </span>
                    </td>
                    <td className="p-5 font-bold text-gray-600">{user.assignedAssembly}</td>
                    <td className="p-5 text-center">
                      <button onClick={() => handleRevokeAccess(user.id, user.fullName, user.accessRole)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Revoke Access">
                        <Trash2 size={16} />
                      </button>
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