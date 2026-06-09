"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import BirthdayTicker from './BirthdayTicker'; 
import { db, auth } from '../app/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, Users, ClipboardCheck, Target, Flame, 
  Shield, MessageSquare, BookOpen, Download, UserCog, 
  Settings, LogOut, Menu, Cloud, Lock,
  Heart, HeartHandshake 
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false); 
  const router = useRouter();
  const pathname = usePathname();

  // --- THE WATCHMAN STATES ---
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [pinError, setPinError] = useState('');

  // --- GLOBAL BRANDING STATES ---
  const [globalName, setGlobalName] = useState('KETIEJILI');
  const [globalSlogan, setGlobalSlogan] = useState('District Command');
  const [globalLogo, setGlobalLogo] = useState('/logo.jpg');

  const [currentUser, setCurrentUser] = useState({
    fullName: "Loading...",
    role: "Verifying",
    localPin: null,
    tierLevel: 3
  });

  // --- FIREBASE SECURITY & USER FETCH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login'); 
      } else {
        const deviceId = localStorage.getItem('ketiejili_device_id');
        if (deviceId) {
          const q = query(collection(db, 'users'), where('authorizedDevice', '==', deviceId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setCurrentUser({
              fullName: userData.name || userData.fullName || "Authorized Leader",
              role: userData.role || "District Leader",
              localPin: userData.localPin,
              tierLevel: Number(userData.tierLevel) || 1
            });
            setIsAuthorized(true); 

            if (!sessionStorage.getItem('session_logged')) {
              try {
                await addDoc(collection(db, 'login_history'), {
                  name: userData.name || userData.fullName || "Authorized Leader",
                  role: userData.role || "District Leader",
                  tierLevel: Number(userData.tierLevel) || 1,
                  loginTime: new Date().toISOString(),
                  userAgent: window.navigator.userAgent,
                  activity: "Logged into Command Centre"
                });
                sessionStorage.setItem('session_logged', 'true');
              } catch (e) {
                console.error("Audit log failed silently.", e);
              }
            }

          } else {
            signOut(auth);
            router.push('/login');
          }
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.districtName) setGlobalName(data.districtName);
        if (data.districtSlogan) setGlobalSlogan(data.districtSlogan);
        if (data.logoBase64) setGlobalLogo(data.logoBase64);
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isAuthorized) setIsLocked(true);
      }, 60000); 
    };

    if (!isLocked) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keypress', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
      window.addEventListener('touchstart', resetTimer);
      resetTimer();
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [isAuthorized, isLocked]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (unlockPin === currentUser.localPin) {
      setIsLocked(false);
      setUnlockPin('');
      setPinError('');
    } else {
      setPinError('Incorrect PIN');
    }
  };

  const getInitials = (name) => {
    if (!name || name === "Loading...") return "PK";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to securely log out?")) {
      try {
        sessionStorage.removeItem('session_logged'); 
        await signOut(auth);
        router.push('/login');
      } catch (error) {
        alert("Failed to log out. Please check your connection.");
      }
    }
  };

  const navItems = [
    { name: 'Connection Inbox', href: '/inbox', icon: MessageSquare },
    { name: 'Analytics Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Directory & Certificates', href: '/directory', icon: Users }, // UPDATED LABEL
    { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { name: 'Discipleship Tracker', href: '/discipleship', icon: Target },
    { name: 'Evangelism & Souls', href: '/evangelism', icon: Flame },
    { name: 'Visitation Command', href: '/visitation', icon: HeartHandshake },
    { name: 'Welfare & Social', href: '/welfare', icon: HeartHandshake },
    { name: 'Leaders Council', href: '/presbytery', icon: Shield },
    { name: 'Bulk SMS Contacts', href: '/sms', icon: MessageSquare },
    { name: 'District Heritage', href: '/heritage', icon: BookOpen },
    { name: 'Data Export', href: '/export', icon: Download },
  ];

  const bottomNavItems = [
    { name: 'Pastoral Prayers', href: "/prayers", icon: Heart },
    { name: 'User Accounts', href: '/accounts', icon: UserCog },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const authorizedNavItems = navItems.filter(item => {
    if (currentUser.tierLevel === 1) return true; 
    if (currentUser.tierLevel === 2) {
      const restricted = ['Data Export'];
      return !restricted.includes(item.name);
    }
    if (currentUser.tierLevel === 3) {
      const allowed = ['Directory & Certificates', 'Attendance', 'Discipleship Tracker'];
      return allowed.includes(item.name);
    }
    return false;
  });

  const authorizedBottomNavItems = bottomNavItems.filter(item => {
    if (currentUser.tierLevel === 1) return true; 
    if (currentUser.tierLevel === 2) {
      const restricted = ['User Accounts', 'Settings'];
      return !restricted.includes(item.name);
    }
    if (currentUser.tierLevel === 3) return false; 
    return false;
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-blue-300 font-black tracking-widest uppercase text-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          Verifying Security Clearance...
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 z-[100] relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-sm text-center relative z-10">
          <div className="w-20 h-20 bg-blue-500/20 border border-blue-400/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Lock size={36} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Session Locked</h2>
          <p className="text-xs font-bold text-blue-200/60 uppercase tracking-widest mb-8">
            Welcome back, {currentUser.fullName.split(' ')[0]}
          </p>

          {pinError && <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-4 animate-pulse">{pinError}</p>}

          <form onSubmit={handleUnlock} className="space-y-6">
            <input 
              type="password" 
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value)}
              placeholder="••••"
              maxLength="4"
              className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-black text-4xl text-center tracking-[1em] text-white placeholder:text-white/20 transition-all shadow-inner"
              autoFocus
            />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/50">
              Unlock Dashboard
            </button>
          </form>
          
          <button onClick={handleLogout} className="mt-8 text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors">
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] overflow-hidden text-white font-sans relative">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full"></div>
      </div>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-md transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-black/20 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        
        {/* BRANDING AREA - NO LONGER CONTAINS THE LOGO, ONLY SYSTEM STATUS */}
        <div className="p-6 border-b border-white/10 bg-white/5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-center gap-2 shadow-inner w-full">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <span className="text-xs font-black text-emerald-200 uppercase tracking-widest">System Active</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar py-6 px-4 space-y-1.5">
          <div className="px-3 pb-3">
            <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest">Command Menu</p>
          </div>
          {authorizedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all text-sm group
                  ${isActive 
                    ? 'bg-blue-600/20 border border-blue-400/30 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                    : 'text-blue-100/70 border border-transparent hover:bg-white/5 hover:text-white hover:border-white/10'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-400' : 'text-blue-300/50 group-hover:text-blue-300'} />
                <span className="tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1.5 bg-black/20">
          {authorizedBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm group
                  ${isActive 
                    ? 'bg-white/10 border border-white/20 text-white shadow-sm' 
                    : 'text-blue-200/50 border border-transparent hover:bg-white/5 hover:text-blue-100'}`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-blue-300/40 group-hover:text-blue-200'} />
                <span className="tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* RE-ALIGNED HEADER: COMPLETELY CENTERED BRANDING */}
        <header className="min-h-[80px] bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 z-20 shadow-sm relative flex items-center justify-between">
          
          {/* Left: Mobile Menu Button */}
          <div className="flex-1 flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-blue-200 hover:bg-white/10 hover:text-white rounded-lg md:hidden transition-colors">
              <Menu size={28} />
            </button>
          </div>
          
          {/* Center: District Logo and Name (Absolutely Centered) */}
          <div 
             className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 cursor-pointer group"
             onClick={() => router.push('/')}
             title="Go to Analytics Dashboard"
          >
             <img 
               src={globalLogo} 
               alt="Logo" 
               className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform" 
               onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=1e3a8a&color=fff'; }} 
             />
             <div className="text-center sm:text-left">
               <h1 className="font-black text-white text-base sm:text-lg leading-tight tracking-tight drop-shadow-md whitespace-nowrap">COP {globalName}</h1>
               <p className="text-[9px] sm:text-[10px] font-black text-blue-400 uppercase tracking-widest">{globalSlogan}</p>
             </div>
          </div>
          
          {/* Right: User Profile & Cloud Sync */}
          <div className="flex-1 flex items-center justify-end gap-3 sm:gap-5">
            <div className="hidden lg:flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-inner">
              <Cloud size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">Synced</span>
            </div>
            
            <div className="relative">
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 sm:gap-3 bg-black/20 pl-1 sm:pl-1.5 pr-2 sm:pr-4 py-1 sm:py-1.5 rounded-full border border-white/10 shadow-inner cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400/30">
                  {getInitials(currentUser.fullName)}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-black text-white leading-none tracking-wide drop-shadow-sm">{currentUser.fullName}</p>
                  <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest mt-1 opacity-80">{currentUser.role}</p>
                </div>
              </div>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2 z-50 animate-fade-in overflow-hidden">
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                    className="w-full text-left px-5 py-3 text-sm font-bold text-blue-200 hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    <UserCog size={16}/> Switch User
                  </button>
                  <div className="h-px w-full bg-white/10 my-1"></div>
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                    className="w-full text-left px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                  >
                    <LogOut size={16}/> Secure Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <BirthdayTicker />

        <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col bg-transparent">
          <div className="p-4 sm:p-6 lg:p-8 flex-1">
            {children}
          </div>
          
          <footer className="w-full bg-black/40 backdrop-blur-md text-center py-6 mt-auto border-t border-white/10">
            <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest">
              2026 &copy; All rights reserved | Developed by <span className="text-blue-400 drop-shadow-sm">Next Level Pip Systems</span>
            </p>
          </footer>
        </div>

      </main>
    </div>
  );
}