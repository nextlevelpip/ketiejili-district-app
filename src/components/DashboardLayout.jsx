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

  const [isLocked, setIsLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [globalName, setGlobalName] = useState('KETIEJILI');
  const [globalSlogan, setGlobalSlogan] = useState('District Command');
  const [globalLogo, setGlobalLogo] = useState('/logo.jpg');

  const [currentUser, setCurrentUser] = useState({
    fullName: "Loading...",
    role: "Verifying",
    localPin: null,
    tierLevel: 3
  });

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
      }, 300000); 
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
    { name: 'Directory & Certificates', href: '/directory', icon: Users }, 
    { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { name: 'Discipleship Tracker', href: '/discipleship', icon: Target },
    { name: 'Evangelism & Souls', href: '/evangelism', icon: Flame },
    { name: 'Visitation Command', href: '/visitation', icon: HeartHandshake },
    { name: 'Welfare & Social', href: '/welfare', icon: HeartHandshake },
    { name: 'Presbytery', href: '/presbytery', icon: Shield },
    { name: 'District Communication Hub', href: '/sms', icon: MessageSquare },
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
      <div className="min-h-screen bg-[#000814] flex items-center justify-center text-[#FFC300] font-black tracking-widest uppercase text-xs">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#FFC300] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,195,0,0.5)]"></div>
          Verifying Security Clearance...
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#001D3D] flex flex-col items-center justify-center p-4 z-[100] relative overflow-hidden">
        <div className="bg-[#000814] border border-[#003566] p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-sm text-center relative z-10">
          <div className="w-16 h-16 bg-[#FFC300]/10 border border-[#FFC300]/30 rounded-full flex items-center justify-center mx-auto mb-6 text-[#FFC300]">
            <Lock size={28} />
          </div>
          <h2 className="text-base font-black text-white mb-1 tracking-widest uppercase">Session Locked</h2>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-8">
            Welcome back, {currentUser.fullName.split(' ')[0]}
          </p>

          {pinError && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-4 animate-pulse">{pinError}</p>}

          <form onSubmit={handleUnlock} className="space-y-6">
            <input 
              type="password" 
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value)}
              placeholder="••••"
              maxLength="4"
              className="w-full px-4 py-4 bg-[#001D3D] border border-[#003566] rounded-xl focus:border-[#FFC300] outline-none font-black text-base text-center tracking-[1em] text-[#FFC300] placeholder:text-white/20 transition-all"
              autoFocus
            />
            <button type="submit" className="w-full bg-[#FFC300] hover:bg-[#FFD60A] text-[#000814] font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all shadow-lg">
              Unlock Dashboard
            </button>
          </form>
          
          <button onClick={handleLogout} className="mt-8 text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors">
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#001D3D] overflow-hidden text-white font-sans relative selection:bg-[#FFC300] selection:text-[#000814]">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#000814]/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION - NAVY & GOLD */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#000814] border-r border-[#003566] flex flex-col transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl`}>
        
        {/* FIXED: Exact 80px height to perfectly match the main header. The horizontal border logic prevents intersection gaps. */}
        <div className="h-[80px] px-6 border-b border-[#003566] bg-[#000814] flex items-center justify-center shrink-0">
          <div className="bg-[#001D3D] border border-[#003566] rounded-lg p-2.5 flex items-center justify-center gap-2 w-full">
            <div className="w-2 h-2 rounded-full bg-[#FFC300] animate-pulse shadow-[0_0_8px_rgba(255,195,0,0.8)]"></div>
            <span className="text-[10px] font-black text-[#FFC300] uppercase tracking-widest">System Active</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar py-5 px-3 space-y-1">
          <div className="px-3 pb-2">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Command Menu</p>
          </div>
          {authorizedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg font-bold transition-all text-xs group
                  ${isActive 
                    ? 'bg-[#FFC300] text-[#000814] shadow-md' 
                    : 'text-white/70 border border-transparent hover:bg-[#001D3D] hover:text-white'}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#000814]' : 'text-white/50 group-hover:text-white'} />
                <span className="tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#003566] space-y-1 bg-[#000814]">
          {authorizedBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold transition-all text-xs group
                  ${isActive 
                    ? 'bg-[#001D3D] border border-[#003566] text-white' 
                    : 'text-white/50 border border-transparent hover:bg-[#001D3D] hover:text-white'}`}
              >
                <Icon size={16} className={isActive ? 'text-[#FFC300]' : 'text-white/40 group-hover:text-white'} />
                <span className="tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 bg-[#001D3D]">
        
        {/* FIXED: Exact 80px height to perfectly intersect with the sidebar */}
        <header className="h-[80px] bg-[#000814] border-b border-[#003566] px-4 sm:px-6 z-20 shadow-sm relative flex items-center justify-between shrink-0">
          
          <div className="flex-1 flex items-center">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-white/70 hover:bg-[#001D3D] hover:text-[#FFC300] rounded-lg md:hidden transition-colors">
              <Menu size={24} />
            </button>
          </div>
          
          <div 
             className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3 cursor-pointer group"
             onClick={() => router.push('/')}
             title="Go to Analytics Dashboard"
          >
             <img 
               src={globalLogo} 
               alt="Logo" 
               className="w-9 h-9 rounded-full object-cover border border-[#FFC300]/50 group-hover:scale-105 transition-transform" 
               onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=COP&background=001D3D&color=FFC300'; }} 
             />
             <div className="text-left hidden sm:block">
               <h1 className="font-black text-white text-base leading-none tracking-widest uppercase">{globalName}</h1>
               <p className="text-[9px] font-bold text-[#FFC300] uppercase tracking-widest mt-0.5">{globalSlogan}</p>
             </div>
          </div>
          
          <div className="flex-1 flex items-center justify-end gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-1.5 bg-[#001D3D] text-[#FFC300] px-2.5 py-1 rounded-md border border-[#003566]">
              <Cloud size={12} className="fill-current" />
              <span className="text-[9px] font-black uppercase tracking-widest">Synced</span>
            </div>
            
            <div className="relative">
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 sm:gap-3 bg-[#001D3D] pl-1 pr-3 py-1 rounded-full border border-[#003566] cursor-pointer hover:border-[#FFC300]/50 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-[#FFC300] text-[#000814] flex items-center justify-center font-black text-[10px]">
                  {getInitials(currentUser.fullName)}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-black text-white leading-none tracking-wide">{currentUser.fullName}</p>
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-0.5">{currentUser.role}</p>
                </div>
              </div>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#000814] border border-[#003566] rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in overflow-hidden">
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-white/70 hover:bg-[#001D3D] hover:text-white transition-colors flex items-center gap-2"
                  >
                    <UserCog size={14}/> Switch User
                  </button>
                  <div className="h-px w-full bg-[#003566] my-1"></div>
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-[#001D3D] transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14}/> Secure Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <BirthdayTicker />

        <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
          <div className="p-4 sm:p-6 flex-1">
            {children}
          </div>
          
          <footer className="w-full text-center py-4 mt-auto border-t border-[#003566] bg-[#000814]">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
              2026 &copy; All rights reserved | Developed by <span className="text-[#FFC300]">Next Level Pip Systems</span>
            </p>
          </footer>
        </div>

      </main>
    </div>
  );
}