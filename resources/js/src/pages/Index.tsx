import { CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { setPageTitle } from '../store/themeConfigSlice';
import { get } from './api/ApiCalls';
import GlobalContext from '../GlobalContext';
import { Icon, IconName } from './dashboard/DashboardIcons';
import DayTimeline from './dashboard/DayTimeline';
import {
    PRIORITY_META,
    PRIORITY_ORDER,
    Task,
    buildDashboard,
    formatClock,
    formatMinutes,
    formatTimeRange,
    isYmd,
    parseYmd,
    priorityKey,
    relativeDayLabel,
    scheduleSpan,
    taskLabel,
    taskMinutes,
    toYmd,
} from './dashboard/dashboardData';
import './dashboard/dashboard.css';

/* ---------- small presentational helpers ---------- */

const shortDate = (ymd: string) => parseYmd(ymd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDate = (ymd: string) => parseYmd(ymd).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function PriorityPill({ priority }: { priority?: string | null }) {
    const key = priorityKey(priority);
    const label = key === 'other' ? String(priority).trim() : PRIORITY_META[key].label;
    return (
        <span className="tdb-pill" style={{ '--tdb-pill': PRIORITY_META[key].color } as CSSProperties}>
            <i aria-hidden="true" />
            {label}
        </span>
    );
}

function Skeleton({ width = '100%', height = 14 }: { width?: number | string; height?: number | string }) {
    return <span className="tdb-skel" style={{ width, height }} aria-hidden="true" />;
}

type PanelProps = { id: string; title: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode };

function Panel({ id, title, subtitle, action, className, children }: PanelProps) {
    return (
        <section className={['tdb-panel', className].filter(Boolean).join(' ')} aria-labelledby={id}>
            <header className="tdb-panel__head">
                <div>
                    <h2 id={id}>{title}</h2>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                {action}
            </header>
            {children}
        </section>
    );
}

type EmptyProps = { icon: IconName; title: string; text: string; action?: ReactNode };

function Empty({ icon, title, text, action }: EmptyProps) {
    return (
        <div className="tdb-empty">
            <span className="tdb-empty__icon">
                <Icon name={icon} size={20} />
            </span>
            <strong>{title}</strong>
            <p>{text}</p>
            {action}
        </div>
    );
}

function Meter({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const percent = percentOf(value, total);
    return (
        <div className="tdb-meter">
            <div className="tdb-meter__row">
                <span>{label}</span>
                <strong>{plural(value, 'task', 'tasks')}</strong>
            </div>
            <div className="tdb-meter__track" role="img" aria-label={`${label}: ${value} of ${total} tasks, ${percent} percent`}>
                <span style={{ width: `${percent}%`, background: color }} />
            </div>
        </div>
    );
}

/* ---------- page ---------- */

type Kpi = { key: string; label: string; value: string | number; hint: string; icon: IconName; tone: string };

const Dashboard = () => {
    const dispatch = useDispatch();
    const { verifyAuth, userAuthData } = useContext(GlobalContext);
    const userId = localStorage.getItem('user_id');

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [now, setNow] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const reloadTasks = useCallback(() => {
        if (!userId) {
            setLoading(false);
            setTasks([]);
            setLoadError('');
            return;
        }
        setLoading(true);
        setLoadError('');
        get('getTask/' + userId)
            .then((response: any) => {
                if (Array.isArray(response?.data)) {
                    setTasks(response.data);
                    setLoadError('');
                } else {
                    setTasks([]);
                    setLoadError(response?.message || 'Task data is not available right now.');
                }
            })
            .catch(() => setLoadError('We could not load your tasks. Check your connection and try again.'))
            .finally(() => setLoading(false));
    }, [userId]);

    useEffect(() => {
        dispatch(setPageTitle('Dashboard'));
        verifyAuth?.();
        reloadTasks();
    }, [dispatch, reloadTasks]);

    // Keep "next up" and the now-marker current without refetching.
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    const model = useMemo(() => buildDashboard(tasks, now), [tasks, now]);
    const today = toYmd(now);
    const activeDay = model.days.find(day => day.date === selectedDate) ?? model.days[0];
    const todayDay = model.days[0];
    const nowMinutes = activeDay.isToday ? now.getHours() * 60 + now.getMinutes() : null;
    const initialLoading = loading && tasks.length === 0 && !loadError;

    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = (userAuthData?.user?.name || '').trim().split(/\s+/)[0];

    const intro = initialLoading
        ? 'Loading your schedule.'
        : model.total === 0
          ? 'Create your first task and TaskOrbit will place it around your working hours.'
          : todayDay.blocks.length > 0
            ? `${plural(todayDay.blocks.length, 'scheduled segment', 'scheduled segments')} today, ${formatMinutes(todayDay.minutes)} of planned work.`
            : 'Nothing is scheduled for today.';

    const kpis: Kpi[] = [
        { key: 'total', label: 'Total tasks', value: model.total, hint: model.enabled + model.disabled > 0 ? `${model.enabled} enabled` : 'In your workspace', icon: 'layers', tone: 'brand' },
        { key: 'scheduled', label: 'Scheduled', value: model.scheduled, hint: `${percentOf(model.scheduled, model.total)}% of all tasks`, icon: 'calendarCheck', tone: 'success' },
        { key: 'unscheduled', label: 'Unscheduled', value: model.unscheduled, hint: model.unscheduled ? 'Waiting for a time slot' : 'Everything is planned', icon: 'inbox', tone: 'warning' },
        { key: 'priority', label: 'High priority', value: model.highPriority, hint: 'Urgent and high', icon: 'flag', tone: 'danger' },
        { key: 'deadlines', label: 'Ending within 7 days', value: model.dueSoon, hint: 'By task end date', icon: 'calendarAlert', tone: 'info' },
        { key: 'planned', label: 'Planned next 7 days', value: formatMinutes(model.plannedWeekMinutes), hint: 'Scheduled work time', icon: 'clock', tone: 'violet' },
    ];

    /* ---------- chart data ---------- */

    const workloadTotalMinutes = model.workload.reduce((sum, item) => sum + item.hours * 60, 0);
    const weeklyTotalMinutes = model.weekly.reduce((sum, item) => sum + item.hours * 60, 0);
    const priorityEntries = PRIORITY_ORDER.filter(key => model.priorityCounts[key] > 0);

    const axisText = { fontSize: '11px', colors: '#5f6e84' };

    const workloadOptions = useMemo<ApexOptions>(
        () => ({
            chart: { fontFamily: 'inherit', toolbar: { show: false }, animations: { speed: 350 } },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '52%' } },
            dataLabels: { enabled: false },
            colors: ['#526de5'],
            grid: { borderColor: '#e5eaf2', strokeDashArray: 3, padding: { left: 8, right: 8 } },
            xaxis: { categories: model.workload.map(item => item.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: -35, style: axisText } },
            yaxis: { min: 0, labels: { formatter: (value: number) => `${Math.round(value * 10) / 10}h`, style: axisText } },
            tooltip: { y: { formatter: (value: number) => formatMinutes(value * 60) } },
        }),
        [model.workload]
    );

    const weeklyOptions = useMemo<ApexOptions>(
        () => ({
            chart: { fontFamily: 'inherit', toolbar: { show: false }, animations: { speed: 350 } },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '48%', distributed: true } },
            dataLabels: { enabled: false },
            legend: { show: false },
            colors: model.weekly.map(item => (item.isCurrent ? '#3346a8' : '#a9b6f2')),
            grid: { borderColor: '#e5eaf2', strokeDashArray: 3, padding: { left: 8, right: 8 } },
            xaxis: { categories: model.weekly.map(item => item.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: axisText } },
            yaxis: { min: 0, labels: { formatter: (value: number) => `${Math.round(value * 10) / 10}h`, style: axisText } },
            tooltip: { y: { formatter: (value: number) => formatMinutes(value * 60) } },
        }),
        [model.weekly]
    );

    const priorityOptions = useMemo<ApexOptions>(
        () => ({
            chart: { fontFamily: 'inherit' },
            labels: priorityEntries.map(key => PRIORITY_META[key].label),
            colors: priorityEntries.map(key => PRIORITY_META[key].color),
            legend: { show: false },
            dataLabels: { enabled: false },
            stroke: { width: 2, colors: ['#ffffff'] },
            plotOptions: {
                pie: {
                    donut: {
                        size: '72%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '12px', color: '#5f6e84', offsetY: 18 },
                            value: { show: true, fontSize: '26px', fontWeight: 700, color: '#17243a', offsetY: -14 },
                            total: { show: true, showAlways: true, label: 'Tasks', fontSize: '12px', color: '#5f6e84', formatter: () => String(model.total) },
                        },
                    },
                },
            },
            tooltip: { y: { formatter: (value: number) => plural(value, 'task', 'tasks') } },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [model.priorityCounts, model.total]
    );

    const bestWeek = model.weekly.reduce((best, item) => (item.hours > best.hours ? item : best), model.weekly[0]);

    return (
        <main className="tdb">
            {/* Welcome header */}
            <header className="tdb-hero">
                <div className="tdb-hero__copy">
                    <p className="tdb-hero__date">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <h1>{firstName ? `${greeting}, ${firstName}` : greeting}</h1>
                    <p className="tdb-hero__intro">{intro}</p>
                    {model.nextBlock && (
                        <div className="tdb-nextup">
                            <span className="tdb-nextup__tag">{model.nextBlock.isNow ? 'In progress' : 'Next up'}</span>
                            <strong>{model.nextBlock.taskName}</strong>
                            <span>
                                {relativeDayLabel(model.nextBlock.date, today)}, {formatTimeRange(model.nextBlock.startMin, model.nextBlock.endMin)}
                            </span>
                            <Link to={`/tasks/edit/${model.nextBlock.taskId}`} className="tdb-nextup__link">
                                Open task
                            </Link>
                        </div>
                    )}
                </div>
                <div className="tdb-hero__actions">
                    <Link to="/tasks/create" className="tdb-btn tdb-btn--primary">
                        <Icon name="plus" size={16} />
                        Create task
                    </Link>
                    <Link to="/slotsetting" className="tdb-btn tdb-btn--secondary">
                        <Icon name="sliders" size={16} />
                        Working hours
                    </Link>
                </div>
            </header>

            {loadError && (
                <div className="tdb-banner" role="alert">
                    <span>{loadError}</span>
                    <button type="button" className="tdb-btn tdb-btn--ghost" onClick={reloadTasks}>
                        <Icon name="refresh" size={16} />
                        Try again
                    </button>
                </div>
            )}

            {/* Productivity overview */}
            <section className="tdb-kpis" aria-label="Productivity overview">
                {kpis.map(kpi => (
                    <article className={`tdb-kpi tdb-tone-${kpi.tone}`} key={kpi.key}>
                        <span className="tdb-kpi__icon">
                            <Icon name={kpi.icon} size={18} />
                        </span>
                        <div>
                            <span className="tdb-kpi__label">{kpi.label}</span>
                            <strong className="tdb-kpi__value">{initialLoading ? <Skeleton width={48} height={24} /> : kpi.value}</strong>
                            <span className="tdb-kpi__hint">{initialLoading ? <Skeleton width={90} height={11} /> : kpi.hint}</span>
                        </div>
                    </article>
                ))}
            </section>

            {initialLoading ? (
                <div className="tdb-grid tdb-grid--main" aria-busy="true" aria-label="Loading dashboard">
                    <div className="tdb-panel">
                        <Skeleton width="40%" height={18} />
                        <div style={{ height: 14 }} />
                        <Skeleton height={64} />
                        <div style={{ height: 14 }} />
                        <Skeleton height={150} />
                    </div>
                    <div className="tdb-panel">
                        <Skeleton width="55%" height={18} />
                        <div style={{ height: 14 }} />
                        <Skeleton height={200} />
                    </div>
                </div>
            ) : (
                <>
                    {/* Schedule command center */}
                    <div className="tdb-grid tdb-grid--main">
                        <Panel
                            id="tdb-schedule-title"
                            title="Schedule"
                            subtitle={`${longDate(activeDay.date)}: ${activeDay.blocks.length ? `${plural(activeDay.blocks.length, 'segment', 'segments')}, ${formatMinutes(activeDay.minutes)} planned` : 'nothing scheduled'}`}
                            action={
                                <Link className="tdb-link" to="/tasklist">
                                    All tasks
                                </Link>
                            }
                        >
                            <div className="tdb-days" role="group" aria-label="Choose a day">
                                {model.days.map(day => (
                                    <button
                                        type="button"
                                        key={day.date}
                                        className={['tdb-day', day.date === activeDay.date ? 'is-active' : '', day.isToday ? 'is-today' : ''].filter(Boolean).join(' ')}
                                        aria-pressed={day.date === activeDay.date}
                                        onClick={() => setSelectedDate(day.date)}
                                    >
                                        <span>{day.weekday}</span>
                                        <strong>{day.dayNumber}</strong>
                                        <small>{day.minutes ? formatMinutes(day.minutes) : 'Open'}</small>
                                    </button>
                                ))}
                            </div>

                            {activeDay.blocks.length > 0 ? (
                                <>
                                    <DayTimeline blocks={activeDay.blocks} nowMinutes={nowMinutes} />
                                    <ol className="tdb-agenda">
                                        {activeDay.blocks.map(block => (
                                            <li key={block.key}>
                                                <span className="tdb-agenda__time">{block.startMin !== null ? formatClock(block.startMin) : 'No time'}</span>
                                                <span className="tdb-agenda__bar" style={{ '--tdb-block': PRIORITY_META[block.priority].color } as CSSProperties} aria-hidden="true" />
                                                <div className="tdb-agenda__main">
                                                    <strong>{block.taskName}</strong>
                                                    <span>{formatTimeRange(block.startMin, block.endMin)}</span>
                                                </div>
                                                <span className="tdb-agenda__duration">{formatMinutes(block.minutes)}</span>
                                                <Link className="tdb-icon-link" to={`/tasks/edit/${block.taskId}`} aria-label={`Edit ${block.taskName}`}>
                                                    <Icon name="pencil" size={16} />
                                                </Link>
                                            </li>
                                        ))}
                                    </ol>
                                </>
                            ) : (
                                <Empty
                                    icon="calendarCheck"
                                    title={`Nothing scheduled ${relativeDayLabel(activeDay.date, today).toLowerCase()}`}
                                    text={model.total === 0 ? 'Create a task and it will appear here once it is scheduled.' : 'Pick another day above, or create a task to fill this one.'}
                                    action={
                                        <Link to="/tasks/create" className="tdb-btn tdb-btn--secondary">
                                            <Icon name="plus" size={16} />
                                            Create task
                                        </Link>
                                    }
                                />
                            )}
                        </Panel>

                        <Panel id="tdb-deadlines-title" title="Upcoming end dates" subtitle="Tasks ordered by their end date">
                            {model.deadlines.length > 0 ? (
                                <ul className="tdb-list">
                                    {model.deadlines.slice(0, 6).map(({ task, daysLeft }) => (
                                        <li key={task.id}>
                                            <div className="tdb-list__main">
                                                <strong>{taskLabel(task)}</strong>
                                                <span>Ends {shortDate(task.end_date as string)}</span>
                                            </div>
                                            <span className={`tdb-due${daysLeft <= 2 ? ' is-soon' : ''}`}>{daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <Empty icon="calendarAlert" title="No upcoming end dates" text="Tasks with an end date today or later will be listed here." />
                            )}
                        </Panel>
                    </div>

                    {/* Task management */}
                    <div className="tdb-grid tdb-grid--main">
                        <Panel
                            id="tdb-recent-title"
                            title="Latest tasks"
                            subtitle="Most recently created"
                            action={
                                <Link className="tdb-link" to="/tasklist">
                                    View all
                                </Link>
                            }
                        >
                            {model.recent.length > 0 ? (
                                <div className="tdb-table-wrap">
                                    <table className="tdb-table">
                                        <thead>
                                            <tr>
                                                <th scope="col">Task</th>
                                                <th scope="col">Priority</th>
                                                <th scope="col">Duration</th>
                                                <th scope="col">Schedule</th>
                                                <th scope="col">Status</th>
                                                <th scope="col">
                                                    <span className="tdb-sr-only">Actions</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {model.recent.slice(0, 6).map(task => {
                                                const span = scheduleSpan(task);
                                                const hasStatus = task.status !== null && task.status !== undefined && task.status !== '';
                                                const isEnabled = Number(task.status) === 1;
                                                return (
                                                    <tr key={task.id}>
                                                        <td>
                                                            <div className="tdb-cell-name">
                                                                <strong>{taskLabel(task)}</strong>
                                                                <span>#{task.id}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <PriorityPill priority={task.priority} />
                                                        </td>
                                                        <td className="tdb-num">{formatMinutes(taskMinutes(task))}</td>
                                                        <td className="tdb-num">
                                                            {span.segments > 0 && span.first ? (
                                                                span.first === span.last || !span.last ? shortDate(span.first) : `${shortDate(span.first)} to ${shortDate(span.last)}`
                                                            ) : (
                                                                <span className="tdb-muted">Not scheduled</span>
                                                            )}
                                                        </td>
                                                        <td>{hasStatus ? <span className={`tdb-status${isEnabled ? ' is-on' : ''}`}>{isEnabled ? 'Enabled' : 'Disabled'}</span> : <span className="tdb-muted">None</span>}</td>
                                                        <td className="tdb-actions">
                                                            <Link className="tdb-icon-link" to={`/tasks/edit/${task.id}`} aria-label={`Edit ${taskLabel(task)}`}>
                                                                <Icon name="pencil" size={16} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Empty
                                    icon="layers"
                                    title="No tasks yet"
                                    text="Your newest tasks will show up here."
                                    action={
                                        <Link to="/tasks/create" className="tdb-btn tdb-btn--primary">
                                            <Icon name="plus" size={16} />
                                            Create task
                                        </Link>
                                    }
                                />
                            )}
                        </Panel>

                        <Panel
                            id="tdb-unscheduled-title"
                            title="Needs scheduling"
                            subtitle={model.unscheduled ? `${plural(model.unscheduled, 'task', 'tasks')} without a time slot` : 'Tasks without a time slot'}
                        >
                            {model.unscheduledList.length > 0 ? (
                                <ul className="tdb-list">
                                    {model.unscheduledList.slice(0, 6).map(task => (
                                        <li key={task.id}>
                                            <div className="tdb-list__main">
                                                <strong>{taskLabel(task)}</strong>
                                                <span>
                                                    {formatMinutes(taskMinutes(task))}
                                                    {isYmd(task.end_date) ? `, ends ${shortDate(task.end_date)}` : ''}
                                                </span>
                                            </div>
                                            <Link className="tdb-icon-link" to={`/tasks/edit/${task.id}`} aria-label={`Edit ${taskLabel(task)}`}>
                                                <Icon name="pencil" size={16} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <Empty icon="calendarCheck" title="Everything is scheduled" text="Every task has time set aside in your calendar." />
                            )}
                        </Panel>
                    </div>

                    {/* Analytics */}
                    <div className="tdb-grid tdb-grid--main">
                        <Panel id="tdb-workload-title" title="Workload, next 14 days" subtitle={workloadTotalMinutes > 0 ? `${formatMinutes(workloadTotalMinutes)} of scheduled work` : 'Scheduled hours per day'}>
                            {workloadTotalMinutes > 0 ? (
                                <div role="img" aria-label={`Scheduled hours per day for the next 14 days, ${formatMinutes(workloadTotalMinutes)} in total`}>
                                    <ReactApexChart type="bar" height={270} options={workloadOptions} series={[{ name: 'Scheduled hours', data: model.workload.map(item => item.hours) }]} />
                                </div>
                            ) : (
                                <Empty icon="clock" title="No scheduled work in the next 14 days" text="Scheduled task segments will be charted here by day." />
                            )}
                        </Panel>

                        <Panel id="tdb-priority-title" title="Priority mix" subtitle="All tasks by priority">
                            {model.total > 0 ? (
                                <>
                                    <div className="tdb-donut" role="img" aria-label={`Tasks by priority: ${priorityEntries.map(key => `${PRIORITY_META[key].label} ${model.priorityCounts[key]}`).join(', ')}`}>
                                        <ReactApexChart type="donut" height={220} options={priorityOptions} series={priorityEntries.map(key => model.priorityCounts[key])} />
                                    </div>
                                    <ul className="tdb-legend">
                                        {priorityEntries.map(key => (
                                            <li key={key}>
                                                <i style={{ background: PRIORITY_META[key].color }} aria-hidden="true" />
                                                <span>{PRIORITY_META[key].label}</span>
                                                <strong>{model.priorityCounts[key]}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <Empty icon="flag" title="No priorities to show" text="Set a priority on a task to see the mix." />
                            )}
                        </Panel>
                    </div>

                    <div className="tdb-grid tdb-grid--main">
                        <Panel
                            id="tdb-weekly-title"
                            title="Planned hours by week"
                            subtitle="Three weeks back to four weeks ahead. Shows scheduled time, not completed work."
                        >
                            {weeklyTotalMinutes > 0 ? (
                                <div role="img" aria-label={`Planned hours per week. Busiest week starts ${bestWeek.label} with ${formatMinutes(bestWeek.hours * 60)}`}>
                                    <ReactApexChart type="bar" height={250} options={weeklyOptions} series={[{ name: 'Planned hours', data: model.weekly.map(item => item.hours) }]} />
                                </div>
                            ) : (
                                <Empty icon="clock" title="No scheduled weeks yet" text="Weekly totals appear once tasks have scheduled segments." />
                            )}
                        </Panel>

                        <Panel id="tdb-coverage-title" title="Task coverage" subtitle="How your tasks are set up">
                            {model.total > 0 ? (
                                <div className="tdb-meters">
                                    <Meter label="Scheduled" value={model.scheduled} total={model.total} color="#2f9a73" />
                                    <Meter label="Unscheduled" value={model.unscheduled} total={model.total} color="#d9a21f" />
                                    {model.enabled + model.disabled > 0 && (
                                        <>
                                            <Meter label="Enabled" value={model.enabled} total={model.enabled + model.disabled} color="#526de5" />
                                            <Meter label="Disabled" value={model.disabled} total={model.enabled + model.disabled} color="#9aa6b8" />
                                        </>
                                    )}
                                </div>
                            ) : (
                                <Empty icon="layers" title="Nothing to measure yet" text="Create a task to see how much of your list is scheduled." />
                            )}
                        </Panel>
                    </div>
                </>
            )}

            {/* Quick access */}
            <nav className="tdb-quick" aria-label="Quick access">
                <Link to="/tasklist" className="tdb-quick__item">
                    <span className="tdb-quick__icon">
                        <Icon name="list" size={20} />
                    </span>
                    <span>
                        <strong>All tasks</strong>
                        <small>Search, sort and manage every task</small>
                    </span>
                    <Icon name="chevronRight" size={16} />
                </Link>
                <Link to="/tasks/create" className="tdb-quick__item">
                    <span className="tdb-quick__icon">
                        <Icon name="plus" size={20} />
                    </span>
                    <span>
                        <strong>Create task</strong>
                        <small>Add a task to your schedule</small>
                    </span>
                    <Icon name="chevronRight" size={16} />
                </Link>
                <Link to="/slotsetting" className="tdb-quick__item">
                    <span className="tdb-quick__icon">
                        <Icon name="sliders" size={20} />
                    </span>
                    <span>
                        <strong>Working hours</strong>
                        <small>Set your days, hours and breaks</small>
                    </span>
                    <Icon name="chevronRight" size={16} />
                </Link>
                <Link to="/recyclebin" className="tdb-quick__item">
                    <span className="tdb-quick__icon">
                        <Icon name="trash" size={20} />
                    </span>
                    <span>
                        <strong>Recycle bin</strong>
                        <small>Restore deleted tasks</small>
                    </span>
                    <Icon name="chevronRight" size={16} />
                </Link>
            </nav>
        </main>
    );
};

export default Dashboard;
