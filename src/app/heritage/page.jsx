"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../../components/DashboardLayout";
import { BookOpen, Award, History, Calendar, MapPin, Save, Trash2, CheckCircle2, AlertCircle, Loader2, Milestone, UserCheck } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

export default function DistrictHeritage() {
  const [timeline, setTimeline] = useState([]);
  const [rollOfHonor, setRollOfHonor] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline');

  // --- GENERAL STATES ---
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- TIMELINE FORM STATES ---
  const [eventYear, setEventYear] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState('');

  // --- ROLL OF HONOR FORM STATES ---
  const [ministerName, setMinisterName] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [keyAchievement, setKeyAchievement] = useState('');

  // --- FIREBASE CONNECTION ---
  useEffect(() => {
    const unsubTimeline = onSnapshot(collection(db, 'heritage_timeline'), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort oldest to newest
      fetchedEvents.sort((a, b) => parseInt(a.year) - parseInt(b.year));
      setTimeline(fetchedEvents);
    });

    const unsubRoll = onSnapshot(collection(db, 'heritage_roll'), (snapshot) => {
      const fetchedMinisters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort oldest to newest based on start year
      fetchedMinisters.sort((a, b) => parseInt(a.startYear) - parseInt(b.startYear));
      setRollOfHonor(fetchedMinisters);
    });

    return () => { unsubTimeline(); unsubRoll(); };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 4000);
  };

  // --- SAVE ACTIONS ---
  const handleSaveTimeline = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'heritage_timeline'), {
        year: eventYear,
        title: eventTitle,
        description: eventDescription,
        category: eventCategory,
        timestamp: new Date().toISOString()
      });
      showNotification('success', 'Historical milestone recorded in the archives.');
      setEventYear(''); setEventTitle(''); setEventDescription(''); setEventCategory('');
    } catch (error) {
      showNotification('error', 'Failed to save milestone.');
    } finally { setIsSubmitting(false); }
  };

  const handleSaveMinister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'heritage_roll'), {
        name: ministerName,
        startYear: startYear,
        endYear: endYear || 'Present',
        achievement: keyAchievement,
        timestamp: new Date().toISOString()
      });
      showNotification('success', 'Minister added to the Roll of Honor.');
      setMinisterName(''); setStartYear(''); setEndYear(''); setKeyAchievement('');
    } catch (error) {
      showNotification('error', 'Failed to save minister record.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (collectionName, id) => {
    if (window.confirm('Are you sure you want to permanently delete this historical record?')) {
      await deleteDoc(doc(db, collectionName, id));
      showNotification('success', 'Record permanently removed from archives.');
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none transition-all text-sm text-gray-700 shadow-sm font-bold";
  const labelStyle = "block text-sm font-bold text-gray-600 mb-1.5 ml-1";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto relative pb-10">
        
        {notification.message && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-extrabold">{notification.message}</span>
          </div>
        )}

        <div className="flex items-center gap-4 mb-8">
          <div className="bg-amber-100 p-4 rounded-2xl text-amber-600"><BookOpen size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-amber-950 uppercase tracking-tight">District Heritage</h1>
            <p className="font-bold text-gray-500">The Book of Chronicles for the Ketiejili District</p>
          </div>
        </div>

        {/* 2-TIER TAB NAVIGATION */}
        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-200 pb-5">
          <button onClick={() => setActiveTab('timeline')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'timeline' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
            <History size={18} /> Historical Timeline
          </button>
          <button onClick={() => setActiveTab('roll')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm border-2 ${activeTab === 'roll' ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
            <Award size={18} /> Ministerial Roll of Honor
          </button>
        </div>

        {/* ================= TAB 1: HISTORICAL TIMELINE ================= */}
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            
            {/* ADD MILESTONE FORM */}
            <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit sticky top-6">
              <h2 className="text-lg font-extrabold text-amber-900 flex items-center gap-2 mb-6">
                <Milestone size={20} className="text-amber-500" /> Record Milestone
              </h2>
              <form onSubmit={handleSaveTimeline} className="space-y-5">
                <div>
                  <label className={labelStyle}>Year *</label>
                  <input required type="number" placeholder="e.g. 2010" value={eventYear} onChange={e => setEventYear(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Category *</label>
                  <select required value={eventCategory} onChange={e => setEventCategory(e.target.value)} className={inputStyle}>
                    <option value="">- Select -</option>
                    <option value="District Creation">District Creation</option>
                    <option value="Assembly Founded">Local Assembly Founded</option>
                    <option value="Building Dedication">Building Dedication</option>
                    <option value="Major Crusade">Major Crusade</option>
                    <option value="Other Milestone">Other Milestone</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Headline / Title *</label>
                  <input required type="text" placeholder="e.g. Central Assembly Dedication" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Historical Details</label>
                  <textarea rows="3" placeholder="Brief description of the event..." value={eventDescription} onChange={e => setEventDescription(e.target.value)} className={`${inputStyle} resize-none`}></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white ${isSubmitting ? 'bg-gray-400' : 'bg-amber-600 hover:bg-amber-700'}`}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Archive Event</>}
                </button>
              </form>
            </div>

            {/* TIMELINE DISPLAY */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                {timeline.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <History size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold">The archives are currently empty.</p>
                    <p className="text-sm">Record your first district milestone to begin the timeline.</p>
                  </div>
                ) : (
                  <div className="relative border-l-4 border-amber-100 ml-4 md:ml-6 space-y-8 pb-4">
                    {timeline.map((event, index) => (
                      <div key={event.id} className="relative pl-8 md:pl-10 group">
                        <div className="absolute -left-3.5 top-1 w-6 h-6 bg-amber-500 rounded-full border-4 border-white shadow-sm group-hover:scale-125 transition-transform"></div>
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow relative">
                          <button onClick={() => handleDelete('heritage_timeline', event.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                          
                          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 font-black text-sm rounded-lg mb-2 tracking-wider">
                            {event.year}
                          </span>
                          <h3 className="text-lg font-black text-gray-900">{event.title}</h3>
                          <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block mb-2">{event.category}</span>
                          <p className="text-gray-600 font-medium text-sm leading-relaxed">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MINISTERIAL ROLL OF HONOR ================= */}
        {activeTab === 'roll' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            
            {/* ADD MINISTER FORM */}
            <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-fit sticky top-6">
              <h2 className="text-lg font-extrabold text-blue-900 flex items-center gap-2 mb-6">
                <UserCheck size={20} className="text-blue-500" /> Induct Minister
              </h2>
              <form onSubmit={handleSaveMinister} className="space-y-5">
                <div>
                  <label className={labelStyle}>Full Name & Title *</label>
                  <input required type="text" placeholder="e.g. Pastor John Doe" value={ministerName} onChange={e => setMinisterName(e.target.value)} className={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Start Year *</label>
                    <input required type="number" placeholder="YYYY" value={startYear} onChange={e => setStartYear(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>End Year</label>
                    <input type="text" placeholder="Leave blank if current" value={endYear} onChange={e => setEndYear(e.target.value)} className={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={labelStyle}>Key Legacy / Achievement</label>
                  <textarea rows="3" placeholder="e.g. Pioneered 3 new assemblies..." value={keyAchievement} onChange={e => setKeyAchievement(e.target.value)} className={`${inputStyle} resize-none`}></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 text-white ${isSubmitting ? 'bg-gray-400' : 'bg-blue-900 hover:bg-blue-800'}`}>
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Award size={18} /> Add to Roll</>}
                </button>
              </form>
            </div>

            {/* ROLL OF HONOR DISPLAY */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rollOfHonor.map((minister) => (
                  <div key={minister.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 relative overflow-hidden group">
                    <button onClick={() => handleDelete('heritage_roll', minister.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 z-10"><Trash2 size={16} /></button>
                    
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-900"></div>
                    <Award size={80} className="absolute -bottom-4 -right-4 text-gray-50 opacity-50 transform rotate-12 group-hover:scale-110 transition-transform" />
                    
                    <div className="relative z-10 pl-2">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 font-black text-xs rounded-lg mb-3 tracking-wider border border-blue-100">
                        {minister.startYear} — {minister.endYear || 'Present'}
                      </span>
                      <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">{minister.name}</h3>
                      <p className="text-sm text-gray-600 font-medium italic border-l-2 border-amber-300 pl-3">
                        "{minister.achievement || 'Faithfully served the Ketiejili District.'}"
                      </p>
                    </div>
                  </div>
                ))}
                
                {rollOfHonor.length === 0 && (
                  <div className="md:col-span-2 text-center py-12 text-gray-400 bg-white rounded-3xl border border-gray-100">
                    <Award size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold">The Ministerial Roll of Honor is empty.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}