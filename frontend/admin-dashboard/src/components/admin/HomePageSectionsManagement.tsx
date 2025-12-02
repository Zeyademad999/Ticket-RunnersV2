import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit,
  Trash2,
  Plus,
  Layout,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { homePageSectionsApi, eventsApi } from "@/lib/api/adminApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HomePageSection {
  id: number;
  section_key: string;
  title: string;
  subtitle: string;
  events: Array<{
    id: number;
    title: string;
    date: string;
    status: string;
  }>;
  order: number;
  is_active: boolean;
  max_events: number;
  event_count: number;
}

interface Event {
  id: number;
  title: string;
  date: string;
  status: string;
}

const HomePageSectionsManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomePageSection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<HomePageSection | null>(null);
  const [formData, setFormData] = useState({
    section_key: "",
    title: "",
    subtitle: "",
    event_ids: [] as number[],
    order: 0,
    is_active: true,
    max_events: 10,
  });

  // Fetch sections
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["homePageSections"],
    queryFn: () => homePageSectionsApi.getSections(),
  });

  // Fetch public sections (what web app sees)
  const { data: publicSections = [], isLoading: isLoadingPublic } = useQuery({
    queryKey: ["homePageSectionsPublic"],
    queryFn: () => homePageSectionsApi.getPublicSections(),
  });

  // Fetch events for selection
  const { data: eventsData } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventsApi.getEvents({ page_size: 1000 }),
  });

  const events: Event[] = eventsData?.results || eventsData || [];

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (editingSection) {
        return homePageSectionsApi.updateSection(editingSection.id, data);
      }
      return homePageSectionsApi.createSection(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homePageSections"] });
      queryClient.invalidateQueries({ queryKey: ["homePageSectionsPublic"] });
      toast({
        title: t("success"),
        description: editingSection
          ? t("homePageSections.updated")
          : t("homePageSections.created"),
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error?.response?.data?.message || t("homePageSections.error"),
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => homePageSectionsApi.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homePageSections"] });
      queryClient.invalidateQueries({ queryKey: ["homePageSectionsPublic"] });
      setIsDeleteDialogOpen(false);
      setSectionToDelete(null);
      toast({
        title: t("success"),
        description: t("homePageSections.deleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error?.response?.data?.message || t("homePageSections.deleteError"),
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      homePageSectionsApi.updateSection(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homePageSections"] });
      queryClient.invalidateQueries({ queryKey: ["homePageSectionsPublic"] });
      toast({
        title: t("success"),
        description: t("homePageSections.statusUpdated"),
      });
    },
  });

  const resetForm = () => {
    setFormData({
      section_key: "",
      title: "",
      subtitle: "",
      event_ids: [],
      order: 0,
      is_active: true,
      max_events: 10,
    });
    setEditingSection(null);
  };

  const handleEdit = (section: HomePageSection) => {
    setEditingSection(section);
    setFormData({
      section_key: section.section_key,
      title: section.title,
      subtitle: section.subtitle || "",
      event_ids: section.events.map((e) => e.id),
      order: section.order,
      is_active: section.is_active,
      max_events: section.max_events,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || (!editingSection && !formData.section_key)) {
      toast({
        title: t("error"),
        description: t("homePageSections.fillRequired"),
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    const section = sections.find((s) => s.id === id);
    if (section) {
      setSectionToDelete(section);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteSection = () => {
    if (sectionToDelete) {
      deleteMutation.mutate(sectionToDelete.id);
      setIsDeleteDialogOpen(false);
      setSectionToDelete(null);
    }
  };

  const handleToggleActive = (section: HomePageSection) => {
    toggleActiveMutation.mutate({
      id: section.id,
      is_active: !section.is_active,
    });
  };

  const sectionKeyOptions = [
    { value: "trending", label: t("homePageSections.trending") },
    { value: "upcoming", label: t("homePageSections.upcoming") },
    { value: "recommended", label: t("homePageSections.recommended") },
    { value: "featured", label: t("homePageSections.featured") },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="management" className="w-full">
        <TabsList>
          <TabsTrigger value="management">
            {t("homePageSections.management")}
          </TabsTrigger>
          <TabsTrigger value="preview">
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("homePageSections.preview")}
          </TabsTrigger>
        </TabsList>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                {t("homePageSections.title")}
              </CardTitle>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t("homePageSections.create")}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("homePageSections.sectionKey")}</TableHead>
                    <TableHead>{t("homePageSections.title")}</TableHead>
                    <TableHead>{t("homePageSections.events")}</TableHead>
                    <TableHead>{t("homePageSections.order")}</TableHead>
                    <TableHead>{t("homePageSections.status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t("homePageSections.noSections")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sections
                      .sort((a: HomePageSection, b: HomePageSection) => a.order - b.order)
                      .map((section: HomePageSection) => (
                        <TableRow key={section.id}>
                          <TableCell>
                            <Badge variant="outline">{section.section_key}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{section.title}</div>
                              {section.subtitle && (
                                <div className="text-sm text-muted-foreground">
                                  {section.subtitle}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {section.event_count || section.events?.length || 0} {t("events")}
                          </TableCell>
                          <TableCell>{section.order}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={section.is_active}
                                onCheckedChange={() => handleToggleActive(section)}
                              />
                              {section.is_active ? (
                                <Eye className="h-4 w-4 text-green-500" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(section)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(section.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab - Shows what web app sees */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t("homePageSections.previewTitle")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {t("homePageSections.previewDescription")}
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingPublic ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">{t("loading")}</div>
                </div>
              ) : publicSections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>{t("homePageSections.noActiveSections")}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {publicSections
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((section: any) => (
                      <Card key={section.section_key} className="border-2">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-xl">{section.title}</CardTitle>
                              {section.subtitle && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {section.subtitle}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary">{section.section_key}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {section.events && section.events.length > 0 ? (
                            <div className="space-y-4">
                              <p className="text-sm font-medium">
                                {t("homePageSections.showingEvents", {
                                  count: section.events.length,
                                })}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {section.events.map((event: any) => (
                                  <Card key={event.id} className="border">
                                    <CardContent className="p-4">
                                      <h4 className="font-semibold mb-2">{event.title}</h4>
                                      <div className="text-sm text-muted-foreground space-y-1">
                                        {event.date && (
                                          <p>
                                            <span className="font-medium">{t("date")}:</span>{" "}
                                            {event.date}
                                          </p>
                                        )}
                                        {event.time && (
                                          <p>
                                            <span className="font-medium">{t("time")}:</span>{" "}
                                            {event.time}
                                          </p>
                                        )}
                                        {event.location && (
                                          <p>
                                            <span className="font-medium">{t("location")}:</span>{" "}
                                            {event.location}
                                          </p>
                                        )}
                                        {event.status && (
                                          <Badge variant="outline" className="mt-2">
                                            {event.status}
                                          </Badge>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {t("homePageSections.noEventsInSection")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection
                ? t("homePageSections.edit")
                : t("homePageSections.create")}
            </DialogTitle>
            <DialogDescription>
              {t("homePageSections.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingSection && (
              <div>
                <label className="text-sm font-medium">
                  {t("homePageSections.sectionKey")} *
                </label>
                <Select
                  value={formData.section_key}
                  onValueChange={(value) =>
                    setFormData({ ...formData, section_key: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("homePageSections.selectSectionKey")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionKeyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">
                {t("homePageSections.title")} *
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t("homePageSections.titlePlaceholder")}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("homePageSections.subtitle")}
              </label>
              <Textarea
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                placeholder={t("homePageSections.subtitlePlaceholder")}
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("homePageSections.selectEvents")}
              </label>
              <ScrollArea className="h-64 w-full border rounded-md p-4">
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("homePageSections.noEventsAvailable")}
                    </p>
                  ) : (
                    events.map((event) => {
                      const isSelected = formData.event_ids.includes(event.id);
                      return (
                        <div
                          key={event.id}
                          className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md"
                        >
                          <Checkbox
                            id={`event-${event.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  event_ids: [...formData.event_ids, event.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  event_ids: formData.event_ids.filter((id) => id !== event.id),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`event-${event.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span>{event.title}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {event.date}
                              </span>
                            </div>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              {formData.event_ids.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("homePageSections.selectedEvents", {
                      count: formData.event_ids.length,
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.event_ids.map((eventId) => {
                      const event = events.find((e) => e.id === eventId);
                      return (
                        <Badge
                          key={eventId}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              event_ids: formData.event_ids.filter((id) => id !== eventId),
                            });
                          }}
                        >
                          {event?.title || eventId}
                          <span className="ml-1">×</span>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("homePageSections.order")}
                </label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  {t("homePageSections.maxEvents")}
                </label>
                <Input
                  type="number"
                  value={formData.max_events}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_events: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <label className="text-sm font-medium">
                {t("homePageSections.active")}
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("homePageSections.dialogs.deleteSection") || "Delete Section"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("homePageSections.dialogs.deleteSectionConfirm") || "Are you sure you want to delete this section? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {sectionToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("homePageSections.table.title")}:</strong> {sectionToDelete.title}
              </p>
              {sectionToDelete.subtitle && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("homePageSections.table.subtitle")}:</strong> {sectionToDelete.subtitle}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSectionToDelete(null);
              }}
            >
              {t("homePageSections.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSection}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("homePageSections.actions.delete") || "Delete Section"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePageSectionsManagement;

