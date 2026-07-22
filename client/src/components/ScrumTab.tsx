import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Loader2, FolderKanban, ChevronDown, GripVertical,
  ListChecks, Layers, CalendarDays, Target, Zap, ArrowRight, CheckCircle2,
  Clock, CircleDot, AlertCircle, Flame, Flag, ChevronRight,
  LayoutDashboard, TrendingUp, BarChart2, BookOpen, Activity, Timer,
  CheckCheck, PackageOpen, XCircle,
} from "lucide-react";
import { buildUrl } from "@shared/routes";
import type {
  ScrumProject,
  ScrumSprint,
  ScrumStory,
  ScrumTask,
} from "@shared/schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: {
    label: "Crítica",
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    icon: Flame,
  },
  high: {
    label: "Alta",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    icon: AlertCircle,
  },
  medium: {
    label: "Media",
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    icon: Flag,
  },
  low: {
    label: "Baja",
    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    icon: CircleDot,
  },
};

const SPRINT_STATUS = {
  planning: {
    label: "Planeación",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  active: {
    label: "Activo",
    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  },
  completed: {
    label: "Completado",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
};

const KANBAN_COLS = [
  {
    id: "todo",
    label: "Por Hacer",
    color: "border-slate-300 dark:border-slate-600",
    header: "bg-slate-50 dark:bg-slate-800/50",
  },
  {
    id: "inprogress",
    label: "En Proceso",
    color: "border-blue-300 dark:border-blue-700",
    header: "bg-blue-50 dark:bg-blue-950/50",
  },
  {
    id: "testing",
    label: "En Pruebas",
    color: "border-yellow-300 dark:border-yellow-700",
    header: "bg-yellow-50 dark:bg-yellow-950/50",
  },
  {
    id: "done",
    label: "Hecho",
    color: "border-green-300 dark:border-green-700",
    header: "bg-green-50 dark:bg-green-950/50",
  },
];

function PriorityBadge({ priority }: { priority: string }) {
  const cfg =
    PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ??
    PRIORITY_CONFIG.medium;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

function apiRequest(method: string, url: string, body?: any) {
  return fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  }).then(async (r) => {
    if (!r.ok) {
      const e = await r.json().catch(() => ({ message: "Error" }));
      throw new Error(e.message);
    }
    if (r.status === 204) return null;
    return r.json();
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ScrumTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [innerTab, setInnerTab] = useState("backlog");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);

  // Projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery<
    ScrumProject[]
  >({
    queryKey: ["/api/scrum/projects"],
  });

  const createProject = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiRequest("POST", "/api/scrum/projects", data),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["/api/scrum/projects"] });
      setSelectedProjectId(p.id);
      setShowNewProject(false);
      setProjectForm({ name: "", description: "" });
      toast({ title: "Proyecto creado" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteProject = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/scrum/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scrum/projects"] });
      setSelectedProjectId(null);
      setDeleteProjectId(null);
      toast({ title: "Proyecto eliminado" });
    },
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (loadingProjects)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-950/50 rounded-lg">
            <FolderKanban className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-foreground">
              Gestión de Proyectos Scrum
            </h2>
            <p className="text-xs text-muted-foreground">
              Backlog · Sprint Board · Planificación
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewProject(true)}
          data-testid="button-new-project"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Proyecto
        </Button>
      </div>

      {/* Project selector */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                selectedProjectId === p.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white dark:bg-card border-border hover:bg-gray-50 dark:hover:bg-muted text-gray-700 dark:text-foreground"
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              {p.name}
              {selectedProjectId === p.id && (
                <span
                  className="ml-1 hover:opacity-70"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteProjectId(p.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-violet-100 dark:bg-violet-950/50 rounded-full flex items-center justify-center">
              <FolderKanban className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-foreground">
              Sin proyectos Scrum
            </h3>
            <p className="text-sm text-muted-foreground">
              Crea tu primer proyecto para comenzar a gestionar sprints e
              historias de usuario.
            </p>
            <Button onClick={() => setShowNewProject(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Crear Proyecto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Project content */}
      {selectedProject && (
        <Tabs value={innerTab} onValueChange={setInnerTab}>
          <TabsList className="bg-gray-100 dark:bg-muted p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="backlog" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <ListChecks className="w-4 h-4" /> Backlog
            </TabsTrigger>
            <TabsTrigger value="board" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Layers className="w-4 h-4" /> Sprint Board
            </TabsTrigger>
            <TabsTrigger value="sprints" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="w-4 h-4" /> Sprints
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <ScrumDashboardView projectId={selectedProject.id} projectName={selectedProject.name} />
          </TabsContent>
          <TabsContent value="backlog" className="mt-4">
            <BacklogView projectId={selectedProject.id} />
          </TabsContent>
          <TabsContent value="board" className="mt-4">
            <SprintBoardView projectId={selectedProject.id} />
          </TabsContent>
          <TabsContent value="sprints" className="mt-4">
            <SprintsView projectId={selectedProject.id} />
          </TabsContent>
        </Tabs>
      )}

      {/* New project dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del proyecto *</Label>
              <Input
                value={projectForm.name}
                onChange={(e) =>
                  setProjectForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Ej: App móvil v2.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={projectForm.description}
                onChange={(e) =>
                  setProjectForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Objetivo del proyecto..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!projectForm.name.trim() || createProject.isPending}
              onClick={() => createProject.mutate(projectForm)}
            >
              {createProject.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              )}
              Crear Proyecto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete project confirm */}
      <AlertDialog
        open={!!deleteProjectId}
        onOpenChange={() => setDeleteProjectId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los sprints, historias y tareas. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteProjectId && deleteProject.mutate(deleteProjectId)
              }
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Dashboard View ────────────────────────────────────────────────────────────

function ScrumDashboardView({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { data: sprints = [], isLoading: loadingSprints } = useQuery<ScrumSprint[]>({
    queryKey: ["/api/scrum/projects", projectId, "sprints"],
    queryFn: () => apiRequest("GET", `/api/scrum/projects/${projectId}/sprints`),
  });
  const { data: stories = [], isLoading: loadingStories } = useQuery<ScrumStory[]>({
    queryKey: ["/api/scrum/projects", projectId, "stories"],
    queryFn: () => apiRequest("GET", `/api/scrum/projects/${projectId}/stories`),
  });

  const isLoading = loadingSprints || loadingStories;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  // ── Computed metrics ──────────────────────────────────────────────

  const activeSprint = sprints.find(s => s.status === "active");
  const backlogStories = stories.filter(s => !s.sprintId);
  const allSprintStories = stories.filter(s => !!s.sprintId);
  const activeSprintStories = stories.filter(s => s.sprintId === activeSprint?.id);

  // Story counts by status (active sprint)
  const statusCounts = {
    todo:       activeSprintStories.filter(s => s.status === "todo").length,
    inprogress: activeSprintStories.filter(s => s.status === "inprogress").length,
    testing:    activeSprintStories.filter(s => s.status === "testing").length,
    done:       activeSprintStories.filter(s => s.status === "done").length,
  };
  const totalInSprint = activeSprintStories.length;

  // Points
  const totalPoints = activeSprintStories.reduce((a, s) => a + (s.storyPoints ?? 0), 0);
  const donePoints  = activeSprintStories.filter(s => s.status === "done").reduce((a, s) => a + (s.storyPoints ?? 0), 0);
  const pct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  // Days remaining in sprint
  let daysRemaining: number | null = null;
  if (activeSprint?.endDate) {
    const end = new Date(activeSprint.endDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  }

  // Overall project totals
  const totalStories = stories.length;
  const doneStories = stories.filter(s => s.status === "done").length;
  const totalProjPoints = stories.reduce((a, s) => a + (s.storyPoints ?? 0), 0);
  const doneProjPoints = stories.filter(s => s.status === "done").reduce((a, s) => a + (s.storyPoints ?? 0), 0);

  // Backlog by priority
  const backlogByPriority = {
    critical: backlogStories.filter(s => s.priority === "critical").length,
    high:     backlogStories.filter(s => s.priority === "high").length,
    medium:   backlogStories.filter(s => s.priority === "medium").length,
    low:      backlogStories.filter(s => s.priority === "low").length,
  };

  // Sprints velocity (done pts per completed sprint)
  const completedSprints = sprints.filter(s => s.status === "completed");

  // Story velocity per all sprints
  const sprintVelocities = sprints.map(sp => {
    const spStories = stories.filter(s => s.sprintId === sp.id);
    return {
      name: sp.name,
      status: sp.status,
      total: spStories.reduce((a, s) => a + (s.storyPoints ?? 0), 0),
      done: spStories.filter(s => s.status === "done").reduce((a, s) => a + (s.storyPoints ?? 0), 0),
      storyCount: spStories.length,
      doneCount: spStories.filter(s => s.status === "done").length,
    };
  });

  const maxVelocity = Math.max(...sprintVelocities.map(v => v.total), 1);

  return (
    <div className="space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={BookOpen}
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-100 dark:bg-violet-950/50"
          label="Historias totales"
          value={String(totalStories)}
          sub={`${doneStories} completadas`}
        />
        <KpiCard
          icon={Zap}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100 dark:bg-amber-950/50"
          label="Story Points"
          value={String(totalProjPoints)}
          sub={`${doneProjPoints} entregados`}
        />
        <KpiCard
          icon={PackageOpen}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-950/50"
          label="En backlog"
          value={String(backlogStories.length)}
          sub={`${allSprintStories.length} en sprints`}
        />
        <KpiCard
          icon={CheckCheck}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-100 dark:bg-green-950/50"
          label="Completadas"
          value={`${totalStories > 0 ? Math.round((doneStories / totalStories) * 100) : 0}%`}
          sub={`${completedSprints.length} sprints cerrados`}
        />
      </div>

      {/* Active Sprint + Story status side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Active Sprint Panel */}
        <Card className="border border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                Sprint Activo
              </CardTitle>
              {activeSprint ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                  {SPRINT_STATUS.active.label}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Ninguno</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSprint ? (
              <>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-foreground">{activeSprint.name}</p>
                  {activeSprint.goal && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
                      <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{activeSprint.goal}
                    </p>
                  )}
                </div>

                {/* Days / Dates */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {activeSprint.startDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {activeSprint.startDate} → {activeSprint.endDate}
                    </span>
                  )}
                  {daysRemaining !== null && (
                    <span className={`flex items-center gap-1 font-semibold ${daysRemaining <= 2 ? "text-red-600 dark:text-red-400" : daysRemaining <= 5 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                      <Timer className="w-3.5 h-3.5" />
                      {daysRemaining === 0 ? "¡Vence hoy!" : `${daysRemaining}d restantes`}
                    </span>
                  )}
                </div>

                {/* Points progress */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Puntos completados</span>
                    <span className="font-bold text-gray-900 dark:text-foreground">{donePoints} / {totalPoints} pts — {pct}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-violet-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Story status mini bars */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Por hacer", count: statusCounts.todo, color: "bg-slate-400" },
                    { label: "En proceso", count: statusCounts.inprogress, color: "bg-blue-500" },
                    { label: "Testing", count: statusCounts.testing, color: "bg-amber-500" },
                    { label: "Hecho", count: statusCounts.done, color: "bg-green-500" },
                  ].map(col => (
                    <div key={col.label} className="space-y-1">
                      <div className={`text-lg font-bold text-gray-900 dark:text-foreground`}>{col.count}</div>
                      <div className={`h-1.5 rounded-full ${col.color} opacity-80`} />
                      <div className="text-[10px] text-muted-foreground leading-tight">{col.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No hay sprint activo. Ve a <strong>Sprints</strong> para iniciar uno.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backlog Health */}
        <Card className="border border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              Estado del Backlog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Priority breakdown */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium">Historias sin sprint por prioridad</p>
              <div className="space-y-2.5">
                {[
                  { key: "critical", label: "Crítica", color: "bg-red-500", cfg: PRIORITY_CONFIG.critical },
                  { key: "high",     label: "Alta",    color: "bg-orange-500", cfg: PRIORITY_CONFIG.high },
                  { key: "medium",   label: "Media",   color: "bg-yellow-500", cfg: PRIORITY_CONFIG.medium },
                  { key: "low",      label: "Baja",    color: "bg-green-500",  cfg: PRIORITY_CONFIG.low },
                ].map(p => {
                  const count = backlogByPriority[p.key as keyof typeof backlogByPriority];
                  const maxCount = Math.max(...Object.values(backlogByPriority), 1);
                  return (
                    <div key={p.key} className="flex items-center gap-2">
                      <span className={`text-xs w-14 font-medium ${p.cfg.color.split(' ')[1]}`}>{p.label}</span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold w-6 text-right text-gray-700 dark:text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Backlog total */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total en backlog</span>
              <span className="font-bold text-gray-900 dark:text-foreground">{backlogStories.length} historias</span>
            </div>

            {/* Story points unassigned */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Puntos sin asignar</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">
                {backlogStories.reduce((a, s) => a + (s.storyPoints ?? 0), 0)} pts
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sprint Velocity Chart */}
      {sprintVelocities.length > 0 && (
        <Card className="border border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Velocidad por Sprint (Story Points)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-32 overflow-x-auto pb-2">
              {sprintVelocities.map((sp, idx) => {
                const heightPct = maxVelocity > 0 ? (sp.total / maxVelocity) * 100 : 0;
                const donePct = sp.total > 0 ? (sp.done / sp.total) * 100 : 0;
                const statusColor = sp.status === "active" ? "ring-2 ring-violet-400" : "";
                return (
                  <div key={idx} className="flex flex-col items-center gap-1 min-w-[48px] flex-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-foreground">{sp.done}/{sp.total}</span>
                    <div className={`w-full relative rounded-t-md overflow-hidden ${statusColor}`} style={{ height: `${Math.max(heightPct, 8)}%`, minHeight: "12px" }}>
                      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-t-md" />
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all ${sp.status === "completed" ? "bg-green-500" : sp.status === "active" ? "bg-violet-500" : "bg-slate-400"}`}
                        style={{ height: `${donePct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full text-center">{sp.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${SPRINT_STATUS[sp.status as keyof typeof SPRINT_STATUS]?.color ?? ""}`}>
                      {SPRINT_STATUS[sp.status as keyof typeof SPRINT_STATUS]?.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Barra completa = total pts · Relleno = completados · Resaltado = sprint activo
            </p>
          </CardContent>
        </Card>
      )}

      {/* All stories distribution */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-sky-500" />
            Distribución global de historias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Backlog",     count: stories.filter(s => s.status === "backlog").length,     color: "bg-slate-200 dark:bg-slate-700",  text: "text-slate-600 dark:text-slate-300",  dot: "bg-slate-400" },
              { label: "Por hacer",  count: stories.filter(s => s.status === "todo").length,         color: "bg-blue-100 dark:bg-blue-950/50",  text: "text-blue-700 dark:text-blue-300",    dot: "bg-blue-500" },
              { label: "En proceso", count: stories.filter(s => s.status === "inprogress").length,   color: "bg-amber-100 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-300",  dot: "bg-amber-500" },
              { label: "Testing",    count: stories.filter(s => s.status === "testing").length,      color: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
              { label: "Hecho",      count: stories.filter(s => s.status === "done").length,         color: "bg-green-100 dark:bg-green-950/50", text: "text-green-700 dark:text-green-300",  dot: "bg-green-500" },
            ].map(st => (
              <div key={st.label} className={`flex items-center gap-3 p-3 rounded-xl ${st.color}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                <div>
                  <div className={`text-xl font-extrabold ${st.text}`}>{st.count}</div>
                  <div className="text-xs text-muted-foreground">{st.label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Progress bar overall */}
          {totalStories > 0 && (
            <div className="mt-4">
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {[
                  { count: stories.filter(s => s.status === "backlog").length, color: "bg-slate-300 dark:bg-slate-600" },
                  { count: stories.filter(s => s.status === "todo").length,    color: "bg-blue-400" },
                  { count: stories.filter(s => s.status === "inprogress").length, color: "bg-amber-400" },
                  { count: stories.filter(s => s.status === "testing").length, color: "bg-violet-400" },
                  { count: stories.filter(s => s.status === "done").length,    color: "bg-green-500" },
                ].filter(s => s.count > 0).map((s, i) => (
                  <div key={i} className={`${s.color} h-full transition-all`} style={{ width: `${(s.count / totalStories) * 100}%` }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0%</span>
                <span>{Math.round((doneStories / totalStories) * 100)}% completado</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {stories.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <LayoutDashboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Crea historias y sprints para ver las métricas del proyecto.
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, iconColor, iconBg, label, value, sub }: {
  icon: any; iconColor: string; iconBg: string; label: string; value: string; sub?: string;
}) {
  return (
    <Card className="border border-border/60">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-extrabold text-gray-900 dark:text-foreground truncate">{value}</div>
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          {sub && <div className="text-[10px] text-muted-foreground/70 truncate">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Backlog View ──────────────────────────────────────────────────────────────

function BacklogView({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editStory, setEditStory] = useState<ScrumStory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    acceptanceCriteria: "",
    priority: "medium",
    storyPoints: "",
  });

  const { data: stories = [], isLoading } = useQuery<ScrumStory[]>({
    queryKey: ["/api/scrum/projects", projectId, "stories"],
    queryFn: () =>
      apiRequest("GET", `/api/scrum/projects/${projectId}/stories`),
  });
  const { data: sprints = [] } = useQuery<ScrumSprint[]>({
    queryKey: ["/api/scrum/projects", projectId, "sprints"],
    queryFn: () =>
      apiRequest("GET", `/api/scrum/projects/${projectId}/sprints`),
  });

  const backlogStories = stories.filter((s) => !s.sprintId);

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: ["/api/scrum/projects", projectId, "stories"],
    });

  const createStory = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/scrum/projects/${projectId}/stories`, data),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      resetForm();
      toast({ title: "Historia creada" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStory = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest("PATCH", `/api/scrum/stories/${id}`, data),
    onSuccess: () => {
      invalidate();
      setEditStory(null);
      toast({ title: "Historia actualizada" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteStory = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/scrum/stories/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast({ title: "Historia eliminada" });
    },
  });

  const assignToSprint = useMutation({
    mutationFn: ({ id, sprintId }: { id: number; sprintId: number }) =>
      apiRequest("PATCH", `/api/scrum/stories/${id}`, {
        sprintId,
        status: "todo",
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Historia asignada al sprint" });
    },
  });

  function resetForm() {
    setForm({
      title: "",
      description: "",
      acceptanceCriteria: "",
      priority: "medium",
      storyPoints: "",
    });
  }

  function openEdit(s: ScrumStory) {
    setForm({
      title: s.title,
      description: s.description ?? "",
      acceptanceCriteria: s.acceptanceCriteria ?? "",
      priority: s.priority,
      storyPoints: s.storyPoints ? String(s.storyPoints) : "",
    });
    setEditStory(s);
  }

  function submitForm() {
    const payload = {
      ...form,
      storyPoints: form.storyPoints ? Number(form.storyPoints) : null,
    };
    if (editStory) {
      updateStory.mutate({ id: editStory.id, ...payload });
    } else {
      createStory.mutate(payload);
    }
  }

  const activeSprints = sprints.filter((s) => s.status !== "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-foreground">
            Product Backlog
          </h3>
          <p className="text-xs text-muted-foreground">
            {backlogStories.length} historias sin asignar a sprint
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Nueva Historia
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && backlogStories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-30" />
          El backlog está vacío. Agrega historias de usuario para comenzar.
        </div>
      )}

      <div className="space-y-2">
        {backlogStories.map((story) => (
          <Card
            key={story.id}
            className="border border-border/60 hover:border-primary/30 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <PriorityBadge priority={story.priority} />
                    {story.storyPoints && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400">
                        <Zap className="w-3 h-3" />
                        {story.storyPoints} pts
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 dark:text-foreground text-sm leading-snug">
                    {story.title}
                  </p>
                  {story.description && expandedId === story.id && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {story.description}
                    </p>
                  )}
                  {story.acceptanceCriteria && expandedId === story.id && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-muted rounded text-xs">
                      <span className="font-semibold">
                        Criterios de aceptación:
                      </span>
                      <p className="mt-0.5 text-muted-foreground whitespace-pre-wrap">
                        {story.acceptanceCriteria}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(story.description || story.acceptanceCriteria) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setExpandedId(expandedId === story.id ? null : story.id)
                      }
                    >
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${expandedId === story.id ? "rotate-90" : ""}`}
                      />
                    </Button>
                  )}
                  {activeSprints.length > 0 && (
                    <Select
                      onValueChange={(val) =>
                        assignToSprint.mutate({
                          id: story.id,
                          sprintId: Number(val),
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-auto text-xs px-2 border-dashed">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Sprint</span>
                      </SelectTrigger>
                      <SelectContent>
                        {activeSprints.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(story)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(story.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Story form dialog */}
      <Dialog
        open={showForm || !!editStory}
        onOpenChange={(o) => {
          if (!o) {
            setShowForm(false);
            setEditStory(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editStory ? "Editar Historia" : "Nueva Historia de Usuario"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Como [usuario], quiero [acción] para [beneficio]"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Detalla el contexto y objetivos..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Criterios de Aceptación</Label>
              <Textarea
                value={form.acceptanceCriteria}
                onChange={(e) =>
                  setForm((p) => ({ ...p, acceptanceCriteria: e.target.value }))
                }
                placeholder="- El usuario puede...\n- El sistema debe..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Story Points</Label>
                <Select
                  value={form.storyPoints}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, storyPoints: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "5", "8", "13", "21"].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditStory(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                !form.title.trim() ||
                createStory.isPending ||
                updateStory.isPending
              }
              onClick={submitForm}
            >
              {(createStory.isPending || updateStory.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              )}
              {editStory ? "Guardar" : "Crear Historia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar historia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también todas las tareas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteStory.mutate(deleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sprint Board (Kanban) ─────────────────────────────────────────────────────

function SprintBoardView({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [dragStoryId, setDragStoryId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [expandedStory, setExpandedStory] = useState<number | null>(null);
  const [taskInputs, setTaskInputs] = useState<Record<number, string>>({});

  const { data: sprints = [] } = useQuery<ScrumSprint[]>({
    queryKey: ["/api/scrum/projects", projectId, "sprints"],
    queryFn: () =>
      apiRequest("GET", `/api/scrum/projects/${projectId}/sprints`),
  });

  const { data: stories = [] } = useQuery<ScrumStory[]>({
    queryKey: ["/api/scrum/projects", projectId, "stories"],
    queryFn: () =>
      apiRequest("GET", `/api/scrum/projects/${projectId}/stories`),
  });

  const activeSprints = sprints.filter((s) => s.status === "active");
  const currentSprintId =
    selectedSprintId ?? activeSprints[0]?.id ?? sprints[0]?.id ?? null;
  const currentSprint = sprints.find((s) => s.id === currentSprintId);
  const sprintStories = stories.filter((s) => s.sprintId === currentSprintId);

  const invalidateStories = () =>
    qc.invalidateQueries({
      queryKey: ["/api/scrum/projects", projectId, "stories"],
    });

  const moveStory = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/scrum/stories/${id}`, { status }),
    onSuccess: invalidateStories,
  });

  const { data: allTasks = {} } = useQuery<Record<number, ScrumTask[]>>({
    queryKey: ["/api/scrum/tasks", currentSprintId],
    queryFn: async () => {
      const result: Record<number, ScrumTask[]> = {};
      for (const s of sprintStories) {
        result[s.id] = await apiRequest(
          "GET",
          `/api/scrum/stories/${s.id}/tasks`,
        );
      }
      return result;
    },
    enabled: sprintStories.length > 0,
  });

  const createTask = useMutation({
    mutationFn: ({ storyId, title }: { storyId: number; title: string }) =>
      apiRequest("POST", `/api/scrum/stories/${storyId}/tasks`, { title }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/scrum/tasks", currentSprintId] });
      setTaskInputs((p) => ({ ...p, [vars.storyId]: "" }));
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/scrum/tasks/${id}`, { status }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["/api/scrum/tasks", currentSprintId] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scrum/tasks/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["/api/scrum/tasks", currentSprintId] }),
  });

  function handleDragStart(storyId: number) {
    setDragStoryId(storyId);
  }
  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setDragOverCol(colId);
  }
  function handleDrop(colId: string) {
    if (dragStoryId !== null && colId !== null) {
      moveStory.mutate({ id: dragStoryId, status: colId });
    }
    setDragStoryId(null);
    setDragOverCol(null);
  }
  function handleDragEnd() {
    setDragStoryId(null);
    setDragOverCol(null);
  }

  if (sprints.length === 0)
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
        Crea un sprint primero en la pestaña <strong>Sprints</strong> para ver
        el tablero.
      </div>
    );

  const totalPoints = sprintStories.reduce(
    (s, st) => s + (st.storyPoints ?? 0),
    0,
  );
  const donePoints = sprintStories
    .filter((s) => s.status === "done")
    .reduce((s, st) => s + (st.storyPoints ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Sprint selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={String(currentSprintId ?? "")}
          onValueChange={(v) => setSelectedSprintId(Number(v))}
        >
          <SelectTrigger className="w-auto min-w-[200px]">
            <SelectValue placeholder="Selecciona un sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name} —{" "}
                <span
                  className={`text-xs ${SPRINT_STATUS[s.status as keyof typeof SPRINT_STATUS]?.color ?? ""}`}
                >
                  {SPRINT_STATUS[s.status as keyof typeof SPRINT_STATUS]?.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentSprint && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {currentSprint.startDate && (
              <span>
                📅 {currentSprint.startDate} → {currentSprint.endDate}
              </span>
            )}
            {totalPoints > 0 && (
              <span className="font-medium text-violet-600 dark:text-violet-400">
                {donePoints}/{totalPoints} pts
              </span>
            )}
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 min-h-[400px]">
        {KANBAN_COLS.map((col) => {
          const colStories = sprintStories.filter((s) => s.status === col.id);
          const isOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border-2 transition-colors ${col.color} ${isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-t-[10px] ${col.header}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  {col.label}
                </span>
                <span className="text-xs font-bold bg-white dark:bg-card px-1.5 py-0.5 rounded-full shadow-sm">
                  {colStories.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[80px]">
                {colStories.map((story) => (
                  <div
                    key={story.id}
                    draggable
                    onDragStart={() => handleDragStart(story.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white dark:bg-card rounded-lg p-3 shadow-sm border border-border/60 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${dragStoryId === story.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-medium text-gray-900 dark:text-foreground leading-snug flex-1">
                        {story.title}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <GripVertical className="w-3 h-3 text-muted-foreground" />
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setExpandedStory(
                              expandedStory === story.id ? null : story.id,
                            )
                          }
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${expandedStory === story.id ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={story.priority} />
                      {story.storyPoints && (
                        <span className="text-xs text-muted-foreground">
                          {story.storyPoints}pts
                        </span>
                      )}
                    </div>

                    {/* Tasks section */}
                    {expandedStory === story.id && (
                      <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
                        {(allTasks[story.id] ?? []).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-1.5 group"
                          >
                            <button
                              onClick={() =>
                                updateTask.mutate({
                                  id: task.id,
                                  status:
                                    task.status === "done" ? "todo" : "done",
                                })
                              }
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 flex-shrink-0 ${task.status === "done" ? "text-green-500" : "text-muted-foreground"}`}
                              />
                            </button>
                            <span
                              className={`text-xs flex-1 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.title}
                            </span>
                            <button
                              onClick={() => deleteTask.mutate(task.id)}
                              className="opacity-0 group-hover:opacity-100 text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-1 mt-1">
                          <Input
                            value={taskInputs[story.id] ?? ""}
                            onChange={(e) =>
                              setTaskInputs((p) => ({
                                ...p,
                                [story.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                (taskInputs[story.id] ?? "").trim()
                              ) {
                                createTask.mutate({
                                  storyId: story.id,
                                  title: taskInputs[story.id].trim(),
                                });
                              }
                            }}
                            placeholder="responsable + tarea (Enter)"
                            className="h-6 text-xs px-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {colStories.length === 0 && (
                  <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Arrastra aquí
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sprints View ──────────────────────────────────────────────────────────────

function SprintsView({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
  });

  const { data: sprints = [], isLoading } = useQuery<ScrumSprint[]>({
    queryKey: ["/api/scrum/projects", projectId, "sprints"],
    queryFn: () =>
      apiRequest("GET", `/api/scrum/projects/${projectId}/sprints`),
  });
  const { data: stories = [] } = useQuery<ScrumStory[]>({
    queryKey: ["/api/scrum/projects", projectId, "stories"],
    queryFn: () =>
      apiRequest("GET", `/api/scrum/projects/${projectId}/stories`),
  });

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: ["/api/scrum/projects", projectId, "sprints"],
    });
    qc.invalidateQueries({
      queryKey: ["/api/scrum/projects", projectId, "stories"],
    });
  };

  const createSprint = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/scrum/projects/${projectId}/sprints`, data),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm({ name: "", goal: "", startDate: "", endDate: "" });
      toast({ title: "Sprint creado" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSprint = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiRequest("PATCH", `/api/scrum/sprints/${id}`, data),
    onSuccess: invalidate,
  });

  const deleteSprint = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/scrum/sprints/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast({ title: "Sprint eliminado" });
    },
  });

  const removeFromSprint = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiRequest("PATCH", `/api/scrum/stories/${id}`, {
        sprintId: null,
        status: "backlog",
      }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-foreground">
            Sprints
          </h3>
          <p className="text-xs text-muted-foreground">
            {sprints.length} sprints creados
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Sprint
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && sprints.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No hay sprints. Crea el primero para comenzar la planificación.
        </div>
      )}

      <div className="space-y-4">
        {sprints.map((sprint) => {
          const sprintStories = stories.filter((s) => s.sprintId === sprint.id);
          const totalPts = sprintStories.reduce(
            (a, s) => a + (s.storyPoints ?? 0),
            0,
          );
          const donePts = sprintStories
            .filter((s) => s.status === "done")
            .reduce((a, s) => a + (s.storyPoints ?? 0), 0);
          const statusCfg =
            SPRINT_STATUS[sprint.status as keyof typeof SPRINT_STATUS] ??
            SPRINT_STATUS.planning;

          return (
            <Card key={sprint.id} className="border border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CardTitle className="text-base">{sprint.name}</CardTitle>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    {sprint.goal && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 flex-shrink-0" />
                        {sprint.goal}
                      </p>
                    )}
                    {sprint.startDate && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {sprint.startDate} → {sprint.endDate}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {sprint.status === "planning" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() =>
                          updateSprint.mutate({
                            id: sprint.id,
                            status: "active",
                          })
                        }
                      >
                        <Zap className="w-3 h-3 mr-1" /> Iniciar
                      </Button>
                    )}
                    {sprint.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-green-700 border-green-300"
                        onClick={() =>
                          updateSprint.mutate({
                            id: sprint.id,
                            status: "completed",
                          })
                        }
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Completar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(sprint.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {totalPts > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progreso</span>
                      <span>
                        {donePts}/{totalPts} pts
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{
                          width: `${totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>

              {sprintStories.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {sprintStories.map((story) => (
                      <div
                        key={story.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-muted/50 group"
                      >
                        <PriorityBadge priority={story.priority} />
                        <span className="text-xs flex-1 text-gray-700 dark:text-foreground">
                          {story.title}
                        </span>
                        {story.storyPoints && (
                          <span className="text-xs text-muted-foreground">
                            {story.storyPoints}pts
                          </span>
                        )}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${story.status === "done" ? "bg-green-100 text-green-700" : story.status === "inprogress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                        >
                          {story.status === "todo"
                            ? "Por hacer"
                            : story.status === "inprogress"
                              ? "En proceso"
                              : story.status === "testing"
                                ? "Testing"
                                : "Hecho"}
                        </span>
                        {sprint.status !== "active" && (
                          <button
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              removeFromSprint.mutate({ id: story.id })
                            }
                            title="Quitar del sprint"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create sprint dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Sprint 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Objetivo del Sprint</Label>
              <Textarea
                value={form.goal}
                onChange={(e) =>
                  setForm((p) => ({ ...p, goal: e.target.value }))
                }
                placeholder="¿Qué se logrará en este sprint?"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.name.trim() || createSprint.isPending}
              onClick={() => createSprint.mutate(form)}
            >
              {createSprint.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              )}
              Crear Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Las historias asignadas volverán al backlog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteSprint.mutate(deleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
