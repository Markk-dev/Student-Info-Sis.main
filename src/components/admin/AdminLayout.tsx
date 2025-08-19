import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar-provider';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Settings, 
  LogOut, 
  QrCode, 
  Bell,
  Search,
  HelpCircle
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { TransactionsPage } from './TransactionsPage';
import { StudentsPage } from './StudentsPage';
import { SettingsPage } from './SettingsPage';
import { useAuth } from '@/contexts/AuthContext';
import type { Admin } from '@/lib/appwrite';

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

export function AdminLayout({ adminData }: AdminLayoutProps) {
  const { logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');

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

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar */}
        <Sidebar className="w-64 border-r bg-card">
          <SidebarHeader className="border-b bg-background">
            <div className="flex items-center gap-2 px-4 py-4">
              <div className="bg-primary rounded-lg w-10 h-10 flex items-center justify-center">
                <QrCode className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg">Canteen System</span>
                <span className="text-sm text-muted-foreground">Admin Panel</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 py-4">
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    onClick={() => setCurrentPage(item.page)}
                    isActive={currentPage === item.page}
                    className="w-full justify-start gap-3 px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t bg-background p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-3 h-auto">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">
                      {adminData.username?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{adminData.username}</span>
                    <span className="text-xs text-muted-foreground">Admin</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
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

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6 bg-background">
            <div className="max-w-7xl mx-auto">
              {renderPage()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}