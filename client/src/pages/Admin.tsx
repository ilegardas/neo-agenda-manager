"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Calendar, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  Clock, 
  X, 
  FolderKanban 
} from "lucide-react";
import { ScrumTab } from "@/components/ScrumTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  SiWhatsapp, 
  SiFacebook, 
  SiInstagram, 
  SiTiktok, 
  SiYoutube, 
  SiLinkedin 
} from "react-icons/si";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("appointments");
  const queryClient = useQueryClient();

  // Consultas de datos
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/appointments");
      if (!res.ok) throw new Error("Error al cargar citas");
      return res.json();
    },
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const res = await fetch("/api/admin/services");
      if (!res.ok) throw new Error("Error al cargar servicios");
      return res.json();
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Citas
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="scrum" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Scrum
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Ajustes
          </TabsTrigger>
        </TabsList>

        {/* Pestaña de Citas */}
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Citas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAppointments ? (
                <p className="text-muted-foreground">Cargando citas...</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground">No hay citas registradas.</p>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{appointment.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.serviceName} - {appointment.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
                          {appointment.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña de Servicios */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Servicios Ofrecidos</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Servicio
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingServices ? (
                <p className="text-muted-foreground">Cargando servicios...</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {services.map((service: any) => (
                    <Card key={service.id}>
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg">{service.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {service.description}
                        </p>
                        <p className="font-semibold text-primary mt-2">
                          ${service.price}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña Scrum */}
        <TabsContent value="scrum" className="space-y-4">
          <ScrumTab />
        </TabsContent>

        {/* Pestaña de Ajustes */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ajustes de la plataforma y redes sociales conectadas.
              </p>
              <div className="flex items-center gap-4">
                <SiWhatsapp className="h-5 w-5 text-green-500" />
                <SiFacebook className="h-5 w-5 text-blue-600" />
                <SiInstagram className="h-5 w-5 text-pink-500" />
                <SiTiktok className="h-5 w-5" />
                <SiYoutube className="h-5 w-5 text-red-600" />
                <SiLinkedin className="h-5 w-5 text-blue-700" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
