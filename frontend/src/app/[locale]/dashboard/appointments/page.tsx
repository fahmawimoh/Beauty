"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { addDays, format, subDays } from "date-fns";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Search, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useApiError } from "@/lib/errors";
import { usePhoneValidation, formatPhoneDisplay, sanitizePhoneInput } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import type {
  Appointment, AvailabilityCheck, BookingEmployee, Customer,
  DailyScheduleByEmployee, ServiceOffering,
} from "@/types";

type AppointmentForm = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  customerId: string;
  serviceOfferingId: string;
  serviceType: string;
  startTime: string;
  durationMinutes: string;
  notes: string;
  status: string;
};

const emptyForm = (): AppointmentForm => ({
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  customerId: "",
  serviceOfferingId: "",
  serviceType: "",
  startTime: "",
  durationMinutes: "30",
  notes: "",
  status: "Scheduled",
});

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function toApiTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export default function AppointmentsPage() {
  const t = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const getError = useApiError();
  const { validatePhone } = usePhoneValidation();
  const { user } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [employees, setEmployees] = useState<BookingEmployee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [schedule, setSchedule] = useState<DailyScheduleByEmployee | null>(null);
  const [availability, setAvailability] = useState<AvailabilityCheck | null>(null);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentForm>(emptyForm());
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const branchQuery = user?.branchId ? `&branchId=${user.branchId}` : "";
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  const loadEmployees = useCallback(async () => {
    const branchPart = user?.branchId ? `&branchId=${user.branchId}` : "";
    const data = await api.get<BookingEmployee[]>(`/booking-employees?activeOnly=true${branchPart}`);
    setEmployees(data);
    setSelectedEmployeeId((prev) => prev || data[0]?.id || "");
  }, [user?.branchId]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const employeeParam = selectedEmployeeId ? `&employeeId=${selectedEmployeeId}` : "";
      const data = await api.get<DailyScheduleByEmployee>(
        `/appointments/daily?date=${selectedDate}${branchQuery}${employeeParam}`
      );
      setSchedule(data);

      if (selectedEmployeeId) {
        const avail = await api.get<AvailabilityCheck>(
          `/appointments/availability?employeeId=${selectedEmployeeId}&date=${selectedDate}`
        );
        setAvailability(avail);
      } else {
        setAvailability(null);
      }
    } catch (err) {
      toast("error", getError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedEmployeeId, branchQuery, getError]);

  useEffect(() => {
    loadEmployees().catch(console.error);
    api.get<{ items: Customer[] }>(`/customers?pageSize=100`).then((r) => setCustomers(r.items)).catch(console.error);
    api.get<ServiceOffering[]>("/services/offerings").then(setServices).catch(console.error);
  }, [loadEmployees]);

  useEffect(() => { loadSchedule().catch(console.error); }, [loadSchedule]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const term = customerSearch.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))
    ).slice(0, 5);
  }, [customers, customerSearch]);

  const displayEmployees = useMemo(() => {
    if (!schedule) return [];
    if (selectedEmployeeId) return schedule.employees.filter((e) => e.employeeId === selectedEmployeeId);
    return schedule.employees;
  }, [schedule, selectedEmployeeId]);

  const navigateDate = (delta: number) => {
    const d = delta > 0 ? addDays(new Date(`${selectedDate}T12:00:00`), 1) : subDays(new Date(`${selectedDate}T12:00:00`), 1);
    setSelectedDate(format(d, "yyyy-MM-dd"));
  };

  const openCreate = (startTime?: string) => {
    if (!selectedEmployeeId) {
      toast("error", t("noEmployeeSelected"));
      return;
    }
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    setEditingAppointment(null);
    setForm({
      ...emptyForm(),
      startTime: startTime ? formatTime(startTime) : "",
      durationMinutes: String(emp?.defaultSlotDurationMinutes ?? 30),
    });
    setPhoneError(null);
    setSubmitError("");
    setDialogOpen(true);
  };

  const openEdit = (appt: Appointment) => {
    setEditingAppointment(appt);
    setSelectedEmployeeId(appt.bookingEmployeeId || selectedEmployeeId);
    setForm({
      clientName: appt.clientName,
      clientPhone: formatPhoneDisplay(appt.clientPhone),
      clientEmail: appt.clientEmail || "",
      customerId: appt.customerId || "",
      serviceOfferingId: appt.serviceOfferingId || "",
      serviceType: appt.serviceType || "",
      startTime: formatTime(appt.startTime),
      durationMinutes: String(appt.durationMinutes),
      notes: appt.notes || "",
      status: appt.status,
    });
    setPhoneError(null);
    setSubmitError("");
    setDialogOpen(true);
  };

  const selectCustomer = (customer: Customer) => {
    setForm((f) => ({
      ...f,
      customerId: customer.id,
      clientName: customer.name,
      clientPhone: formatPhoneDisplay(customer.phone),
      clientEmail: customer.email || "",
    }));
    setCustomerSearch(customer.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const phoneValidation = validatePhone(form.clientPhone, true);
    setPhoneError(phoneValidation);
    if (phoneValidation || !form.clientName.trim() || !form.startTime) return;

    const employeeId = editingAppointment?.bookingEmployeeId || selectedEmployeeId;
    if (!employeeId) return;

    setSaving(true);
    try {
      const payload = {
        bookingEmployeeId: employeeId,
        branchId: user?.branchId || null,
        customerId: form.customerId || null,
        clientName: form.clientName.trim(),
        clientPhone: sanitizePhoneInput(form.clientPhone),
        clientEmail: form.clientEmail.trim() || null,
        serviceOfferingId: form.serviceOfferingId || null,
        serviceType: form.serviceType.trim() || null,
        appointmentDate: editingAppointment?.appointmentDate || selectedDate,
        startTime: toApiTime(form.startTime),
        durationMinutes: parseInt(form.durationMinutes, 10) || 30,
        notes: form.notes.trim() || null,
      };

      if (editingAppointment) {
        await api.put(`/appointments/${editingAppointment.id}`, { ...payload, status: form.status });
        toast("success", t("updateAppointment"));
      } else {
        await api.post("/appointments", payload);
        toast("success", t("saveAppointment"));
      }

      setDialogOpen(false);
      await loadSchedule();
    } catch (err) {
      setSubmitError(getError(err, t("saveFailed")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/appointments/${deleteTarget.id}`);
      toast("success", t("deleteSuccess"));
      setDeleteTarget(null);
      await loadSchedule();
    } catch (err) {
      toast("error", getError(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(dateLocale, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const availableSlots = availability?.slots.filter((s) => s.isAvailable) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Button onClick={() => openCreate()} disabled={!selectedEmployeeId}>
          <Plus className="h-4 w-4 me-2" />{t("addAppointment")}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:flex-wrap">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigateDate(-1)} aria-label={t("previousDay")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
            <Button type="button" variant="outline" size="sm" onClick={() => navigateDate(1)} aria-label={t("nextDay")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}>
              {t("today")}
            </Button>
          </div>

          <div className="min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("selectEmployee")}</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">{t("allEmployees")}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("searchCustomer")}</label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={t("searchCustomer")}
                className="ps-9"
              />
            </div>
            {filteredCustomers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-2 text-start text-sm hover:bg-violet-50"
                    onClick={() => selectCustomer(c)}
                  >
                    {c.name} · {formatPhoneDisplay(c.phone)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {selectedEmployeeId && (
          <Card className="lg:col-span-1">
            <CardHeader className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-600" />
                <h2 className="font-semibold text-slate-900">{t("selectTimeSlot")}</h2>
              </div>
              <p className="text-xs text-slate-500">{displayDate}</p>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <p className="text-sm text-slate-500">{tCommon("loading")}</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noSlots")}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => openCreate(slot.startTime)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className={cn("space-y-4", selectedEmployeeId ? "lg:col-span-2" : "lg:col-span-3")}>
          {loading ? (
            <p className="py-12 text-center text-slate-500">{tCommon("loading")}</p>
          ) : displayEmployees.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-slate-500">{t("noAppointments")}</CardContent></Card>
          ) : (
            displayEmployees.map((empSchedule) => (
              <Card key={empSchedule.employeeId}>
                <CardHeader className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-violet-600" />
                    <h2 className="text-lg font-semibold text-slate-900">{empSchedule.employeeName}</h2>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {empSchedule.appointments.length === 0 ? (
                    <p className="text-sm text-slate-400">{t("noAppointments")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {empSchedule.appointments.map((appt) => (
                        <li
                          key={appt.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-violet-700">{formatTime(appt.startTime)}</span>
                            <div>
                              <p className="font-medium text-slate-900">{appt.clientName}</p>
                              <p className="text-xs text-slate-500">
                                {formatPhoneDisplay(appt.clientPhone)}
                                {(appt.serviceName || appt.serviceType) && ` · ${appt.serviceName || appt.serviceType}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(appt)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(appt)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingAppointment ? t("editAppointment") : t("addAppointment")}
        subtitle={`${displayDate}${form.startTime ? ` · ${form.startTime}` : ""}`}
        onSubmit={handleSubmit}
        submitLabel={editingAppointment ? t("updateAppointment") : t("saveAppointment")}
        cancelLabel={tCommon("cancel")}
        loading={saving}
      >
        {!editingAppointment && (
          <div>
            <label className="mb-1 block text-sm font-medium">{t("time")}</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              required
            >
              <option value="">{t("selectTimeSlot")}</option>
              {availableSlots.map((s) => (
                <option key={s.startTime} value={formatTime(s.startTime)}>{formatTime(s.startTime)}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">{t("clientName")}</label>
          <Input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tCommon("phone")}</label>
          <PhoneInput
            value={form.clientPhone}
            onChange={(p) => { setForm((f) => ({ ...f, clientPhone: p })); setPhoneError(validatePhone(p, true)); }}
            error={phoneError}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tCommon("email")}</label>
          <Input type="email" value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("selectService")}</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.serviceOfferingId}
            onChange={(e) => {
              const svc = services.find((s) => s.id === e.target.value);
              setForm((f) => ({
                ...f,
                serviceOfferingId: e.target.value,
                durationMinutes: svc ? String(svc.durationMinutes) : f.durationMinutes,
              }));
            }}
          >
            <option value="">{t("noService")}</option>
            {services.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tCommon("durationMinutes")}</label>
          <Input type="number" min={15} max={480} step={15} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tCommon("notes")}</label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        {editingAppointment && (
          <div>
            <label className="mb-1 block text-sm font-medium">{tCommon("status")}</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Scheduled">{t("statusScheduled")}</option>
              <option value="Completed">{t("statusCompleted")}</option>
              <option value="Cancelled">{t("statusCancelled")}</option>
              <option value="NoShow">{t("statusNoShow")}</option>
            </select>
          </div>
        )}
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("deleteAppointment")}
        message={t("deleteConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        loading={deleteLoading}
      />
    </div>
  );
}
