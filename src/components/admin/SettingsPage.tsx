import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, UserPlus, Database, Bell, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';
import { adminService, settingsService } from '@/lib/services';

interface CashierAccount {
  id: string;
  name: string;
  username: string;
  administrator_id: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export function SettingsPage() {
  // Temporary workaround: use maxDailySpend as maintenance flag
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCashier, setShowAddCashier] = useState(false);
  const [showEditCashier, setShowEditCashier] = useState(false);
  const [showDeleteCashier, setShowDeleteCashier] = useState(false);
  const [deletingCashier, setDeletingCashier] = useState<CashierAccount | null>(null);
  const [editingCashier, setEditingCashier] = useState<CashierAccount | null>(null);
  const [newCashier, setNewCashier] = useState({
    name: '',
    username: '',
    password: ''
  });
  const [editCashierData, setEditCashierData] = useState({
    name: '',
    email: '',
    password: '',
    oldPassword: ''
  });

  
  const generateAdministratorId = () => {
    const firstPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const secondPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${firstPart}-${secondPart}`;
  };

  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        
        const adminsResponse = await adminService.getAdmins();
        const transformedCashiers: CashierAccount[] = adminsResponse.documents.map((admin: any) => {
          
          let lastLogin: Date | undefined;
          let createdAt: Date;
          
          try {
            if (admin.lastLogin) {
              lastLogin = new Date(admin.lastLogin);
              if (isNaN(lastLogin.getTime())) {
                lastLogin = undefined; 
              }
            }
          } catch (error) {
            lastLogin = undefined;
          }
          
          try {
            createdAt = new Date(admin.createdAt);
            if (isNaN(createdAt.getTime())) {
              createdAt = new Date(); 
            }
          } catch (error) {
            createdAt = new Date(); 
          }
          
          return {
            id: admin.$id,
            name: admin.Fullname, 
            username: admin.username,
            administrator_id: admin.administrator_id,
            isActive: admin.isActive,
            lastLogin: lastLogin,
            createdAt: createdAt
          };
        });
        
        setCashiers(transformedCashiers);
        
        try {
          const settingsResponse = await settingsService.getSettings();
          if (settingsResponse) {
            // Fix: Check if maxDailySpend is 0 (maintenance mode)
            const isMaintenance = settingsResponse.maxDailySpend === 0;
            setMaintenanceMode(isMaintenance);
            console.log('Maintenance mode:', isMaintenance, 'maxDailySpend:', settingsResponse.maxDailySpend);
          }
        } catch (error) {
          console.log('No settings found, using defaults');
        }
        setDbStatus('connected');
      } catch (error) {
        console.error('Error loading settings data:', error);
        toast.error('Failed to load settings');
        setDbStatus('error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddCashier = async () => {
    if (!newCashier.name || !newCashier.username || !newCashier.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    const usernameRegex = /^[a-zA-Z]+$/;
    if (!usernameRegex.test(newCashier.username)) {
      toast.error('Username can only contain letters.');
      return;
    }

    try {
      const generatedAdminId = generateAdministratorId();
      
      const cashierData = {
        Fullname: newCashier.name,
        username: newCashier.username,
        email: `${newCashier.username}@university.edu`,
        administrator_id: generatedAdminId,
        password: newCashier.password,
        isActive: true
      };

      const createdAdmin = await adminService.createAdmin(cashierData);
      
      const newCashierAccount: CashierAccount = {
        id: createdAdmin.$id,
        name: newCashier.name,
        username: newCashier.username,
        administrator_id: generatedAdminId,
        isActive: true,
        createdAt: new Date()
      };

      setCashiers(prev => [...prev, newCashierAccount]);
      setNewCashier({ name: '', username: '', password: '' });
      setShowAddCashier(false);
      toast.success('Cashier account created successfully');
    } catch (error) {
      console.error('Error creating cashier:', error);
      toast.error('Failed to create cashier account');
    }
  };

  const handleEditCashier = (cashier: CashierAccount) => {
    setEditingCashier(cashier);
    setEditCashierData({
      name: cashier.name,
      email: `${cashier.username}@university.edu`, 
      password: '',
      oldPassword: ''
    });
    setShowEditCashier(true);
  };

  const handleUpdateCashier = async () => {
    if (!editingCashier || !editCashierData.name || !editCashierData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const updateData: any = {
        email: editCashierData.email
      };

      // If new password is provided, validate old password and add to update
      if (editCashierData.password.trim()) {
        if (!editCashierData.oldPassword.trim()) {
          toast.error('Please enter your old password to set a new one.');
          return;
        }

        // Fetch the admin data to verify the old password
        const adminToVerify = await adminService.getAdmin(editingCashier.id);
        if (adminToVerify.password !== editCashierData.oldPassword) {
          toast.error('The old password you entered is incorrect.');
          return;
        }

        if (editCashierData.password.trim().length < 9) {
          toast.error('New password must be at least 9 characters long.');
          return;
        }

        updateData.password = editCashierData.password;
      }

      await adminService.updateAdmin(editingCashier.id, updateData);
      
      setCashiers(prev => 
        prev.map(c => 
          c.id === editingCashier.id 
            ? { ...c, name: editCashierData.name } 
            : c
        )
      );

      setShowEditCashier(false);
      setEditingCashier(null);
      setEditCashierData({ name: '', email: '', password: '', oldPassword: '' });
      toast.success('Cashier account updated successfully');
    } catch (error) {
      console.error('Error updating cashier:', error);
      toast.error('Failed to update cashier account');
    }
  };

  const handleDeleteCashier = async () => {
    if (!deletingCashier) return;

    try {
      await adminService.deleteAdmin(deletingCashier.id);
      
      setCashiers(prev => prev.filter(c => c.id !== deletingCashier.id));
      setShowDeleteCashier(false);
      setDeletingCashier(null);
      toast.success('Cashier account deleted successfully');
    } catch (error) {
      console.error('Error deleting cashier:', error);
      toast.error('Failed to delete cashier account');
    }
  };

  const confirmDeleteCashier = (cashier: CashierAccount) => {
    setDeletingCashier(cashier);
    setShowDeleteCashier(true);
  };

  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* General Settings */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5" />
              System Maintenance
            </CardTitle>
            <CardDescription className="text-xs">
              Control system access and maintenance mode
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Temporarily disable student login and registration.
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={async (checked: boolean) => {
                    try {
                      await settingsService.updateSettings({ maxDailySpend: checked ? 0 : 1000 });
                      setMaintenanceMode(checked);
                      toast.success(`System maintenance ${checked ? 'enabled' : 'disabled'}`);
                    } catch (error) {
                      console.error('Failed to update maintenance mode:', error);
                      toast.error('Failed to update maintenance mode');
                    }
                  }}
                />
              </div>
              
              {maintenanceMode && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className='flex items-center gap-2'>
                      <AlertOctagon className='h-4 w-4 text-yellow-800'/>
                      <p className='font-semibold text-sm text-yellow-800'>Maintenance Active</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await settingsService.updateSettings({ maxDailySpend: 1000 });
                          setMaintenanceMode(false);
                          toast.success('Maintenance mode disabled');
                        } catch (error) {
                          console.error('Failed to disable maintenance mode:', error);
                          toast.error('Failed to disable maintenance mode');
                        }
                      }}
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 h-7 text-xs"
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        
      </div>

      {/* User Management */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription className="text-xs">
                Manage admin and cashier accounts
              </CardDescription>
            </div>
            <Dialog open={showAddCashier} onOpenChange={setShowAddCashier}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cashier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add New Cashier</DialogTitle>
                  <DialogDescription className="text-sm">
                    Create a new cashier account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cashier-name">Full Name</Label>
                    <Input
                      id="cashier-name"
                      value={newCashier.name}
                      onChange={(e) => setNewCashier(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cashier-username">Username</Label>
                    <Input
                      id="cashier-username"
                      value={newCashier.username}
                      onChange={(e) => {
                        const filteredValue = e.target.value.replace(/[^a-zA-Z]/g, '');
                        setNewCashier(prev => ({ ...prev, username: filteredValue }));
                      }}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cashier-password">Password</Label>
                    <Input
                      id="cashier-password"
                      type="password"
                      value={newCashier.password}
                      onChange={(e) => setNewCashier(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowAddCashier(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCashier}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <Dialog open={showEditCashier} onOpenChange={setShowEditCashier}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Cashier</DialogTitle>
              <DialogDescription>
                Update account info. Leave password blank to keep it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cashier-name">Full Name</Label>
                <Input
                  id="edit-cashier-name"
                  value={editCashierData.name}
                  onChange={(e) => setEditCashierData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cashier-email">Email</Label>
                <Input
                  id="edit-cashier-email"
                  type="email"
                  value={editCashierData.email}
                  onChange={(e) => setEditCashierData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cashier-old-password">Old Password</Label>
                <Input
                  id="edit-cashier-old-password"
                  type="password"
                  value={editCashierData.oldPassword}
                  onChange={(e) => setEditCashierData(prev => ({ ...prev, oldPassword: e.target.value }))}
                  placeholder="Enter old password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cashier-password">New Password</Label>
                <Input
                  id="edit-cashier-password"
                  type="password"
                  value={editCashierData.password}
                  onChange={(e) => setEditCashierData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditCashier(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateCashier}>
                  Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteCashier} onOpenChange={setShowDeleteCashier}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Cashier</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this account?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Permanently remove <strong>{deletingCashier?.name}</strong>.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteCashier(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteCashier}
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Name</TableHead>
                  <TableHead className="hidden sm:table-cell px-4">Username</TableHead>
                  <TableHead className="hidden md:table-cell px-4">Admin ID</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="hidden lg:table-cell px-4">Last Login</TableHead>
                  <TableHead className="px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashiers.map((cashier) => (
                  <TableRow key={cashier.id}>
                    <TableCell className="font-medium px-4 py-2 text-sm">{cashier.name}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono px-4 py-2 text-xs">{cashier.username}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono px-4 py-2 text-xs">{cashier.administrator_id}</TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge variant={cashier.isActive ? 'default' : 'destructive'} className="text-xs">
                        {cashier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell px-4 py-2 text-xs">
                      {cashier.lastLogin ? formatDate(cashier.lastLogin) : 'Never'}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditCashier(cashier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => confirmDeleteCashier(cashier)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription className="text-xs">
            Current system status and information
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Database Status</Label>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">{dbStatus === 'connected' ? 'Connected' : 'Error'}</span>
              </div>
            </div>
            <div className="space-y-1 flex flex-col">
              <Label className="text-xs">System Version</Label>
              <span className="text-sm">v1.2.2</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}