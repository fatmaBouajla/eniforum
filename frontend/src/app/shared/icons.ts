// Icônes utilisées dans l'application (Lucide, licence ISC)
import {
  Archive, ArrowLeft, ArrowRight, Award, BadgeCheck, Bell, BellRing, BrainCircuit, Briefcase, Building2,
  Calendar, CalendarClock, CalendarDays, ChartColumn, ChartPie, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleAlert, CircleCheck, CircleX, ClipboardList, Clock, Crown, Download, Eye, EyeOff, FileSpreadsheet,
  FileText, Flag, FolderKanban, Gauge, GraduationCap, Handshake, History, Inbox, Info, KeyRound, Layers,
  LayoutDashboard, ListTodo, Lock, LockOpen, LogOut, Mail, MapPin, Medal, Megaphone, Menu, MessageSquare, Mic,
  Palette, PanelLeftClose, PanelLeftOpen, Pencil, Phone, Plus, Presentation, Printer, RefreshCw, Rocket, Search,
  Send, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, TriangleAlert, Truck, Upload, User, UserCheck,
  UserPlus, Users, X,
} from 'lucide-angular';

export const ICONES = {
  Archive, ArrowLeft, ArrowRight, Award, BadgeCheck, Bell, BellRing, BrainCircuit, Briefcase, Building2,
  Calendar, CalendarClock, CalendarDays, ChartColumn, ChartPie, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleAlert, CircleCheck, CircleX, ClipboardList, Clock, Crown, Download, Eye, EyeOff, FileSpreadsheet,
  FileText, Flag, FolderKanban, Gauge, GraduationCap, Handshake, History, Inbox, Info, KeyRound, Layers,
  LayoutDashboard, ListTodo, Lock, LockOpen, LogOut, Mail, MapPin, Medal, Megaphone, Menu, MessageSquare, Mic,
  Palette, PanelLeftClose, PanelLeftOpen, Pencil, Phone, Plus, Presentation, Printer, RefreshCw, Rocket, Search,
  Send, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, TriangleAlert, Truck, Upload, User, UserCheck,
  UserPlus, Users, X,
};

/** Icône associée à chaque comité. */
export const ICONE_COMITE: Record<string, string> = {
  sponsoring: 'handshake', design: 'palette', logistique: 'truck',
  projet: 'folder-kanban', programme: 'presentation', media: 'megaphone',
};

export function iconeComite(nom: string | undefined | null): string {
  const cle = (nom ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const trouve = Object.keys(ICONE_COMITE).find(k => cle.includes(k));
  return trouve ? ICONE_COMITE[trouve] : 'layers';
}
