'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  CreditCard,
  Ticket,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  User,
  DollarSign,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(profileData);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: DollarSign, label: 'Earnings', href: '/dashboard/earnings' },
    { icon: Users, label: 'Active Users', href: '/dashboard/users' },
    { icon: FileText, label: 'Survey', href: '/dashboard/survey' },
    { icon: Package, label: 'Plans & Packages', href: '/dashboard/plans' },
    { icon: CreditCard, label: 'Transactions', href: '/dashboard/transactions' },
    { icon: Ticket, label: 'Vouchers', href: '/dashboard/vouchers' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-marketplace-bg">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-marketplace-sidebar transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-marketplace-border">
            <h1 className="text-2xl font-bold text-primary">QTRO ISP</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-marketplace-text-muted hover:text-marketplace-text"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Menu */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <div className="text-xs font-semibold text-marketplace-text-muted uppercase mb-3">Main</div>
            {menuItems.slice(0, 3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  pathname === item.href
                    ? 'bg-primary text-white'
                    : 'text-marketplace-text-muted hover:bg-marketplace-hover hover:text-marketplace-text'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="text-xs font-semibold text-marketplace-text-muted uppercase mb-3 mt-6">
              Management
            </div>
            {menuItems.slice(3, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  pathname === item.href
                    ? 'bg-primary text-white'
                    : 'text-marketplace-text-muted hover:bg-marketplace-hover hover:text-marketplace-text'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="text-xs font-semibold text-marketplace-text-muted uppercase mb-3 mt-6">
              Settings
            </div>
            {menuItems.slice(6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  pathname === item.href
                    ? 'bg-primary text-white'
                    : 'text-marketplace-text-muted hover:bg-marketplace-hover hover:text-marketplace-text'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="bg-marketplace-sidebar border-b border-marketplace-border sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-marketplace-text-muted hover:text-marketplace-text"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 max-w-2xl mx-4">
              <input
                type="search"
                placeholder="Search customers, plans, tickets..."
                className="w-full px-4 py-2 bg-marketplace-card text-marketplace-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-marketplace-border"
              />
            </div>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle />

              <button className="relative text-marketplace-text-muted hover:text-marketplace-text">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-xs flex items-center justify-center text-white">
                  {profile?.unread_notifications || 0}
                </span>
              </button>

              <button className="text-marketplace-text-muted hover:text-marketplace-text">
                <User className="w-6 h-6" />
              </button>

              <div className="text-right">
                <p className="text-sm text-marketplace-text font-medium">
                  {profile?.business_name || user?.email}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="text-marketplace-text-muted hover:text-marketplace-text"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

