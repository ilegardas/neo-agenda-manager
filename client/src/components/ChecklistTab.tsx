import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Checklist, ChecklistItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { Plus, Trash2, Download, FileText, ClipboardList, ChevronDown, ChevronRight, Pencil, GripVertical, Heading, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { userId: string; }

export function ChecklistTab({ userId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const profileName = settings?.profile_name?.trim() || "Mi Empresa";

  // ── Checklists list ─────────────────────────────────────────────────────────
  const { data: lists = [], isLoading } = useQuery<Checklist[]>({
    queryKey: [api.checklists.list.path],
  });

  const [selected, setSelected] = useState<Checklist | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [deleteListId, setDeleteListId] = useState<number | null>(null);

  const createList = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(api.checklists.create.path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
      try {
        return JSON.parse(text) as Checklist;
      } catch {
        throw new Error(`Respuesta no válida (${res.status}): ${text.slice(0, 200)}`);
      }
    },
    onSuccess: (cl) => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
      setNewListOpen(false);
      setNewListName("");
      setSelected(cl);
      toast({ title: "Checklist creado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const renameList = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(buildUrl(api.checklists.update.path, { id }), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Error al renombrar");
      return res.json() as Promise<Checklist>;
    },
    onSuccess: (cl) => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
      if (selected?.id === cl.id) setSelected(cl);
      setRenameOpen(false);
      toast({ title: "Nombre actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteList = useMutation({
    mutationFn: async (id: number) => {
      await fetch(buildUrl(api.checklists.delete.path, { id }), { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
      if (selected?.id === deleteListId) setSelected(null);
      setDeleteListId(null);
      toast({ title: "Checklist eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Items ───────────────────────────────────────────────────────────────────
  const { data: items = [], isLoading: loadingItems } = useQuery<ChecklistItem[]>({
    queryKey: [api.checklists.listItems.path, selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const res = await fetch(buildUrl(api.checklists.listItems.path, { id: selected.id }), { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!selected,
  });

  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemType, setNewItemType] = useState<"item" | "title">("item");
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const addItem = useMutation({
    mutationFn: async ({ label, type }: { label: string; type: string }) => {
      if (!selected) return;
      const res = await fetch(buildUrl(api.checklists.createItem.path, { id: selected.id }), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, type, sortOrder: items.length }),
      });
      if (!res.ok) throw new Error("Error al agregar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.listItems.path, selected?.id] });
      setNewItemLabel("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: number) => {
      if (!selected) return;
      await fetch(buildUrl(api.checklists.deleteItem.path, { id: selected.id, itemId }), {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.listItems.path, selected?.id] });
      setDeleteItemId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Export helpers ─────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (!selected) return;
    const XLSX = await import("xlsx");
    const rows: { Tipo: string; Contenido: string }[] = [];
    for (const it of items) {
      rows.push({ Tipo: it.type === "title" ? "Título" : "Elemento", Contenido: it.label });
    }
    const ws = XLSX.utils.json_to_sheet(rows, { header: ["Tipo", "Contenido"] });
    ws["!cols"] = [{ wch: 10 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklist");
    XLSX.writeFile(wb, `${selected.name.replace(/\s+/g, "_")}.xlsx`);
  };

  const exportPDF = () => {
    if (!selected) return;
    const titleRows = items
      .map(it => {
        if (it.type === "title") {
          return `<tr><td colspan="2" style="background:#1a56a0;color:#fff;font-weight:bold;padding:8px 12px;font-size:13px;">${it.label}</td></tr>`;
        }
        return `<tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 12px;width:36px;"><div style="width:16px;height:16px;border:2px solid #1a56a0;display:inline-block;vertical-align:middle;border-radius:2px;"></div></td>
          <td style="padding:8px 12px;font-size:13px;">${it.label}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #111; }
  h1 { text-align:center; font-size:28px; color:#fff; background:#1a56a0; padding:20px; margin:-32px -32px 8px; }
  h2 { text-align:center; font-size:16px; color:#444; margin-bottom:24px; }
  table { width:100%; border-collapse:collapse; }
  @media print { body { padding:0; } h1 { margin: 0 0 8px; } }
</style>
</head><body>
<h1>Checklist</h1>
<h2>${selected.name}</h2>
<p style="text-align:right;font-size:11px;color:#888;margin-bottom:12px;">${profileName}</p>
<table>${titleRows}</table>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Checklists</h2>
        </div>
        <Button size="sm" onClick={() => setNewListOpen(true)} data-testid="button-new-checklist">
          <Plus className="w-4 h-4 mr-1.5" />Nuevo checklist
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* List panel */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="py-3 px-4 bg-muted/30 border-b">
            <CardTitle className="text-sm font-medium">Mis listas</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground p-3">Cargando...</p>
            ) : lists.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Sin checklists. Crea el primero.</p>
            ) : (
              <ul className="space-y-0.5">
                {lists.map(cl => (
                  <li key={cl.id}>
                    <button
                      onClick={() => setSelected(cl)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-left transition-colors hover:bg-muted",
                        selected?.id === cl.id && "bg-primary/10 text-primary font-medium"
                      )}
                      data-testid={`checklist-item-${cl.id}`}
                    >
                      <span className="truncate flex-1">{cl.name}</span>
                      {selected?.id === cl.id && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="md:col-span-2 space-y-3">
          {!selected ? (
            <Card className="border-border/50 shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                Selecciona o crea un checklist para editarlo.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Checklist header */}
              <Card className="border-border/50 shadow-sm">
                <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold truncate">{selected.name}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setRenameName(selected.name); setRenameOpen(true); }} data-testid="button-rename-checklist">
                      <Pencil className="w-3.5 h-3.5 mr-1" />Renombrar
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportExcel} disabled={items.length === 0} className="border-green-200 text-green-700 hover:bg-green-50" data-testid="button-export-checklist-excel">
                      <Download className="w-3.5 h-3.5 mr-1" />Excel
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportPDF} disabled={items.length === 0} className="border-blue-200 text-blue-700 hover:bg-blue-50" data-testid="button-export-checklist-pdf">
                      <FileText className="w-3.5 h-3.5 mr-1" />PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteListId(selected.id)} className="border-red-200 text-red-600 hover:bg-red-50" data-testid="button-delete-checklist">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Add item row */}
              <Card className="border-border/50 shadow-sm">
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={newItemType === "item" ? "default" : "outline"}
                        onClick={() => setNewItemType("item")}
                        title="Agregar elemento"
                        data-testid="button-type-item"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant={newItemType === "title" ? "default" : "outline"}
                        onClick={() => setNewItemType("title")}
                        title="Agregar título de sección"
                        data-testid="button-type-title"
                      >
                        <Heading className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={newItemLabel}
                      onChange={e => setNewItemLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newItemLabel.trim()) addItem.mutate({ label: newItemLabel.trim(), type: newItemType }); }}
                      placeholder={newItemType === "title" ? "Nombre del título (ej. Documentos)..." : "Descripción del elemento..."}
                      className="flex-1 h-9 text-sm"
                      data-testid="input-new-item"
                    />
                    <Button
                      size="sm"
                      onClick={() => { if (newItemLabel.trim()) addItem.mutate({ label: newItemLabel.trim(), type: newItemType }); }}
                      disabled={!newItemLabel.trim() || addItem.isPending}
                      data-testid="button-add-item"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">☰</span> = título de sección &nbsp;|&nbsp; <span className="font-medium">✓</span> = elemento de lista
                  </p>
                </CardContent>
              </Card>

              {/* Items list */}
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-2">
                  {loadingItems ? (
                    <p className="text-xs text-muted-foreground p-3">Cargando...</p>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 text-center">
                      Agrega títulos y elementos usando el panel de arriba.
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      {items.map(it => (
                        <li
                          key={it.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md group",
                            it.type === "title"
                              ? "bg-primary/10 font-semibold text-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          {it.type === "title" ? (
                            <Heading className="w-3.5 h-3.5 shrink-0 text-primary" />
                          ) : (
                            <div className="w-4 h-4 shrink-0 border-2 border-muted-foreground/40 rounded-sm" />
                          )}
                          <span className={cn("flex-1 text-sm", it.type === "title" && "text-primary")}>{it.label}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-6 h-6 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50"
                            onClick={() => setDeleteItemId(it.id)}
                            data-testid={`button-delete-item-${it.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* New checklist dialog */}
      <Dialog open={newListOpen} onOpenChange={v => !v && setNewListOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo checklist</DialogTitle>
          </DialogHeader>
          <Input
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newListName.trim()) createList.mutate(newListName.trim()); }}
            placeholder="Nombre de la lista..."
            data-testid="input-new-checklist-name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewListOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (newListName.trim()) createList.mutate(newListName.trim()); }} disabled={!newListName.trim() || createList.isPending}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={v => !v && setRenameOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renombrar checklist</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && renameName.trim()) renameList.mutate({ id: selected!.id, name: renameName.trim() }); }}
            placeholder="Nuevo nombre..."
            data-testid="input-rename-checklist"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (renameName.trim()) renameList.mutate({ id: selected!.id, name: renameName.trim() }); }} disabled={!renameName.trim() || renameList.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete checklist confirm */}
      <AlertDialog open={deleteListId !== null} onOpenChange={v => !v && setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar checklist?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán la lista y todos sus elementos. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteListId !== null && deleteList.mutate(deleteListId)} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete item confirm */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={v => !v && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>El elemento será removido del checklist.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItemId !== null && deleteItem.mutate(deleteItemId)} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
