"use client";
import { useState, useEffect } from 'react';
import { CalendarDays, Clock, MapPin, Plus, X, Trash2, Loader2 } from 'lucide-react';
import { db } from '../app/firebase'; 
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

export default function PastorScheduleWidget({ userTier }) {
  const [events, setEvents] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('Service'); // Service, Meeting, Visitation, Personal

  useEffect(() => {
    // 1. Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 2. Get the date 7 days from now
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // 3. Query Firebase for events happening between today and next week
    const q = query(
      collection(db, 'pastor_schedule'), 
      where('date', '>=', todayStr),
      where('date', '<=', nextWeekStr)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      
      // Sort them chronologically by date and time in memory
      fetchedEvents.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateA - dateB;
      });

      setEvents(fetchedEvents);
    });

    return () => unsub();
  }, []);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'pastor_schedule'), {
        title, date, time, location, type,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setTitle(''); setDate(''); setTime(''); setLocation(''); setType('Service');
    } catch (error) {
      alert("Failed to add event to schedule.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id, eventTitle) => {
    if (window.confirm(`Remove "${eventTitle}" from the schedule?`)) {
      await deleteDoc(doc(db, 'pastor_schedule', id));
    }
  };

  const formatDisplayDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateObj = new Date(dateString);
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    return dateObj.toLocaleDateString('en-US', options);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight leading-tight">Pastor's Itinerary</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next 7 Days</p>
          </div>
        </div>
        
        {/* Only allow Tier 1 (District Minister/Sec) to add events */}
        {userTier === 1 && !isAdding && (
          <button onClick={() => setIsAdding(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white" title="Add Activity">
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* INLINE ADD FORM WITH HIGH-CONTRAST READABILITY */}
      {isAdding && (
        <form onSubmit={handleAddEvent} className="p-5 bg-slate-50 border-b border-gray-200 animate-fade-in space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">New Activity</span>
            <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <input 
            required 
            type="text"
            placeholder="Activity Title (e.g. Area Presbytery Meeting)" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="w-full px-3.5 py-2.5 text-xs font-bold text-[#001D3D] placeholder:text-slate-400 bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" 
          />
          
          <div className="grid grid-cols-2 gap-2.5">
            <input 
              required 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full px-3.5 py-2.5 text-xs font-bold text-[#001D3D] bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm cursor-pointer" 
            />
            <input 
              required 
              type="time" 
              value={time} 
              onChange={e => setTime(e.target.value)} 
              className="w-full px-3.5 py-2.5 text-xs font-bold text-[#001D3D] bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm cursor-pointer" 
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2.5">
            <select 
              value={type} 
              onChange={e => setType(e.target.value)} 
              className="col-span-1 px-3 py-2.5 text-xs font-bold text-[#001D3D] bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm cursor-pointer"
            >
              <option value="Service" className="text-[#001D3D]">Service</option>
              <option value="Meeting" className="text-[#001D3D]">Meeting</option>
              <option value="Visitation" className="text-[#001D3D]">Visitation</option>
              <option value="Personal" className="text-[#001D3D]">Personal</option>
            </select>
            <input 
              type="text"
              placeholder="Location (Optional)" 
              value={location} 
              onChange={e => setLocation(e.target.value)} 
              className="col-span-2 px-3.5 py-2.5 text-xs font-bold text-[#001D3D] placeholder:text-slate-400 bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 mt-2 transition-all shadow-md active:scale-[0.99]"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Save to Schedule"}
          </button>
        </form>
      )}

      {/* EVENT LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {events.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full">
            <CalendarDays size={32} className="text-slate-300 mb-3" />
            <p className="text-xs font-bold text-slate-500">No activities scheduled for the next 7 days.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((ev) => (
              <div key={ev.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors group relative overflow-hidden shadow-sm">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  ev.type === 'Service' ? 'bg-emerald-500' : 
                  ev.type === 'Meeting' ? 'bg-blue-600' : 
                  ev.type === 'Visitation' ? 'bg-purple-500' : 'bg-amber-500'
                }`}></div>
                
                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-snug">{ev.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-bold text-slate-600">
                      <span className="flex items-center gap-1 text-slate-800"><CalendarDays size={13} className="text-blue-600"/> {formatDisplayDate(ev.date)}</span>
                      <span className="flex items-center gap-1"><Clock size={13} className="text-amber-500"/> {ev.time}</span>
                      {ev.location && <span className="flex items-center gap-1"><MapPin size={13} className="text-emerald-600"/> {ev.location}</span>}
                    </div>
                  </div>
                  
                  {userTier === 1 && (
                    <button 
                      onClick={() => handleDelete(ev.id, ev.title)} 
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                      title="Delete activity"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}