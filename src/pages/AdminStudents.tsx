import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Pencil, Trash2, KeyRound, Eye, EyeOff, Users } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface Student {
  id: string;
  student_id: string;
  name: string;
  created_at: string;
  plain_password: string | null;
}

const AdminStudents = () => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);

  const [newStudentId, setNewStudentId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const { data: students, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_students");
      if (error) throw error;
      return data as unknown as Student[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_add_student", {
        p_student_id: newStudentId,
        p_name: newName,
        p_password: newPassword,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success("تمت إضافة الطالب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setAddOpen(false);
      setNewStudentId("");
      setNewName("");
      setNewPassword("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { data, error } = await supabase.rpc("admin_update_student", {
        p_id: selected.id,
        p_name: editName,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success("تم تعديل بيانات الطالب");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setEditOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { data, error } = await supabase.rpc("admin_reset_password", {
        p_id: selected.id,
        p_new_password: resetPassword,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success("تم إعادة تعيين كلمة المرور");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setResetOpen(false);
      setResetPassword("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { data, error } = await supabase.rpc("admin_delete_student", {
        p_id: selected.id,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success("تم حذف الطالب");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setDeleteOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cardBase = isDark
    ? "glass-card border-0"
    : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]";

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-bold ${isDark ? "text-primary glow-text" : "text-foreground"}`}>
          إدارة حسابات الطلاب
        </h2>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          إضافة طالب
        </Button>
      </div>

      <Card className={`rounded-2xl ${cardBase}`}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState message="تعذّر تحميل قائمة الطلاب" onRetry={() => refetch()} />
            </div>
          ) : !students || students.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="لا يوجد طلاب مسجلون"
                description="أضف حسابات الطلاب للسماح لهم بتسجيل الدخول واستخدام المساعد"
                actionLabel="إضافة طالب"
                onAction={() => setAddOpen(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الرقم الجامعي</TableHead>
                  <TableHead className="text-right">كلمة المرور</TableHead>
                  <TableHead className="text-right">تاريخ التسجيل</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono">{s.student_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {showPasswords[s.id]
                            ? s.plain_password || "—"
                            : "••••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => togglePassword(s.id)}
                        >
                          {showPasswords[s.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.created_at).toLocaleDateString("ar-SA")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="تعديل الاسم"
                          onClick={() => {
                            setSelected(s);
                            setEditName(s.name);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="إعادة تعيين كلمة المرور"
                          onClick={() => {
                            setSelected(s);
                            setResetPassword("");
                            setResetOpen(true);
                          }}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="حذف"
                          onClick={() => {
                            setSelected(s);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة طالب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الرقم الجامعي</Label>
              <Input value={newStudentId} onChange={(e) => setNewStudentId(e.target.value)} placeholder="مثال: 20230004" />
            </div>
            <div className="space-y-2">
              <Label>اسم الطالب</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة المرور" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addMutation.mutate()} disabled={!newStudentId || !newName || !newPassword || addMutation.isPending}>
              {addMutation.isPending ? "جارٍ الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل اسم الطالب</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>الاسم الجديد</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => editMutation.mutate()} disabled={!editName || editMutation.isPending}>
              {editMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            الطالب: {selected?.name} ({selected?.student_id})
          </p>
          <div className="space-y-2 py-2">
            <Label>كلمة المرور الجديدة</Label>
            <Input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="كلمة المرور الجديدة" />
          </div>
          <DialogFooter>
            <Button onClick={() => resetMutation.mutate()} disabled={!resetPassword || resetMutation.isPending}>
              {resetMutation.isPending ? "جارٍ التحديث..." : "تحديث"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            هل أنت متأكد من حذف الطالب <strong>{selected?.name}</strong> ({selected?.student_id})؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "جارٍ الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStudents;
