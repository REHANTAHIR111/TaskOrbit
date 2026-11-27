/**
 * Dashboard data layer.
 * Everything here is derived from the existing `getTask/{userId}` response.
 * Nothing is invented: if the API does not provide a value, the metric is omitted.
 */

export type TaskSegment = {
    segment_date?: string;
    start_time?: string;
    end_time?: string;
    allocated_minutes?: number | string;
};

export type Task = {
    id: number | string;
    task_name?: string;
    priority?: string | null;
    status?: number | string | null;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    hour?: number | string;
    total_allocated_minutes?: number | string | null;
    segments?: TaskSegment[];
};

export type PriorityKey = 'urgent' | 'high' | 'medium' | 'low' | 'other' | 'none';

export const PRIORITY_ORDER: PriorityKey[] = ['urgent', 'high', 'medium', 'low', 'other', 'none'];

export const PRIORITY_META: Record<PriorityKey, { label: string; color: string }> = {
    urgent: { label: 'Urgent', color: '#b0293e' },
    high: { label: 'High', color: '#d9622b' },
    medium: { label: 'Medium', color: '#c98a12' },
    low: { label: 'Low', color: '#3f7fc4' },
    other: { label: 'Custom', color: '#7a6bd0' },
    none: { label: 'No priority', color: '#9aa6b8' },
};

export type ScheduledBlock = {
    key: string;
    taskId: number | string;
    taskName: string;
    priority: PriorityKey;
    date: string;
    startMin: number | null;
    endMin: number | null;
    minutes: number;
};

export type DaySummary = {
    date: string;
    weekday: string;
    dayNumber: string;
    isToday: boolean;
    minutes: number;
    blocks: ScheduledBlock[];
};

export type DeadlineItem = { task: Task; daysLeft: number };

export type DashboardModel = {
    total: number;
    scheduled: number;
    unscheduled: number;
    highPriority: number;
    dueSoon: number;
    plannedWeekMinutes: number;
    enabled: number;
    disabled: number;
    priorityCounts: Record<PriorityKey, number>;
    days: DaySummary[];
    workload: { label: string; hours: number }[];
    weekly: { label: string; hours: number; isCurrent: boolean }[];
    deadlines: DeadlineItem[];
    unscheduledList: Task[];
    recent: Task[];
    nextBlock: (ScheduledBlock & { isNow: boolean }) | null;
};

/* ---------- date and time helpers ---------- */

const pad = (value: number) => String(value).padStart(2, '0');

export const toYmd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const isYmd = (value?: string | null): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);

export const parseYmd = (value: string): Date => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
};

export const addDays = (date: Date, amount: number): Date => {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + amount);
    return copy;
};

export const daysBetween = (fromYmd: string, toYmdValue: string): number => {
    const from = parseYmd(fromYmd);
    const to = parseYmd(toYmdValue);
    return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);
};

export const toMinutes = (value?: string | null): number | null => {
    if (!value) return null;
    const [hours, minutes] = String(value).split(':');
    const h = Number(hours);
    const m = Number(minutes ?? 0);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

export const formatClock = (minutes: number): string => {
    const hour = Math.floor(minutes / 60) % 24;
    return `${hour % 12 || 12}:${pad(minutes % 60)} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export const formatMinutes = (minutes: number): string => {
    const rounded = Math.max(0, Math.round(minutes));
    const hours = Math.floor(rounded / 60);
    const remainder = rounded % 60;
    return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ') || '0m';
};

export const formatTimeRange = (startMin: number | null, endMin: number | null): string => {
    if (startMin === null) return 'Time not set';
    return endMin === null ? formatClock(startMin) : `${formatClock(startMin)} to ${formatClock(endMin)}`;
};

export const relativeDayLabel = (date: string, today: string): string => {
    const diff = daysBetween(today, date);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return parseYmd(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

/* ---------- task helpers ---------- */

export const priorityKey = (priority?: string | null): PriorityKey => {
    const value = String(priority ?? '').trim().toLowerCase();
    if (!value) return 'none';
    return value === 'urgent' || value === 'high' || value === 'medium' || value === 'low' ? value : 'other';
};

export const taskLabel = (task: Task): string => task.task_name || `Task #${task.id}`;

export const hasSegments = (task: Task): boolean => Array.isArray(task.segments) && task.segments.length > 0;

export const taskMinutes = (task: Task): number => {
    const allocated = Number(task.total_allocated_minutes);
    if (Number.isFinite(allocated) && allocated > 0) return allocated;
    const fromHours = Math.round(Number(task.hour || 0) * 60);
    return Number.isFinite(fromHours) ? fromHours : 0;
};

/** First and last scheduled dates for a task, falling back to its start and end dates. */
export const scheduleSpan = (task: Task): { first: string | null; last: string | null; segments: number } => {
    const dates = (task.segments || []).map(segment => segment.segment_date).filter(isYmd).map(value => value.slice(0, 10)).sort();
    const first = dates[0] ?? (isYmd(task.start_date) ? task.start_date.slice(0, 10) : null);
    const last = dates[dates.length - 1] ?? (isYmd(task.end_date) ? task.end_date.slice(0, 10) : null);
    return { first, last, segments: dates.length };
};

const idValue = (task: Task): number => {
    const numeric = Number(task.id);
    return Number.isFinite(numeric) ? numeric : 0;
};

const blocksForTask = (task: Task): ScheduledBlock[] => {
    const priority = priorityKey(task.priority);
    return (Array.isArray(task.segments) ? task.segments : []).reduce<ScheduledBlock[]>((list, segment, index) => {
        if (!isYmd(segment.segment_date)) return list;
        const startMin = toMinutes(segment.start_time);
        const endMin = toMinutes(segment.end_time);
        const allocated = Number(segment.allocated_minutes);
        const fallback = startMin !== null && endMin !== null && endMin > startMin ? endMin - startMin : 0;
        list.push({
            key: `${task.id}-${index}`,
            taskId: task.id,
            taskName: taskLabel(task),
            priority,
            date: segment.segment_date.slice(0, 10),
            startMin,
            endMin,
            minutes: Number.isFinite(allocated) && allocated > 0 ? allocated : fallback,
        });
        return list;
    }, []);
};

const byStart = (a: ScheduledBlock, b: ScheduledBlock) =>
    a.date.localeCompare(b.date) || (a.startMin ?? 24 * 60) - (b.startMin ?? 24 * 60);

/* ---------- model ---------- */

export function buildDashboard(tasks: Task[], now: Date): DashboardModel {
    const today = toYmd(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const blocks = tasks.flatMap(blocksForTask).sort(byStart);
    const minutesOn = (date: string) => blocks.filter(block => block.date === date).reduce((sum, block) => sum + block.minutes, 0);

    const scheduled = tasks.filter(hasSegments).length;

    const priorityCounts: Record<PriorityKey, number> = { urgent: 0, high: 0, medium: 0, low: 0, other: 0, none: 0 };
    tasks.forEach(task => {
        priorityCounts[priorityKey(task.priority)] += 1;
    });

    let enabled = 0;
    let disabled = 0;
    tasks.forEach(task => {
        if (task.status === null || task.status === undefined || task.status === '') return;
        if (Number(task.status) === 1) enabled += 1;
        else disabled += 1;
    });

    const days: DaySummary[] = Array.from({ length: 7 }, (_, index) => {
        const day = addDays(startOfToday, index);
        const date = toYmd(day);
        const dayBlocks = blocks.filter(block => block.date === date);
        return {
            date,
            weekday: day.toLocaleDateString(undefined, { weekday: 'short' }),
            dayNumber: String(day.getDate()),
            isToday: index === 0,
            minutes: dayBlocks.reduce((sum, block) => sum + block.minutes, 0),
            blocks: dayBlocks,
        };
    });

    const workload = Array.from({ length: 14 }, (_, index) => {
        const day = addDays(startOfToday, index);
        return {
            label: day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
            hours: Math.round((minutesOn(toYmd(day)) / 60) * 100) / 100,
        };
    });

    const weekStart = addDays(startOfToday, -((now.getDay() + 6) % 7));
    const weekly = Array.from({ length: 8 }, (_, index) => {
        const start = addDays(weekStart, (index - 3) * 7);
        const from = toYmd(start);
        const to = toYmd(addDays(start, 6));
        const minutes = blocks.filter(block => block.date >= from && block.date <= to).reduce((sum, block) => sum + block.minutes, 0);
        return {
            label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            hours: Math.round((minutes / 60) * 100) / 100,
            isCurrent: index === 3,
        };
    });

    const deadlines = tasks
        .filter(task => isYmd(task.end_date) && daysBetween(today, task.end_date) >= 0)
        .map(task => ({ task, daysLeft: daysBetween(today, task.end_date as string) }))
        .sort((a, b) => a.daysLeft - b.daysLeft || idValue(a.task) - idValue(b.task));

    const unscheduledList = tasks
        .filter(task => !hasSegments(task))
        .sort((a, b) => (isYmd(a.end_date) ? a.end_date : '9999-12-31').localeCompare(isYmd(b.end_date) ? b.end_date : '9999-12-31') || idValue(a) - idValue(b));

    const upcoming = blocks.find(block => {
        if (block.startMin === null) return false;
        if (block.date > today) return true;
        return block.date === today && (block.endMin ?? block.startMin) > nowMinutes;
    });

    return {
        total: tasks.length,
        scheduled,
        unscheduled: tasks.length - scheduled,
        highPriority: priorityCounts.urgent + priorityCounts.high,
        dueSoon: deadlines.filter(item => item.daysLeft <= 7).length,
        plannedWeekMinutes: days.reduce((sum, day) => sum + day.minutes, 0),
        enabled,
        disabled,
        priorityCounts,
        days,
        workload,
        weekly,
        deadlines,
        unscheduledList,
        recent: [...tasks].sort((a, b) => idValue(b) - idValue(a)),
        nextBlock: upcoming
            ? { ...upcoming, isNow: upcoming.date === today && upcoming.startMin !== null && upcoming.startMin <= nowMinutes }
            : null,
    };
}
