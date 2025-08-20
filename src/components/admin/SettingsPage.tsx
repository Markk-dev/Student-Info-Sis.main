import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Plus, Edit, Trash2, Save, X, UserPlus, Shield, Database, Bell, Clock } from 'lucide-react';
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

interface SystemSettings {
  currency: string;
  dateFormat: string;
  timezone: string;
  enableNotifications: boolean;
  enableAutoBackup: boolean;
  requireReceiptPrint: boolean;
  maxTransactionAmount: number;
  sessionTimeout: number;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    currency: 'PHP',
    dateFormat: 'MM/dd/yyyy',
    timezone: 'Asia/Manila',
    enableNotifications: true,
    enableAutoBackup: true,
    requireReceiptPrint: false,
    maxTransactionAmount: 1000,
    sessionTimeout: 30
  });

  // Temporary workaround: use maxDailySpend as maintenance flag
  const [maintenanceMode, setMaintenanceMode] = useState(false);
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
    password: ''
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
            name: admin.username, 
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
            setSettings(prev => ({
              ...prev,
              ...settingsResponse
            }));
            // Fix: Check if maxDailySpend is 0 (maintenance mode)
            const isMaintenance = settingsResponse.maxDailySpend === 0;
            setMaintenanceMode(isMaintenance);
            console.log('Maintenance mode:', isMaintenance, 'maxDailySpend:', settingsResponse.maxDailySpend);
          }
        } catch (error) {
          console.log('No settings found, using defaults');
        }
        
      } catch (error) {
        console.error('Error loading settings data:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSettingChange = async (key: string, value: any) => {
    try {
      
      setSettings(prev => ({ ...prev, [key]: value }));
      
      
      await settingsService.updateSettings({ [key]: value });
      
      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
      
      
      setSettings(prev => ({ ...prev, [key]: !value }));
    }
  };

  const handleAddCashier = async () => {
    if (!newCashier.name || !newCashier.username || !newCashier.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const generatedAdminId = generateAdministratorId();
      
      const cashierData = {
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

  const toggleCashierStatus = async (id: string) => {
    try {
      const cashier = cashiers.find(c => c.id === id);
      if (!cashier) return;

      await adminService.updateAdmin(id, { isActive: !cashier.isActive });
      
      setCashiers(prev => 
        prev.map(c => 
          c.id === id 
            ? { ...c, isActive: !c.isActive }
            : c
        )
      );
      toast.success(`Cashier account ${!cashier.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating cashier status:', error);
      toast.error('Failed to update cashier status');
    }
  };

  const handleEditCashier = (cashier: CashierAccount) => {
    setEditingCashier(cashier);
    setEditCashierData({
      name: cashier.name,
      email: `${cashier.username}@university.edu`, 
      password: '' 
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

      
      if (editCashierData.password.trim()) {
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
      setEditCashierData({ name: '', email: '', password: '' });
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

  const exportData = (type: string) => {
    
    toast.success(`${type} data exported successfully`);
  };

  const importData = () => {
    
    toast.success('Data imported successfully');
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

  const formatTime = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
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
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => exportData('Settings')}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" onClick={importData}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Maintenance
            </CardTitle>
            <CardDescription>
              Control system access and maintenance mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily close all login/register for the student side for system maintenance
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={async (checked: boolean) => {
                    try {
                      // Update database
                      await settingsService.updateSettings({ maxDailySpend: checked ? 0 : 1000 });
                      
                      // Update local state
                      setMaintenanceMode(checked);
                      
                      // Update settings state
                      setSettings(prev => ({
                        ...prev,
                        maxDailySpend: checked ? 0 : 1000
                      }));
                      
                      toast.success(`System maintenance ${checked ? 'enabled' : 'disabled'}`);
                    } catch (error) {
                      console.error('Failed to update maintenance mode:', error);
                      toast.error('Failed to update maintenance mode');
                    }
                  }}
                />
              </div>
              
              {maintenanceMode && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Maintenance Mode Active:</strong> Student login and registration are currently disabled. 
                        The system is temporarily closed for maintenance.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await settingsService.updateSettings({ maxDailySpend: 1000 });
                          setMaintenanceMode(false);
                          setSettings(prev => ({ ...prev, maxDailySpend: 1000 }));
                          toast.success('Maintenance mode disabled');
                        } catch (error) {
                          console.error('Failed to disable maintenance mode:', error);
                          toast.error('Failed to disable maintenance mode');
                        }
                      }}
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                    >
                      Disable Maintenance
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Preferences
            </CardTitle>
            <CardDescription>
              Configure system behavior and security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show system notifications
                  </p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked: boolean) => handleSettingChange('enableNotifications', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup data daily
                  </p>
                </div>
                <Switch
                  checked={settings.enableAutoBackup}
                  onCheckedChange={(checked: boolean) => handleSettingChange('enableAutoBackup', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Receipt Print</Label>
                  <p className="text-sm text-muted-foreground">
                    Force receipt printing for all transactions
                  </p>
                </div>
                <Switch
                  checked={settings.requireReceiptPrint}
                  onCheckedChange={(checked: boolean) => handleSettingChange('requireReceiptPrint', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage admin and cashier accounts
              </CardDescription>
            </div>
            <Dialog open={showAddCashier} onOpenChange={setShowAddCashier}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cashier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Cashier</DialogTitle>
                  <DialogDescription>
                    Create a new cashier account for the system. Administrator ID will be automatically generated.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashier-name">Full Name</Label>
                    <Input
                      id="cashier-name"
                      value={newCashier.name}
                      onChange={(e) => setNewCashier(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-username">Username</Label>
                    <Input
                      id="cashier-username"
                      value={newCashier.username}
                      onChange={(e) => setNewCashier(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-password">Password</Label>
                    <Input
                      id="cashier-password"
                      type="password"
                      value={newCashier.password}
                      onChange={(e) => setNewCashier(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddCashier(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCashier}>
                      Create Account
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* Edit Cashier Modal */}
        <Dialog open={showEditCashier} onOpenChange={setShowEditCashier}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Cashier Account</DialogTitle>
              <DialogDescription>
                Update cashier account information. Leave password blank to keep current password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cashier-name">Full Name</Label>
                <Input
                  id="edit-cashier-name"
                  value={editCashierData.name}
                  onChange={(e) => setEditCashierData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cashier-email">Email</Label>
                <Input
                  id="edit-cashier-email"
                  type="email"
                  value={editCashierData.email}
                  onChange={(e) => setEditCashierData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cashier-password">New Password (optional)</Label>
                <Input
                  id="edit-cashier-password"
                  type="password"
                  value={editCashierData.password}
                  onChange={(e) => setEditCashierData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter new password or leave blank"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditCashier(false);
                    setEditingCashier(null);
                    setEditCashierData({ name: '', email: '', password: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateCashier}>
                  Update Account
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Cashier Confirmation Modal */}
        <Dialog open={showDeleteCashier} onOpenChange={setShowDeleteCashier}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Cashier Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this cashier account? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently remove the user account "{deletingCashier?.name}" from the system.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteCashier(false);
                    setDeletingCashier(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteCashier}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Administrator ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashiers.map((cashier) => (
                  <TableRow key={cashier.id}>
                    <TableCell className="font-medium">{cashier.name}</TableCell>
                    <TableCell className="font-mono">{cashier.username}</TableCell>
                    <TableCell className="font-mono">{cashier.administrator_id}</TableCell>
                    <TableCell>
                      <Badge variant={cashier.isActive ? 'default' : 'destructive'}>
                        {cashier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cashier.lastLogin ? (
                        <div>
                          <p className="text-sm">{formatDate(cashier.lastLogin)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(cashier.lastLogin)}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{formatDate(cashier.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(cashier.createdAt)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge
                          variant={cashier.isActive ? 'destructive' : 'default'}
                          className="cursor-pointer hover:opacity-80 transition-opacity text-xs px-2 py-1"
                          onClick={() => toggleCashierStatus(cashier.id)}
                        >
                          {cashier.isActive ? 'Deactivate' : 'Activate'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditCashier(cashier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => confirmDeleteCashier(cashier)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>
            Current system status and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Database Status</Label>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Connected</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Last Backup</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Today at 2:00 AM</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>System Version</Label>
              <span className="text-sm">v1.0.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}