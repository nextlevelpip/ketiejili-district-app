"use client";
import { useState, useEffect } from 'react';
import DashboardLayout from "../components/DashboardLayout";
import PastorScheduleWidget from '../components/PastorScheduleWidget'; 
import { Users, Flame, Wind, TrendingUp, Shield, Heart, Trophy, Activity, Target, Droplet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db, auth } from './firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// --- REUSABLE WIDGETS ---
const MassiveKpiCard = ({ title, value, icon: Icon, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden`}>
    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className={`${textColor} text-sm font-bold opacity-90 mb-1 uppercase tracking-wider`}>{title}</p>
        <h3 className="text-4xl font-extrabold text-white">{value}</h3>
      </div>
      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><Icon size={28} className="text-white" /></div>
    </div>
    <div className="absolute -bottom-6 -right-6 text-white/10 transform rotate-12"><Icon size={120} /></div>
  </div>
);

const MinistryCard = ({ title, primaryValue, secondaryText, icon: Icon, bgClass, textClass }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-5 transition-transform hover:-translate-y-1">
    <div className={`p-4 rounded-xl ${bgClass} ${textClass}`}>
      <Icon size={26} strokeWidth={2.5} />
    </div>
    <div>
      <p className="text-gray-500 text-sm font-bold">{title}</p>
      {primaryValue !== undefined && <h3 className="text-2xl font-extrabold text-gray-900">{primaryValue}</h3>}
      {secondaryText && <div className="text-sm font-bold mt-1">{secondaryText}</div>}
    </div>
  </div>
);

export default function Home() {
  const [members, setMembers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [userTier, setUserTier] = useState(3); // Default to lowest security tier

  // --- FIREBASE CONNECTION & SECURITY CHECK ---
  useEffect(() => {
    // 1. Fetch Members & Logs
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubLogs = onSnapshot(collection(db, 'attendance_logs'), (snapshot) => {
      setAttendanceLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Current User Tier Level
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const deviceId = localStorage.getItem('ketiejili_device_id');
        if (deviceId) {
          const q = query(collection(db, 'users'), where('authorizedDevice', '==', deviceId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUserTier(Number(userData.tierLevel) || 3);
          }
        }
      }
    });

    return () => { 
      unsubMembers(); 
      unsubLogs(); 
      unsubscribeAuth(); 
    };
  }, []);

  // --- REAL-TIME DATA CALCULATIONS ---
  const totalMembers = members.length;
  const totalSouls = members.filter(m => m.churchRole === 'New Convert').length;
  
  const waterBaptized = members.filter(m => m.waterBaptismStatus === 'Yes').length;
  const spiritBaptized = members.filter(m => m.spiritBaptism === 'Yes').length;

  const elders = members.filter(m => m.churchRole === 'Elder' || m.churchRole === 'Presiding Elder').length;
  const deacons = members.filter(m => m.churchRole === 'Deacon' || m.churchRole === 'Presiding Deacon').length;
  const deaconesses = members.filter(m => m.churchRole === 'Deaconess').length;
  const totalPresbytery = elders + deacons + deaconesses;

  const singles = members.filter(m => m.maritalStatus === 'Single').length;
  const unemployed = members.filter(m => m.occupation && m.occupation.toLowerCase().includes('unemploy')).length;

  const pendingWater = members.filter(m => m.waterBaptismStatus !== 'Yes').length;
  const pendingSpirit = members.filter(m => m.spiritBaptism !== 'Yes').length;

  let totalPresent = 0; let totalAbsent = 0;
  attendanceLogs.forEach(log => {
    Object.values(log.records).forEach(status => {
      if (status === 'Present') totalPresent++;
      if (status === 'Absent') totalAbsent++;
    });
  });

  const getLeaderboard = () => {
    const attendanceCount = {};
    attendanceLogs.forEach(log => {
      Object.entries(log.records).forEach(([memberId, status]) => {
        if (status === 'Present') attendanceCount[memberId] = (attendanceCount[memberId] || 0) + 1;
      });
    });
    return members.map(m => ({ ...m, presentCount: attendanceCount[m.id] || 0 }))
      .filter(m => m.presentCount > 0).sort((a, b) => b.presentCount - a.presentCount).slice(0, 5);
  };
  const leaderboard = getLeaderboard();

  // THE REPAIRED 4-TIER DEMOGRAPHICS ENGINE
  const getDemographics = () => {
    let children = 0; let teens = 0; let youth = 0; let adults = 0;
    const currentYear = new Date().getFullYear();
    members.forEach(m => {
      if (m.dob) {
        const birthYear = parseInt(m.dob.split('-')[0]);
        const age = currentYear - birthYear;
        if (age <= 12) children++; 
        else if (age <= 19) teens++; 
        else if (age <= 35) youth++; 
        else adults++;
      }
    });
    return [
      { name: 'Children (0-12)', value: children || 1, color: '#f59e0b' }, // Amber
      { name: 'Teens (13-19)', value: teens || 1, color: '#10b981' }, // Emerald
      { name: 'Youth (20-35)', value: youth || 1, color: '#3b82f6' }, // Blue
      { name: 'Adults (36+)', value: adults || 1, color: '#8b5cf6' }, // Purple
    ];
  };
  const demoData = getDemographics();

  const getAttendanceTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = {};

    const currentMonthIndex = new Date().getMonth();
    for (let i = 4; i >= 0; i--) {
      let mIndex = currentMonthIndex - i;
      if (mIndex < 0) mIndex += 12; 
      trendMap[months[mIndex]] = { month: months[mIndex], present: 0, absent: 0 };
    }

    attendanceLogs.forEach(log => {
      if (!log.date) return;
      const logDate = new Date(log.date);
      const monthName = months[logDate.getMonth()];

      if (trendMap[monthName]) {
        Object.values(log.records).forEach(status => {
          if (status === 'Present') trendMap[monthName].present++;
          if (status === 'Absent') trendMap[monthName].absent++;
        });
      }
    });

    return Object.values(trendMap);
  };

  const attendanceTrendData = getAttendanceTrend();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
        
        {/* ROW 1: CORE SPIRITUAL METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MassiveKpiCard title="Total Members" value={totalMembers} icon={Users} bgColor="bg-blue-900" textColor="text-blue-100" />
          <MassiveKpiCard title="Total Souls Won" value={totalSouls} icon={Flame} bgColor="bg-emerald-600" textColor="text-emerald-100" />
          <MassiveKpiCard title="Water Baptism" value={waterBaptized} icon={Droplet} bgColor="bg-amber-500" textColor="text-amber-100" />
          <MassiveKpiCard title="Holy Spirit Baptism" value={spiritBaptized} icon={Wind} bgColor="bg-purple-600" textColor="text-purple-100" />
        </div>

        {/* ROW 2: STRUCTURAL & MINISTRY FOCUS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MinistryCard 
            title="Welfare Focus" 
            secondaryText={
              <div className="flex items-center gap-2 mt-1">
                <span className="text-red-600 font-bold">{singles} Singles</span> <span className="text-gray-300">|</span> <span className="text-red-600 font-bold">{unemployed} No Job</span>
              </div>
            }
            icon={Heart} bgClass="bg-red-100" textClass="text-red-500" 
          />
          <MinistryCard 
            title="Discipleship Pipeline" 
            secondaryText={
              <div className="flex items-center gap-2 mt-1">
                <span className="text-blue-600 font-bold">{pendingWater} Needs Water</span> <span className="text-gray-300">|</span> <span className="text-purple-600 font-bold">{pendingSpirit} Needs Spirit</span>
              </div>
            }
            icon={Target} bgClass="bg-blue-100" textClass="text-blue-500" 
          />
          <MinistryCard 
            title="Presbytery" 
            primaryValue={totalPresbytery}
            secondaryText={
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-gray-600 text-xs font-bold">Elder: <span className="text-indigo-600 text-sm">{elders}</span></span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600 text-xs font-bold">Deac: <span className="text-indigo-600 text-sm">{deacons}</span></span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600 text-xs font-bold">D'ness: <span className="text-indigo-600 text-sm">{deaconesses}</span></span>
              </div>
            }
            icon={Shield} bgClass="bg-indigo-100" textClass="text-indigo-600" 
          />
        </div>

        {/* ROW 3: CHARTS & DYNAMIC ITINERARY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Attendance Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <TrendingUp className="text-blue-500" size={20} /> Attendance & Faithfulness Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={attendanceTrendData}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/><stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="present" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" name="Total Present" />
                  <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAbsent)" name="Total Absent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DYNAMIC 3RD COLUMN: Shows Itinerary for Tier 1, Demographic Pie for others */}
          <div className="lg:col-span-1 h-[400px]">
            {userTier === 1 ? (
              <div className="h-full animate-fade-in">
                <PastorScheduleWidget userTier={userTier} />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full animate-fade-in">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Activity className="text-blue-500" size={20} /> Age Demographics
                </h3>
                <div className="flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={demoData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {demoData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-auto pt-4 border-t border-gray-50">
                  {demoData.map(demo => (
                    <div key={demo.name} className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: demo.color }}></div>
                      {demo.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ROW 4: LEADERBOARD & DEMOGRAPHICS (For Tier 1 only, since Tier 2/3 sees Demographics in Row 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${userTier === 1 ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8`}>
            <h3 className="text-xl font-extrabold text-amber-500 flex items-center gap-3 mb-6"><Trophy size={24} strokeWidth={2.5} /> Faithful Servants Leaderboard</h3>
            {leaderboard.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leaderboard.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-black flex items-center justify-center shadow-md">#{index + 1}</div>
                    <div>
                      <h4 className="font-extrabold text-gray-900">{member.name}</h4>
                      <p className="text-xs font-bold text-gray-500">{member.localAssembly} • {member.churchRole}</p>
                    </div>
                    <div className="ml-auto text-center">
                      <div className="text-xl font-black text-emerald-600">{member.presentCount}</div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Services</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm font-bold bg-gray-50 p-6 rounded-xl border border-gray-100 text-center">No attendance data has been recorded yet.</p>
            )}
          </div>

          {/* Show Demographics down here for Tier 1 so they don't miss out on it! */}
          {userTier === 1 && (
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full animate-fade-in">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Activity className="text-blue-500" size={20} /> Age Demographics
              </h3>
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={demoData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {demoData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-auto pt-4 border-t border-gray-50">
                {demoData.map(demo => (
                  <div key={demo.name} className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: demo.color }}></div>
                    {demo.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}