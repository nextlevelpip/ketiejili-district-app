"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { Users, UserPlus, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Edit3, Save, Flame } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function Directory() {
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('register'); // Defaulting to register tab based on your screenshot
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FORM STATES ---
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(''); 
  const [gender, setGender] = useState('');
  
  const [localAssembly, setLocalAssembly] = useState('Central');
  const [customAssembly, setCustomAssembly] = useState('');
  
  const [group, setGroup] = useState('New Convert Class'); 
  const [customGroup, setCustomGroup] = useState('');
  
  const [occupation, setOccupation] = useState('');
  const [churchRole, setChurchRole] = useState('Member');
  
  const [soulWinner, setSoulWinner] = useState('');
  const [waterBaptized, setWaterBaptized] = useState('');
  
  const [maritalStatus, setMaritalStatus] = useState('');
  const [childrenCount, setChildrenCount] = useState('');
  
  const [spiritBaptism, setSpiritBaptism] = useState('');
  const [hasDisability, setHasDisability] = useState('No');
  const [disabilityType, setDisabilityType] = useState('');

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fRole, setFRole] = useState('All Roles');
  const [fAssem, setFAssem] = useState('All Assemblies');
  const [fGen, setFGen] = useState('All Genders');
  const [fDemo, setFDemo] = useState('All Ages');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(fetched.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    });
    return () => unsub();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const resetForm = () => {
    setEditingId(null); setName(''); setPhone(''); setDob(''); setGender('');
    setLocalAssembly('Central'); setCustomAssembly('');
    setGroup('New Convert Class'); setCustomGroup('');
    setOccupation(''); setChurchRole('Member'); setSoulWinner(''); setWaterBaptized('');
    setMaritalStatus(''); setChildrenCount(''); setSpiritBaptism('');
    setHasDisability('No'); setDisabilityType('');
  };

  // --- STRICT PHONE VALIDATION ---
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); // Strip all non-numbers
    
    // If they start typing without a zero, instantly add it for them!
    if (val.length > 0 && val[0] !== '0') {
      val = '0' + val;
    }
    
    setPhone(val.slice(0, 10)); // Lock strictly to 10 digits
  };

 const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // SECURITY GATE 1: Final Phone Validation
    if (phone.length !== 10) {
      showNotification('error', 'Phone number must be exactly 10 digits.');
      setIsSubmitting(false);
      return;
    }

    // SECURITY GATE 2: The Duplicate Shield (Name + Phone + DOB + Gender)
    const isDuplicate = members.some(m => 
      m.id !== editingId && // Ensure we don't block ourselves when editing a record!
      (m.name || '').toLowerCase().trim() === name.toLowerCase().trim() && 
      m.phone === phone && 
      m.dob === dob && 
      m.gender === gender
    );

    if (isDuplicate) {
      showNotification('error', 'SYSTEM HALTED: A member with this exact Name, Phone, DOB, and Gender already exists!');
      setIsSubmitting(false);
      return;
    }

    const finalAssembly = localAssembly === 'Add Custom Assembly' ? customAssembly : localAssembly;
    const finalGroup = group === 'Add Custom Group' ? customGroup : group;

    const data = { 
        name, phone, dob, gender, 
        localAssembly: finalAssembly, 
        group: finalGroup, 
        occupation, churchRole, 
        soulWinner: churchRole === 'New Convert' ? soulWinner : '',
        waterBaptized: churchRole === 'New Convert' ? waterBaptized : '',
        maritalStatus, 
        childrenCount: maritalStatus && maritalStatus !== 'Single' ? childrenCount : 0,
        spiritBaptism, hasDisability, 
        disabilityType: hasDisability === 'Yes' ? disabilityType : '' 
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'members', editingId), data);
        showNotification('success', 'Record Updated Successfully.');
      } else {
        await addDoc(collection(db, 'members'), { ...data, dateAdded: new Date().toISOString() });
        showNotification('success', 'Member Registered Successfully.');
      }
      resetForm(); 
      setActiveTab('directory');
    } catch (err) {
      showNotification('error', 'Critical Error: Data Not Saved.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (m) => {
    setEditingId(m.id); setName(m.name || ''); setPhone(m.phone || ''); 
    setDob(m.dob || ''); setGender(m.gender || ''); setOccupation(m.occupation || '');
    
    if (m.localAssembly === 'Central') { setLocalAssembly('Central'); }
    else { setLocalAssembly('Add Custom Assembly'); setCustomAssembly(m.localAssembly || ''); }

    if (m.group === 'New Convert Class') { setGroup('New Convert Class'); }
    else { setGroup('Add Custom Group'); setCustomGroup(m.group || ''); }

    setChurchRole(m.churchRole || 'Member'); setSoulWinner(m.soulWinner || ''); setWaterBaptized(m.waterBaptized || '');
    setMaritalStatus(m.maritalStatus || ''); setChildrenCount(m.childrenCount || ''); 
    setSpiritBaptism(m.spiritBaptism || ''); setHasDisability(m.hasDisability || 'No'); setDisabilityType(m.disabilityType || '');
    setActiveTab('register');
  };

  const handleDelete = async (id, mName) => {
    if (window.confirm(`Delete ${mName} from the database?`)) {
      try {
        await deleteDoc(doc(db, 'members', id));
        showNotification('success', 'Member Purged.');
      } catch (err) { showNotification('error', 'Purge Failed.'); }
    }
  };

  const filtered = members.filter(m => {
    const age = calculateAge(m.dob);
    const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.phone || '').includes(searchTerm);
    const matchesAssem = fAssem === 'All Assemblies' || m.localAssembly === fAssem;
    const matchesRole = fRole === 'All Roles' || m.churchRole === fRole;
    const matchesGen = fGen === 'All Genders' || m.gender === fGen;
    
    let matchesDemo = true;
    if (fDemo === '< 13') matchesDemo = age !== null && age < 13;
    else if (fDemo === '13 - 35') matchesDemo = age !== null && age >= 13 && age <= 35;
    else if (fDemo === '> 35') matchesDemo = age !== null && age > 35;
    
    return matchesSearch && matchesAssem && matchesRole && matchesGen && matchesDemo;
  });

  const uniqueAssemblies = [...new Set(members.map(m => m.localAssembly).filter(Boolean))];
  
  // ADDED MINISTERS WIVES AND PRESIDING ELDERS WIVES
  const churchRoles = ["Member", "New Convert", "Elder", "Deacon", "Deaconess", "District Minister", "District Minister's Wife", "Presiding Elder", "Presiding", "Presiding Deacon"];
  const disabilityTypes = ["Visually Impairment", "Deaf/Hard of Hearing", "Speech Impairment", "Physical/ Mobility Dis'ties", "Autism Spectrum Disorders", "Albinism", "Epilepsy", "Cerebral Palsy", "Mental Health Conditions", "Multiple Dis'ties", "Other Dis'ties"];

  // UPDATED STYLES TO PERFECTLY MATCH YOUR SCREENSHOT
  const inputStyle = "w-full p-3.5 bg-gray-50/50 border border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl font-bold text-gray-800 outline-none transition-all text-sm";
  const labelStyle = "text-[10px] font-black text-gray-400 uppercase ml-1 mb-2 block tracking-widest";

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {notification.message && (
          <div className={`fixed top-10 right-10 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            {notification.message}
          </div>
        )}

        {/* TAB BUTTONS (Styled exactly like the screenshot) */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <button onClick={() => { resetForm(); setActiveTab('register'); }} className={`px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 transition-all ${activeTab === 'register' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 hover:bg-gray-50 border border-gray-100'}`}>
            <UserPlus size={18}/> {editingId ? 'Edit Record' : 'Register Member'}
          </button>
          <button onClick={() => setActiveTab('directory')} className={`px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 transition-all ${activeTab === 'directory' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
            <Users size={18}/> Member Directory ({members.length})
          </button>
        </div>

        {activeTab === 'register' ? (
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 max-w-5xl mx-auto">
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* ROW 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelStyle}>Full Name *</label>
                  <input required placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Phone Number *</label>
                  <input 
                    required 
                    type="tel" 
                    placeholder="024XXXXXXX" 
                    value={phone} 
                    onChange={handlePhoneChange} 
                    className={`${inputStyle} tracking-widest`} 
                  />
                </div>
                <div>
                  <label className={labelStyle}>Date of Birth *</label>
                  <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputStyle} />
                </div>
              </div>

              {/* ROW 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelStyle}>Gender *</label>
                  <select required value={gender} onChange={e => setGender(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option><option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Local Assembly *</label>
                  <select required value={localAssembly} onChange={e => setLocalAssembly(e.target.value)} className={inputStyle}>
                    <option value="Central">Central</option>
                    <option value="Add Custom Assembly">+ Add Custom Assembly</option>
                  </select>
                  {localAssembly === 'Add Custom Assembly' && (
                    <input required autoFocus placeholder="Type Custom Assembly" value={customAssembly} onChange={e => setCustomAssembly(e.target.value)} className={`mt-2 ${inputStyle} border-blue-200 bg-blue-50`} />
                  )}
                </div>
                <div>
                  <label className={labelStyle}>Discipleship Group</label>
                  <select value={group} onChange={e => setGroup(e.target.value)} className={inputStyle}>
                    <option value="New Convert Class">New Convert Class</option>
                    <option value="Add Custom Group">+ Add Custom Group</option>
                  </select>
                  {group === 'Add Custom Group' && (
                    <input required autoFocus placeholder="Type Custom Group" value={customGroup} onChange={e => setCustomGroup(e.target.value)} className={`mt-2 ${inputStyle} border-blue-200 bg-blue-50`} />
                  )}
                </div>
              </div>

              {/* ROW 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className={labelStyle}>Occupation</label>
                  <input placeholder="e.g. Teacher, Unemployed" value={occupation} onChange={e => setOccupation(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Church Status / Role *</label>
                  <select required value={churchRole} onChange={e => setChurchRole(e.target.value)} className={inputStyle}>
                    {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* CONDITIONAL: New Convert Block */}
              {churchRole === 'New Convert' && (
                <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in mt-2">
                  <div>
                    <label className={`${labelStyle} text-orange-800 flex items-center gap-1`}><Flame size={12}/> Who won this soul?</label>
                    <select value={soulWinner} onChange={e => setSoulWinner(e.target.value)} className={`${inputStyle} border-orange-200 bg-white`}>
                      <option value="">- Select Soul Winner -</option>
                      <option value="General Church">General Church</option>
                      <option value="Personal Repentance">Personal Repentance</option>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`${labelStyle} text-orange-800`}>Water Baptized?</label>
                    <select value={waterBaptized} onChange={e => setWaterBaptized(e.target.value)} className={`${inputStyle} border-orange-200 bg-white`}>
                      <option value="">- Select -</option><option value="Yes">Yes</option><option value="No">No</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ROW 4 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div>
                  <label className={labelStyle}>Marital Status *</label>
                  <select required value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option>
                  </select>
                </div>
                {(maritalStatus === 'Married' || maritalStatus === 'Widowed') && (
                  <div className="animate-fade-in">
                    <label className={labelStyle}>How many children?</label>
                    <input type="number" min="0" placeholder="Accepts 0" value={childrenCount} onChange={e => setChildrenCount(e.target.value)} className={inputStyle} />
                  </div>
                )}
                <div>
                  <label className={labelStyle}>Holy Spirit Baptism?</label>
                  <select value={spiritBaptism} onChange={e => setSpiritBaptism(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option><option value="Yes">Yes</option><option value="No">No</option>
                  </select>
                </div>
              </div>

              {/* ROW 5 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 border border-gray-100 p-6 rounded-2xl mt-4">
                <div>
                  <label className={labelStyle}>Any Disabilities?</label>
                  <select value={hasDisability} onChange={e => setHasDisability(e.target.value)} className={`${inputStyle} bg-white`}>
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
                {hasDisability === 'Yes' && (
                  <div className="md:col-span-2 animate-fade-in">
                    <label className={labelStyle}>Specific Condition</label>
                    <select required value={disabilityType} onChange={e => setDisabilityType(e.target.value)} className={`${inputStyle} bg-white`}>
                      <option value="">- Select Type -</option>
                      {disabilityTypes.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-3">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18}/> {editingId ? 'Update District Record' : 'Save Record'}</>}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* SEARCH & FILTERS */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-300" size={16}/>
                <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-blue-500" />
              </div>
              <select value={fRole} onChange={e => setFRole(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500">
                <option value="All Roles">All Roles</option>
                {churchRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={fAssem} onChange={e => setFAssem(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500">
                <option value="All Assemblies">All Assemblies</option>
                {uniqueAssemblies.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={fGen} onChange={e => setFGen(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500">
                <option value="All Genders">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <select value={fDemo} onChange={e => setFDemo(e.target.value)} className="p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500">
                <option value="All Ages">All Ages</option>
                <option value="< 13">Children (&lt; 13)</option>
                <option value="13 - 35">Youth (13 - 35)</option>
                <option value="> 35">Adults (&gt; 35)</option>
              </select>
            </div>

            {/* DIRECTORY TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-5">Member Profile</th>
                      <th className="p-5">Assembly & Group</th>
                      <th className="p-5">Gender & Age</th>
                      <th className="p-5">Contact</th>
                      <th className="p-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(m => {
                      const age = calculateAge(m.dob);
                      return (
                        <tr key={m.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="p-5">
                            <div className="font-black text-gray-900">{m.name}</div>
                            <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block mt-1 border border-blue-100">{m.churchRole}</div>
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-emerald-700">{m.localAssembly}</div>
                            <div className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">{m.group || 'N/A'}</div>
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-gray-700">{m.gender}</div>
                            <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1 border ${age !== null && age < 13 ? 'bg-amber-50 text-amber-700 border-amber-200' : age !== null && age <= 35 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                              {age !== null ? `${age} yrs` : 'No DOB'}
                            </div>
                          </td>
                          <td className="p-5 font-mono font-bold text-gray-600">{m.phone}</td>
                          <td className="p-5">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEdit(m)} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"><Edit3 size={16}/></button>
                              <button onClick={() => handleDelete(m.id, m.name)} className="p-2 text-red-500 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold italic">No records match your filters.</td></tr>}
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