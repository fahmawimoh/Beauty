"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardContent } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useApiError } from "@/lib/errors";
import { usePhoneValidation, formatPhoneDisplay, sanitizePhoneInput } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import type { BookingEmployee, EmployeeSchedule, EmployeeScheduleBreak } from "@/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

type ScheduleForm = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
  breaks: EmployeeScheduleBreak[];
};

type EmployeeForm = {
  name: string;
  phone: string;
  notes: string;
  defaultSlotDurationMinutes: string;
  schedules: ScheduleForm[];
};

const defaultSchedules = (): ScheduleForm[] =>
  DAYS.map((day) => ({
    dayOfWeek: day,
    startTime: "09:00",
    endTime: "17:00",
    isWorkingDay: day !== "Sunday" && day !== "Saturday",
    breaks: [],
  }));

const emptyForm = (): EmployeeForm => ({
  name: "",
  phone: "",
  notes: "",
  defaultSlotDurationMinutes: "30",
  schedules: defaultSchedules(),
});

export default function EmployeesPage() {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const getError = useApiError();
  const { validatePhone } = usePhoneValidation();
  const { user } = useAuthStore();

  const [employees, setEmployees] = useState<BookingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm());
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookingEmployee | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const branchQuery = user?.branchId ? `?branchId=${user.branchId}` : "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<BookingEmployee[]>(`/booking-employees${branchQuery}`);
      setEmployees(data);
    } catch (err) {
      toast("error", getError(err));
    } finally {
      setLoading(false);
    }
  }, [branchQuery, getError]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setPhoneError(null);
    setSubmitError("");
    setDialogOpen(true);
  };

  const openEdit = (emp: BookingEmployee) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      phone: formatPhoneDisplay(emp.phoneNumber),
      notes: emp.notes || "",
      defaultSlotDurationMinutes: String(emp.defaultSlotDurationMinutes),
      schedules: DAYS.map((day) => {
        const existing = emp.schedules.find((s) => s.dayOfWeek === day);
        return existing
          ? {
              dayOfWeek: day,
              startTime: existing.startTime.slice(0, 5),
              endTime: existing.endTime.slice(0, 5),
              isWorkingDay: existing.isWorkingDay,
              breaks: existing.breaks.map((b) => ({
                startTime: b.startTime.slice(0, 5),
                endTime: b.endTime.slice(0, 5),
              })),
            }
          : { dayOfWeek: day, startTime: "09:00", endTime: "17:00", isWorkingDay: false, breaks: [] };
      }),
    });
    setPhoneError(null);
    setSubmitError("");
    setDialogOpen(true);
  };

  const handlePhoneChange = (phone: string) => {
    const normalized = sanitizePhoneInput(phone);
    setForm((f) => ({ ...f, phone: normalized }));
    setPhoneError(validatePhone(normalized, true));
  };

  const resolvePhoneForSubmit = (): string => {
    const fromDom = phoneInputRef.current?.value ?? "";
    return sanitizePhoneInput(fromDom || form.phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const normalizedPhone = resolvePhoneForSubmit();
    if (normalizedPhone !== form.phone) {
      setForm((f) => ({ ...f, phone: normalizedPhone }));
    }

    const phoneValidation = validatePhone(normalizedPhone, true);
    setPhoneError(phoneValidation);
    if (phoneValidation || !form.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        branchId: user?.branchId || null,
        name: form.name.trim(),
        phoneNumber: normalizedPhone,
        notes: form.notes.trim() || null,
        defaultSlotDurationMinutes: parseInt(form.defaultSlotDurationMinutes, 10) || 30,
        schedules: form.schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isWorkingDay: s.isWorkingDay,
          breaks: s.breaks.filter((b) => b.startTime && b.endTime),
        })),
      };

      if (editingId) {
        const emp = employees.find((e) => e.id === editingId);
        const updatePayload = {
          ...payload,
          branchId: emp?.branchId ?? user?.branchId ?? null,
          isActive: emp?.isActive ?? true,
        };
        if (process.env.NODE_ENV === "development") {
          console.debug("[employees] PUT", `/booking-employees/${editingId}`, updatePayload);
        }
        await api.put(`/booking-employees/${editingId}`, updatePayload);
        toast("success", t("updateEmployee"));
      } else {
        if (process.env.NODE_ENV === "development") {
          console.debug("[employees] POST", "/booking-employees", payload);
        }
        await api.post("/booking-employees", payload);
        toast("success", t("saveEmployee"));
      }

      setDialogOpen(false);
      await load();
    } catch (err) {
      const message = getError(err, t("saveFailed"));
      if (message.toLowerCase().includes("phone")) {
        setPhoneError(message);
      } else {
        setSubmitError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (emp: BookingEmployee) => {
    try {
      await api.patch(`/booking-employees/${emp.id}/${emp.isActive ? "deactivate" : "activate"}`);
      toast("success", emp.isActive ? t("deactivate") : t("activate"));
      await load();
    } catch (err) {
      toast("error", getError(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/booking-employees/${deleteTarget.id}`);
      toast("success", tCommon("deleteSuccess"));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast("error", getError(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateSchedule = (index: number, patch: Partial<ScheduleForm>) => {
    setForm((f) => ({
      ...f,
      schedules: f.schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const addBreak = (scheduleIndex: number) => {
    setForm((f) => ({
      ...f,
      schedules: f.schedules.map((s, i) =>
        i === scheduleIndex ? { ...s, breaks: [...s.breaks, { startTime: "12:00", endTime: "13:00" }] } : s
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 me-2" />{t("addEmployee")}</Button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-slate-500">{tCommon("loading")}</p>
      ) : employees.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">{t("noEmployees")}</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{emp.name}</h3>
                    <p className="text-sm text-slate-500">{formatPhoneDisplay(emp.phoneNumber)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {emp.defaultSlotDurationMinutes} min · {emp.schedules.filter((s) => s.isWorkingDay).length} {t("workingDay").toLowerCase()}s
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {emp.isActive ? tCommon("active") : tCommon("inactive")}
                  </span>
                </div>
                {emp.notes && <p className="mt-2 text-sm text-slate-600">{emp.notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(emp)}>
                    <Pencil className="h-3.5 w-3.5 me-1" />{tCommon("edit")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleActive(emp)}>
                    {emp.isActive ? <UserX className="h-3.5 w-3.5 me-1" /> : <UserCheck className="h-3.5 w-3.5 me-1" />}
                    {emp.isActive ? t("deactivate") : t("activate")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(emp)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("editEmployee") : t("addEmployee")}
        onSubmit={handleSubmit}
        submitLabel={editingId ? t("updateEmployee") : t("saveEmployee")}
        cancelLabel={tCommon("cancel")}
        loading={saving}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">{t("employeeName")}</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("namePlaceholder")} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tCommon("phone")}</label>
            <PhoneInput
              ref={phoneInputRef}
              value={form.phone}
              onChange={handlePhoneChange}
              error={phoneError}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("slotDuration")}</label>
            <Input type="number" min={15} max={480} step={15} value={form.defaultSlotDurationMinutes} onChange={(e) => setForm((f) => ({ ...f, defaultSlotDurationMinutes: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">{tCommon("notes")}</label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">{t("schedule")}</h4>
          {form.schedules.map((schedule, idx) => (
            <div key={schedule.dayOfWeek} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium min-w-[100px]">
                  <input type="checkbox" checked={schedule.isWorkingDay} onChange={(e) => updateSchedule(idx, { isWorkingDay: e.target.checked })} />
                  {t(`days.${schedule.dayOfWeek}` as "days.Monday")}
                </label>
                {schedule.isWorkingDay && (
                  <>
                    <Input type="time" value={schedule.startTime} onChange={(e) => updateSchedule(idx, { startTime: e.target.value })} className="w-auto" />
                    <span className="text-slate-400">–</span>
                    <Input type="time" value={schedule.endTime} onChange={(e) => updateSchedule(idx, { endTime: e.target.value })} className="w-auto" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => addBreak(idx)}>{t("addBreak")}</Button>
                  </>
                )}
              </div>
              {schedule.isWorkingDay && schedule.breaks.length > 0 && (
                <div className="mt-2 space-y-2 ps-6">
                  {schedule.breaks.map((brk, bi) => (
                    <div key={bi} className="flex flex-wrap items-center gap-2">
                      <Input type="time" value={brk.startTime} onChange={(e) => {
                        const breaks = [...schedule.breaks];
                        breaks[bi] = { ...brk, startTime: e.target.value };
                        updateSchedule(idx, { breaks });
                      }} className="w-auto" />
                      <span className="text-slate-400">–</span>
                      <Input type="time" value={brk.endTime} onChange={(e) => {
                        const breaks = [...schedule.breaks];
                        breaks[bi] = { ...brk, endTime: e.target.value };
                        updateSchedule(idx, { breaks });
                      }} className="w-auto" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("deleteEmployee")}
        message={t("deleteConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        loading={deleteLoading}
      />
    </div>
  );
}
