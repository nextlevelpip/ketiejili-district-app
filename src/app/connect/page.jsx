"use client";
import { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { User, Phone, MapPin, Heart, Send, CheckCircle2, Calendar, Users } from 'lucide-react';

export default function ConnectKiosk() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // --- DYNAMIC ASSEMBLIES STATE ---
  // We start with a default so the app doesn't break if the database is empty
  const [assemblies, setAssemblies] = useState(['Central']); 

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    localAssembly: 'Central', 
    gender: '',
    dob: '',
    connectionType: '',
    message: ''
  });

  // --- FETCH ASSEMBLIES FROM FIREBASE ---
  useEffect(() => {
    // This looks for a collection called 'assemblies' and gets their names
    const q = query(collection(db, 'assemblies'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const assemblyList = snapshot.docs.map(doc => doc.data().name);
        setAssemblies(assemblyList);
        
        // Automatically set the default dropdown to the first assembly in the list
        if (assemblyList.length > 0 && formData.localAssembly === 'Central') {
          setFormData(prev => ({ ...prev, localAssembly: assemblyList[0] }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

 const handleChange = (e) => {
    if (e.target.name === 'phone') {
      // 1. Strip out anything that is not a number
      let onlyNums = e.target.value.replace(/[^0-9]/g, '');
      
      // 2. If they type a number that doesn't start with 0, force a 0 at the front!
      if (onlyNums.length > 0 && onlyNums[0] !== '0') {
        onlyNums = '0' + onlyNums;
      }
      
      // 3. Act like a brick wall at exactly 10 digits
      onlyNums = onlyNums.substring(0, 10);
      
      setFormData({ ...formData, phone: onlyNums });
      return;
    }
    
    // For all other fields (name, gender, etc.)
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'pending_connections'), {
        name: formData.fullName, 
        phone: formData.phone,
        localAssembly: formData.localAssembly,
        gender: formData.gender,
        dateOfBirth: formData.dob,
        connectionType: formData.connectionType,
        message: formData.message,
        timestamp: serverTimestamp(),
        status: 'Pending'
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({ 
          fullName: '', phone: '', localAssembly: assemblies[0] || 'Central', 
          gender: '', dob: '', connectionType: '', message: '' 
        });
      }, 4000);

    } catch (error) {
      alert("Submission failed. Please check your connection.");
    }
    setLoading(false);
  };

  // --- SUCCESS SCREEN ---
  if (success) {
    return (
      <div className="min-h-screen bg-[#1e2749] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-[#1e2749] mb-2">Connection Received!</h2>
          <p className="text-gray-600 font-medium">Thank you for connecting with Ketiejili District. God richly bless you.</p>
        </div>
      </div>
    );
  }

  // --- CLASSIC ENTRY SCREEN ---
  return (
    <div className="min-h-screen bg-[#1e2749] flex flex-col items-center pt-10 px-4">
      
      <div className="flex flex-col items-center mb-8">
        <img 
          src="/logo.jpg" 
          alt="Church of Pentecost" 
          className="w-20 h-20 rounded-full mb-4 border-2 border-white shadow-lg object-cover"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=fff&color=1e2749'; }}
        />
        <h1 className="text-2xl font-black text-white tracking-wider uppercase">Ketiejili District</h1>
        <p className="text-sm font-bold text-blue-300">Digital Connect Card</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-t-3xl rounded-b-xl shadow-2xl overflow-hidden mb-10 relative">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500"></div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className="text-gray-400" />
            </div>
            <input 
              type="text" name="fullName" value={formData.fullName} onChange={handleChange} required
              placeholder="Your Full Name"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium text-gray-700 transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone size={18} className="text-gray-400" />
            </div>
            <input 
            type="tel" name="phone" value={formData.phone} onChange={handleChange} required
              pattern="^0[0-9]{9}$"
              maxLength="10"
              title="Phone number must be exactly 10 digits and start with 0"
              placeholder="Phone Number (e.g. 024...)"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium text-gray-700 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* DYNAMIC LOCAL ASSEMBLY DROPDOWN */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MapPin size={18} className="text-gray-400" />
            </div>
            <select 
              name="localAssembly" value={formData.localAssembly} onChange={handleChange} required
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold text-gray-800 transition-all appearance-none"
            >
              {assemblies.map((assemblyName, index) => (
                <option key={index} value={assemblyName}>
                  {assemblyName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users size={16} className="text-gray-400" />
              </div>
              <select 
                name="gender" value={formData.gender} onChange={handleChange} required
                className="w-full pl-10 pr-2 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium text-gray-700 transition-all appearance-none text-sm"
              >
                <option value="" disabled>Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input 
                type="date" name="dob" value={formData.dob} onChange={handleChange} required
                className="w-full pl-10 pr-2 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium text-gray-700 transition-all text-sm"
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Heart size={18} className="text-gray-400" />
            </div>
            <select 
              name="connectionType" value={formData.connectionType} onChange={handleChange} required
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold text-gray-800 transition-all appearance-none"
            >
              <option value="" disabled>- Why are you connecting today? -</option>
              <option value="I am a First-Time Visitor">I am a First-Time Visitor</option>
              <option value="I recently gave my life to Christ">I recently gave my life to Christ</option>
              <option value="I am a member updating my info">I am a member updating my info</option>
              <option value="I need Pastoral Prayer">I need Pastoral Prayer</option>
            </select>
          </div>

          <div className="pt-2">
            <textarea 
              name="message" value={formData.message} onChange={handleChange} rows="3"
              placeholder="Any prayer requests or messages for the Pastor? (Optional)"
              className="w-full p-4 bg-gray-100/70 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium text-sm text-gray-700 transition-all resize-none placeholder:text-gray-400"
            ></textarea>
          </div>

          <div className="pt-4">
            <button 
              type="submit" disabled={loading} 
              className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold tracking-wide py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {loading ? 'SENDING...' : 'SUBMIT CONNECTION'} 
              {!loading && <Send size={18} />}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}