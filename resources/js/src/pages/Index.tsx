import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Chart from 'react-apexcharts';
import { setPageTitle } from '../store/themeConfigSlice';
import { get } from './api/ApiCalls';
import GlobalContext from '../GlobalContext';

type Segment = { segment_date?: string; start_time?: string; end_time?: string; allocated_minutes?: number };
type Task = { id: number | string; task_name?: string; priority?: string; status?: number; hour?: number | string; total_allocated_minutes?: number; segments?: Segment[] };

const Dashboard = () => {
    const dispatch = useDispatch();
    const { verifyAuth } = useContext<any>(GlobalContext);
    const userId = localStorage.getItem('user_id');
    const username = localStorage.getItem('username') || '';
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const reloadTasks = useCallback(() => {
        if (!userId) { setTasks([]); setLoading(false); return; }
        setLoading(true);
        setError('');
        get('getTask/' + userId)
            .then((response: any) => {
                if (Array.isArray(response?.data)) setTasks(response.data);
                else { setTasks([]); setError(response?.message || 'Task data is unavailable.'); }
            })
            .catch(() => setError('We could not load your tasks. Please try again.'))
            .finally(() => setLoading(false));
    }, [userId]);

    useEffect(() => {
        dispatch(setPageTitle('Dashboard'));
        verifyAuth?.();
        reloadTasks();
    }, [dispatch, reloadTasks]);

    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const scheduled = useMemo(() => tasks.filter(task => Array.isArray(task.segments) && task.segments.length > 0), [tasks]);
    const unscheduledCount = tasks.length - scheduled.length;
    const priorities = useMemo(() => ({
        high: tasks.filter(task => ['high', 'urgent'].includes(String(task.priority || '').toLowerCase())).length,
        medium: tasks.filter(task => String(task.priority || '').toLowerCase() === 'medium').length,
        low: tasks.filter(task => String(task.priority || '').toLowerCase() === 'low').length,
    }), [tasks]);
    const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index);
        const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
        const segments = scheduled.flatMap(task => (task.segments || []).filter(segment => segment.segment_date === key));
        return { key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), date: date.getDate(), count: segments.length, minutes: segments.reduce((sum, segment) => sum + Number(segment.allocated_minutes || 0), 0) };
    }), [scheduled, today]);
    const weekMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
    const upcoming = useMemo(() => scheduled.flatMap(task => (task.segments || []).map(segment => ({ task, segment })))
        .filter(item => item.segment.segment_date && (item.segment.segment_date > today || (item.segment.segment_date === today && String(item.segment.end_time || '').slice(0, 5) >= String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'))))
        .sort((a, b) => (String(a.segment.segment_date) + ' ' + String(a.segment.start_time)).localeCompare(String(b.segment.segment_date) + ' ' + String(b.segment.start_time)))
        .slice(0, 7), [scheduled, today, now.getHours(), now.getMinutes()]);
    const todayItems = scheduled.flatMap(task => (task.segments || []).filter(segment => segment.segment_date === today).map(segment => ({ task, segment }))).sort((a, b) => String(a.segment.start_time).localeCompare(String(b.segment.start_time)));
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
    const duration = (value: number) => {
        const minutes = Math.max(0, Math.round(value));
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return (hours ? hours + 'h ' : '') + (remainder ? remainder + 'm' : (hours ? '' : '0m'));
    };
    const time = (value?: string) => {
        if (!value) return 'Time not set';
        const parts = value.split(':');
        const hour = Number(parts[0]);
        return (hour % 12 || 12) + ':' + (parts[1] || '00') + ' ' + (hour >= 12 ? 'PM' : 'AM');
    };
    const first = upcoming[0];
    const hasPriority = priorities.high + priorities.medium + priorities.low > 0;
    const weeklyOptions = {
        chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif', foreColor: '#929bad', parentHeightOffset: 0 },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '42%' } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#edf0f5', strokeDashArray: 4, padding: { left: 0, right: 8 } },
        xaxis: { categories: days.map(day => day.label), axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (value: number) => value >= 60 ? Math.round(value / 60) + 'h' : Math.round(value) + 'm' } },
        tooltip: { y: { formatter: (value: number) => duration(value) } },
        colors: ['#665df0'],
        states: { hover: { filter: { type: 'lighten', value: 0.06 } } },
    };
    const priorityOptions = {
        chart: { type: 'donut' as const, fontFamily: 'Inter, sans-serif' },
        labels: ['High', 'Medium', 'Low'],
        colors: ['#e56e7c', '#e7ad55', '#7192e8'],
        stroke: { width: 4, colors: ['#ffffff'] },
        dataLabels: { enabled: false },
        legend: { show: false },
        plotOptions: { pie: { donut: { size: '76%', labels: { show: true, total: { show: true, label: 'Tasks', color: '#929bad', formatter: () => String(tasks.length) } } } } },
        tooltip: { y: { formatter: (value: number) => value + ' tasks' } },
    };

    return (
        <main className="to-command-center">
            <section className="to-command-welcome">
                <div className="to-welcome-copy">
                    <span className="to-welcome-date">◷ &nbsp;{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <h1>{greeting}{username ? ', ' + username.split(' ')[0] : ''}</h1>
                    <p>Your workspace at a glance. Plan deliberately, stay focused, and make time count.</p>
                    <div className="to-welcome-actions"><Link to="/tasks/create" className="to-command-primary">＋ &nbsp;Create task</Link><Link to="/tasklist" className="to-command-secondary">View all tasks&nbsp; ↗</Link></div>
                </div>
                <div className="to-welcome-focus">
                    <span className="to-focus-overline">NEXT UP</span>
                    {loading ? <strong className="to-focus-task">Loading your plan…</strong> : first ? <><strong className="to-focus-task">{first.task.task_name || 'Task #' + first.task.id}</strong><span className="to-focus-time">{new Date(String(first.segment.segment_date) + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {time(first.segment.start_time)}</span></> : <><strong className="to-focus-task">Nothing scheduled</strong><span className="to-focus-time">Your calendar has room for focused work.</span></>}
                    <div className="to-focus-bottom"><span>◷ &nbsp;{loading ? '—' : duration(weekMinutes)} planned this week</span><Link to="/tasklist">↗</Link></div>
                </div>
            </section>

            {error && <div className="to-command-error" role="alert"><span>{error}</span><button type="button" onClick={reloadTasks}>Retry</button></div>}

            <section className="to-command-kpis" aria-label="Workspace overview">
                <article className="to-kpi-card"><span className="to-kpi-icon kpi-violet">▤</span><div><span className="to-kpi-label">Total tasks</span><strong>{loading ? '—' : tasks.length}</strong><small>Across your workspace</small></div><Link to="/tasklist">↗</Link></article>
                <article className="to-kpi-card"><span className="to-kpi-icon kpi-green">✓</span><div><span className="to-kpi-label">Scheduled</span><strong>{loading ? '—' : scheduled.length}</strong><small>Tasks with planned time</small></div><span className="to-kpi-tag">PLANNED</span></article>
                <article className="to-kpi-card"><span className="to-kpi-icon kpi-amber">◷</span><div><span className="to-kpi-label">Needs planning</span><strong>{loading ? '—' : unscheduledCount}</strong><small>Tasks without segments</small></div><Link to="/tasklist">↗</Link></article>
                <article className="to-kpi-card"><span className="to-kpi-icon kpi-rose">⚑</span><div><span className="to-kpi-label">High priority</span><strong>{loading ? '—' : priorities.high}</strong><small>Urgent and high priority</small></div><span className="to-kpi-tag">FOCUS</span></article>
            </section>

            <section className="to-command-grid">
                <article className="to-command-panel to-schedule-panel">
                    <div className="to-panel-heading"><div><span className="to-panel-eyebrow">YOUR AGENDA</span><h2>Upcoming schedule</h2><p>Next scheduled work, in chronological order.</p></div><Link to="/tasklist" className="to-panel-link">Full task list&nbsp; ↗</Link></div>
                    {loading ? <div className="to-command-empty">Loading your schedule…</div> : upcoming.length ? <div className="to-agenda-list">{upcoming.map((item, index) => <div className="to-agenda-row" key={String(item.task.id) + '-' + item.segment.segment_date + '-' + item.segment.start_time}>
                        <div className="to-agenda-date"><strong>{new Date(String(item.segment.segment_date) + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>{new Date(String(item.segment.segment_date) + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })}</span></div>
                        <span className={'to-agenda-marker' + (index === 0 ? ' is-current' : '')}><i /></span>
                        <div className="to-agenda-info"><strong>{item.task.task_name || 'Task #' + item.task.id}</strong><span>{time(item.segment.start_time)} – {time(item.segment.end_time)}{(item.task.segments?.length || 0) > 1 ? ' · Scheduled segment' : ''}</span></div>
                        <span className="to-agenda-duration">{duration(Number(item.segment.allocated_minutes || 0))}</span><Link to={'/tasks/edit/' + item.task.id} className="to-agenda-open">Open ↗</Link>
                    </div>)}</div> : <div className="to-command-empty"><span className="to-empty-symbol">◷</span><strong>No upcoming work</strong><p>When tasks are scheduled, your next commitments will appear here.</p><Link to="/tasks/create">Create a task ↗</Link></div>}
                </article>

                <article className="to-command-panel to-week-panel">
                    <div className="to-panel-heading"><div><span className="to-panel-eyebrow">CAPACITY PLANNING</span><h2>Weekly workload</h2><p>Allocated minutes across the next seven days.</p></div><strong className="to-chart-total">{loading ? '—' : duration(weekMinutes)}</strong></div>
                    <div className="to-week-chart-wrap">{loading ? <div className="to-chart-loading">Preparing workload…</div> : <Chart options={weeklyOptions} series={[{ name: 'Scheduled minutes', data: days.map(day => day.minutes) }]} type="bar" height={220} width="100%" />}</div>
                    <div className="to-chart-footnote"><span><i /> Scheduled time</span><span>{loading ? '—' : days.reduce((sum, day) => sum + day.count, 0) + ' segments planned'}</span></div>
                </article>

                <article className="to-command-panel to-priority-panel">
                    <div className="to-panel-heading"><div><span className="to-panel-eyebrow">WORK PRIORITIES</span><h2>Task distribution</h2><p>Breakdown by priority level.</p></div><Link to="/tasklist" className="to-panel-link">Manage ↗</Link></div>
                    {hasPriority ? <div className="to-priority-content"><div className="to-priority-chart"><Chart options={priorityOptions} series={[priorities.high, priorities.medium, priorities.low]} type="donut" height={190} width="100%" /></div><div className="to-priority-legend"><div><i className="priority-high" /><span>High priority</span><strong>{priorities.high}</strong></div><div><i className="priority-medium" /><span>Medium priority</span><strong>{priorities.medium}</strong></div><div><i className="priority-low" /><span>Low priority</span><strong>{priorities.low}</strong></div></div></div> : <div className="to-command-empty compact"><strong>No priority data yet</strong><p>Assign priorities to tasks to see the distribution.</p></div>}
                </article>

                <article className="to-command-panel to-today-panel">
                    <div className="to-panel-heading"><div><span className="to-panel-eyebrow">TODAY</span><h2>Today's commitments</h2><p>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><span className="to-today-count">{loading ? '—' : todayItems.length + ' segments'}</span></div>
                    {loading ? <div className="to-command-empty">Loading today’s plan…</div> : todayItems.length ? <div className="to-today-list">{todayItems.slice(0, 5).map(item => <div className="to-today-row" key={String(item.task.id) + '-' + item.segment.start_time}><span className="to-today-time">{time(item.segment.start_time)}</span><i className="to-today-dot" /><div><strong>{item.task.task_name || 'Task #' + item.task.id}</strong><small>{time(item.segment.start_time)} – {time(item.segment.end_time)}</small></div><span className="to-today-duration">{duration(Number(item.segment.allocated_minutes || 0))}</span></div>)}</div> : <div className="to-command-empty compact"><strong>No commitments today</strong><p>Your day is open. Add a task whenever you're ready.</p></div>}
                    <Link to="/tasklist" className="to-today-footer">See all scheduled tasks&nbsp; ↗</Link>
                </article>
            </section>

            <section className="to-command-bottom"><div className="to-command-bottom-copy"><span className="to-bottom-icon">✦</span><div><strong>Keep your plan intentional</strong><p>{loading ? 'Your workspace insights are updating.' : unscheduledCount ? unscheduledCount + ' task' + (unscheduledCount === 1 ? '' : 's') + ' still need a place in your schedule.' : 'Your tasks are planned. Review upcoming work and protect your focus time.'}</p></div></div><div className="to-bottom-actions"><Link to="/slotsetting">Working hours</Link><Link to="/recyclebin">Recycle bin</Link></div></section>
        </main>
    );
};

export default Dashboard;
