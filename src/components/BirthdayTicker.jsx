"use client";
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../app/firebase'; // <-- FIXED EXACT PATH HERE
import { Cake, Sparkles, Clock } from 'lucide-react';

export default function BirthdayTicker() {
  const [members, setMembers] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => doc.data()));
    });

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const getActiveCelebrants = () => {
    const celebrants = [];
    
    members.forEach(m => {
      if (!m.dob) return;
      const birthDate = new Date(m.dob);
      if (isNaN(birthDate.getTime())) return;

      const currentYear = now.getFullYear();
      
      const isToday = now.getMonth() === birthDate.getMonth() && now.getDate() === birthDate.getDate();
      
      if (isToday) {
        celebrants.push({ id: m.phone || m.name, name: m.name, status: 'today' });
        return;
      }

      let nextBday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate(), 0, 0, 0);
      
      if (nextBday < now) {
        nextBday.setFullYear(currentYear + 1);
      }

      const diffMs = nextBday - now;
      const hoursLeft = diffMs / (1000 * 60 * 60);

      if (hoursLeft > 0 && hoursLeft <= 24) {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const mMs = diffMs % (1000 * 60 * 60);
        const minute = Math.floor(mMs / (1000 * 60));
        const sMs = mMs % (1000 * 60);
        const s = Math.floor(sMs / 1000);
        
        celebrants.push({ 
          id: m.phone || m.name, 
          name: m.name, 
          status: 'upcoming', 
          countdown: `${h}h ${minute}m ${s}s` 
        });
      }
    });
    
    return celebrants;
  };

  const activeCelebrants = getActiveCelebrants();

  if (activeCelebrants.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 text-white overflow-hidden flex items-center relative border-b border-pink-700 shadow-md z-20 h-10">
      <style>{`
        @keyframes ticker-slide {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .animate-ticker {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker-slide 25s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="w-full">
        <div className="animate-ticker items-center gap-12 px-4 cursor-pointer">
          {activeCelebrants.map((celeb, index) => (
            <div key={`${celeb.id}-${index}`} className="flex items-center gap-3">
              {celeb.status === 'today' ? (
                <div className="flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full font-black tracking-widest text-[11px] uppercase">
                  <Sparkles size={14} className="text-yellow-300 animate-pulse" />
                  Happy Birthday {celeb.name.split(' ')[0]}! 🎉
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-black/20 px-4 py-1 rounded-full font-bold tracking-wider text-[11px] uppercase">
                  <Cake size={14} className="text-pink-200" />
                  {celeb.name.split(' ')[0]}'s Birthday in: 
                  <span className="text-yellow-300 font-mono ml-1 flex items-center gap-1">
                    <Clock size={12}/> {celeb.countdown}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}