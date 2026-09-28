import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudUpload,
  FileImage,
  Flame,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Siren,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetAdminSettingsQueryKey,
  getGetDashboardSummaryQueryKey,
  getListAdminsQueryKey,
  getListDepartmentsQueryKey,
  getListIncidentsQueryKey,
  useCreateAdmin,
  useCreateIncident,
  useDeleteAdmin,
  useGetAdminSettings,
  useGetDashboardSummary,
  useHealthCheck,
  useListAdmins,
  useListDepartments,
  useListIncidents,
  useRequestUploadUrl,
  useUpdateAdminSettings,
  useUpdateIncident,
  type Department,
  type Incident,
} from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

type StatIcon = typeof Activity;

function FlagLogo({ compact = false, siteName = 'TwinCity' }: { compact?: boolean; siteName?: string }) {
  return (
    <Link href="/" className="group flex items-center gap-3" data-testid="link-logo">
      <img src={`${basePath}/logo.svg`} alt="Sierra Leone flag" className="h-7 w-10 shrink-0 rounded-[3px] object-cover shadow-[0_3px_0_hsl(177_58%_15%/0.16)] transition-transform group-hover:-translate-y-0.5" data-testid="img-sierra-leone-flag" />
      {!compact && (
        <span className="font-display text-lg font-bold tracking-[-0.04em] text-inherit">
          {siteName}
        </span>
      )}
    </Link>
  );
}

function LoadingBlock({ label = 'Loading TwinCity' }: { label?: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-8" data-testid="state-loading">
      <div className="flex gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-secondary [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-secondary [animation-delay:300ms]" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function ErrorState({ retry, label = 'Something did not load' }: { retry?: () => void; label?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-accent/25 bg-accent/5 p-8 text-center" data-testid="state-error">
      <CircleAlert className="mb-3 h-8 w-8 text-accent" />
      <p className="font-display text-lg font-bold text-foreground">{label}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">The city desk could not reach this service. Try again in a moment.</p>
      {retry && <Button variant="outline" size="sm" onClick={retry} className="mt-4" data-testid="button-retry"><RefreshCw className="mr-2 h-4 w-4" /> Try again</Button>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s/g, '-');
  const styles: Record<string, string> = {
    new: 'border-secondary/40 bg-secondary/15 text-primary',
    'in-progress': 'border-sky-700/20 bg-sky-700/10 text-sky-800',
    resolved: 'border-emerald-700/20 bg-emerald-700/10 text-emerald-800',
    closed: 'border-border bg-muted text-muted-foreground',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.12em] ${styles[key] ?? styles.new}`} data-testid={`status-${key}`}><span className="h-1.5 w-1.5 rounded-full bg-current" /> {status.replace('-', ' ')}</span>;
}

function PriorityMark({ priority }: { priority: string }) {
  const key = priority.toLowerCase();
  const tone = key === 'urgent' || key === 'high' ? 'text-accent' : key === 'medium' ? 'text-secondary' : 'text-muted-foreground';
  return <span className={`text-xs font-bold uppercase tracking-[.13em] ${tone}`} data-testid={`priority-${key}`}>{priority}</span>;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}

function PublicNav({ siteName }: { siteName: string }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <FlagLogo siteName={siteName} />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-primary/75 md:flex" aria-label="Public navigation">
          <a href="#how-it-works" className="transition-colors hover:text-primary" data-testid="link-how-it-works">How it works</a>
          <a href="#departments" className="transition-colors hover:text-primary" data-testid="link-departments">Departments</a>
          <a href="#service-health" className="transition-colors hover:text-primary" data-testid="link-service-health">Service health</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5" data-testid="link-sign-in">Sign in</Link>
           <Link href="/sign-up" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_4px_0_hsl(177_51%_13%/0.15)] transition-transform hover:-translate-y-0.5" data-testid="link-sign-up">Join {siteName}</Link>
        </div>
      </div>
    </header>
  );
}

function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const health = useHealthCheck();
  const departments = useListDepartments();
  const settings = useGetAdminSettings();
  const now = useClock();
  const live = health.data?.status === 'ok' || health.data?.status === 'healthy';
  const siteName = settings.data?.siteName ?? 'TwinCity';
  const welcomeMessage = settings.data?.welcomeMessage ?? 'TwinCity gives Freetown residents a direct line to the teams keeping the city moving — from a dark street in Kissy to a blocked drain in Lumley.';
  const tagline = settings.data?.tagline ?? 'Your report. Our response.';
  if (isLoaded && isSignedIn) return <Redirect to="/incidents" />;
  return (
    <div className="twincity-noise min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <PublicNav siteName={siteName} />
      <main>
        <section className="surface-grid relative overflow-hidden border-b border-border/60 bg-[hsl(45_37%_95%)]">
          <div className="pointer-events-none absolute -right-24 top-24 h-96 w-96 rounded-full border-[50px] border-accent/15" />
          <div className="pointer-events-none absolute -bottom-44 left-[-8rem] h-[28rem] w-[28rem] rounded-full border-[72px] border-secondary/70" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-36 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:px-8 lg:pb-28 lg:pt-48">
            <div className="animate-rise">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/65 px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-primary">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-600" /> A clearer city, together
              </div>
              <h1 className="max-w-3xl font-display text-[clamp(3.3rem,8vw,7.6rem)] font-extrabold leading-[.91] tracking-[-.075em] text-primary">
                {tagline.split('. ')[0]}.<br /><span className="text-accent">{tagline.split('. ').slice(1).join('. ') || 'Our response.'}</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-primary/70 lg:text-xl">{welcomeMessage}</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/sign-up" className="group inline-flex items-center gap-3 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_6px_0_hsl(177_51%_13%/.14)] transition-all hover:-translate-y-1" data-testid="link-report-an-issue">Report an issue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-background/50 px-5 py-3.5 text-sm font-bold text-primary transition-colors hover:bg-background" data-testid="link-view-reports">View my reports</Link>
              </div>
              <div className="mt-12 flex items-center gap-3 text-xs font-medium text-primary/60">
                <ShieldCheck className="h-4 w-4 text-primary" /> Built for Freetown. Accountable by design.
              </div>
            </div>
            <div className="animate-rise animate-rise-2 relative">
              <div className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-[#dcebe7] p-6 text-primary shadow-[14px_16px_0_hsl(204_100%_39%/.14)] lg:p-8">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-accent/10" />
                <div className="relative flex items-start justify-between">
                  <div><p className="text-xs font-bold uppercase tracking-[.17em] text-accent">Freetown desk</p><p className="mt-2 font-display text-2xl font-bold">City pulse</p></div>
                  <Activity className="h-6 w-6 text-accent" />
                </div>
                <div className="relative mt-10 grid grid-cols-2 gap-3">
                  {[['47', 'reports this week'], ['3.8h', 'average response']].map(([value, label], index) => <div key={label} className="rounded-2xl border border-primary/10 bg-primary/5 p-4"><p className="font-display text-3xl font-bold text-accent">{value}</p><p className="mt-1 text-xs text-primary/60">{label}</p><div className={`mt-4 h-1 rounded-full ${index === 0 ? 'w-3/4 bg-accent' : 'w-1/2 bg-primary/20'}`} /></div>)}
                </div>
                <div className="relative mt-3 flex items-center justify-between rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 text-primary/70"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Services online</span>
                  <span className="font-bold text-accent">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} SLST</span>
                </div>
                <div className="relative mt-8 flex items-end gap-1.5">
                  {[38, 50, 42, 68, 57, 78, 63, 84, 73, 91, 77, 95].map((height, i) => <span key={i} className={`flex-1 rounded-t ${i > 8 ? 'bg-accent' : 'bg-primary/15'}`} style={{ height: `${height / 2.5}px` }} />)}
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[.16em] text-primary/45">Community reports, last 12 days</p>
              </div>
            </div>
          </div>
        </section>

        <section id="service-health" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div><p className="text-xs font-bold uppercase tracking-[.17em] text-accent">Live service health</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">The desk is open.</h2></div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-current-time"><Clock3 className="h-4 w-4" /> {now.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} SLST</div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Report intake', 'Department queues', 'Resident updates'].map((label, i) => <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3" data-testid={`health-card-${i}`}><span className="text-sm font-semibold">{label}</span><span className="flex items-center gap-2 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {i === 0 && health.isLoading ? 'Checking' : live === false ? 'Checking' : 'Operational'}</span></div>)}
          </div>
        </section>

        <section id="how-it-works" className="bg-primary py-20 text-primary-foreground lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
              <div><p className="text-xs font-bold uppercase tracking-[.17em] text-secondary">One shared record</p><h2 className="mt-4 max-w-md font-display text-4xl font-bold leading-tight tracking-[-.04em] lg:text-5xl">A city works better when everyone can see the thread.</h2></div>
              <div className="grid gap-5 sm:grid-cols-3">
                {[['01', 'Tell us what happened', 'A short, clear report with a location gives the right desk a head start.'], ['02', 'The right team picks it up', 'City Council, EDSA and FireForce see the queue built for their work.'], ['03', 'You stay in the loop', 'Track every update without chasing a phone number or office.']].map(([number, title, copy]) => <div key={number} className="border-t border-primary-foreground/20 pt-4"><p className="font-display text-4xl font-bold text-secondary">{number}</p><h3 className="mt-7 text-base font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-primary-foreground/60">{copy}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="departments" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-accent">The desks behind the response</p><h2 className="mt-3 font-display text-4xl font-bold tracking-[-.05em]">One city. Many hands.</h2></div><p className="max-w-xs text-sm leading-6 text-muted-foreground">Your report lands with the team closest to the problem.</p></div>
          {departments.isLoading ? <div className="mt-10"><LoadingBlock label="Loading service departments" /></div> : departments.isError ? <div className="mt-10"><ErrorState retry={() => departments.refetch()} /></div> : <div className="mt-10 grid gap-4 md:grid-cols-3">{(departments.data ?? []).map((department, index) => <DepartmentCard department={department} index={index} key={department.id} />)}</div>}
        </section>
         <footer className="border-t border-border bg-[hsl(42_32%_90%/.6)]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-8 lg:px-8"><FlagLogo siteName={siteName} /><p className="text-xs text-muted-foreground">A public service for Freetown, Sierra Leone · {new Date().getFullYear()}</p><p className="text-xs font-bold uppercase tracking-[.15em] text-primary/60">For the city, with the city</p></div></footer>
      </main>
    </div>
  );
}

function DepartmentCard({ department, index }: { department: Department; index: number }) {
  const icons = [Home, Zap, Flame];
  const Icon = icons[index % icons.length];
  return <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg" data-testid={`card-department-${department.id}`}><span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: department.color }} /><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-secondary"><Icon className="h-5 w-5" /></div><h3 className="mt-8 font-display text-xl font-bold">{department.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{department.description}</p><div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-primary/55">{department.shortName}<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></div></div>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const settings = useGetAdminSettings();
  const email = user?.primaryEmailAddress?.emailAddress ?? 'Resident';
  const nav = [{ href: '/', label: 'Home', icon: Home }, { href: '/incidents', label: 'My reports', icon: Activity }, { href: '/report', label: 'Report an issue', icon: Plus }];
  const dashboards = [{ href: '/dashboard/city-council', label: 'City Council', icon: Home }, { href: '/dashboard/edsa', label: 'EDSA', icon: Zap }, { href: '/dashboard/fireforce', label: 'FireForce', icon: Flame }];
  return (
    <div className="twincity-noise min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col overflow-y-auto bg-primary px-5 py-6 text-primary-foreground transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
           <FlagLogo siteName={settings.data?.siteName ?? 'TwinCity'} />
          <button className="rounded-lg p-2 text-primary-foreground/60 hover:bg-primary-foreground/10 lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-10 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-secondary">Resident portal</p>
          <p className="mt-2 truncate text-sm font-semibold">{email}</p>
          <p className="mt-1 text-xs text-primary-foreground/45">Freetown, Sierra Leone</p>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Resident navigation">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${location === href ? 'bg-secondary text-primary' : 'text-primary-foreground/65 hover:bg-primary-foreground/10 hover:text-primary-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replace(/\s/g, '-')}`}><Icon className="h-4 w-4" /> {label}</Link>)}
        </nav>
        <div className="mt-9 border-t border-primary-foreground/10 pt-6">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.16em] text-primary-foreground/35">Operations view</p>
          <nav className="mt-3 space-y-1">
            {dashboards.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${location === href ? 'bg-primary-foreground/10 text-secondary' : 'text-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground'}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon className="h-4 w-4" /> {label}</Link>)}
          </nav>
        </div>
        <div className="mt-6 space-y-1 border-t border-primary-foreground/10 pt-4 pb-2">
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground" data-testid="link-nav-admin"><Settings2 className="h-4 w-4" /> Admin settings</Link>
          <button onClick={() => signOut({ redirectUrl: basePath || '/' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground" data-testid="button-logout"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-primary/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-overlay-menu" />}
      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md lg:px-10">
          <button className="rounded-lg p-2 text-primary lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-muted-foreground sm:block">{location.startsWith('/dashboard') ? 'Operations centre' : 'Good to see you, '}{!location.startsWith('/dashboard') && <span className="font-bold text-primary">{user?.firstName || 'neighbour'}</span>}</div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-muted sm:flex" data-testid="button-home"><Home className="h-3.5 w-3.5" /> Home</Link>
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-muted sm:flex" data-testid="button-admin-header"><Settings2 className="h-3.5 w-3.5" /> Admin</Link>
            <button onClick={() => signOut({ redirectUrl: basePath || '/' })} className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-muted sm:flex" data-testid="button-header-logout"><LogOut className="h-3.5 w-3.5" /> Log out</button>
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground lg:flex"><span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-500" /> Systems online</div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-primary" data-testid="text-user-initials">{(user?.firstName?.[0] ?? email[0] ?? 'R').toUpperCase()}</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background p-6"><LoadingBlock label="Connecting to TwinCity" /></div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <AppShell>{children}</AppShell>;
}

function IncidentsPage() {
  const incidents = useListIncidents({ mine: true });
  const [search, setSearch] = useState('');
  const visible = useMemo(() => (incidents.data ?? []).filter((incident) => `${incident.title} ${incident.location} ${incident.department}`.toLowerCase().includes(search.toLowerCase())), [incidents.data, search]);
  return <div className="animate-rise"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-accent">Resident portal</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">My reports</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Keep a clear line of sight from your report to the work happening on the ground.</p></div><Link href="/report" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_4px_0_hsl(177_51%_13%/.12)] transition-transform hover:-translate-y-0.5" data-testid="link-new-report"><Plus className="h-4 w-4" /> New report</Link></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><MiniStat label="All reports" value={incidents.data?.length ?? 0} icon={Activity} /><MiniStat label="Being worked on" value={(incidents.data ?? []).filter((i) => i.status.toLowerCase().includes('progress')).length} icon={Clock3} /><MiniStat label="Resolved" value={(incidents.data ?? []).filter((i) => i.status.toLowerCase() === 'resolved').length} icon={CheckCircle2} /></div><div className="mt-8 flex items-center justify-between gap-3"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your reports" className="h-11 border-border bg-card pl-10" data-testid="input-search-incidents" /></div><span className="text-xs font-semibold text-muted-foreground">{visible.length} shown</span></div>{incidents.isLoading ? <div className="mt-5"><LoadingBlock label="Loading your reports" /></div> : incidents.isError ? <div className="mt-5"><ErrorState retry={() => incidents.refetch()} label="Your reports are unavailable" /></div> : visible.length === 0 ? <EmptyReports hasSearch={!!search} /> : <div className="mt-5 space-y-3">{visible.map((incident) => <IncidentRow incident={incident} key={incident.id} />)}</div>}</div>;
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: StatIcon }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.13em] text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-secondary-foreground" /></div><p className="mt-4 font-display text-3xl font-bold text-primary">{value}</p></div>;
}

function EmptyReports({ hasSearch }: { hasSearch: boolean }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center" data-testid="state-empty-incidents"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/20 text-primary"><MapPin className="h-6 w-6" /></div><h2 className="mt-5 font-display text-xl font-bold">{hasSearch ? 'No reports match that search' : 'Your city log starts here'}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{hasSearch ? 'Try a different title, location or department.' : 'See something that needs attention? Give the right city team a clear starting point.'}</p>{!hasSearch && <Link href="/report" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="link-empty-report"><Plus className="h-4 w-4" /> Report an issue</Link>}</div>;
}

function IncidentRow({ incident }: { incident: Incident }) {
  return <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/25 hover:shadow-md" data-testid={`card-incident-${incident.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusPill status={incident.status} /><PriorityMark priority={incident.priority} /></div><h2 className="mt-3 truncate font-display text-lg font-bold text-primary">{incident.title}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {incident.location}</p></div><p className="text-xs font-medium text-muted-foreground">{new Date(incident.reportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4"><p className="text-xs text-muted-foreground">Assigned desk <span className="font-bold text-primary">{incident.department}</span>{incident.assignedTo ? <> · <span className="text-primary">{incident.assignedTo}</span></> : null}</p>{incident.evidenceUrl && <a href={incident.evidenceUrl.startsWith('/api') ? incident.evidenceUrl : `/api/storage${incident.evidenceUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline" data-testid={`link-evidence-${incident.id}`}><FileImage className="h-3.5 w-3.5" /> Evidence</a>}</div></div>;
}

type ReportForm = { title: string; description: string; location: string; priority: string; department: string };
function ReportPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const departments = useListDepartments();
  const createIncident = useCreateIncident();
  const requestUpload = useRequestUploadUrl();
  const form = useForm<ReportForm>({ defaultValues: { title: '', description: '', location: '', priority: 'medium', department: '' } });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const submit = async (values: ReportForm) => {
    try {
      let evidenceUrl: string | null = null;
      if (file) {
        setUploading(true);
        const upload = await requestUpload.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type } });
        await fetch(upload.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        evidenceUrl = `/api/storage${upload.objectPath}`;
        setUploading(false);
      }
      await createIncident.mutateAsync({ data: { ...values, evidenceUrl, reporter: user?.primaryEmailAddress?.emailAddress ?? user?.id ?? 'resident' } });
      toast({ title: 'Report received', description: 'The right city team has your report. You can follow its progress in My reports.' });
      setLocation('/incidents');
    } catch {
      setUploading(false);
      toast({ title: 'Report not sent', description: 'Please check your connection and try again.', variant: 'destructive' });
    }
  };
  return <div className="mx-auto max-w-4xl animate-rise"><div className="flex items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-accent">New report</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">Help the city see it.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">A specific report gets to the right team faster. Share what you know; it does not need to be perfect.</p></div><div className="hidden rounded-2xl bg-primary p-4 text-secondary sm:block"><Siren className="h-6 w-6" /></div></div><Form {...form}><form onSubmit={form.handleSubmit(submit)} className="mt-9 space-y-5"><div className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="mb-6 flex items-center gap-3 border-b border-border pb-5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">01</span><div><h2 className="font-display text-lg font-bold">What is happening?</h2><p className="text-xs text-muted-foreground">Give the team a useful first read.</p></div></div><div className="grid gap-5 sm:grid-cols-2"><FormField control={form.control} name="title" rules={{ required: 'Add a short title' }} render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel className="text-sm font-bold">Title</FormLabel><FormControl><Input {...field} placeholder="For example: Street light out near Congo Cross" className="h-12 bg-background" data-testid="input-incident-title" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="description" rules={{ required: 'Tell us a little more' }} render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel className="text-sm font-bold">Description</FormLabel><FormControl><Textarea {...field} placeholder="What did you see? Include useful landmarks, timing or safety details." className="min-h-32 resize-y bg-background" data-testid="textarea-incident-description" /></FormControl><FormMessage /></FormItem>} /></div></div><div className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="mb-6 flex items-center gap-3 border-b border-border pb-5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">02</span><div><h2 className="font-display text-lg font-bold">Point us to it</h2><p className="text-xs text-muted-foreground">Location and routing make the difference.</p></div></div><div className="grid gap-5 sm:grid-cols-2"><FormField control={form.control} name="location" rules={{ required: 'Add a Freetown location' }} render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel className="text-sm font-bold">Freetown location</FormLabel><FormControl><div className="relative"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" /><Input {...field} placeholder="Neighbourhood, street or landmark" className="h-12 bg-background pl-10" data-testid="input-incident-location" /></div></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="priority" render={({ field }) => <FormItem><FormLabel className="text-sm font-bold">Priority</FormLabel><FormControl><select {...field} className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" data-testid="select-incident-priority"><option value="low">Low — can wait</option><option value="medium">Medium — needs attention</option><option value="high">High — urgent service</option><option value="urgent">Urgent — immediate risk</option></select></FormControl></FormItem>} /><FormField control={form.control} name="department" rules={{ required: 'Choose a department' }} render={({ field }) => <FormItem><FormLabel className="text-sm font-bold">Department</FormLabel><FormControl><select {...field} className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" data-testid="select-incident-department"><option value="">Choose a desk</option>{(departments.data ?? []).map((department) => <option value={department.shortName} key={department.id}>{department.name}</option>)}</select></FormControl><FormMessage /></FormItem>} /></div></div><div className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="mb-6 flex items-center gap-3 border-b border-border pb-5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">03</span><div><h2 className="font-display text-lg font-bold">Show the scene</h2><p className="text-xs text-muted-foreground">Optional, but a picture can help the desk act.</p></div></div><label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/[.025] px-5 py-8 text-center transition-colors hover:border-primary/50 hover:bg-secondary/5" data-testid="label-upload-evidence"><input type="file" accept="image/*" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} data-testid="input-evidence" /><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/20 text-primary">{file ? <Check className="h-5 w-5" /> : <CloudUpload className="h-5 w-5" />}</span><span className="mt-3 text-sm font-bold">{file ? file.name : 'Upload a photo'}</span><span className="mt-1 text-xs text-muted-foreground">{file ? `${Math.round(file.size / 1024)} KB · ready to attach` : 'JPG or PNG · one image up to 10 MB'}</span></label></div><div className="flex flex-wrap items-center justify-between gap-4"><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Your report is shared with the selected desk.</p><Button type="submit" disabled={createIncident.isPending || uploading} className="min-w-40" data-testid="button-submit-incident">{createIncident.isPending || uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending</> : <>Send report <ArrowRight className="ml-2 h-4 w-4" /></>}</Button></div></form></Form></div>;
}

const dashboardConfig: Record<string, { name: string; eyebrow: string; description: string; icon: StatIcon; accent: string }> = {
  'city-council': { name: 'City Council', eyebrow: 'Cleanliness & city services', description: 'Keep streets, drains and shared spaces working for every neighbourhood.', icon: Home, accent: 'bg-emerald-700' },
  edsa: { name: 'EDSA', eyebrow: 'Power & light', description: 'Bring power issues into focus and keep Freetown lit.', icon: Zap, accent: 'bg-secondary' },
  fireforce: { name: 'FireForce', eyebrow: 'Fire & emergency response', description: 'See urgent fire reports clearly so teams can move with speed.', icon: Flame, accent: 'bg-accent' },
};

function DashboardPage({ departmentKey }: { departmentKey: string }) {
  const config = dashboardConfig[departmentKey];
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useGetDashboardSummary({ department: departmentKey });
  const incidents = useListIncidents({ department: departmentKey });
  const update = useUpdateIncident();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const displayed = useMemo(() => (incidents.data ?? []).filter((item) => (filter === 'all' || item.status.toLowerCase().replace(/\s/g, '-') === filter) && `${item.title} ${item.location}`.toLowerCase().includes(search.toLowerCase())), [incidents.data, filter, search]);
  const changeStatus = (incident: Incident, status: string) => update.mutate({ id: incident.id, data: { status } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey({ department: departmentKey }) }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ department: departmentKey }) }); toast({ title: 'Queue updated', description: `${incident.title} is now marked ${status}.` }); } });
  if (!config) return <NotFound />;
  const Icon = config.icon;
  return <div className="animate-rise"><div className="flex flex-wrap items-start justify-between gap-6"><div className="flex items-start gap-4"><div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${config.accent} ${departmentKey === 'edsa' ? 'text-primary' : 'text-primary-foreground'}`}><Icon className="h-7 w-7" /></div><div><p className="text-xs font-bold uppercase tracking-[.17em] text-accent">Operations centre</p><h1 className="mt-1 font-display text-4xl font-bold tracking-[-.06em]">{config.name}</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">{config.description}</p></div></div><div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-emerald-700"><span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-500" /> Live queue</div></div>{summaryLoading ? <div className="mt-8"><LoadingBlock label="Loading queue overview" /></div> : summaryError ? <div className="mt-8"><ErrorState retry={() => refetchSummary()} /></div> : <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><DashboardMetric label="Total reports" value={summary?.total ?? 0} icon={Activity} /><DashboardMetric label="New" value={summary?.newCount ?? 0} icon={Bell} tone="secondary" /><DashboardMetric label="In progress" value={summary?.inProgress ?? 0} icon={Clock3} /><DashboardMetric label="Resolved" value={summary?.resolved ?? 0} icon={CheckCircle2} tone="green" /><DashboardMetric label="Avg response" value={`${summary?.averageResponseHours ?? 0}h`} icon={BarChart3} /></div>}<div className="mt-9 rounded-2xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5"><div><h2 className="font-display text-xl font-bold">Incoming reports</h2><p className="mt-1 text-xs text-muted-foreground">Triage, assign and keep the public record moving.</p></div><div className="relative w-full sm:w-60"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search queue" className="h-10 bg-background pl-9" data-testid="input-search-queue" /></div></div><div className="flex gap-1 overflow-x-auto border-b border-border px-5 py-3">{[['all', 'All'], ['new', 'New'], ['in-progress', 'In progress'], ['resolved', 'Resolved']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors ${filter === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} data-testid={`button-filter-${value}`}>{label}</button>)}</div>{incidents.isLoading ? <div className="p-5"><LoadingBlock label="Loading incoming reports" /></div> : incidents.isError ? <div className="p-5"><ErrorState retry={() => incidents.refetch()} /></div> : displayed.length === 0 ? <div className="p-12 text-center" data-testid="state-empty-queue"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 text-primary"><CheckCircle2 className="h-6 w-6" /></div><h3 className="mt-4 font-display text-lg font-bold">Queue is clear</h3><p className="mt-1 text-sm text-muted-foreground">No reports match this view right now.</p></div> : <div className="divide-y divide-border">{displayed.map((incident) => <QueueRow incident={incident} key={incident.id} onStatusChange={changeStatus} pending={update.isPending} />)}</div>}</div></div>;
}

function DashboardMetric({ label, value, icon: Icon, tone = 'primary' }: { label: string; value: number | string; icon: StatIcon; tone?: 'primary' | 'secondary' | 'green' }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">{label}</p><Icon className={`h-4 w-4 ${tone === 'secondary' ? 'text-secondary-foreground' : tone === 'green' ? 'text-emerald-700' : 'text-primary'}`} /></div><p className="mt-3 font-display text-2xl font-bold text-primary">{value}</p></div>;
}

function QueueRow({ incident, onStatusChange, pending }: { incident: Incident; onStatusChange: (incident: Incident, status: string) => void; pending: boolean }) {
  const next = incident.status.toLowerCase() === 'new' ? 'in progress' : incident.status.toLowerCase().includes('progress') ? 'resolved' : null;
  return <div className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/35" data-testid={`row-queue-incident-${incident.id}`}><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><StatusPill status={incident.status} /><PriorityMark priority={incident.priority} /><span className="text-xs text-muted-foreground">#{incident.id}</span></div><p className="mt-2 truncate font-bold text-primary">{incident.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {incident.location} <span className="mx-1">·</span> {new Date(incident.reportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p></div><div className="flex items-center gap-2">{next && <Button size="sm" variant="outline" disabled={pending} onClick={() => onStatusChange(incident, next)} data-testid={`button-status-${incident.id}`}><Check className="mr-1.5 h-3.5 w-3.5" /> Mark {next}</Button>}{incident.status.toLowerCase() === 'resolved' && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Complete</span>}</div></div>;
}

function AdminPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '';
  const primaryAdmin = email === 'madomdoma780@gmail.com';
  const admins = useListAdmins({ query: { retry: false, queryKey: getListAdminsQueryKey() } });
  const authorized = primaryAdmin || Boolean(admins.data);
  const settings = useGetAdminSettings({ query: { enabled: authorized, queryKey: getGetAdminSettingsQueryKey() } });
  const updateSettings = useUpdateAdminSettings();
  const createAdmin = useCreateAdmin();
  const deleteAdmin = useDeleteAdmin();
  const departments = useListDepartments({ query: { enabled: authorized, queryKey: getListDepartmentsQueryKey() } });
  const { toast } = useToast();
  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('operator');
  const [newDepartment, setNewDepartment] = useState('');
  useEffect(() => { if (settings.data) { setSiteName(settings.data.siteName); setTagline(settings.data.tagline); setWelcomeMessage(settings.data.welcomeMessage); } }, [settings.data]);
  if (!admins.isLoading && !primaryAdmin && admins.isError) return <div className="mx-auto max-w-xl py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent"><ShieldCheck className="h-8 w-8" /></div><h1 className="mt-6 font-display text-3xl font-bold">Admin access is restricted</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">This signed-in account is not on the TwinCity admin list. If you need dashboard access, ask the city administrator to add your email.</p><Link href="/incidents" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="link-return-portal">Return to portal</Link></div>;
  const saveSettings = () => {
    const nextSettings = { siteName: siteName.trim(), tagline: tagline.trim(), welcomeMessage: welcomeMessage.trim() };
    if (!nextSettings.siteName || !nextSettings.tagline || !nextSettings.welcomeMessage) {
      toast({ title: 'Complete all site voice fields', description: 'Site name, tagline, and welcome message cannot be empty.', variant: 'destructive' });
      return;
    }
    updateSettings.mutate({ data: nextSettings }, {
      onSuccess: (saved) => {
        setSiteName(saved.siteName);
        setTagline(saved.tagline);
        setWelcomeMessage(saved.welcomeMessage);
        queryClient.setQueryData(getGetAdminSettingsQueryKey(), saved);
        queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
        toast({ title: 'Site settings saved', description: 'Your changes are live across TwinCity.' });
      },
      onError: () => toast({ title: 'Settings were not saved', description: 'You may not have permission, or the city desk is temporarily unavailable.', variant: 'destructive' }),
    });
  };
  const addAdmin = () => {
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail) return;
    createAdmin.mutate({ data: { email: normalizedEmail, role: newRole, department: newDepartment || null } }, {
      onSuccess: () => {
        setNewEmail('');
        setNewDepartment('');
        queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
        toast({ title: 'Access added', description: `${normalizedEmail} can now access the selected desk.` });
      },
      onError: () => toast({ title: 'Access was not added', description: 'Check the email address or confirm this account has admin permission.', variant: 'destructive' }),
    });
  };
  const removeAdmin = (id: number) => {
    if (!window.confirm('Remove this dashboard access?')) return;
    deleteAdmin.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminsQueryKey() });
        toast({ title: 'Access removed' });
      },
      onError: () => toast({ title: 'Access was not removed', description: 'The admin list could not be updated.', variant: 'destructive' }),
    });
  };
  return <div className="animate-rise"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-accent">Protected controls</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">Admin settings</h1><p className="mt-2 text-sm text-muted-foreground">Keep TwinCity's public voice and operations access current.</p></div>{settings.isLoading || admins.isLoading ? <div className="mt-8"><LoadingBlock label="Loading admin controls" /></div> : settings.isError ? <div className="mt-8"><ErrorState retry={() => settings.refetch()} /></div> : <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><h2 className="font-display text-xl font-bold">Site voice</h2><p className="mt-1 text-xs text-muted-foreground">These words appear on the public welcome surface.</p></div><Pencil className="h-5 w-5 text-secondary-foreground" /></div><div className="mt-6 space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Site name</span><Input value={siteName} onChange={(event) => setSiteName(event.target.value)} className="bg-background" data-testid="input-admin-site-name" /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Tagline</span><Input value={tagline} onChange={(event) => setTagline(event.target.value)} className="bg-background" data-testid="input-admin-tagline" /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Welcome message</span><Textarea value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} className="min-h-28 bg-background" data-testid="textarea-admin-welcome" /></label><Button onClick={saveSettings} disabled={updateSettings.isPending} data-testid="button-save-settings">{updateSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save site voice</Button></div></section><section className="rounded-2xl border border-border bg-card p-6"><div className="border-b border-border pb-5"><h2 className="font-display text-xl font-bold">Dashboard access</h2><p className="mt-1 text-xs text-muted-foreground">Invite the people who keep each desk moving.</p></div><div className="mt-5 space-y-3"><Input type="email" placeholder="colleague@email.com" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="bg-background" data-testid="input-new-admin-email" /><div className="grid grid-cols-2 gap-3"><select value={newRole} onChange={(event) => setNewRole(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-new-admin-role"><option value="operator">Operator</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option></select><select value={newDepartment} onChange={(event) => setNewDepartment(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-new-admin-department"><option value="">All desks</option>{(departments.data ?? []).map((department) => <option value={department.shortName} key={department.id}>{department.shortName}</option>)}</select></div><Button variant="secondary" className="w-full" onClick={addAdmin} disabled={createAdmin.isPending || !newEmail.trim()} data-testid="button-add-admin"><Plus className="mr-2 h-4 w-4" /> Add dashboard access</Button></div><div className="mt-7 space-y-2">{(admins.data ?? []).length === 0 ? <p className="rounded-xl bg-muted p-4 text-center text-xs text-muted-foreground" data-testid="state-empty-admins">No additional dashboard access yet.</p> : (admins.data ?? []).map((admin) => <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3" key={admin.id} data-testid={`row-admin-${admin.id}`}><div className="min-w-0"><p className="truncate text-sm font-bold">{admin.email}</p><p className="mt-0.5 text-xs text-muted-foreground">{admin.role}{admin.department ? ` · ${admin.department}` : ''}</p></div><button onClick={() => removeAdmin(admin.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-remove-admin-${admin.id}`}><Trash2 className="h-4 w-4" /></button></div>)}</div></section></div>}</div>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const common = { appearance: { options: { logoPlacement: 'inside' as const, logoImageUrl: `${window.location.origin}${basePath}/logo.svg`, logoLinkUrl: basePath || '/', socialButtonsPlacement: 'top' as const, socialButtonsVariant: 'blockButton' as const }, variables: { colorPrimary: '#123f3d', colorBackground: '#f7f2e8', colorForeground: '#123f3d', colorMutedForeground: '#55706d', colorInput: '#fbfaf5', colorInputForeground: '#123f3d', colorNeutral: '#d9d1c1', fontFamily: 'DM Sans, sans-serif', borderRadius: '12px' }, elements: { cardBox: 'bg-[#f7f2e8] shadow-xl border border-[#d9d1c1] rounded-2xl', headerTitle: 'font-display text-[#123f3d]', headerSubtitle: 'text-[#55706d]', form: 'hidden', dividerRow: 'hidden', formFieldLabel: 'text-[#123f3d]', socialButtonsBlockButton: 'border-[#d9d1c1] bg-[#fbfaf5] text-[#123f3d]', formButtonPrimary: 'bg-[#123f3d] hover:bg-[#1d6b68]', footerActionLink: 'text-[#a33a34]' } } };
  return <div className="twincity-noise flex min-h-[100dvh] items-center justify-center bg-primary px-5 py-10"><div className="absolute left-6 top-6 text-primary-foreground"><FlagLogo /></div><div className="w-full max-w-[440px]">{mode === 'sign-in' ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={common.appearance} forceRedirectUrl={`${basePath}/incidents`} /> : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} appearance={common.appearance} forceRedirectUrl={`${basePath}/incidents`} />}</div></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={HomePage} /><Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} /><Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} /><Route path="/report">{() => <Protected><ReportPage /></Protected>}</Route><Route path="/incidents">{() => <Protected><IncidentsPage /></Protected>}</Route><Route path="/dashboard/city-council">{() => <Protected><DashboardPage departmentKey="city-council" /></Protected>}</Route><Route path="/dashboard/edsa">{() => <Protected><DashboardPage departmentKey="edsa" /></Protected>}</Route><Route path="/dashboard/fireforce">{() => <Protected><DashboardPage departmentKey="fireforce" /></Protected>}</Route><Route path="/admin">{() => <Protected><AdminPage /></Protected>}</Route><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function App() {
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={{ variables: { colorPrimary: '#123f3d', colorBackground: '#f7f2e8', fontFamily: 'DM Sans, sans-serif' } }}><QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={basePath}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider></ClerkProvider>;
}

export default App;