"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import BirthdayTicker from './BirthdayTicker'; // <-- THE MISSING KEY IS RIGHT HERE
import { db, auth } from '../app/firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  LayoutDashboard, Users, ClipboardCheck, Target, Flame, 
  Shield, MessageSquare, BookOpen, Download, UserCog, 
  Settings, LogOut, Menu, Cloud, Lock,
  Heart, Mail, HeartHandshake, Coins 
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // --- REAL USER DATA (Now with Tier Level!) ---
  const [currentUser, setCurrentUser] = useState({
    fullName: "Loading...",
    role: "Verifying",
    localPin: null,
    tierLevel: 3 // Default to lowest clearance until proven otherwise
  });

  // --- FIREBASE SECURITY & USER FETCH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login'); 
      } else {
        // Find who this phone belongs to!
        const deviceId = localStorage.getItem('ketiejili_device_id');
        if (deviceId) {
          const q = query(collection(db, 'users'), where('authorizedDevice', '==', deviceId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setCurrentUser({
              // Support both 'name' and 'fullName' depending on how it was saved
              fullName: userData.name || userData.fullName || "Authorized Leader",
              role: userData.role || "District Leader",
              localPin: userData.localPin,
              tierLevel: Number(userData.tierLevel) || 1 // Force it to be a number!
            });
            setIsAuthorized(true); 
          } else {
            // Device not recognized in database, kick them out
            signOut(auth);
            router.push('/login');
          }
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- LISTEN FOR DISTRICT SETTINGS ---
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

  // --- THE AUTO-LOCK WATCHMAN ---
  useEffect(() => {
    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 60000 ms = 60 seconds. 
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
        await signOut(auth);
        router.push('/login');
      } catch (error) {
        alert("Failed to log out. Please check your connection.");
      }
    }
  };

  // --- MASTER LIST OF ALL POSSIBLE LINKS ---
  const navItems = [
    { name: 'Connection Inbox', href: '/inbox', icon: MessageSquare },
    { name: 'Analytics Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Directory', href: '/directory', icon: Users },
    { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { name: 'Discipleship Tracker', href: '/discipleship', icon: Target },
    { name: 'Evangelism & Souls', href: '/evangelism', icon: Flame },
    { name: 'Welfare & Social', href: '/welfare', icon: HeartHandshake },
    { name: 'District Treasury', href: '/treasury', icon: Coins },
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

  // --- THE DOOR FILTERS (SECURITY LOGIC) ---
  const authorizedNavItems = navItems.filter(item => {
    if (currentUser.tierLevel === 1) return true; 
    if (currentUser.tierLevel === 2) {
      const restricted = ['Data Export'];
      return !restricted.includes(item.name);
    }
    if (currentUser.tierLevel === 3) {
      const allowed = ['Directory', 'Attendance', 'Discipleship Tracker'];
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

  // --- LOADING SCREEN ---
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

  // --- THE IDLE LOCK SCREEN OVERLAY (GLASSMORPHISM) ---
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 z-[100] relative overflow-hidden">
        {/* Lock Screen Ambient Glows */}
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

  // --- MAIN LAYOUT RENDER ---
  return (
    <div className="flex h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] overflow-hidden text-white font-sans relative">
      
      {/* GLOBAL AMBIENT BACKGROUND GLOWS */}
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

      {/* --- SIDEBAR (FROSTED GLASS) --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-black/20 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        
        {/* LOGO AREA */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-5 bg-white/5">
          <div className="flex items-center gap-4">
            <img 
              src={globalLogo} 
              alt="Logo" 
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=1e3a8a&color=fff'; }} 
            />
            <div className="overflow-hidden">
              <h1 className="font-black text-white leading-tight tracking-tight text-lg truncate drop-shadow-md" title={globalName}>{globalName}</h1>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest truncate">{globalSlogan}</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-center gap-2 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">System Active</span>
          </div>
        </div>

        {/* TOP NAV LINKS */}
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

        {/* BOTTOM NAV LINKS */}
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
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 mt-3 border border-transparent hover:border-red-500/30 group"
          >
            <LogOut size={18} className="text-red-400/50 group-hover:text-red-400" />
            <span className="tracking-wide">Secure Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* HEADER (FROSTED GLASS) */}
        <header className="h-[72px] bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-blue-200 hover:bg-white/10 hover:text-white rounded-lg md:hidden transition-colors border border-transparent hover:border-white/10">
              <Menu size={24} />
            </button>
            <h2 className="hidden sm:block text-xl font-black text-white tracking-tight drop-shadow-md">COP {globalName}</h2>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-inner">
              <Cloud size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cloud Synced</span>
            </div>
            
            <div className="flex items-center gap-3 bg-black/20 pl-1.5 pr-4 py-1.5 rounded-full border border-white/10 shadow-inner cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400/30">
                {getInitials(currentUser.fullName)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-black text-white leading-none tracking-wide drop-shadow-sm">{currentUser.fullName}</p>
                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1 opacity-80">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* INJECT THE LIVE TICKER HERE */}
        <BirthdayTicker />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col bg-transparent">
          <div className="p-4 sm:p-6 lg:p-8 flex-1">
            {children}
          </div>
          
          {/* BRANDING FOOTER */}
          <footer className="w-full bg-black/40 backdrop-blur-md text-center py-6 mt-auto border-t border-white/10">
            <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest">
              2026 &copy; All rights reserved | Developed by <span className="text-blue-400 drop-shadow-sm">Next Level Pip Systems</span>
            </p>
            <a href="mailto:nextlevelpip@gmail.com" className="text-[10px] font-bold text-blue-300/40 hover:text-blue-300 mt-2 flex items-center justify-center gap-1.5 transition-colors">
              <Mail size={12} /> nextlevelpip@gmail.com
            </a>
          </footer>
        </div>

        {/* WHATSAPP FLOATING BUTTON */}
        <a 
          href="https://wa.me/233541437815" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-[100] bg-[#25D366] hover:bg-[#1ebd57] text-white p-3 sm:px-5 sm:py-3.5 rounded-full font-black tracking-wide shadow-[0_10px_25px_rgba(37,211,102,0.4)] flex items-center gap-2.5 transition-all hover:scale-105 border border-green-400/50"
        >
          {/* Official WhatsApp SVG Icon */}
          <svg className="w-7 h-7 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span className="hidden sm:inline">Need Admin Support?</span>
        </a>

      </main>
    </div>
  );
}