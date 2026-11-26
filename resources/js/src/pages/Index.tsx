import React, { useContext, useEffect, useMemo, useState } from 'react';
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
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Dashboard'));
        verifyAuth?.();
        if (!userId) {
            setLoading(false);
            return;
        }
        get(`getTask/${userId}`)
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
    }, [dispatch, userId]);

    const today = new Date().toISOString().slice(0, 10);
    const scheduledTasks = useMemo(() => tasks.filter(task => Array.isArray(task.segments) && task.segments.length > 0), [tasks]);
    const unscheduledTasks = tasks.length - scheduledTasks.length;
    const priorityTasks = tasks.filter(task => ['urgent', 'high'].includes(String(task.priority || '').toLowerCase()));
    const upcomingTasks = useMemo(() => scheduledTasks.map(task => {
        const segments = [...(task.segments || [])].sort((a, b) => `${a.segment_date} ${a.start_time}`.localeCompare(`${b.segment_date} ${b.start_time}`));
        return { ...task, nextSegment: segments.find(segment => `${segment.segment_date} ${segment.start_time}` >= `${today} 00:00`) };
    }).filter(task => task.nextSegment).sort((a, b) => `${a.nextSegment?.segment_date} ${a.nextSegment?.start_time}`.localeCompare(`${b.nextSegment?.segment_date} ${b.nextSegment?.start_time}`)).slice(0, 6), [scheduledTasks, today]);

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
            <div className="to-dashboard-heading">
                <div>
                    <span className="to-dashboard-kicker">YOUR WORKSPACE</span>
                    <h1>Good to see you.</h1>
                    <p>Here’s a clear view of your tasks and what’s coming up.</p>
                </div>
                <Link to="/tasks/create" className="to-dashboard-primary"><span aria-hidden="true">＋</span> Create task</Link>
            </div>

            {loadError && <div className="to-dashboard-notice" role="status">{loadError}</div>}

            <section className="to-dashboard-stats" aria-label="Task overview">
                <article className="to-stat-card"><span className="to-stat-icon to-stat-indigo">▦</span><div><span>Total tasks</span><strong>{loading ? '—' : tasks.length}</strong><small>Across your workspace</small></div></article>
                <article className="to-stat-card"><span className="to-stat-icon to-stat-green">✓</span><div><span>Scheduled</span><strong>{loading ? '—' : scheduledTasks.length}</strong><small>With allocated time</small></div></article>
                <article className="to-stat-card"><span className="to-stat-icon to-stat-amber">◷</span><div><span>Unscheduled</span><strong>{loading ? '—' : unscheduledTasks}</strong><small>Need a place in your day</small></div></article>
                <article className="to-stat-card"><span className="to-stat-icon to-stat-rose">↗</span><div><span>High priority</span><strong>{loading ? '—' : priorityTasks.length}</strong><small>Urgent and high priority</small></div></article>
            </section>

            <section className="to-dashboard-content">
                <div className="to-dashboard-main-card">
                    <div className="to-section-heading"><div><h2>Upcoming schedule</h2><p>Your next scheduled task segments.</p></div><Link to="/tasklist">View all tasks <span aria-hidden="true">→</span></Link></div>
                    {loading ? <div className="to-dashboard-empty">Loading your schedule…</div> : upcomingTasks.length ? (
                        <div className="to-upcoming-list">
                            {upcomingTasks.map(task => <article className="to-upcoming-item" key={task.id}>
                                <div className="to-upcoming-date"><strong>{task.nextSegment?.segment_date ? new Date(`${task.nextSegment.segment_date}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit' }) : '—'}</strong><span>{task.nextSegment?.segment_date ? new Date(`${task.nextSegment.segment_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }) : 'Date'}</span></div>
                                <div className="to-upcoming-details"><strong>{task.task_name || `Task #${task.id}`}</strong><span>{formatTime(task.nextSegment?.start_time)} – {formatTime(task.nextSegment?.end_time)}</span></div>
                                <span className="to-duration-pill">{formatDuration(task)}</span>
                                <Link to={`/tasks/edit/${task.id}`} className="to-upcoming-edit" aria-label={`Edit ${task.task_name || 'task'}`}>Edit</Link>
                            </article>)}
                        </div>
                    ) : <div className="to-dashboard-empty"><span className="to-empty-icon">◷</span><strong>Your schedule is clear</strong><p>Create a task and give it a time slot to see it here.</p><Link to="/tasks/create">Create your first task</Link></div>}
                </div>

                <aside className="to-dashboard-side-card">
                    <div className="to-section-heading"><div><h2>Quick actions</h2><p>Keep your workflow moving.</p></div></div>
                    <div className="to-quick-links">
                        <Link to="/tasks/create"><span className="to-quick-icon">＋</span><span><strong>Create a task</strong><small>Add a task to your schedule</small></span><b>→</b></Link>
                        <Link to="/tasklist"><span className="to-quick-icon">▤</span><span><strong>All tasks</strong><small>Review and manage tasks</small></span><b>→</b></Link>
                        <Link to="/slotsetting"><span className="to-quick-icon">◷</span><span><strong>Working hours</strong><small>Set your availability</small></span><b>→</b></Link>
                        <Link to="/recyclebin"><span className="to-quick-icon">↶</span><span><strong>Recycle bin</strong><small>Restore deleted tasks</small></span><b>→</b></Link>
                    </div>
                    <div className="to-dashboard-tip"><strong>Make time work for you</strong><p>Set your working days and hours so task scheduling can respect your availability.</p><Link to="/slotsetting">Review working hours</Link></div>
                </aside>
            </section>
        </main>
    );
};

export default Dashboard;
