"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MessageCircle, Send, RefreshCw, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/lib/store";
import { useApiError } from "@/lib/errors";
import { formatPhoneDisplay } from "@/lib/phone";
import type {
  Branch,
  Customer,
  PagedResult,
  RecipientPreview,
  ServiceCategory,
  ServiceOffering,
  WhatsAppCampaign,
  WhatsAppCampaignDetail,
  WhatsAppTemplate,
} from "@/types";

type TargetType = "all" | "selected" | "branch" | "service" | "category";
type Tab = "compose" | "history";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}</label>;
}

export default function WhatsAppPage() {
  const t = useTranslations("whatsapp");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuthStore();
  const getError = useApiError();
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  const [tab, setTab] = useState<Tab>("compose");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);

  const [message, setMessage] = useState("");
  const [templateKey, setTemplateKey] = useState("custom");
  const [templateLang, setTemplateLang] = useState<"en" | "ar">(locale === "ar" ? "ar" : "en");
  const [target, setTarget] = useState<TargetType>("all");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [preview, setPreview] = useState<RecipientPreview | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<WhatsAppCampaignDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSeq = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAllowed = user?.role === "Admin" || user?.role === "Manager";

  const buildFilterPayload = useCallback(() => ({
    target,
    customerIds: target === "selected" ? selectedCustomerIds : undefined,
    branchId: target === "branch" ? branchId : undefined,
    serviceOfferingId: target === "service" ? serviceId : undefined,
    serviceCategoryId: target === "category" ? categoryId : undefined,
  }), [target, selectedCustomerIds, branchId, serviceId, categoryId]);

  const loadInitial = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const [tpls, custRes, brs, svcs, cats, campRes] = await Promise.all([
        api.get<WhatsAppTemplate[]>("/whatsapp/templates"),
        api.get<PagedResult<Customer>>("/customers?pageSize=200"),
        api.get<Branch[]>("/branches"),
        api.get<ServiceOffering[]>("/services/offerings"),
        api.get<ServiceCategory[]>("/services/categories"),
        api.get<PagedResult<WhatsAppCampaign>>("/whatsapp/campaigns?pageSize=50"),
      ]);
      if (seq !== loadSeq.current) return;
      setTemplates(tpls);
      setCustomers(custRes.items.filter((c) => c.phone));
      setBranches(brs);
      setServices(svcs);
      setCategories(cats);
      setCampaigns(campRes.items);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      toast("error", getError(err, tCommon("noData")));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await api.get<PagedResult<WhatsAppCampaign>>("/whatsapp/campaigns?pageSize=50");
      setCampaigns(res.items);
    } catch (err) {
      toast("error", getError(err, tCommon("noData")));
    }
  };

  useEffect(() => {
    if (isAllowed) loadInitial();
  }, [isAllowed]);

  useEffect(() => {
    if (tab !== "history") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      loadCampaigns().catch(() => {});
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tab]);

  useEffect(() => {
    setPreview(null);
  }, [target, selectedCustomerIds, branchId, serviceId, categoryId]);

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    if (key === "custom") return;
    const tpl = templates.find((t) => t.key === key);
    if (!tpl) return;
    setMessage(templateLang === "ar" ? tpl.bodyAr : tpl.bodyEn);
  };

  useEffect(() => {
    if (templateKey !== "custom") applyTemplate(templateKey);
  }, [templateLang]);

  const previewRecipients = async () => {
    if (target === "selected" && selectedCustomerIds.length === 0) {
      toast("error", t("selectAtLeastOne"));
      return;
    }
    if (target === "branch" && !branchId) { toast("error", t("filterRequired")); return; }
    if (target === "service" && !serviceId) { toast("error", t("filterRequired")); return; }
    if (target === "category" && !categoryId) { toast("error", t("filterRequired")); return; }

    setPreviewLoading(true);
    try {
      const result = await api.post<RecipientPreview>("/whatsapp/recipients/preview", buildFilterPayload());
      setPreview(result);
    } catch (err) {
      toast("error", getError(err, t("noRecipients")));
    } finally {
      setPreviewLoading(false);
    }
  };

  const validateBeforeSend = (): boolean => {
    if (!message.trim()) {
      toast("error", t("messageRequired"));
      return false;
    }
    if (target === "selected" && selectedCustomerIds.length === 0) {
      toast("error", t("selectAtLeastOne"));
      return false;
    }
    if (target === "branch" && !branchId) { toast("error", t("filterRequired")); return false; }
    if (target === "service" && !serviceId) { toast("error", t("filterRequired")); return false; }
    if (target === "category" && !categoryId) { toast("error", t("filterRequired")); return false; }
    return true;
  };

  const handleSendClick = async () => {
    if (!validateBeforeSend()) return;

    let count = preview?.totalCount ?? 0;
    if (!preview) {
      setPreviewLoading(true);
      try {
        const result = await api.post<RecipientPreview>("/whatsapp/recipients/preview", buildFilterPayload());
        setPreview(result);
        count = result.totalCount;
        if (count === 0) {
          toast("error", t("noRecipients"));
          return;
        }
      } catch (err) {
        toast("error", getError(err, t("noRecipients")));
        return;
      } finally {
        setPreviewLoading(false);
      }
    }

    if (count === 0) {
      toast("error", t("noRecipients"));
      return;
    }

    setShowConfirm(true);
  };

  const sendBroadcast = async () => {
    setSending(true);
    try {
      await api.post("/whatsapp/broadcast", {
        body: message.trim(),
        templateType: templateKey === "custom" ? "Custom" : templates.find((x) => x.key === templateKey)?.templateType ?? "Custom",
        ...buildFilterPayload(),
      });
      toast("success", t("sendSuccess"));
      setShowConfirm(false);
      setMessage("");
      setPreview(null);
      setSelectedCustomerIds([]);
      setTab("history");
      await loadCampaigns();
    } catch (err) {
      toast("error", getError(err, t("sendFailed")));
    } finally {
      setSending(false);
    }
  };

  const openCampaignDetail = async (campaign: WhatsAppCampaign) => {
    setDetailLoading(true);
    setDetailCampaign(null);
    try {
      const detail = await api.get<WhatsAppCampaignDetail>(`/whatsapp/campaigns/${campaign.id}`);
      setDetailCampaign(detail);
    } catch (err) {
      toast("error", getError(err, tCommon("noData")));
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Queued: t("statusQueued"),
      Processing: t("statusProcessing"),
      Completed: t("statusCompleted"),
      Failed: t("statusFailed"),
      Cancelled: t("statusCancelled"),
      Sent: t("sent"),
      Pending: t("pending"),
    };
    return map[status] ?? status;
  };

  const statusColor = (status: string) => {
    if (status === "Completed" || status === "Sent") return "text-emerald-600 bg-emerald-50";
    if (status === "Failed") return "text-red-600 bg-red-50";
    if (status === "Processing") return "text-blue-600 bg-blue-50";
    return "text-amber-600 bg-amber-50";
  };

  if (!isAllowed) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        {t("forbidden")}
      </div>
    );
  }

  const recipientCount = preview?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-emerald-600" />
            {t("title")}
          </h1>
          <p className="text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "compose" ? "primary" : "outline"} onClick={() => setTab("compose")}>
            {t("compose")}
          </Button>
          <Button variant={tab === "history" ? "primary" : "outline"} onClick={() => setTab("history")}>
            {t("history")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">{tCommon("loading")}</div>
      ) : tab === "compose" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-800">{t("message")}</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <FieldLabel>{t("template")}</FieldLabel>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={templateKey}
                  onChange={(e) => applyTemplate(e.target.value)}
                >
                  <option value="custom">{t("templateCustom")}</option>
                  {templates.map((tpl) => (
                    <option key={tpl.key} value={tpl.key}>
                      {locale === "ar" ? tpl.nameAr : tpl.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {templateKey !== "custom" && (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={templateLang === "en" ? "primary" : "outline"} onClick={() => setTemplateLang("en")}>
                    {t("useEnglishTemplate")}
                  </Button>
                  <Button type="button" size="sm" variant={templateLang === "ar" ? "primary" : "outline"} onClick={() => setTemplateLang("ar")}>
                    {t("useArabicTemplate")}
                  </Button>
                </div>
              )}

              <div>
                <FieldLabel>{t("message")}</FieldLabel>
                <textarea
                  className="w-full min-h-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm resize-y"
                  placeholder={t("messagePlaceholder")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={4096}
                />
                <p className="text-xs text-slate-400 mt-1 text-end">{message.length}/4096</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-800">{t("recipients")}</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(["all", "selected", "branch", "service", "category"] as TargetType[]).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="target" checked={target === opt} onChange={() => setTarget(opt)} />
                    {t(`target${opt.charAt(0).toUpperCase()}${opt.slice(1)}` as "targetAll")}
                  </label>
                ))}
              </div>

              {target === "branch" && (
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">{t("selectBranch")}</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}

              {target === "service" && (
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  <option value="">{t("selectService")}</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}

              {target === "category" && (
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">{t("selectCategory")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              {target === "selected" && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y">
                  {customers.length === 0 ? (
                    <p className="p-3 text-sm text-slate-400">{tCommon("noData")}</p>
                  ) : customers.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={selectedCustomerIds.includes(c.id)} onChange={() => toggleCustomer(c.id)} />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-slate-400">{formatPhoneDisplay(c.phone)}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={previewRecipients} disabled={previewLoading}>
                  <Users className="h-4 w-4" />
                  {previewLoading ? tCommon("loading") : t("previewRecipients")}
                </Button>
                <Button type="button" onClick={handleSendClick} disabled={sending || !message.trim()}>
                  <Send className="h-4 w-4" />
                  {t("send")}
                </Button>
              </div>

              {preview && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                  <p className="font-medium">{t("recipientCount", { count: preview.totalCount })}</p>
                  {preview.sample.length > 0 && (
                    <ul className="mt-2 space-y-1 text-emerald-700">
                      {preview.sample.map((r) => (
                        <li key={r.customerId}>{r.name} — {formatPhoneDisplay(r.phone)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="font-semibold text-slate-800">{t("history")}</h2>
            <Button variant="outline" size="sm" onClick={loadCampaigns}>
              <RefreshCw className="h-4 w-4" />
              {t("refresh")}
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={campaigns}
              keyExtractor={(c) => c.id}
              emptyMessage={t("noCampaigns")}
              columns={[
                { key: "name", header: t("campaignName"), render: (c) => c.name },
                {
                  key: "status",
                  header: t("status"),
                  render: (c) => (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  ),
                },
                {
                  key: "progress",
                  header: t("totalRecipients"),
                  render: (c) => (
                    <span className="text-sm">
                      {t("progress", { sent: c.sentCount, failed: c.failedCount, pending: c.pendingCount })}
                    </span>
                  ),
                },
                {
                  key: "createdAt",
                  header: tCommon("date"),
                  render: (c) => new Date(c.createdAt).toLocaleString(dateLocale),
                },
                { key: "createdBy", header: t("createdBy"), render: (c) => c.createdByName },
                {
                  key: "actions",
                  header: tCommon("actions"),
                  render: (c) => (
                    <Button variant="ghost" size="sm" onClick={() => openCampaignDetail(c)}>
                      <Eye className="h-4 w-4" />
                      {t("viewDetails")}
                    </Button>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={sendBroadcast}
        title={t("confirmTitle")}
        message={t("confirmMessage", { count: recipientCount || "..." })}
        confirmLabel={t("send")}
        cancelLabel={tCommon("cancel")}
        loading={sending}
        variant="warning"
        warning={t("confirmWarning")}
        confirmDisabled={recipientCount === 0}
      />

      <Dialog
        open={!!detailCampaign || detailLoading}
        onClose={() => setDetailCampaign(null)}
        title={detailCampaign ? t("campaignDetails") : tCommon("loading")}
      >
        {detailLoading && !detailCampaign ? (
          <p className="text-slate-400 py-4">{tCommon("loading")}</p>
        ) : detailCampaign ? (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <p><span className="font-medium">{t("campaignName")}:</span> {detailCampaign.name}</p>
              <p><span className="font-medium">{t("status")}:</span> {statusLabel(detailCampaign.status)}</p>
              <p>{t("progress", { sent: detailCampaign.sentCount, failed: detailCampaign.failedCount, pending: detailCampaign.pendingCount })}</p>
              <p className="whitespace-pre-wrap border-t pt-2 mt-2">{detailCampaign.body}</p>
            </div>
            <h3 className="font-medium text-slate-800">{t("messageLog")}</h3>
            <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {detailCampaign.messages.map((m) => (
                <div key={m.id} className="px-3 py-2 text-sm flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.customerName}</p>
                    <p className="text-slate-400">{formatPhoneDisplay(m.phone)}</p>
                    {m.errorMessage && <p className="text-red-500 text-xs mt-1">{m.errorMessage}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(m.status)}`}>
                    {statusLabel(m.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
