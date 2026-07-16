import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { type Minuta } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Search, FileSpreadsheet, Printer,
  NotebookPen, Filter, X, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function useMinutas() {
  return useQuery<Minuta[]>({
    queryKey: [api.minutas.list.path],
    queryFn: async () => {
      const res = await fetch(api.minutas.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar minutas");
      return res.json();
    },
  });
}

function MinutaDialog({ open, onClose, initial }: {
  open: boolean;
  onClose: () => void;
  initial?: Minuta | null;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = format(new Date(), "HH:mm");

  const [asunto, setAsunto] = useState(initial?.asunto ?? "");
  const [anotacion, setAnotacion] = useState(initial?.anotacion ?? "");
  const [fecha, setFecha] = useState(initial?.fecha ?? today);
  const [hora, setHora] = useState(initial?.hora ?? currentTime);
  const [lugar, setLugar] = useState(initial?.lugar ?? "");
  const [responsable, setResponsable] = useState(initial?.responsable ?? "");
  const [status, setStatus] = useState(initial?.status ?? "abierta");
  const [archivos, setArchivos] = useState(initial?.archivos ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        asunto, anotacion, fecha,
        hora: hora || null,
        lugar: lugar || null,
        responsable: responsable || null,
        status,
        archivos: archivos || null,
      };
      const url = isEdit
        ? buildUrl(api.minutas.update.path, { id: initial!.id })
        : api.minutas.create.path;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.minutas.list.path] });
      toast({ title: isEdit ? "Minuta actualizada" : "Minuta creada" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Minuta" : "Nueva Minuta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Asunto *</Label>
            <Input value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Ej. Ronda de seguridad, Reporte de novedad..." data-testid="input-minuta-asunto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} data-testid="input-minuta-fecha" />
            </div>
            <div className="space-y-1.5">
              <Label>Hora</Label>
              <Input type="time" value={hora} onChange={e => setHora(e.target.value)} data-testid="input-minuta-hora" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lugar</Label>
              <Input value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Área o ubicación" data-testid="input-minuta-lugar" />
            </div>
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Input value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Nombre" data-testid="input-minuta-responsable" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-minuta-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abierta">Abierta</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Anotación / Descripción *</Label>
            <Textarea
              value={anotacion}
              onChange={e => setAnotacion(e.target.value)}
              placeholder="Describe el evento, novedad o acuerdo..."
              rows={4}
              data-testid="input-minuta-anotacion"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Archivos / Referencias</Label>
            <Textarea
              value={archivos}
              onChange={e => setArchivos(e.target.value)}
              placeholder="Nombres de archivos adjuntos, links u otras referencias..."
              rows={2}
              data-testid="input-minuta-archivos"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !asunto.trim() || !anotacion.trim() || !fecha}
            data-testid="button-save-minuta"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_COLORS: Record<string, string> = {
  abierta:  "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  cerrada:  "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  pendiente:"bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  urgente:  "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

export function MinutasTab() {
  const { toast } = useToast();
  const { data: minutas = [], isLoading } = useMinutas();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; minuta?: Minuta | null }>({ open: false });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMinuta = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.minutas.delete.path, { id }), {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.minutas.list.path] });
      toast({ title: "Minuta eliminada" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = minutas.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.asunto.toLowerCase().includes(q) ||
      m.anotacion.toLowerCase().includes(q) ||
      (m.responsable?.toLowerCase().includes(q) ?? false) ||
      (m.lugar?.toLowerCase().includes(q) ?? false);
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportPDF = useCallback(() => {
    const rows = filtered.map(m => `
      <tr>
        <td><strong>${m.asunto}</strong></td>
        <td style="white-space:pre-wrap;max-width:260px">${m.anotacion}</td>
        <td>${m.responsable || "—"}</td>
        <td style="white-space:nowrap">${m.fecha}${m.hora ? "<br><small>" + m.hora + "</small>" : ""}</td>
        <td>${m.lugar || "—"}</td>
        <td><span class="badge ${m.status}">${m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span></td>
        <td style="font-size:10px">${m.archivos || "—"}</td>
      </tr>`).join("");
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Minutas</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:11px;color:#222;padding:20px}
      h1{font-size:16px;margin-bottom:4px}
      .sub{color:#666;font-size:10px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#1d4ed8;color:#fff;text-align:left;padding:6px 8px;font-size:10px}
      td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
      .badge{font-size:9px;font-weight:600;padding:1px 6px;border-radius:999px;display:inline-block}
      .badge.abierta{background:#dcfce7;color:#166534}
      .badge.cerrada{background:#f1f5f9;color:#475569}
      .badge.pendiente{background:#fef9c3;color:#854d0e}
      .badge.urgente{background:#fee2e2;color:#991b1b}
      @media print{.btn{display:none}}
    </style></head><body>
    <h1>Minutas</h1>
    <p class="sub">Generado el ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })} — ${filtered.length} registro(s)</p>
    <table>
      <thead><tr><th>Asunto</th><th>Anotación</th><th>Responsable</th><th>Fecha/Hora</th><th>Lugar</th><th>Estado</th><th>Archivos</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <br>
    <button class="btn" onclick="window.print()" style="background:#1d4ed8;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimir / Guardar PDF</button>
    </body></html>`);
    win.document.close();
  }, [filtered]);

  const exportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const rows = filtered.map(m => ({
      Asunto: m.asunto,
      "Anotación": m.anotacion,
      Responsable: m.responsable || "",
      Fecha: m.fecha,
      Hora: m.hora || "",
      Lugar: m.lugar || "",
      Estado: m.status,
      Archivos: m.archivos || "",
      Creado: m.createdAt ? format(new Date(m.createdAt), "yyyy-MM-dd HH:mm") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [25, 50, 20, 12, 8, 20, 12, 30, 18].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Minutas");
    XLSX.writeFile(wb, `minutas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [filtered]);

  const hasFilters = search || statusFilter !== "all";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-primary" />
            Minutas
          </h2>
          <p className="text-sm text-muted-foreground">Registro de novedades, acuerdos y eventos</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportPDF} data-testid="button-export-pdf-minutas">
            <Printer className="w-3.5 h-3.5 mr-1.5" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} data-testid="button-export-excel-minutas">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />Excel
          </Button>
          <Button size="sm" onClick={() => setDialog({ open: true, minuta: null })} data-testid="button-new-minuta">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Nueva Minuta
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por asunto, anotación, responsable o lugar..."
            className="pl-9 pr-8"
            data-testid="input-search-minuta"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-status-minuta">
            <Filter className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="abierta">Abierta</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="cerrada">Cerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-border/50 py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
              {hasFilters && " (filtrado)"}
            </CardTitle>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3 h-3" />Limpiar filtros
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <NotebookPen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">{hasFilters ? "Sin resultados" : "Sin minutas"}</p>
              <p className="text-sm mt-1">
                {hasFilters
                  ? "Prueba con otros términos o quita los filtros."
                  : "Crea tu primera minuta con el botón \"Nueva Minuta\"."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-gray-50/30 dark:bg-gray-900/10">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Asunto</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Anotación</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Responsable</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Fecha</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Lugar</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Estado</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Archivos</th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id} className="border-b border-border/30 hover:bg-gray-50/50 dark:hover:bg-gray-900/10" data-testid={`row-minuta-${m.id}`}>
                      <td className="px-4 py-3 font-medium max-w-[140px]">
                        <span className="truncate block">{m.asunto}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] lg:max-w-[280px]">
                        <span className="line-clamp-2 text-xs leading-relaxed">{m.anotacion}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap text-xs">
                        {m.responsable || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        <div>{m.fecha}</div>
                        {m.hora && <div className="text-muted-foreground/60">{m.hora}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs max-w-[120px]">
                        <span className="truncate block">{m.lugar || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[m.status] ?? STATUS_COLORS.abierta}`}>
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs max-w-[140px]">
                        <span className="truncate block">{m.archivos || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => setDialog({ open: true, minuta: m })}
                            data-testid={`button-edit-minuta-${m.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteId(m.id)}
                            data-testid={`button-delete-minuta-${m.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MinutaDialog
        key={dialog.minuta?.id ?? "new-minuta"}
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        initial={dialog.minuta}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar minuta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deleteId) { deleteMinuta.mutate(deleteId); setDeleteId(null); } }}
              data-testid="button-confirm-delete-minuta"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
