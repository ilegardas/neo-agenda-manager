import { useState, useEffect, useRef } from "react";
import { useAvailabilityRules, useDeleteAvailabilityRule } from "@/hooks/use-availability";
import { useAppointments, useUpdateAppointment, useDeleteAppointment } from "@/hooks/use-appointments";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useUser, useAuth } from "@/hooks/use-auth";
import { AvailabilityForm } from "@/components/AvailabilityForm";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, CheckCircle, XCircle, Clock, Calendar, Settings, Pencil, MessageCircle, Save, LogOut, Users, Link2, Copy, ChevronDown, ArrowLeft, ExternalLink, CreditCard, Loader2, Crown, AlertCircle, UserCircle, Upload, Camera, Sun, Moon, UtensilsCrossed, Plus, ImagePlus, Package, Eye, EyeOff, FileSpreadsheet, Search, Download, BarChart3, X, UserCheck, Images, ZoomIn, ChevronLeft, ChevronRight, Globe, Palette, Layout, RotateCcw, MapPin, Printer, QrCode, NotebookPen, ClipboardList } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AttendanceTab } from "@/components/AttendanceTab";
import { MinutasTab } from "@/components/MinutasTab";
import { ChecklistTab } from "@/components/ChecklistTab";
import { SiWhatsapp, SiFacebook, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa";
import { useTheme } from "@/hooks/use-theme";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Appointment } from "@shared/schema";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useSubscription, usePlans, useCheckout, useCustomerPortal } from "@/hooks/use-subscription";
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/use-menu";

const DAYS = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  booked: "Pendiente",
};

const MASTER_EMAIL = 'hackedbydymo@gmail.com';

interface AdminProps {
  viewingUserId?: string;
}

export default function Admin({ viewingUserId }: AdminProps) {
  const { data: user } = useUser();
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const isAdmin = user?.role === "admin";
  const isMaster = user?.email === MASTER_EMAIL;
  const isViewingOther = !!viewingUserId && viewingUserId !== user?.id;
  const targetUserId = viewingUserId || user?.id || "";

  const myDisplayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email || 'Usuario' : 'Usuario';
  const initials = myDisplayName.substring(0, 2).toUpperCase();
  const { theme, toggleTheme } = useTheme();

  const { data: viewingUserInfo } = useQuery({
    queryKey: ['/api/users', viewingUserId, 'info'],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.public.userInfo.path, { userId: viewingUserId! }));
      if (!res.ok) throw new Error("Usuario no encontrado");
      return res.json() as Promise<{ id: string; name: string; email: string }>;
    },
    enabled: isViewingOther,
  });

  const viewingName = isViewingOther ? (viewingUserInfo?.name || 'Usuario') : myDisplayName;

  const adminRulesQuery = useQuery({
    queryKey: ['/api/admin/users', targetUserId, 'availability'],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.admin.userAvailability.path, { userId: targetUserId }), { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: isViewingOther,
  });

  const ownRulesQuery = useAvailabilityRules();
  const rules = isViewingOther ? adminRulesQuery.data : ownRulesQuery.data;
  const rulesLoading = isViewingOther ? adminRulesQuery.isLoading : ownRulesQuery.isLoading;

  const adminApptsQuery = useQuery({
    queryKey: ['/api/admin/users', targetUserId, 'appointments'],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.admin.userAppointments.path, { userId: targetUserId }), { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      return data.map((apt: any) => ({
        ...apt,
        startTime: new Date(apt.startTime),
        endTime: new Date(apt.endTime),
        createdAt: apt.createdAt ? new Date(apt.createdAt) : null,
      }));
    },
    enabled: isViewingOther,
  });

  const ownApptsQuery = useAppointments();
  const appointments = isViewingOther ? adminApptsQuery.data : ownApptsQuery.data;
  const aptLoading = isViewingOther ? adminApptsQuery.isLoading : ownApptsQuery.isLoading;

  const adminSettingsQuery = useQuery({
    queryKey: ['/api/admin/users', targetUserId, 'settings'],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.admin.userSettings.path, { userId: targetUserId }), { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Error");
      return res.json() as Promise<Record<string, string>>;
    },
    enabled: isViewingOther,
  });

  const ownSettingsQuery = useSettings();
  const settingsData = isViewingOther ? adminSettingsQuery.data : ownSettingsQuery.data;

  const adminUpdateSettings = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch(buildUrl(api.admin.updateUserSettings.path, { userId: targetUserId }), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', targetUserId, 'settings'] });
      toast({ title: "Configuración Guardada" });
    },
  });

  const ownUpdateSettings = useUpdateSettings();
  const updateSettings = isViewingOther ? adminUpdateSettings : ownUpdateSettings;

  const adminDeleteRule = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.deleteUserAvailability.path, { userId: targetUserId, id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Error");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', targetUserId, 'availability'] });
      toast({ title: "Regla Eliminada" });
    },
  });

  const ownDeleteRule = useDeleteAvailabilityRule();
  const deleteRule = isViewingOther ? adminDeleteRule : ownDeleteRule;

  const adminUpdateApt = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Record<string, any>) => {
      const url = buildUrl(api.admin.updateUserAppointment.path, { userId: targetUserId, id });
      const payload = { ...updates };
      if (payload.startTime instanceof Date) payload.startTime = payload.startTime.toISOString();
      if (payload.endTime instanceof Date) payload.endTime = payload.endTime.toISOString();
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', targetUserId, 'appointments'] });
      toast({ title: "Cita Actualizada" });
    },
  });

  const ownUpdateApt = useUpdateAppointment();
  const updateApt = isViewingOther ? adminUpdateApt : ownUpdateApt;

  const adminDeleteApt = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.deleteUserAppointment.path, { userId: targetUserId, id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Error");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', targetUserId, 'appointments'] });
      toast({ title: "Cita Cancelada" });
    },
  });

  const ownDeleteApt = useDeleteAppointment();
  const deleteApt = isViewingOther ? adminDeleteApt : ownDeleteApt;

  const { data: allUsers } = useQuery({
    queryKey: [api.admin.users.path],
    queryFn: async () => {
      const res = await fetch(api.admin.users.path, { credentials: "include" });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: isMaster,
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      const res = await fetch(buildUrl(api.admin.updateUserRole.path, { userId }), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al actualizar rol');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      toast({ title: "Rol actualizado correctamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const grantTrial = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(buildUrl(api.admin.grantTrial.path, { userId }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al otorgar período de prueba');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      const end = new Date(data.trialEndsAt);
      toast({ title: "Prueba otorgada", description: `Período de prueba activo hasta el ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(buildUrl(api.admin.deleteUser.path, { userId }), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al eliminar usuario');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.users.path] });
      toast({ title: "Usuario eliminado", description: "El usuario y todos sus datos han sido eliminados." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [activeTab, setActiveTab] = useState("appointments");
  const [pollingSubscription, setPollingSubscription] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const { data: subscriptionStatus } = useSubscription();
  const { data: plansData } = usePlans();
  const checkout = useCheckout();
  const portal = useCustomerPortal();

  const isSubscriptionActive = subscriptionStatus?.status === 'active' || subscriptionStatus?.isAdmin;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subResult = params.get("subscription");

    if (subResult === "success") {
      setActiveTab("subscription");
      window.history.replaceState({}, "", "/admin");
      setPollingSubscription(true);
      toast({ title: "Verificando pago…", description: "Confirmando tu suscripción con Stripe." });
    } else if (subResult === "cancelled") {
      setActiveTab("subscription");
      window.history.replaceState({}, "", "/admin");
      toast({ title: "Pago cancelado", description: "No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.", variant: "destructive" });
    }
  }, []);

  useEffect(() => {
    if (!pollingSubscription) return;
    if (subscriptionStatus?.status === "active") {
      setPollingSubscription(false);
      setPollingAttempts(0);
      toast({ title: "¡Suscripción activada!", description: "Tu suscripción está activa. Tu enlace de reservas ya es público." });
      return;
    }
    if (pollingAttempts >= 15) {
      setPollingSubscription(false);
      setPollingAttempts(0);
      toast({ title: "Verifica tu suscripción", description: "El pago puede tardar unos minutos en procesarse. Recarga la página en un momento.", variant: "destructive" });
      return;
    }
    const timer = setTimeout(() => {
      setPollingAttempts((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: [api.subscription.status.path] });
    }, 3000);
    return () => clearTimeout(timer);
  }, [pollingSubscription, subscriptionStatus, pollingAttempts]);

  function handleCheckout(plan: string) {
    checkout.mutate(plan, {
      onSuccess: (data) => {
        if (data.url) window.location.href = data.url;
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  function handlePortal() {
    portal.mutate(undefined, {
      onSuccess: (data) => {
        if (data.url) window.location.href = data.url;
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");

  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  const [landingBgColor, setLandingBgColor] = useState("#0f172a");
  const [landingContainerColor, setLandingContainerColor] = useState("#1e293b");
  const [landingTextColor, setLandingTextColor] = useState("#ffffff");
  const [landingFont, setLandingFont] = useState("inter");
  const [landingShowCatalog, setLandingShowCatalog] = useState(true);
  const [landingShowMenu, setLandingShowMenu] = useState(true);
  const [landingShowBooking, setLandingShowBooking] = useState(true);

  const settingsInitKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!settingsData) return;
    const initKey = targetUserId || "self";
    if (settingsInitKeyRef.current === initKey) return;
    settingsInitKeyRef.current = initKey;
    setWhatsappPhone(settingsData.whatsapp_phone || "");
    setWhatsappMessage(settingsData.whatsapp_message || "");
    setProfileName(settingsData.profile_name || "");
    setProfileDescription(settingsData.profile_description || "");
    setProfileImage(settingsData.profile_image || "");
    setSocialFacebook(settingsData.social_facebook || "");
    setSocialInstagram(settingsData.social_instagram || "");
    setSocialTiktok(settingsData.social_tiktok || "");
    setSocialYoutube(settingsData.social_youtube || "");
    setSocialLinkedin(settingsData.social_linkedin || "");
      setGoogleMapsUrl(settingsData.google_maps_url || "");
    setLandingBgColor(settingsData.landing_bg_color || "#0f172a");
    setLandingContainerColor(settingsData.landing_container_color || "#1e293b");
    setLandingTextColor(settingsData.landing_text_color || "#ffffff");
    setLandingFont(settingsData.landing_font || "inter");
    setLandingShowCatalog(settingsData.landing_show_catalog !== "false");
    setLandingShowMenu(settingsData.landing_show_menu !== "false");
    setLandingShowBooking(settingsData.landing_show_booking !== "false");
  }, [settingsData, targetUserId]);

  function handleSaveWhatsappSettings() {
    updateSettings.mutate({
      whatsapp_phone: whatsappPhone,
      whatsapp_message: whatsappMessage,
    });
  }

  function compressImage(file: File, maxWidth: number = 400, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas error"));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen.", variant: "destructive" });
      return;
    }
    setImageUploading(true);
    try {
      const compressed = await compressImage(file);
      setProfileImage(compressed);
    } catch {
      toast({ title: "Error", description: "No se pudo procesar la imagen.", variant: "destructive" });
    } finally {
      setImageUploading(false);
    }
  }

  function handleSaveProfile() {
    updateSettings.mutate({
      profile_name: profileName,
      profile_description: profileDescription,
      profile_image: profileImage,
      social_facebook: socialFacebook,
      social_instagram: socialInstagram,
      social_tiktok: socialTiktok,
      social_youtube: socialYoutube,
      social_linkedin: socialLinkedin,
      google_maps_url: googleMapsUrl,
    });
  }

  function handleRemoveImage() {
    setProfileImage("");
  }

  const { data: menuItemsData, isLoading: menuLoading } = useMenuItems();
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();

  const [menuLegend, setMenuLegend] = useState("");
  const [menuForm, setMenuForm] = useState({ name: "", description: "", price: "", imageData: "" });
  const [menuImageUploading, setMenuImageUploading] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<number | null>(null);
  const [editMenuForm, setEditMenuForm] = useState({ name: "", description: "", price: "", imageData: "" });

  useEffect(() => {
    if (settingsData) {
      setMenuLegend(settingsData.menu_legend || "");
    }
  }, [settingsData]);

  async function handleMenuImageUpload(e: React.ChangeEvent<HTMLInputElement>, isEdit = false) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen.", variant: "destructive" });
      return;
    }
    setMenuImageUploading(true);
    try {
      const compressed = await compressImage(file, 600, 0.75);
      if (isEdit) setEditMenuForm(prev => ({ ...prev, imageData: compressed }));
      else setMenuForm(prev => ({ ...prev, imageData: compressed }));
    } catch {
      toast({ title: "Error", description: "No se pudo procesar la imagen.", variant: "destructive" });
    } finally {
      setMenuImageUploading(false);
    }
  }

  function handleAddMenuItem() {
    if (!menuForm.name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    const price = parseInt(menuForm.price, 10);
    if (isNaN(price) || price < 0) {
      toast({ title: "Error", description: "El precio debe ser un número válido.", variant: "destructive" });
      return;
    }
    createMenuItem.mutate({
      name: menuForm.name.trim(),
      description: menuForm.description.trim() || undefined,
      price,
      imageData: menuForm.imageData || undefined,
      sortOrder: (menuItemsData?.length ?? 0),
      available: true,
    } as any, {
      onSuccess: () => {
        setMenuForm({ name: "", description: "", price: "", imageData: "" });
        toast({ title: "Producto agregado" });
      },
    });
  }

  function startEditMenuItem(item: any) {
    setEditingMenuItem(item.id);
    setEditMenuForm({ name: item.name, description: item.description || "", price: String(item.price), imageData: item.imageData || "" });
  }

  function handleUpdateMenuItem() {
    if (!editingMenuItem) return;
    const price = parseInt(editMenuForm.price, 10);
    if (isNaN(price) || price < 0) {
      toast({ title: "Error", description: "El precio debe ser un número válido.", variant: "destructive" });
      return;
    }
    updateMenuItem.mutate({
      id: editingMenuItem,
      name: editMenuForm.name.trim(),
      description: editMenuForm.description.trim() || undefined,
      price,
      imageData: editMenuForm.imageData || undefined,
    } as any, {
      onSuccess: () => {
        setEditingMenuItem(null);
        toast({ title: "Producto actualizado" });
      },
    });
  }

  function handleSaveMenuLegend() {
    updateSettings.mutate({ menu_legend: menuLegend });
  }

  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [reportSearch, setReportSearch] = useState("");

  const reportRows = (() => {
    const all = (appointments ?? []) as (Appointment & { startTime: Date; endTime: Date })[];
    return all
      .filter((apt) => apt.status === "confirmed")
      .filter((apt) => {
        if (reportDateFrom) {
          const from = new Date(reportDateFrom);
          from.setHours(0, 0, 0, 0);
          if (new Date(apt.startTime) < from) return false;
        }
        if (reportDateTo) {
          const to = new Date(reportDateTo);
          to.setHours(23, 59, 59, 999);
          if (new Date(apt.startTime) > to) return false;
        }
        if (reportSearch.trim()) {
          const q = reportSearch.toLowerCase();
          if (
            !apt.customerName.toLowerCase().includes(q) &&
            !(apt.customerPhone ?? "").toLowerCase().includes(q)
          ) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  })();

  const reportTotal = reportRows.reduce((sum, apt) => sum + (apt.amount ?? 0), 0);

  function exportToExcel() {
    import("xlsx").then((XLSX) => {
      const data = reportRows.map((apt) => ({
        Fecha: format(new Date(apt.startTime), "dd/MM/yyyy", { locale: es }),
        Hora: format(new Date(apt.startTime), "h:mm a"),
        Cliente: apt.customerName,
        Teléfono: apt.customerPhone ?? "",
        Notas: apt.notes ?? "",
        "Monto ($)": apt.amount ?? 0,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte de Citas");
      const fileName = `reporte_citas_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(wb, fileName);
    });
  }

  const [amountValues, setAmountValues] = useState<Record<number, string>>({});

  useEffect(() => {
    if (appointments) {
      setAmountValues(prev => {
        const next = { ...prev };
        appointments.forEach((apt: any) => {
          if (apt.amount != null && !(apt.id in next)) {
            next[apt.id] = String(apt.amount);
          }
        });
        return next;
      });
    }
  }, [appointments]);

  function handleSaveAmount(aptId: number) {
    const val = amountValues[aptId];
    const amount = val !== undefined && val !== "" ? parseInt(val, 10) : null;
    updateApt.mutate({ id: aptId, amount } as any);
  }

  const [editingApt, setEditingApt] = useState<(Appointment & { startTime: Date; endTime: Date }) | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  function openEditDialog(apt: Appointment & { startTime: Date; endTime: Date }) {
    setEditingApt(apt);
    setEditDate(format(new Date(apt.startTime), "yyyy-MM-dd"));
    setEditStartTime(format(new Date(apt.startTime), "HH:mm"));
    setEditEndTime(format(new Date(apt.endTime), "HH:mm"));
  }

  function handleSaveTime() {
    if (!editingApt) return;
    const newStart = new Date(`${editDate}T${editStartTime}:00`);
    const newEnd = new Date(`${editDate}T${editEndTime}:00`);
    if (newEnd <= newStart) return;
    updateApt.mutate(
      { id: editingApt.id, startTime: newStart, endTime: newEnd },
      { onSuccess: () => setEditingApt(null) }
    );
  }

  const bookingUrl = `${window.location.origin}/book/${targetUserId}`;
  const catalogUrl = `${window.location.origin}/catalog/${targetUserId}`;

  function copyBookingLink() {
    navigator.clipboard.writeText(bookingUrl);
    toast({ title: "¡Enlace Copiado!", description: "El enlace de reservas ha sido copiado al portapapeles." });
  }

  function copyCatalogLink() {
    navigator.clipboard.writeText(catalogUrl);
    toast({ title: "¡Enlace Copiado!", description: "El enlace del catálogo ha sido copiado al portapapeles." });
  }

  const landingUrl = `${window.location.origin}/landing/${targetUserId}`;

  function copyLandingLink() {
    navigator.clipboard.writeText(landingUrl);
    toast({ title: "¡Enlace Copiado!", description: "El enlace de tu landing page ha sido copiado." });
  }

  function handleSaveLandingSettings() {
    updateSettings.mutate({
      landing_bg_color: landingBgColor,
      landing_container_color: landingContainerColor,
      landing_text_color: landingTextColor,
      landing_font: landingFont,
      landing_show_catalog: landingShowCatalog ? "true" : "false",
      landing_show_menu: landingShowMenu ? "true" : "false",
      landing_show_booking: landingShowBooking ? "true" : "false",
    });
  }

  const LANDING_THEMES = [
    {
      id: "dark",
      name: "Oscuro Tech",
      desc: "Tecnología & digital",
      bgColor: "#0f172a",
      containerColor: "#1e293b",
      textColor: "#ffffff",
      font: "inter",
      preview: ["#0f172a", "#1e293b", "#38bdf8"],
    },
    {
      id: "pro",
      name: "Profesional",
      desc: "Corporativo & consultoría",
      bgColor: "#0a192f",
      containerColor: "#1e3461",
      textColor: "#e2e8f0",
      font: "montserrat",
      preview: ["#0a192f", "#1e3461", "#64b5f6"],
    },
    {
      id: "fem",
      name: "Femenino",
      desc: "Belleza & bienestar",
      bgColor: "#3b0764",
      containerColor: "#7e22ce",
      textColor: "#fce7f3",
      font: "playfair",
      preview: ["#3b0764", "#7e22ce", "#f9a8d4"],
    },
  ] as const;

  function applyLandingTheme(theme: typeof LANDING_THEMES[number]) {
    setLandingBgColor(theme.bgColor);
    setLandingContainerColor(theme.containerColor);
    setLandingTextColor(theme.textColor);
    setLandingFont(theme.font);
  }

  function handleResetLandingDefaults() {
    setLandingBgColor("#0f172a");
    setLandingContainerColor("#1e293b");
    setLandingTextColor("#ffffff");
    setLandingFont("inter");
    setLandingShowCatalog(true);
    setLandingShowMenu(true);
    setLandingShowBooking(true);
  }

  // ── Catalog ──────────────────────────────────────────────────────────────────
  const { data: catalogPhotosData = [], isLoading: catalogLoading } = useQuery<{ id: number; userId: string; caption: string | null; sortOrder: number; createdAt: string | null }[]>({
    queryKey: [api.catalog.list.path],
    queryFn: async () => {
      const res = await fetch(api.catalog.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });

  const addCatalogPhoto = useMutation({
    mutationFn: async (data: { imageData: string; caption?: string }) => {
      const body = JSON.stringify({ ...data, sortOrder: catalogPhotosData.length });
      const bodySizeMB = new Blob([body]).size / (1024 * 1024);
      if (bodySizeMB > 4.5) throw new Error("La imagen es demasiado grande. Intenta con una foto de menor resolución.");
      const res = await fetch(api.catalog.add.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      });
      if (res.status === 413) throw new Error("La imagen es demasiado grande para el servidor.");
      if (!res.ok) throw new Error("Error al subir foto");
      return res.json();
    },
    onSuccess: (newPhoto) => {
      queryClient.setQueryData<{ id: number; userId: string; caption: string | null; sortOrder: number; createdAt: string | null }[]>(
        [api.catalog.list.path],
        (old = []) => [...old, newPhoto]
      );
      queryClient.invalidateQueries({ queryKey: [api.catalog.list.path] });
    },
  });

  const deleteCatalogPhoto = useMutation({
    mutationFn: async (id: number) => {
      const url = api.catalog.delete.path.replace(":id", String(id));
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.catalog.list.path] }),
    onError: () => toast({ title: "Error", description: "No se pudo eliminar la foto.", variant: "destructive" }),
  });

  const [catalogLightbox, setCatalogLightbox] = useState<number | null>(null);
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [catalogUploadCount, setCatalogUploadCount] = useState({ done: 0, total: 0 });

  async function handleCatalogUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files || []).filter(f =>
      f.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|tiff?)$/i.test(f.name)
    );
    if (!files.length) return;
    setCatalogUploading(true);
    setCatalogUploadCount({ done: 0, total: files.length });
    let successCount = 0;
    const errors: string[] = [];
    for (const file of files) {
      try {
        const compressed = await compressImage(file, 600, 0.72);
        await addCatalogPhoto.mutateAsync({ imageData: compressed });
        successCount++;
        setCatalogUploadCount(prev => ({ ...prev, done: prev.done + 1 }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        errors.push(`${file.name}: ${msg}`);
      }
    }
    setCatalogUploading(false);
    setCatalogUploadCount({ done: 0, total: 0 });
    input.value = "";
    if (successCount > 0) {
      toast({ title: `${successCount} foto${successCount > 1 ? "s" : ""} subida${successCount > 1 ? "s" : ""} correctamente` });
    }
    if (errors.length > 0) {
      toast({ title: "Algunas fotos no se pudieron subir", description: errors.join("\n"), variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isViewingOther && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
                className="text-gray-500 hover:text-gray-900"
                data-testid="button-back-admin"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-xl font-bold font-display text-gray-900">
              {isViewingOther ? `Panel de ${viewingName}` : "Panel de Control"}
            </h1>
            {isViewingOther && (
              <Badge variant="outline" className="text-xs">Vista Admin</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isMaster && allUsers && allUsers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-user-switcher">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Usuarios</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Cambiar Panel</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/admin")}
                    className={cn("cursor-pointer", !isViewingOther && "bg-primary/5 font-medium")}
                    data-testid="menu-item-my-dashboard"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{myDisplayName}</p>
                        <p className="text-xs text-muted-foreground">Mi Panel</p>
                      </div>
                      {!isViewingOther && <Badge variant="secondary" className="text-[10px] shrink-0">Activo</Badge>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {allUsers.filter((u: any) => u.id !== user?.id).map((u: any) => (
                    <DropdownMenuItem
                      key={u.id}
                      onClick={() => navigate(`/admin/user/${u.id}`)}
                      className={cn("cursor-pointer", viewingUserId === u.id && "bg-primary/5 font-medium")}
                      data-testid={`menu-item-user-${u.id}`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[10px] shrink-0">
                          {(u.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{u.name || 'Proveedor'}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email || 'Sin correo'}</p>
                        </div>
                        {viewingUserId === u.id && <Badge variant="secondary" className="text-[10px] shrink-0">Activo</Badge>}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-800" data-testid="button-profile-menu">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">{myDisplayName}</span>
                  {isMaster ? (
                    <Badge className="text-xs bg-amber-500 hover:bg-amber-500 hidden sm:inline-flex">Master</Badge>
                  ) : isAdmin ? (
                    <Badge variant="secondary" className="text-xs hidden sm:inline-flex">Admin</Badge>
                  ) : null}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  {myDisplayName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!isViewingOther && (
                  <DropdownMenuItem onClick={() => setActiveTab("profile")} className="cursor-pointer" data-testid="menu-item-perfil">
                    <UserCircle className="w-4 h-4 mr-2" />
                    Perfil
                  </DropdownMenuItem>
                )}
                {!isViewingOther && (
                  <DropdownMenuItem onClick={() => setActiveTab("subscription")} className="cursor-pointer" data-testid="menu-item-suscripcion">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Suscripción
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer" data-testid="button-toggle-theme">
                  {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {theme === "dark" ? "Modo claro" : "Modo oscuro"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-600 focus:text-red-600" data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1.5 rounded-xl border shadow-sm flex flex-wrap gap-0.5 h-auto w-full">
            <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Citas</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>Disponibilidad</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
              <span>Menú</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-catalog">
              <Images className="w-3.5 h-3.5 shrink-0" />
              <span>Catálogo</span>
            </TabsTrigger>
            <TabsTrigger value="asistencias" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-asistencias">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Asistencias</span>
            </TabsTrigger>
            <TabsTrigger value="minutas" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-minutas">
              <NotebookPen className="w-3.5 h-3.5 shrink-0" />
              <span>Minutas</span>
            </TabsTrigger>
            <TabsTrigger value="checklists" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-checklists">
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>Checklist</span>
            </TabsTrigger>
            {!isViewingOther && (
              <TabsTrigger value="landing" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-landing">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>Landing</span>
              </TabsTrigger>
            )}
            {isMaster && !isViewingOther && (
              <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Usuarios</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium px-2.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Reportes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-4 md:grid-cols-3">
               <Card className="bg-white border-border/50 shadow-sm">
                 <CardContent className="p-6 flex items-center gap-4">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                     <Calendar className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground font-medium">Total de Reservas</p>
                     <p className="text-2xl font-bold font-display">{appointments?.length || 0}</p>
                   </div>
                 </CardContent>
               </Card>
               <Card className="bg-white border-border/50 shadow-sm">
                 <CardContent className="p-6 flex items-center gap-4">
                   <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                     <CheckCircle className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground font-medium">Confirmadas</p>
                     <p className="text-2xl font-bold font-display">
                        {appointments?.filter((a: any) => a.status === 'confirmed').length || 0}
                     </p>
                   </div>
                 </CardContent>
               </Card>
               <Card className="bg-white border-border/50 shadow-sm">
                 <CardContent className="p-6 flex items-center gap-4">
                   <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                     <Clock className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground font-medium">Pendientes</p>
                     <p className="text-2xl font-bold font-display">
                       {appointments?.filter((a: any) => a.status === 'booked').length || 0}
                     </p>
                   </div>
                 </CardContent>
               </Card>
            </div>

            <Card className="border-border/50 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-gray-50/50 border-b border-border/50">
                <CardTitle className="font-display text-lg">Lista de Citas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {aptLoading ? (
                   <div className="p-8 text-center text-muted-foreground">Cargando citas...</div>
                ) : appointments?.length === 0 ? (
                   <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                     <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                       <Calendar className="w-8 h-8 text-gray-400" />
                     </div>
                     <p>No se encontraron citas.</p>
                   </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {appointments?.map((apt: any) => (
                      <div key={apt.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <h3 className="font-semibold text-gray-900">{apt.customerName}</h3>
                             <Badge
                                variant="outline"
                                className={cn(
                                  "capitalize border-transparent font-medium",
                                  apt.status === 'confirmed' ? "bg-green-100 text-green-700" :
                                  apt.status === 'cancelled' ? "bg-red-100 text-red-700" :
                                  "bg-orange-100 text-orange-700"
                                )}
                             >
                               {STATUS_LABELS[apt.status] || apt.status}
                             </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(apt.startTime), "d 'de' MMM, yyyy", { locale: es })}
                            </span>
                            <span className="hidden sm:inline">&bull;</span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(apt.startTime), "h:mm a")} - {format(new Date(apt.endTime), "h:mm a")}
                            </span>
                          </div>
                          {apt.customerPhone && (
                            <p className="text-xs text-gray-500">{apt.customerPhone}</p>
                          )}
                          {apt.notes && (
                            <p className="text-sm bg-gray-50 p-2 rounded-md mt-2 border border-border/50 text-gray-600">
                              <span className="font-medium text-xs uppercase tracking-wide text-gray-400 block mb-0.5">Nota</span>
                              {apt.notes}
                            </p>
                          )}
                          {apt.status === 'confirmed' && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-medium text-gray-500">Monto ganado:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 font-medium">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  data-testid={`input-amount-${apt.id}`}
                                  className="w-24 text-sm border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                                  value={amountValues[apt.id] ?? ""}
                                  onChange={(e) => setAmountValues(prev => ({ ...prev, [apt.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAmount(apt.id)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                                  data-testid={`button-save-amount-${apt.id}`}
                                  onClick={() => handleSaveAmount(apt.id)}
                                  disabled={updateApt.isPending}
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {apt.customerPhone && (
                            <a
                              href={`https://wa.me/52${apt.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customerName}, te contactamos sobre tu cita del ${format(new Date(apt.startTime), "d 'de' MMMM", { locale: es })} a las ${format(new Date(apt.startTime), "h:mm a")}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`link-whatsapp-${apt.id}`}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"
                              >
                                <SiWhatsapp className="w-4 h-4 mr-1.5" /> WhatsApp
                              </Button>
                            </a>
                          )}
                          {apt.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                              data-testid={`button-edit-time-${apt.id}`}
                              onClick={() => openEditDialog(apt)}
                            >
                              <Pencil className="w-4 h-4 mr-1.5" /> Editar Hora
                            </Button>
                          )}
                          {apt.status !== 'confirmed' && apt.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              onClick={() => updateApt.mutate({ id: apt.id, status: 'confirmed' })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1.5" /> Confirmar
                            </Button>
                          )}
                          {apt.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                              onClick={() => deleteApt.mutate(apt.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1.5" /> Cancelar
                            </Button>
                          )}
                          {apt.status === 'cancelled' && (
                            <Button size="sm" variant="ghost" disabled>Cancelada</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Booking link */}
            {!isSubscriptionActive && !isViewingOther && (
              <Card className="bg-amber-50 border-amber-200 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-900">Tu enlace de reservas es privado</p>
                      <p className="text-sm text-amber-700">Activa un plan de suscripción para publicar tu página de reservas y que tus clientes puedan agendar citas.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="bg-white border-border/50 shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{isViewingOther ? "Enlace de reservas:" : "Tu enlace de reservas:"}</span>
                  <code className="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono" data-testid="text-booking-link">
                    {bookingUrl}
                  </code>
                  {!isSubscriptionActive && !isViewingOther && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Privado</Badge>
                  )}
                  {isSubscriptionActive && (
                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">Público</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={copyBookingLink} data-testid="button-copy-link">
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                  </Button>
                  <a href={`/book/${targetUserId}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" data-testid="button-open-booking">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-border/50 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-border/50">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  Configuración de WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone">Número de Teléfono (con código de país)</Label>
                  <Input
                    id="whatsapp-phone"
                    placeholder="ej. 521234567890"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    data-testid="input-whatsapp-phone"
                  />
                  <p className="text-xs text-muted-foreground">Sin + ni espacios. Ejemplo: 521234567890</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-message">Mensaje Predeterminado</Label>
                  <Textarea
                    id="whatsapp-message"
                    placeholder="¡Hola! Acabo de reservar una cita..."
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    className="min-h-[80px] resize-none"
                    data-testid="input-whatsapp-message"
                  />
                  <p className="text-xs text-muted-foreground">Este mensaje se pre-llenará cuando el cliente abra WhatsApp después de reservar.</p>
                </div>
                <Button
                  onClick={handleSaveWhatsappSettings}
                  disabled={updateSettings.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-save-whatsapp"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {updateSettings.isPending ? "Guardando..." : "Guardar Configuración de WhatsApp"}
                </Button>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
               <div className="lg:col-span-1 space-y-6">
                 <div>
                    <h3 className="text-lg font-display font-bold mb-2">Agregar Nueva Regla</h3>
                    <p className="text-sm text-muted-foreground mb-4">Define horarios de trabajo estándar o descansos para cada día de la semana.</p>
                 </div>
                 <AvailabilityForm targetUserId={isViewingOther ? targetUserId : undefined} />
               </div>

               <div className="lg:col-span-2">
                 <Card className="bg-white border-border/50 shadow-sm h-full">
                    <CardHeader className="bg-gray-50/50 border-b border-border/50">
                      <CardTitle className="font-display text-lg">Reglas Actuales</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {rulesLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Cargando reglas...</div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {rules?.sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek).map((rule: any) => (
                            <div key={rule.id} className="p-4 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border",
                                  rule.isBreak
                                    ? "bg-gray-100 text-gray-500 border-gray-200"
                                    : "bg-primary/10 text-primary border-primary/20"
                                )}>
                                  {DAYS[rule.dayOfWeek].substring(0, 3)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{rule.label || (rule.isBreak ? "Descanso" : "Disponible")}</p>
                                    {rule.isBreak && <Badge variant="secondary" className="text-xs">Bloqueado</Badge>}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{rule.startTime} - {rule.endTime}</span>
                                  </div>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => deleteRule.mutate(rule.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {(!rules || rules.length === 0) && (
                            <div className="p-8 text-center text-muted-foreground italic">
                              Aún no se han definido reglas de disponibilidad.
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                 </Card>
               </div>
            </div>
          </TabsContent>

          <TabsContent value="menu" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-white border-border/50 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                    Menú Digital
                  </CardTitle>
                  <a
                    href={`/menu/${targetUserId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    data-testid="link-public-menu"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver menú público
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10 text-sm">
                  <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-gray-600 flex-1 truncate">{window.location.origin}/menu/{targetUserId}</span>
                  <button
                    data-testid="button-copy-menu-link"
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/menu/${targetUserId}`); toast({ title: "Enlace copiado" }); }}
                    className="text-primary hover:text-primary/80 flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* QR Code generator */}
                <div className="rounded-xl border border-border/50 bg-gray-50/60 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <QrCode className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-gray-700">Código QR del Menú</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* QR code */}
                    <div
                      id="menu-qr-print-area"
                      className="bg-white p-4 rounded-xl shadow-sm border border-border/40 flex flex-col items-center gap-3"
                    >
                      <QRCodeSVG
                        value={`${window.location.origin}/menu/${targetUserId}`}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                        level="H"
                        includeMargin={false}
                      />
                      <p className="text-xs text-gray-500 text-center max-w-[180px] truncate">
                        {window.location.origin}/menu/{targetUserId}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-3 flex-1 w-full sm:w-auto">
                      <p className="text-sm text-gray-600">
                        Imprime o descarga este código QR para que tus clientes puedan escanear y ver el menú directamente desde su celular.
                      </p>
                      <button
                        data-testid="button-print-menu-qr"
                        onClick={() => {
                          const el = document.getElementById("menu-qr-print-area");
                          if (!el) return;
                          const win = window.open("", "_blank", "width=400,height=500");
                          if (!win) return;
                          const svg = el.querySelector("svg")?.outerHTML || "";
                          const url = `${window.location.origin}/menu/${targetUserId}`;
                          win.document.write(`<!DOCTYPE html><html><head><title>QR Menú</title><style>
                            body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff;padding:24px;box-sizing:border-box;}
                            svg{width:260px;height:260px;}
                            p{margin-top:12px;font-size:12px;color:#555;text-align:center;word-break:break-all;max-width:260px;}
                            h2{font-size:18px;font-weight:700;margin-bottom:8px;color:#0f172a;}
                            @media print{button{display:none;}}
                          </style></head><body>
                          <h2>Menú Digital</h2>${svg}<p>${url}</p>
                          <button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Imprimir</button>
                          </body></html>`);
                          win.document.close();
                          win.focus();
                          setTimeout(() => win.print(), 400);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir / Guardar PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Agregar nuevo producto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50/70 rounded-xl border border-border/50">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Foto del producto</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                            {menuForm.imageData ? (
                              <img src={menuForm.imageData} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImagePlus className="w-6 h-6 text-gray-300" />
                            )}
                          </div>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              data-testid="input-menu-image"
                              onChange={(e) => handleMenuImageUpload(e, false)}
                              disabled={menuImageUploading}
                            />
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 border border-primary/30 rounded-lg px-3 py-1.5 bg-white transition-colors">
                              {menuImageUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              Subir foto
                            </span>
                          </label>
                          {menuForm.imageData && (
                            <button onClick={() => setMenuForm(p => ({ ...p, imageData: "" }))} className="text-xs text-red-400 hover:text-red-600">Quitar</button>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Nombre *</Label>
                        <Input
                          value={menuForm.name}
                          onChange={(e) => setMenuForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Ej. Tacos de pastor"
                          className="mt-1 bg-white"
                          data-testid="input-menu-name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Precio (MXN) *</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <Input
                            type="number"
                            min="0"
                            value={menuForm.price}
                            onChange={(e) => setMenuForm(p => ({ ...p, price: e.target.value }))}
                            placeholder="0"
                            className="pl-7 bg-white"
                            data-testid="input-menu-price"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex-1">
                        <Label className="text-xs font-medium text-gray-600">Descripción</Label>
                        <Textarea
                          value={menuForm.description}
                          onChange={(e) => setMenuForm(p => ({ ...p, description: e.target.value }))}
                          placeholder="Descripción del producto..."
                          className="mt-1 bg-white resize-none"
                          rows={4}
                          data-testid="input-menu-description"
                        />
                      </div>
                      <Button
                        onClick={handleAddMenuItem}
                        disabled={createMenuItem.isPending}
                        className="w-full"
                        data-testid="button-add-menu-item"
                      >
                        {createMenuItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Agregar producto
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Productos del menú</h3>
                  {menuLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                    </div>
                  ) : !menuItemsData || menuItemsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2 border border-dashed rounded-xl bg-gray-50/70">
                      <Package className="w-10 h-10 text-gray-200" />
                      <p className="text-sm text-muted-foreground">No hay productos aún. Agrega el primero arriba.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {menuItemsData.map((item) => (
                        <div key={item.id} data-testid={`card-admin-menu-item-${item.id}`} className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
                          {editingMenuItem === item.id ? (
                            <div className="p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-14 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {editMenuForm.imageData ? (
                                    <img src={editMenuForm.imageData} alt="preview" className="w-full h-full object-cover" />
                                  ) : (
                                    <ImagePlus className="w-5 h-5 text-gray-300" />
                                  )}
                                </div>
                                <label className="cursor-pointer">
                                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleMenuImageUpload(e, true)} disabled={menuImageUploading} />
                                  <span className="inline-flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-md px-2 py-1 bg-white">
                                    {menuImageUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    Cambiar
                                  </span>
                                </label>
                                {editMenuForm.imageData && (
                                  <button onClick={() => setEditMenuForm(p => ({ ...p, imageData: "" }))} className="text-xs text-red-400 hover:text-red-600">Quitar</button>
                                )}
                              </div>
                              <Input value={editMenuForm.name} onChange={(e) => setEditMenuForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre" className="text-sm" />
                              <Textarea value={editMenuForm.description} onChange={(e) => setEditMenuForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripción" className="text-sm resize-none" rows={2} />
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <Input type="number" min="0" value={editMenuForm.price} onChange={(e) => setEditMenuForm(p => ({ ...p, price: e.target.value }))} className="pl-7 text-sm" />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleUpdateMenuItem} disabled={updateMenuItem.isPending} className="flex-1">
                                  {updateMenuItem.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                  Guardar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingMenuItem(null)}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {item.imageData ? (
                                <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                                  <img src={item.imageData} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
                                  <Package className="w-8 h-8 text-gray-200" />
                                </div>
                              )}
                              <div className="p-3 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                                  <span className="text-primary font-bold text-sm flex-shrink-0">${item.price.toLocaleString('es-MX')}</span>
                                </div>
                                {item.description && <p className="text-xs text-gray-500 leading-snug">{item.description}</p>}
                                <div className="flex items-center gap-1.5 pt-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startEditMenuItem(item)} data-testid={`button-edit-menu-item-${item.id}`}>
                                    <Pencil className="w-3 h-3 mr-1" />Editar
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { updateMenuItem.mutate({ id: item.id, available: !item.available } as any); }} data-testid={`button-toggle-menu-item-${item.id}`}>
                                    {item.available ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                                    {item.available ? "Ocultar" : "Mostrar"}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={() => { if (confirm('¿Eliminar este producto?')) deleteMenuItem.mutate(item.id); }} data-testid={`button-delete-menu-item-${item.id}`}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border/50 pt-5">
                  <Label className="text-sm font-medium text-gray-700">Leyenda al final del menú</Label>
                  <Textarea
                    value={menuLegend}
                    onChange={(e) => setMenuLegend(e.target.value)}
                    placeholder="Ej. Precios sujetos a cambio sin previo aviso. IVA incluido."
                    className="resize-none"
                    rows={2}
                    data-testid="input-menu-legend"
                  />
                  <Button size="sm" onClick={handleSaveMenuLegend} disabled={updateSettings.isPending} data-testid="button-save-menu-legend">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Guardar leyenda
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Catálogo ── */}
          <TabsContent value="catalog" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Catalog link */}
            {!isSubscriptionActive && !isViewingOther && (
              <Card className="bg-amber-50 border-amber-200 shadow-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Tu catálogo es privado</p>
                    <p className="text-sm text-amber-700">Activa un plan de suscripción para que tus clientes puedan ver tu catálogo.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="bg-white border-border/50 shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tu enlace de catálogo:</span>
                  <code className="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono" data-testid="text-catalog-link">
                    {catalogUrl}
                  </code>
                  {!isSubscriptionActive && !isViewingOther
                    ? <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Privado</Badge>
                    : <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">Público</Badge>
                  }
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={copyCatalogLink} data-testid="button-copy-catalog-link">
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                  </Button>
                  <a href={`/catalog/${targetUserId}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" data-testid="button-open-catalog">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Upload area */}
            <Card className="bg-white border-border/50 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Images className="w-5 h-5 text-primary" />
                    Fotos del Catálogo
                    <Badge variant="secondary" className="ml-1">{catalogPhotosData.length}</Badge>
                  </CardTitle>
                  <label
                    htmlFor="catalog-upload"
                    className="cursor-pointer"
                  >
                    <Button size="sm" asChild disabled={catalogUploading} data-testid="button-upload-catalog">
                      <span>
                        {catalogUploading
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{catalogUploadCount.total > 1 ? `Subiendo ${catalogUploadCount.done + 1}/${catalogUploadCount.total}...` : "Subiendo..."}</>
                          : <><Plus className="w-3.5 h-3.5 mr-1.5" />Agregar Fotos</>
                        }
                      </span>
                    </Button>
                  </label>
                  <input
                    id="catalog-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleCatalogUpload}
                    disabled={catalogUploading}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {catalogLoading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : catalogPhotosData.length === 0 ? (
                  <label htmlFor="catalog-upload" className="cursor-pointer block">
                    <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      <Images className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground font-medium">Haz clic o arrastra fotos aquí</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Puedes subir varias fotos a la vez · Se optimizan automáticamente</p>
                    </div>
                  </label>
                ) : (
                  <>
                    <div className="columns-3 sm:columns-4 md:columns-5 gap-2 space-y-2">
                      {catalogPhotosData.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="break-inside-avoid group relative overflow-hidden rounded-xl border border-border/30"
                          data-testid={`img-catalog-admin-${photo.id}`}
                        >
                          <img
                            src={`/api/catalog/${photo.id}/image`}
                            alt={photo.caption || `Foto ${index + 1}`}
                            className="w-full object-cover cursor-zoom-in group-hover:opacity-80 transition-opacity duration-200"
                            onClick={() => setCatalogLightbox(index)}
                          />
                          <button
                            className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-sm"
                            onClick={() => deleteCatalogPhoto.mutate(photo.id)}
                            data-testid={`button-delete-catalog-${photo.id}`}
                            title="Eliminar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Haz clic en una foto para ampliarla · El ícono rojo la elimina del catálogo y del servidor
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="asistencias" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AttendanceTab userId={targetUserId} />
          </TabsContent>

          <TabsContent value="minutas" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <MinutasTab />
          </TabsContent>

          <TabsContent value="checklists" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ChecklistTab userId={targetUserId} />
          </TabsContent>

          {/* ── Landing Page ── */}
          {!isViewingOther && (
            <TabsContent value="landing" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Subscription warning */}
              {!isSubscriptionActive && (
                <Card className="bg-amber-50 border-amber-200 shadow-sm">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">Tu landing page es privada</p>
                      <p className="text-sm text-amber-700">Activa un plan de suscripción para que tus clientes puedan ver tu landing page.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Link card */}
              <Card className="bg-white border-border/50 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tu landing page:</span>
                    <code className="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono" data-testid="text-landing-link">
                      {landingUrl}
                    </code>
                    {!isSubscriptionActive
                      ? <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Privada</Badge>
                      : <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">Pública</Badge>
                    }
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={copyLandingLink} data-testid="button-copy-landing-link">
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                    </Button>
                    <a href={`/landing/${targetUserId}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" data-testid="button-open-landing">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Appearance settings */}
              <Card className="bg-white border-border/50 shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary" />
                      Apariencia
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleResetLandingDefaults}
                      className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
                      data-testid="button-reset-landing-defaults"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restablecer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Theme presets */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wide">Estilo prediseñado</p>
                    <div className="grid grid-cols-3 gap-3">
                      {LANDING_THEMES.map((theme) => {
                        const isActive =
                          landingBgColor === theme.bgColor &&
                          landingContainerColor === theme.containerColor &&
                          landingTextColor === theme.textColor &&
                          landingFont === theme.font;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => applyLandingTheme(theme)}
                            className={cn(
                              "rounded-2xl border-2 overflow-hidden transition-all text-left focus:outline-none",
                              isActive
                                ? "border-primary ring-2 ring-primary/30 scale-[1.02]"
                                : "border-border hover:border-primary/40 hover:scale-[1.01]"
                            )}
                            data-testid={`theme-preset-${theme.id}`}
                          >
                            {/* Mini color preview */}
                            <div className="h-20 relative" style={{ backgroundColor: theme.preview[0] }}>
                              {/* Fake hero text */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
                                <div className="w-6 h-6 rounded-lg opacity-70" style={{ backgroundColor: theme.preview[1] }} />
                                <div className="h-1.5 rounded-full w-16 opacity-80" style={{ backgroundColor: theme.preview[2] }} />
                                <div className="h-1 rounded-full w-10 opacity-40 bg-white" />
                              </div>
                              {/* Bottom card block */}
                              <div
                                className="absolute bottom-2 inset-x-2 rounded-lg px-2 py-1.5 flex items-center gap-1.5"
                                style={{ backgroundColor: theme.preview[1] }}
                              >
                                <div className="w-4 h-4 rounded bg-white/10 shrink-0" />
                                <div className="flex-1 space-y-0.5">
                                  <div className="h-1 rounded-full bg-white/25 w-full" />
                                  <div className="h-0.5 rounded-full bg-white/15 w-2/3" />
                                </div>
                                <div className="w-8 h-3 rounded bg-green-500/70" />
                              </div>
                              {isActive && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            {/* Labels */}
                            <div className="px-3 py-2 bg-white">
                              <p className="text-xs font-bold text-foreground leading-tight">{theme.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{theme.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">Selecciona un estilo para aplicar sus colores y tipografía. Puedes ajustarlos después.</p>
                  </div>

                  {/* Live mini preview */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Vista previa</p>
                    <div
                      className="rounded-2xl overflow-hidden h-36 relative flex items-center justify-center transition-colors duration-300"
                      style={{ backgroundColor: landingBgColor }}
                    >
                      {/* Fake hero text */}
                      <div className="text-center px-4 pb-6">
                        <div className="w-10 h-10 rounded-xl mx-auto mb-2 opacity-60" style={{ backgroundColor: landingContainerColor }} />
                        <div className="font-black text-lg opacity-90 leading-tight" style={{ color: landingTextColor }}>Mi Negocio</div>
                        <div className="text-xs mt-1 opacity-50" style={{ color: landingTextColor }}>Descripción del negocio</div>
                      </div>
                      {/* Fake section block */}
                      <div
                        className="absolute bottom-0 inset-x-0 mx-4 mb-3 rounded-xl px-4 py-2.5 flex items-center gap-2 transition-colors duration-300"
                        style={{ backgroundColor: landingContainerColor }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2 rounded-full w-20 opacity-50" style={{ backgroundColor: landingTextColor }} />
                          <div className="h-1.5 rounded-full w-14 opacity-25" style={{ backgroundColor: landingTextColor }} />
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-green-500/80 text-white text-[9px] font-bold">WhatsApp</div>
                      </div>
                    </div>
                  </div>

                  {/* Color pickers row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Background color */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Color de fondo</Label>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer shrink-0 group" data-testid="input-landing-bg-color">
                          <div
                            className="w-14 h-14 rounded-2xl border-2 border-border shadow-sm group-hover:scale-105 transition-transform ring-offset-2 ring-primary/20 group-hover:ring-2"
                            style={{ backgroundColor: landingBgColor }}
                          />
                          <input
                            type="color"
                            value={landingBgColor}
                            onChange={(e) => setLandingBgColor(e.target.value)}
                            className="sr-only"
                          />
                        </label>
                        <div className="flex-1">
                          <Input
                            value={landingBgColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLandingBgColor(v);
                            }}
                            className="font-mono text-sm h-9"
                            maxLength={7}
                            placeholder="#0f172a"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">Fondo de la página</p>
                        </div>
                      </div>
                    </div>

                    {/* Container / section color */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Color de bloques</Label>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer shrink-0 group" data-testid="input-landing-container-color">
                          <div
                            className="w-14 h-14 rounded-2xl border-2 border-border shadow-sm group-hover:scale-105 transition-transform ring-offset-2 ring-primary/20 group-hover:ring-2"
                            style={{ backgroundColor: landingContainerColor }}
                          />
                          <input
                            type="color"
                            value={landingContainerColor}
                            onChange={(e) => setLandingContainerColor(e.target.value)}
                            className="sr-only"
                          />
                        </label>
                        <div className="flex-1">
                          <Input
                            value={landingContainerColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLandingContainerColor(v);
                            }}
                            className="font-mono text-sm h-9"
                            maxLength={7}
                            placeholder="#1e293b"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">Fondo de secciones</p>
                        </div>
                      </div>
                    </div>

                    {/* Text color */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Color de letra</Label>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer shrink-0 group" data-testid="input-landing-text-color">
                          <div
                            className="w-14 h-14 rounded-2xl border-2 border-border shadow-sm group-hover:scale-105 transition-transform ring-offset-2 ring-primary/20 group-hover:ring-2 flex items-center justify-center"
                            style={{ backgroundColor: landingBgColor }}
                          >
                            <span className="text-sm font-black" style={{ color: landingTextColor }}>Aa</span>
                          </div>
                          <input
                            type="color"
                            value={landingTextColor}
                            onChange={(e) => setLandingTextColor(e.target.value)}
                            className="sr-only"
                          />
                        </label>
                        <div className="flex-1">
                          <Input
                            value={landingTextColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLandingTextColor(v);
                            }}
                            className="font-mono text-sm h-9"
                            maxLength={7}
                            placeholder="#ffffff"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">Color del texto</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Font selector */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Tipografía</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { value: "inter",       label: "Inter",       style: "system-ui, sans-serif",          desc: "Moderna" },
                        { value: "montserrat",  label: "Montserrat",  style: "'Montserrat', sans-serif",       desc: "Limpia" },
                        { value: "lato",        label: "Lato",        style: "'Lato', sans-serif",             desc: "Amigable" },
                        { value: "playfair",    label: "Playfair",    style: "'Playfair Display', serif",      desc: "Elegante" },
                        { value: "merriweather",label: "Merriweather",style: "'Merriweather', serif",          desc: "Clásica" },
                      ].map(f => (
                        <button
                          key={f.value}
                          onClick={() => setLandingFont(f.value)}
                          className={cn(
                            "flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 transition-all text-center",
                            landingFont === f.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`font-option-${f.value}`}
                        >
                          <span className="text-base font-bold leading-none mb-1" style={{ fontFamily: f.style }}>Aa</span>
                          <span className="text-[11px] font-semibold">{f.label}</span>
                          <span className="text-[10px] opacity-60">{f.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections */}
              <Card className="bg-white border-border/50 shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-border/50">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary" />
                    Secciones visibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group" data-testid="toggle-landing-catalog">
                    <div
                      onClick={() => setLandingShowCatalog(v => !v)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors cursor-pointer",
                        landingShowCatalog ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        landingShowCatalog ? "translate-x-5" : "translate-x-0"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Galería / Catálogo</p>
                      <p className="text-xs text-muted-foreground">Muestra tus fotos del catálogo</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group" data-testid="toggle-landing-menu">
                    <div
                      onClick={() => setLandingShowMenu(v => !v)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors cursor-pointer",
                        landingShowMenu ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        landingShowMenu ? "translate-x-5" : "translate-x-0"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Menú digital</p>
                      <p className="text-xs text-muted-foreground">Muestra los productos de tu menú</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group" data-testid="toggle-landing-booking">
                    <div
                      onClick={() => setLandingShowBooking(v => !v)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors cursor-pointer",
                        landingShowBooking ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        landingShowBooking ? "translate-x-5" : "translate-x-0"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reservar cita</p>
                      <p className="text-xs text-muted-foreground">Muestra el calendario de disponibilidad</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Save */}
              <div className="flex justify-end">
                <Button onClick={handleSaveLandingSettings} disabled={updateSettings.isPending} data-testid="button-save-landing">
                  {updateSettings.isPending
                    ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Guardando...</>
                    : <><Save className="w-4 h-4 mr-1.5" />Guardar Landing Page</>
                  }
                </Button>
              </div>
            </TabsContent>
          )}

          {!isViewingOther && (
            <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="bg-white border-border/50 shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-border/50">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-primary" />
                    Perfil Público
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-6">
                    Configura tu imagen y nombre que aparecerán en tu página de reservas.
                  </p>

                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg bg-gray-50 flex items-center justify-center">
                          {profileImage ? (
                            <img src={profileImage} alt="Perfil" className="w-full h-full object-cover" data-testid="img-profile-preview" />
                          ) : (
                            <UserCircle className="w-16 h-16 text-gray-300" />
                          )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {imageUploading ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          ) : (
                            <Camera className="w-8 h-8 text-white" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={imageUploading}
                            data-testid="input-profile-image"
                          />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="w-3.5 h-3.5 mr-1.5" />
                              Subir Imagen
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={imageUploading}
                          />
                        </label>
                        {profileImage && (
                          <Button variant="ghost" size="sm" onClick={handleRemoveImage} className="text-red-500 hover:text-red-700 hover:bg-red-50" data-testid="button-remove-image">
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Quitar
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                        La imagen se optimiza automáticamente. Formatos: JPG, PNG, WebP.
                      </p>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Nombre del Negocio / Profesional</Label>
                        <Input
                          id="profile-name"
                          placeholder="ej. Barbería El Rey, Dra. García..."
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          data-testid="input-profile-name"
                        />
                        <p className="text-xs text-muted-foreground">
                          Este nombre aparecerá en el encabezado de tu página de reservas.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-description">Descripción / Resumen de Servicios</Label>
                        <Textarea
                          id="profile-description"
                          placeholder="ej. Ofrecemos cortes de cabello, coloración y tratamientos capilares. Más de 10 años de experiencia..."
                          value={profileDescription}
                          onChange={(e) => setProfileDescription(e.target.value)}
                          rows={3}
                          data-testid="input-profile-description"
                        />
                        <p className="text-xs text-muted-foreground">
                          Aparecerá debajo del título en tu página de reservas.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label>Redes Sociales</Label>
                        <p className="text-xs text-muted-foreground -mt-1">
                          Pega el enlace completo de cada red social. Los que tengas activos aparecerán como íconos en tu página de reservas.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <SiFacebook className="w-5 h-5 text-[#1877F2] shrink-0" />
                            <Input
                              placeholder="https://facebook.com/tu-pagina"
                              value={socialFacebook}
                              onChange={(e) => setSocialFacebook(e.target.value)}
                              data-testid="input-social-facebook"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <SiInstagram className="w-5 h-5 text-[#E1306C] shrink-0" />
                            <Input
                              placeholder="https://instagram.com/tu-usuario"
                              value={socialInstagram}
                              onChange={(e) => setSocialInstagram(e.target.value)}
                              data-testid="input-social-instagram"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <SiTiktok className="w-5 h-5 text-black shrink-0" />
                            <Input
                              placeholder="https://tiktok.com/@tu-usuario"
                              value={socialTiktok}
                              onChange={(e) => setSocialTiktok(e.target.value)}
                              data-testid="input-social-tiktok"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <SiYoutube className="w-5 h-5 text-[#FF0000] shrink-0" />
                            <Input
                              placeholder="https://youtube.com/@tu-canal"
                              value={socialYoutube}
                              onChange={(e) => setSocialYoutube(e.target.value)}
                              data-testid="input-social-youtube"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <FaLinkedin className="w-5 h-5 text-[#0A66C2] shrink-0" />
                            <Input
                              placeholder="https://linkedin.com/in/tu-perfil"
                              value={socialLinkedin}
                              onChange={(e) => setSocialLinkedin(e.target.value)}
                              data-testid="input-social-linkedin"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#EA4335] shrink-0" />
                            <Input
                              placeholder="https://maps.google.com/?q=..."
                              value={googleMapsUrl}
                              onChange={(e) => setGoogleMapsUrl(e.target.value)}
                              data-testid="input-google-maps-url"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="font-medium text-sm text-gray-700 mb-3">Vista Previa</h4>
                        <div className="bg-gray-50 rounded-xl p-4 border flex items-center gap-3">
                          {profileImage ? (
                            <img src={profileImage} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Clock className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-display font-bold text-gray-900">
                              {profileName || myDisplayName || "migestion.pro"}
                            </p>
                            <p className="text-xs text-muted-foreground">Página de Reservas</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={updateSettings.isPending}
                      className="bg-primary hover:bg-primary/90"
                      data-testid="button-save-profile"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      {updateSettings.isPending ? "Guardando..." : "Guardar Perfil"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {!isViewingOther && (
            <TabsContent value="subscription" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {pollingSubscription && (
                <Card className="bg-blue-50 border-blue-200 shadow-sm">
                  <CardContent className="p-6 flex items-center gap-4">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-900">Verificando tu pago…</p>
                      <p className="text-sm text-blue-700">Estamos confirmando tu suscripción con Stripe. Esto puede tomar unos segundos.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {subscriptionStatus?.isAdmin ? (
                <Card className="bg-white border-border/50 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Crown className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-bold mb-2">Cuenta de Administrador</h3>
                    <p className="text-muted-foreground">Como administrador, tienes acceso completo sin necesidad de suscripción. Tu enlace de reservas está siempre activo.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {isSubscriptionActive && (
                    <Card className="bg-green-50 border-green-200 shadow-sm">
                      <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-green-100 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-green-900">Suscripción Activa</p>
                            <p className="text-sm text-green-700">
                              Plan: <span className="font-medium capitalize">{subscriptionStatus?.plan}</span>
                              {subscriptionStatus?.currentPeriodEnd && (
                                <> &bull; Vence: {format(new Date(subscriptionStatus.currentPeriodEnd), "d 'de' MMM, yyyy", { locale: es })}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" onClick={handlePortal} disabled={portal.isPending} data-testid="button-manage-subscription">
                          {portal.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Administrar Suscripción
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid md:grid-cols-3 gap-6">
                    {plansData?.plans?.map((plan: any) => {
                      const isCurrentPlan = subscriptionStatus?.plan === plan.key;
                      const priceFormatted = (plan.price / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
                      const periodLabel = plan.key === 'monthly' ? '/mes' : plan.key === 'semiannual' ? '/6 meses' : '/año';
                      const savingsLabel = plan.key === 'semiannual' ? 'Más popular' : plan.key === 'annual' ? 'Mejor precio' : null;

                      function handlePlanClick() {
                        if (isCurrentPlan) return;
                        if (plan.paymentLink) {
                          window.open(plan.paymentLink, '_blank');
                        } else {
                          handleCheckout(plan.key);
                        }
                      }

                      return (
                        <Card key={plan.key} className={cn(
                          "bg-white border-border/50 shadow-sm relative overflow-hidden",
                          plan.key === 'annual' && "border-primary/50 ring-1 ring-primary/20"
                        )}>
                          {savingsLabel && (
                            <div className={cn(
                              "absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-lg",
                              plan.key === 'annual' ? "bg-primary" : "bg-green-600"
                            )}>
                              {savingsLabel}
                            </div>
                          )}
                          <CardHeader className="pb-2">
                            <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground">{plan.description}</p>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <span className="text-3xl font-display font-bold">{priceFormatted}</span>
                              <span className="text-muted-foreground ml-1">{periodLabel}</span>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Enlace de reservas público</li>
                              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Gestión de citas ilimitada</li>
                              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Integración con WhatsApp</li>
                              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Configuración de horarios</li>
                            </ul>
                            <Button
                              className={cn(
                                "w-full",
                                plan.key === 'annual' ? "bg-primary hover:bg-primary/90" : ""
                              )}
                              variant={plan.key === 'annual' ? 'default' : 'outline'}
                              disabled={isCurrentPlan || checkout.isPending}
                              onClick={handlePlanClick}
                              data-testid={`button-checkout-${plan.key}`}
                            >
                              {checkout.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              {isCurrentPlan ? "Plan Actual" : "Suscribirse"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>
          )}

          {isMaster && !isViewingOther && (
            <TabsContent value="users" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="bg-white border-border/50 shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-border/50">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Usuarios Registrados
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {allUsers ? (
                    <div className="divide-y divide-border/50">
                      {allUsers.map((u: any) => {
                        const isMasterUser = u.email === MASTER_EMAIL;
                        const isCurrentUser = u.id === user?.id;
                        return (
                        <div key={u.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {(u.name || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">{u.name || 'Proveedor'}</p>
                                {isMasterUser ? (
                                  <Badge className="text-xs bg-amber-500 hover:bg-amber-500 gap-1">
                                    <Crown className="w-3 h-3" /> Master
                                  </Badge>
                                ) : u.role === 'admin' ? (
                                  <Badge className="text-xs gap-1">
                                    <Crown className="w-3 h-3" /> Admin
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Usuario</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{u.email || 'Sin correo'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {u.createdAt && (
                              <span className="text-sm text-muted-foreground hidden sm:inline">
                                Registrado {format(new Date(u.createdAt), "d 'de' MMM, yyyy", { locale: es })}
                              </span>
                            )}
                            {!isMasterUser && !isCurrentUser && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updateUserRole.isPending}
                                  onClick={() => updateUserRole.mutate({ userId: u.id, role: u.role === 'admin' ? 'user' : 'admin' })}
                                  className={u.role === 'admin'
                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                                    : "border-primary/20 text-primary hover:bg-primary/5"}
                                  data-testid={`button-toggle-role-${u.id}`}
                                >
                                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                                  {u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={grantTrial.isPending}
                                  onClick={() => grantTrial.mutate(u.id)}
                                  className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                                  data-testid={`button-grant-trial-${u.id}`}
                                >
                                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                                  7 días gratis
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={deleteUser.isPending}
                                  onClick={() => setConfirmDeleteUserId(u.id)}
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                  data-testid={`button-delete-user-${u.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(isCurrentUser ? "/admin" : `/admin/user/${u.id}`)}
                              data-testid={`button-view-dashboard-${u.id}`}
                            >
                              <Settings className="w-3.5 h-3.5 mr-1.5" />
                              Panel
                            </Button>
                            <a href={`/book/${u.id}`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost" data-testid={`link-booking-page-${u.id}`}>
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                Reservas
                              </Button>
                            </a>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">Cargando usuarios...</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-white border-border/50 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-border/50">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Reporte de Citas Confirmadas
                  </CardTitle>
                  <Button
                    onClick={exportToExcel}
                    disabled={reportRows.length === 0}
                    className="flex items-center gap-2"
                    data-testid="button-export-excel"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o celular…"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="pl-9 bg-white"
                      data-testid="input-report-search"
                    />
                    {reportSearch && (
                      <button onClick={() => setReportSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Desde</Label>
                      <Input
                        type="date"
                        value={reportDateFrom}
                        onChange={(e) => setReportDateFrom(e.target.value)}
                        className="w-36 bg-white text-sm"
                        data-testid="input-report-date-from"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</Label>
                      <Input
                        type="date"
                        value={reportDateTo}
                        onChange={(e) => setReportDateTo(e.target.value)}
                        className="w-36 bg-white text-sm"
                        data-testid="input-report-date-to"
                      />
                    </div>
                    {(reportDateFrom || reportDateTo) && (
                      <button onClick={() => { setReportDateFrom(""); setReportDateTo(""); }} className="text-muted-foreground hover:text-foreground" title="Limpiar fechas">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold font-display text-primary">{reportRows.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Citas confirmadas</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold font-display text-green-700">${reportTotal.toLocaleString('es-MX')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total ganado</p>
                  </div>
                  <div className="bg-gray-50 border border-border/50 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                    <p className="text-2xl font-bold font-display text-gray-700">
                      ${reportRows.length > 0 ? Math.round(reportTotal / reportRows.length).toLocaleString('es-MX') : 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Promedio por cita</p>
                  </div>
                </div>

                {aptLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                  </div>
                ) : reportRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2 border border-dashed rounded-xl bg-gray-50/70">
                    <FileSpreadsheet className="w-10 h-10 text-gray-200" />
                    <p className="text-sm text-muted-foreground">No hay citas confirmadas con los filtros actuales.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-sm" data-testid="table-report">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-border/50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hora</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Celular</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {reportRows.map((apt) => (
                          <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors" data-testid={`row-report-${apt.id}`}>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {format(new Date(apt.startTime), "dd MMM yyyy", { locale: es })}
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {format(new Date(apt.startTime), "h:mm a")}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{apt.customerName}</td>
                            <td className="px-4 py-3 text-gray-600">{apt.customerPhone ?? "—"}</td>
                            <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{apt.notes ?? "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                              {apt.amount != null ? `$${apt.amount.toLocaleString('es-MX')}` : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50/80 border-t-2 border-border/50">
                          <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">Total ({reportRows.length} citas)</td>
                          <td className="px-4 py-3 text-right font-bold text-primary text-base">${reportTotal.toLocaleString('es-MX')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>

      <Dialog open={!!editingApt} onOpenChange={(open) => { if (!open) setEditingApt(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Editar Hora de la Cita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} data-testid="input-edit-date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Hora de Inicio</Label>
                <Input id="edit-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} data-testid="input-edit-start" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">Hora de Fin</Label>
                <Input id="edit-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} data-testid="input-edit-end" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApt(null)}>Cancelar</Button>
            <Button onClick={handleSaveTime} disabled={updateApt.isPending} data-testid="button-save-edit">
              {updateApt.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!confirmDeleteUserId} onOpenChange={(open) => { if (!open) setConfirmDeleteUserId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente e irreversible. Se eliminarán todos los datos del usuario: agenda, citas, menú digital, configuración e imágenes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (confirmDeleteUserId) {
                  deleteUser.mutate(confirmDeleteUserId);
                  setConfirmDeleteUserId(null);
                }
              }}
              data-testid="button-confirm-delete-user"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Catalog lightbox */}
      {catalogLightbox !== null && catalogPhotosData[catalogLightbox] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setCatalogLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={() => setCatalogLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
            onClick={(e) => { e.stopPropagation(); setCatalogLightbox(i => (i !== null ? (i - 1 + catalogPhotosData.length) % catalogPhotosData.length : null)); }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
            onClick={(e) => { e.stopPropagation(); setCatalogLightbox(i => (i !== null ? (i + 1) % catalogPhotosData.length : null)); }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={`/api/catalog/${catalogPhotosData[catalogLightbox].id}/image`}
              alt={catalogPhotosData[catalogLightbox].caption || `Foto ${catalogLightbox + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white/40 text-xs">{catalogLightbox + 1} / {catalogPhotosData.length}</p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
