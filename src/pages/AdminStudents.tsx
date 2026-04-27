import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, KeyRound, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

interface Student {
  id: string;
  student_id: string;
  name: string;
  created_at: string;
}

const AdminStudents = () => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [resetTarget, setResetTarget] = useState<Student | null>(null);

  // Form states
  const [formStudentId, setFormStudentId] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: students, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_students");
      if (error) throw error;
      return data as Student[];
    },
  });

  const filteredStudents = students?.filter(
    (s) => s.name.includes(search) || s.student_id.includes(search)
  ) ?? [];

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_add_student", {
        p_student_id: formStudentId.trim(),
        p_name: formName.trim(),
        p_password: formPassword,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast({ title: "تمت إضافة الطالب بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setAddOpen(false);
      setFormStudentId("");
      setFormName("");
      setFormPassword("");
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const { data, error } = await supabase.rpc("admin_update_student", {
        p_id: editTarget.id,
        p_name: editName.trim(),
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast({ title: "تم تحديث بيانات الطالب" });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setEditTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      const { data, error } = await supabase.rpc("admin_delete_student", {
        p_id: deleteTarget.id,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast({ title: "تم حذف الطالب بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!resetTarget) return;
      const { data, error } = await supabase.rpc("admin_reset_password", {
        p_id: resetTarget.id,
        p_new_password: newPassword,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      toast({ title: "تم إعادة تعيين كلمة المرور" });
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const cardBase = isDark
    ? "glass-card border-0"
    : "bg-white border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]";

  const rowBase = isDark
    ? "bg-white/5 border border-white/5 hover:bg-white/8"
    : "bg-secondary/30 border border-black/5 hover:bg-secondary/60 hover:border-primary/20";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <Card className={`transition-colors duration-300 rounded-2xl ${cardBase}`}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0 pb-4">
          <CardTitle className={`text-lg font-bold ${isDark ? "text-primary glow-text" : "text-foreground"}`}>
            إدارة حسابات الطلاب
          </CardTitle>
          <Button
            onClick={() => setAddOpen(true)}
            className={`gap-2 ${
              isDark
                ? "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 glow-primary"
                : "bg-primary hover:bg-primary-hover text-primary-foreground"
            }`}
          >
            <Plus className="w-4 h-4" />
            إضافة طالب
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="ابحث بالاسم أو الرقم الجامعي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`text-right ${isDark ? "glass-input" : ""}`}
            dir="rtl"
          />

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <ErrorState message="تعذّر تحميل قائمة الطلاب" onRetry={() => refetch()} />
          ) : filteredStudents.length === 0 ? (
            students && students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="لا يوجد طلاب مسجلون"
                description="أضف حسابات الطلاب ليتمكنوا من الدخول إلى المساعد"
                actionLabel="إضافة طالب"
                onAction={() => setAddOpen(true)}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="لا توجد نتائج مطابقة"
                actionLabel="مسح البحث"
                onAction={() => setSearch("")}
              />
            )
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{filteredStudents.length} طالب</p>
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-colors duration-300 ${rowBase}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{student.student_id} · {new Date(student.created_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="تعديل الاسم"
                      onClick={() => {
                        setEditTarget(student);
                        setEditName(student.name);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="إعادة تعيين كلمة المرور"
                      onClick={() => {
                        setResetTarget(student);
                        setNewPassword("");
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="حذف"
                      onClick={() => setDeleteTarget(student)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة طالب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الرقم الجامعي</Label>
              <Input value={formStudentId} onChange={(e) => setFormStudentId(e.target.value)} dir="rtl" placeholder="مثال: 20230004" />
            </div>
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} dir="rtl" placeholder="مثال: علي أحمد محمد" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <div className="relative">
                <Input type={showFormPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} dir="ltr" placeholder="كلمة مرور قوية" className="pl-10" />
                <button type="button" onClick={() => setShowFormPassword(!showFormPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!formStudentId.trim() || !formName.trim() || !formPassword.trim() || addMutation.isPending}
              className="gap-2"
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الطالب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الرقم الجامعي</Label>
              <Input value={editTarget?.student_id ?? ""} disabled dir="rtl" className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} dir="rtl" />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!editName.trim() || updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            إعادة تعيين كلمة المرور للطالب: <strong className="text-foreground">{resetTarget?.name}</strong>
          </p>
          <div className="space-y-2 py-2">
            <Label>كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" placeholder="كلمة مرور جديدة" className="pl-10" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => resetMutation.mutate()}
              disabled={!newPassword.trim() || resetMutation.isPending}
              className="gap-2"
            >
              {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              تعيين كلمة المرور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">حذف حساب الطالب</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block">هل أنت متأكد من حذف حساب هذا الطالب؟ لا يمكن التراجع.</span>
              {deleteTarget && (
                <span className="block font-medium text-foreground bg-muted rounded-md px-3 py-2 text-sm">
                  {deleteTarget.name} — {deleteTarget.student_id}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              تأكيد الحذف
            </Button>
            <AlertDialogCancel disabled={deleteMutation.isPending}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudents;
