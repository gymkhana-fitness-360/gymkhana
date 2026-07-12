"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createLogger } from "@/lib/logger";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { useActionQueue } from "@/hooks/use-action-queue";

const logger = createLogger("dashboard-employees");
import {
  Plus,
  Edit,
  Trash2,
  UserPlus,
  X,
  Save,
  Loader2,
  Shield,
  UserCheck,
  Eye,
  Pencil,
} from "lucide-react";

interface User {
  id: string;
  contactNumber: string;
  name: string;
  role: "ADMIN" | "SUB_ADMIN";
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

import type { Permission } from "@/lib/permissions";

const ALL_PERMISSIONS: Permission[] = [
  "canViewMembers",
  "canEditMembers",
  "canViewPayments",
  "canEditPayments",
  "canViewRenewals",
  "canEditRenewals",
  "canViewReminders",
  "canEditReminders",
  "canViewReports",
  "canViewWhatsAppReminders",
  "canSendWhatsAppReminders",
  "canSendBulkReminders",
];

const ADMIN_PERMISSIONS = new Set(ALL_PERMISSIONS);
const EMPLOYEE_PERMISSIONS = new Set<Permission>([
  "canViewMembers",
  "canViewPayments",
  "canViewRenewals",
  "canViewReminders",
  "canViewReports",
]);

const PERMISSION_LABELS: Record<Permission, string> = {
  canViewMembers: "View members",
  canEditMembers: "Edit members",
  canViewPayments: "View payments",
  canEditPayments: "Edit payments",
  canViewRenewals: "View renewals",
  canEditRenewals: "Edit renewals",
  canViewReminders: "View reminders",
  canEditReminders: "Edit reminders",
  canViewReports: "View reports",
  canViewWhatsAppReminders: "View WhatsApp Business reminders",
  canSendWhatsAppReminders: "Send WhatsApp Business reminders",
  canSendBulkReminders: "Send bulk reminders",
};

export default function EmployeesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    contactNumber: "",
    password: "",
    name: "",
    role: "SUB_ADMIN" as "ADMIN" | "SUB_ADMIN",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  useEffect(() => {
    // Check if user is admin
    if (session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [session, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      logger.error("Error fetching users:", error as Error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        contactNumber: user.contactNumber,
        password: "",
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        contactNumber: "",
        password: "",
        name: "",
        role: "SUB_ADMIN",
        isActive: true,
      });
    }
    setGeneratedPassword(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingUser
        ? `/api/users/${editingUser.id}`
        : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      // If editing and password is empty, don't send it
      const submitData: Record<string, unknown> = { ...formData };
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // If creating new user and password was generated, show it
        if (!editingUser && result.temporaryPassword) {
          setGeneratedPassword(result.temporaryPassword);
          setShowPasswordModal(true);
          toast.success("Employee created successfully!");
        } else {
          toast.success("Employee updated successfully!");
        }
        
        await fetchUsers();
        handleCloseForm();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save employee");
      }
    } catch (error) {
      logger.error("Error saving employee:", error as Error);
      toast.error("Failed to save employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) {
      return;
    }

    enqueueAction(`delete-user:${id}`, async () => {
      setDeletingUserId(id);
      try {
        const response = await fetch(`/api/users/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success("Employee deleted successfully");
          await fetchUsers();
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to delete employee");
        }
      } catch (error) {
        logger.error("Error deleting employee:", error as Error);
        toast.error("Failed to delete employee");
      } finally {
        setDeletingUserId((current) => (current === id ? null : current));
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Modal */}
      {showPasswordModal && generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-xl border border-border">
            <h2 className="text-xl font-bold mb-4">Employee Created Successfully</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Important:</strong> This password will only be shown once. Copy it and share securely.
              </p>
              <div className="bg-background border border-border rounded p-3 font-mono text-lg select-all">
                {generatedPassword}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Employee must change this password on first login.
            </p>
            <Button
              type="button"
              onClick={() => {
                setShowPasswordModal(false);
                setGeneratedPassword(null);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              I&apos;ve Saved the Password
            </Button>
          </div>
        </div>
      )}

      <DashboardPageHeader
        title="Employee management"
        description="Manage employees and configure their permissions"
        actions={
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        }
      />

      {/* Users List */}
      <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.name[0].toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {user.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {user.contactNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      {user.role === "ADMIN" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <UserCheck className="h-3 w-3" />
                      )}
                      {user.role === "ADMIN" ? "Admin" : "Employee"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        onClick={() => handleOpenForm(user)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.role !== "ADMIN" && user.id !== session?.user?.id && (
                        <Button
                          type="button"
                          onClick={() => handleDelete(user.id)}
                          disabled={isQueued(`delete-user:${user.id}`)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Read-only view of role capabilities</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Permission</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Admin</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm} className="hover:bg-muted/50">
                  <td className="px-4 py-2.5 text-foreground">{PERMISSION_LABELS[perm]}</td>
                  <td className="px-4 py-2.5 text-center">
                    {ADMIN_PERMISSIONS.has(perm) ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {EMPLOYEE_PERMISSIONS.has(perm) ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-foreground border border-border">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {editingUser ? "Edit Employee" : "Add New Employee"}
              </h2>
              <Button
                type="button"
                onClick={handleCloseForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Basic Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Contact Number *
                  </label>
                  <Input
                    type="tel"
                    required
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, contactNumber: e.target.value })
                    }
                    placeholder="Enter contact number"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Password {editingUser ? "(leave blank to keep current)" : "(default: Gympass@123!)"}
                  </label>
                  <Input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={editingUser ? "Leave blank to keep current" : "Gympass@123!"}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role
                  </label>
                  <SelectNative
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "ADMIN" | "SUB_ADMIN",
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="SUB_ADMIN">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </SelectNative>
                </div>

                <div className="flex items-center">
                  <CheckboxInput
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-foreground"
                  >
                    Active
                  </label>
                </div>
              </div>


              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? "Saving..." : editingUser ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
