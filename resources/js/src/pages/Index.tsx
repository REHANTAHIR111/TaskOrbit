import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../store/themeConfigSlice';
import { get } from './api/ApiCalls';
import GlobalContext from '../GlobalContext';

type TaskSegment = { segment_date?: string; start_time?: string; end_time?: string; allocated_minutes?: number };
type Task = {
    id: number | string;
    task_name?: string;
    priority?: string;
    status?: number;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    hour?: number | string;
    total_allocated_minutes?: number;
    segments?: TaskSegment[];
};

const Dashboard = () => {
    const dispatch = useDispatch();
    const { verifyAuth } = useContext<any>(GlobalContext);
    const userId = localStorage.getItem('user_id');
    const username = localStorage.getItem('username') || '';
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

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
            .catch(() => setLoadError('We could not load your tasks. Please refresh and try again.'))
            .finally(() => setLoading(false));
    }, [userId]);

    useEffect(() => {
        dispatch(setPageTitle('Dashboard'));
        verifyAuth?.();
        reloadTasks();
    }, [dispatch, reloadTasks]);

    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const scheduledTasks = useMemo(() => tasks.filter(task => Array.isArray(task.segments) && task.segments.length > 0), [tasks]);
    const unscheduledTasks = tasks.length - scheduledTasks.length;
    const priorityTasks = tasks.filter(task => ['urgent', 'high'].includes(String(task.priority || '').toLowerCase()));
    const upcomingSegments = useMemo(() => scheduledTasks.flatMap(task => (task.segments || []).map(segment => ({ task, segment })))
        .filter(({ segment }) => segment.segment_date > today || (segment.segment_date === today && String(segment.start_time || '').slice(0, 5) >= `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`))
        .sort((a, b) => `${a.segment.segment_date} ${a.segment.start_time}`.localeCompare(`${b.segment.segment_date} ${b.segment.start_time}`))
        .slice(0, 6), [scheduledTasks, today, now.getHours(), now.getMinutes()]);
    const nextSevenDays = useMemo(() => Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const daySegments = scheduledTasks.flatMap(task => (task.segments || []).filter(segment => segment.segment_date === key));
        return { key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), date: date.getDate(), count: daySegments.length, minutes: daySegments.reduce((sum, segment) => sum + Number(segment.allocated_minutes || 0), 0) };
    }), [scheduledTasks, today]);
    const busiestDay = nextSevenDays.reduce((best, day) => day.minutes > best.minutes ? day : best, nextSevenDays[0]);
    const plannedWeekMinutes = nextSevenDays.reduce((sum, day) => sum + day.minutes, 0);
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

    const formatTime = (value?: string) => {
        if (!value) return 'Time not set';
        const [hours, minutes] = value.split(':');
        const hour = Number(hours);
        return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
    };
    const formatDuration = (task: Task) => {
        const minutes = task.total_allocated_minutes ?? Math.round(Number(task.hour || 0) * 60);
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ') || '—';
    };

    return (
        <main className="to-dashboard">
            <section className="to-dashboard-hero">
                <div className="to-hero-orbit to-hero-orbit-one" aria-hidden="true" />
                <div className="to-hero-orbit to-hero-orbit-two" aria-hidden="true" />
                <div className="to-dashboard-hero-copy">
                    <span className="to-dashboard-kicker">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    <h1>{greeting}{username ? `, ${username.split(' ')[0]}` : ''}<br /><span>make today count.</span></h1>
                    <p>Your work, thoughtfully scheduled. Here’s what’s ahead and where your time is going.</p>
                    <div className="to-hero-actions"><Link to="/tasks/create" className="to-dashboard-primary"><span aria-hidden="true">＋</span> Plan a task</Link><Link to="/tasklist" className="to-hero-secondary">Open task list <span aria-hidden="true">↗</span></Link></div>
                </div>
                <div className="to-hero-focus" aria-label="Upcoming workload">
                    <span className="to-focus-label">NEXT 7 DAYS</span>
                    <strong>{loading ? '—' : plannedWeekMinutes ? formatDuration({ total_allocated_minutes: plannedWeekMinutes }) : '0m'}</strong>
                    <span className="to-focus-caption">scheduled work</span>
                    <div className="to-focus-divider" />
                    <span className="to-focus-foot">{loading ? 'Updating your plan' : busiestDay.minutes ? `Busiest day · ${new Date(`${busiestDay.key}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}` : 'Room for what matters'}</span>
                </div>
            </section>

            {loadError && <div className="to-dashboard-notice" role="status">{loadError}</div>}

            <section className="to-dashboard-stats" aria-label="Task overview">
                <article className="to-stat-card"><span className="to-stat-icon to-stat-indigo"><span>▦</span></span><div><span>All tasks</span><strong>{loading ? '—' : tasks.length}</strong><small>In your workspace</small></div><span className="to-stat-trend">01</span></article>
                <article className="to-stat-card"><span className="to-stat-icon to-stat-green"><span>✓</span></span><div><span>Scheduled</span><strong>{loading ? '—' : scheduledTasks.length}</strong><small>With working time</small></div><span className="to-stat-trend">02</span></article>
                <article className="to-stat-card"><span className="to-stat-icon to-stat-amber"><span>◷</span></span><div><span>Need a time</span><strong>{loading ? '—' : unscheduledTasks}</strong><small>Ready to be planned</small></div><span className="to-stat-trend">03</span></article>
                <article className="to-stat-card"><span className="to-stat-icon to-stat-rose"><span>↗</span></span><div><span>Priority tasks</span><strong>{loading ? '—' : priorityTasks.length}</strong><small>High or urgent</small></div><span className="to-stat-trend">04</span></article>
            </section>

            <section className="to-dashboard-content">
                <div className="to-dashboard-main-card">
                    <div className="to-section-heading"><div><span className="to-section-eyebrow">YOUR TIMELINE</span><h2>Coming up</h2><p>Scheduled work, in chronological order.</p></div><Link to="/tasklist">Full schedule <span aria-hidden="true">↗</span></Link></div>
                    {loading ? <div className="to-dashboard-empty" role="status">Loading your schedule…</div> : loadError ? (
                        <div className="to-dashboard-empty" role="alert"><strong>Schedule unavailable</strong><p>{loadError}</p><button type="button" onClick={reloadTasks}>Try again</button></div>
                    ) : upcomingSegments.length ? (
                        <div className="to-upcoming-list">
                            {upcomingSegments.map(({ task, segment }, index) => <article className="to-upcoming-item" key={`${task.id}-${segment.segment_date}-${segment.start_time}`}>
                                <div className="to-upcoming-date"><strong>{new Date(`${segment.segment_date}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>{new Date(`${segment.segment_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span></div>
                                <span className={`to-timeline-rail${index === 0 ? ' is-next' : ''}`} aria-hidden="true"><i /></span>
                                <div className="to-upcoming-details"><strong>{task.task_name || `Task #${task.id}`}{index === 0 && <span className="to-next-badge">NEXT</span>}</strong><span>{formatTime(segment.start_time)} – {formatTime(segment.end_time)}{(task.segments?.length || 0) > 1 ? ' · Scheduled segment' : ''}</span></div>
                                <span className="to-duration-pill">{formatDuration({ total_allocated_minutes: Number(segment.allocated_minutes || 0) })}</span>
                                <Link to={`/tasks/edit/${task.id}`} className="to-upcoming-edit" aria-label={`Edit ${task.task_name || 'task'}`}>View <span aria-hidden="true">↗</span></Link>
                            </article>)}
                        </div>
                    ) : <div className="to-dashboard-empty"><span className="to-empty-icon">◷</span><strong>Your schedule is clear</strong><p>Add a task and TaskOrbit will help fit it into your working time.</p><Link to="/tasks/create">Plan your first task <span aria-hidden="true">→</span></Link></div>}
                </div>

                <aside className="to-dashboard-side-card">
                    <div className="to-section-heading"><div><span className="to-section-eyebrow">PLAN AHEAD</span><h2>Weekly rhythm</h2><p>Scheduled segments by day.</p></div><span className="to-week-total">{loading ? '—' : formatDuration({ total_allocated_minutes: plannedWeekMinutes })}</span></div>
                    <div className="to-week-chart" aria-label="Scheduled minutes for the next seven days">
                        {nextSevenDays.map(day => <div className={`to-week-day${day.key === today ? ' is-today' : ''}`} key={day.key} title={`${day.label}, ${day.date}: ${formatDuration({ total_allocated_minutes: day.minutes })}`}>
                            <span className="to-week-value">{day.minutes ? formatDuration({ total_allocated_minutes: day.minutes }) : '—'}</span>
                            <span className="to-week-track"><i style={{ height: `${plannedWeekMinutes ? Math.max(day.minutes ? 8 : 3, Math.round((day.minutes / Math.max(...nextSevenDays.map(item => item.minutes), 1)) * 100)) : 3}%` }} /></span>
                            <span className="to-week-label">{day.label}</span><small>{day.date}</small>
                        </div>)}
                    </div>
                    <div className="to-week-legend"><span><i /> Planned time</span><span>{loading ? '—' : `${nextSevenDays.reduce((sum, day) => sum + day.count, 0)} segments`}</span></div>
                    <div className="to-quick-panel-heading"><span className="to-section-eyebrow">SHORTCUTS</span></div>
                    <div className="to-quick-links">
                        <Link to="/tasks/create"><span className="to-quick-icon">＋</span><span><strong>Create a task</strong><small>Add work to your plan</small></span><b>↗</b></Link>
                        <Link to="/slotsetting"><span className="to-quick-icon">◷</span><span><strong>Working hours</strong><small>Set your availability</small></span><b>↗</b></Link>
                    </div>
                </aside>
            </section>
        </main>
    );
};

export default Dashboard;
