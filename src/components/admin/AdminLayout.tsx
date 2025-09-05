import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarToggle } from '@/components/ui/sidebar';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar-provider';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Settings, 
  LogOut, 
  QrCode, 
  Bell,
  Search,
  HelpCircle,
  Menu
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { TransactionsPage } from './TransactionsPage';
import { StudentsPage } from './StudentsPage';
import { SettingsPage } from './SettingsPage';
import { useAuth } from '@/contexts/AuthContext';
import type { Admin } from '@/lib/appwrite';
import { LineSeparator } from '../ui/dotted-line';

interface AdminLayoutProps {
  adminData: Admin;
}

type NavPage = 'dashboard' | 'transactions' | 'students' | 'settings';

const navigation = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    page: 'dashboard' as NavPage,
    description: 'Overview and analytics'
  },
  {
    title: 'Transactions',
    icon: Receipt,
    page: 'transactions' as NavPage,
    description: 'Payment records and history'
  },
  {
    title: 'Students',
    icon: Users,
    page: 'students' as NavPage,
    description: 'Student management'
  },
  {
    title: 'Settings',
    icon: Settings,
    page: 'settings' as NavPage,
    description: 'System configuration'
  }
];

function AdminSidebar({ currentPage, setCurrentPage, adminData }: { currentPage: NavPage; setCurrentPage: (page: NavPage) => void; adminData: Admin }) {
  const { logout } = useAuth();
  const { isOpen } = useSidebar();

  return (
    <Sidebar className={`w-60 md:w-64 border-r bg-card transition-all duration-300 fixed lg:relative z-50 h-full ${!isOpen ? 'hidden lg:flex' : 'flex'}`}>
      <SidebarHeader className="flex-col px-2 py-2 -mt-2.5 bg-background">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-primary rounded-lg w-8 h-8 md:w-9 md:h-9 flex items-center justify-center">
            <QrCode className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base md:text-lg">Canteen System</span>
            <span className="text-sm text-muted-foreground">Admin Panel</span>
          </div>
        </div>
        <LineSeparator />
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.page}>
              <SidebarMenuButton
                onClick={() => setCurrentPage(item.page)}
                isActive={currentPage === item.page}
                className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-3 py-4">
        <div className="flex items-center gap-3 w-full">
          <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">
              {adminData.username?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {adminData.username}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              Admin
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminLayout({ adminData }: AdminLayoutProps) {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const { isOpen, setIsOpen } = useSidebar();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'transactions':
        return <TransactionsPage />;
      case 'students':
        return <StudentsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <AdminDashboard />;
    }
  };

  const getPageTitle = () => {
    const page = navigation.find(nav => nav.page === currentPage);
    return page?.title || 'Dashboard';
  };

  const getPageDescription = () => {
    const page = navigation.find(nav => nav.page === currentPage);
    return page?.description || 'Overview and analytics';
  };

  // Auto-close sidebar on small screens when page changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, [setIsOpen]);

  const handlePageChange = (page: NavPage) => {
    setCurrentPage(page);
    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar currentPage={currentPage} setCurrentPage={handlePageChange} adminData={adminData} />
      
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Toggle Button */}
        <header className="flex items-center justify-between px-4 py-2 border-b bg-background lg:hidden">
          <div className="flex items-center gap-3">
            <SidebarToggle onClick={() => setIsOpen(!isOpen)} />
            <div>
              <h1 className="text-base font-semibold">{getPageTitle()}</h1>
              <p className="text-sm text-muted-foreground">{getPageDescription()}</p>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-1 hidden lg:block">
          <div className="flex h-16 items-center gap-4 px-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-foreground">{getPageTitle()}</h1>
              <p className="text-sm text-muted-foreground">{getPageDescription()}</p>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <LineSeparator className="hidden lg:block" />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 bg-background">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminLayoutWrapper({ adminData }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <AdminLayout adminData={adminData} />
    </SidebarProvider>
  );
}

export { AdminLayoutWrapper as AdminLayout };
