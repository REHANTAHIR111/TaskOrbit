import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import Tippy from '@tippyjs/react';
import { Link } from 'react-router-dom';
import { List } from 'lodash';
import { useNavigate } from 'react-router-dom';
import IconPlus from '../../components/Icon/IconPlus';
import { get, post } from '../api/ApiCalls';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import IconSearch from '../../components/Icon/IconSearch';
import GlobalContext from '../../GlobalContext';

const TaskListing = (props: any) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { verifyAuth } = useContext(GlobalContext);
    const userId = localStorage.getItem('user_id');

    const rowData: any[] | null | undefined = [];

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<any[]>(rowData || []);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'first_scheduled', direction: 'asc' });
    const [loader, setLoader] = useState(false);
    const [permissionsData, setpermissionsData] = useState<any>([]);
    const [taskData, setTaskData] = useState<any>([]);
    const [recordsData, setRecordsData] = useState(initialRecords);

    const getTask = () => {
        setLoader(true)
        get(`getTask/${userId}`).then((responseJson: any) => {
            setTaskData(responseJson.data);
            setTimeout(
                function () {
                    setLoader(false);
                }.bind(this),
                1000
            );
        });
    };

    useEffect(() => {
        dispatch(setPageTitle('Task Listing'));
        getTask();
        verifyAuth();
    }, [props]);

    const scheduledStartKey = (task: any) => {
        const firstSegment = [...(task?.segments || [])]
            .sort((left: any, right: any) => `${left.segment_date} ${left.start_time}`.localeCompare(`${right.segment_date} ${right.start_time}`))[0];
        const date = firstSegment?.segment_date || task?.start_date || '9999-12-31';
        const time = firstSegment?.start_time || task?.start_time || '23:59:59';
        return `${date} ${time}`;
    };

    useEffect(() => {
        const sorted = [...taskData].sort((left: any, right: any) => {
            const leftValue = sortStatus.columnAccessor === 'first_scheduled' ? scheduledStartKey(left) : left?.[sortStatus.columnAccessor];
            const rightValue = sortStatus.columnAccessor === 'first_scheduled' ? scheduledStartKey(right) : right?.[sortStatus.columnAccessor];
            const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
                ? leftValue - rightValue
                : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { numeric: true, sensitivity: 'base' });
            return (sortStatus.direction === 'desc' ? -comparison : comparison) || Number(left.id) - Number(right.id);
        });
        const normalizedSearch = search.trim().toLowerCase();
        const filtered = normalizedSearch
            ? sorted.filter((item: any) => [item.task_name, item.name, item.name_ar]
                .some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))
            : sorted;
        setInitialRecords(filtered);
        setPage(1);
    }, [taskData, sortStatus, search]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    const formatTime = (time: string) => {
        if (!time) return '';

        const [hours, minutes] = time.split(':');
        const hour = Number(hours);

        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;

        return `${String(displayHour).padStart(2, '0')}:${minutes} ${period}`;
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor((minutes || 0) / 60);
        const remainder = (minutes || 0) % 60;
        return `${hours ? `${hours}h` : ''}${remainder ? ` ${remainder}m` : ''}`.trim() || '0m';
    };

    const schedulePoint = (date: string, time: string) => (
        <div className="text-sm text-slate-700">
            <div>{date || '—'}</div>
            <div className="text-xs text-slate-500">{formatTime(time) || '—'}</div>
        </div>
    );

    const escapeHtml = (value: any) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[character] as string));

    const describeSegmentsHtml = (segments: any[]) => (segments || []).length
        ? `<ul class="list-disc pl-5 text-left">${segments.map((segment) => `<li>${escapeHtml(segment.segment_date)} ${escapeHtml(formatTime(segment.start_time))}–${escapeHtml(formatTime(segment.end_time))} (${escapeHtml(formatDuration(Number(segment.allocated_minutes)))})</li>`).join('')}</ul>`
        : '<p>No saved segments</p>';

    const showDeleteResult = (deletedLabel: string, responseJson: any) => {
        const moved = responseJson?.rescheduled || [];
        if (!moved.length) {
            return Swal.fire({ title: 'Task deleted', text: `${deletedLabel} was moved to the recycle bin. Other task schedules stayed unchanged.`, icon: 'success', confirmButtonText: t('ok') });
        }

        const taskChanges = moved.map((task: any) => `
            <section class="mb-4 text-left">
                <strong>Task #${escapeHtml(task.id)}${task.task_name ? ` — ${escapeHtml(task.task_name)}` : ''}</strong>
                <span> · ${escapeHtml(formatDuration(Number(task.total_allocated_minutes)))} preserved</span>
                <p class="mt-1 mb-0"><strong>Before reflow</strong>${describeSegmentsHtml(task.previous_segments)}</p>
                <p class="mt-1 mb-0"><strong>After reflow</strong>${describeSegmentsHtml(task.segments)}</p>
            </section>`).join('');

        return Swal.fire({
            title: 'Task deleted and later tasks reflowed',
            html: `<div class="space-y-3 text-left"><p>${escapeHtml(deletedLabel)} was moved to the recycle bin. ${moved.length} later task${moved.length === 1 ? '' : 's'} kept their full duration and original order. Earlier tasks were not changed. Segments can split around breaks and non-working time.</p>${taskChanges}</div>`,
            icon: 'success',
            confirmButtonText: t('ok'),
            width: 760,
            customClass: { confirmButton: 'btn btn-primary', popup: 'sweet-alerts' },
            buttonsStyling: false,
        });
    };

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData([...initialRecords?.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    const deleteRow = async (id: any = null) => {
        const result = await Swal.fire({
            title: `Delete task #${id}?`,
            text: 'Delete only keeps every other task at its current time. Delete and reflow moves later tasks earlier into the freed time, keeps their durations and order, and may split them around breaks or non-working periods. Earlier tasks stay unchanged. If any later task cannot fit its date limit, the whole reflow is canceled.',
            icon: 'warning',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Delete and reflow later tasks',
            denyButtonText: 'Delete only (keep schedules)',
            cancelButtonText: t('noCancel'),
            reverseButtons: true,
            customClass: {
                confirmButton: 'btn btn-primary',
                denyButton: 'btn btn-secondary',
                cancelButton: 'btn btn-dark',
                popup: 'sweet-alerts',
            },
            buttonsStyling: false,
        });

        if (result.isDismissed) return;

        const shouldReflow = result.isConfirmed;
        const responseJson: any = await get(
            'task/' + id + '/delete' + (shouldReflow ? '?reflow=true' : '')
        );

        if (responseJson?.success === true || responseJson?.success === 'true') {
            await getTask();
            await showDeleteResult(`Task #${id}`, responseJson);
        } else {
            await Swal.fire({
                title: 'Could not delete task',
                text: responseJson?.message || 'The task could not be deleted.',
                icon: 'error',
                confirmButtonText: t('ok'),
            });
        }
    };

    const showAlert = async (type: number) => {
        if (type === 11) {
            const count = selectedRecords.length;
            if (!count) return;
            const result = await Swal.fire({
                title: `Delete ${count} selected task${count === 1 ? '' : 's'}?`,
                text: 'Delete only keeps all other tasks at their current times. Delete and reflow moves later tasks earlier while preserving their duration and order; segments may split around breaks and non-working periods. Earlier tasks stay unchanged. If any later task cannot fit its date limit, no selected task is deleted.',
                icon: 'warning',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Delete only (keep schedules)',
                denyButtonText: 'Delete and reflow later tasks',
                cancelButtonText: t('noCancel'),
                reverseButtons: true,
                customClass: { confirmButton: 'btn btn-secondary', denyButton: 'btn btn-primary', cancelButton: 'btn btn-dark', popup: 'sweet-alerts' },
                buttonsStyling: false,
            });
            if (!result.isConfirmed && !result.isDenied) return;
            const selectedLabel = `Selected tasks ${selectedRecords.map((task: any) => `#${task.id}`).join(', ')}`;
            const responseJson: any = await post('task/multidelete', {
                id: selectedRecords.map((task: { id: any }) => task.id),
                reflow: result.isDenied,
            });
            if (responseJson?.success === true || responseJson?.success === 'true') {
                await getTask();
                setSelectedRecords([]);
                await showDeleteResult(selectedLabel, responseJson);
            } else {
                await Swal.fire({ title: 'Deletion rolled back', text: responseJson?.message || 'No selected tasks were changed.', icon: 'error', confirmButtonText: t('ok') });
            }
        }
    };


    return (
        <div className="to-task-list">
            <div className="to-listing-intro">
                <div className="to-listing-title">
                    <span className="to-listing-kicker">WORKSPACE / TASK MANAGEMENT</span>
                    <h1>Tasks</h1>
                    <p>Everything you're working on, organized in one place.</p>
                </div>
                <div className="to-listing-intro-actions">
                    <span className="to-listing-total"><strong>{taskData.length}</strong><small>Total tasks</small></span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="listingTrashButton"
                            aria-label="Delete selected tasks"
                            disabled={selectedRecords?.length < 1}
                            onClick={() => showAlert(11)}
                        >
                            <IconTrashLines className="w-4.5 h-4.5" />
                        </button>
                        <Link
                            to="/tasks/create"
                            className="listingCreateButton"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22 5.18L10.59 16.6l-4.24-4.24l1.41-1.41l2.83 2.83l10-10zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.57 0 3.04.46 4.28 1.25l1.45-1.45A10 10 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.73 0 3.36-.44 4.78-1.22l-1.5-1.5c-1 .46-2.11.72-3.28.72m7-5h-3v2h3v3h2v-3h3v-2h-3v-3h-2z"/>
                            </svg>
                            <span>{t('Add Task')}</span>
                        </Link>
                    </div>
                </div>
            </div>
            <div className="panel to-listing-surface">
                <div className="to-listing-stats">
                    <div><span className="to-listing-stat-icon">▤</span><span><small>All tasks</small><strong>{taskData.length}</strong></span></div>
                    <div><span className="to-listing-stat-icon is-scheduled">◷</span><span><small>Scheduled</small><strong>{taskData.filter((task: any) => (task.segments || []).length > 0).length}</strong></span></div>
                    <div><span className="to-listing-stat-icon is-pending">＋</span><span><small>Needs planning</small><strong>{taskData.filter((task: any) => !(task.segments || []).length).length}</strong></span></div>
                </div>
                <div className="to-task-list-toolbar">
                    <div className="to-task-search">
                        <IconSearch aria-hidden="true" className="h-4 w-4" />
                        <input
                            id="task-list-search"
                            type="search"
                            aria-label="Search tasks"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search tasks"
                            autoComplete="off"
                        />
                        {search && <button type="button" onClick={() => setSearch('')}>Clear</button>}
                    </div>
                    <span className="to-task-result-count" aria-live="polite">
                        {initialRecords.length} {initialRecords.length === 1 ? 'task' : 'tasks'}
                    </span>
                </div>
                <div className="datatables">
                    <DataTable
                            noRecordsText="No tasks found"
                            highlightOnHover
                            striped={false}
                            withColumnBorders={false}
                            className="whitespace-nowrap task-datatable"
                            records={recordsData}
                            fetching={loader}
                            customLoader={
                                <span className="animate-spin border-[3px] border-transparent border-l-primary rounded-full w-8 h-8 inline-block align-middle"></span>
                            }
                            loaderBackgroundBlur={0}

                            columns={[
                                { accessor: 'task_name', title: 'Task', sortable: false, width: 250, render: ({ id, task_name }: any) => <div className="to-task-identity"><strong>{task_name || 'Untitled task'}</strong><span>#{id || '—'}</span></div> },
                                { accessor: 'hour', title: 'Duration', sortable: false, width: 110, render: ({ hour, total_allocated_minutes }: any) => <span className="to-task-duration-pill">{total_allocated_minutes != null ? formatDuration(Number(total_allocated_minutes)) : hour ? formatDuration(Math.round(Number(hour) * 60)) : '—'}</span> },
                                { accessor: 'first_scheduled', title: 'Schedule', sortable: true, width: 280, render: ({ segments, start_date, start_time, end_date, end_time }: any) => {
                                    const ordered = [...(segments || [])].sort((x: any, y: any) => (String(x.segment_date) + ' ' + String(x.start_time)).localeCompare(String(y.segment_date) + ' ' + String(y.start_time)));
                                    const first = ordered[0], last = ordered[ordered.length - 1];
                                    const firstDate = first?.segment_date || start_date, lastDate = last?.segment_date || end_date;
                                    const firstTime = first?.start_time || start_time, lastTime = last?.end_time || end_time;
                                    return firstDate ? <div className="to-task-schedule"><strong>{firstDate === lastDate ? firstDate : firstDate + ' → ' + (lastDate || firstDate)}</strong><span>{formatTime(firstTime || '') || 'Time not set'}{lastTime ? ' – ' + formatTime(lastTime) : ''}</span>{ordered.length > 1 && <small>{ordered.length} scheduled segments</small>}</div> : <span className="to-task-unscheduled">Needs planning</span>;
                                } },
                                { accessor: 'Priority', title: 'Priority', sortable: false, width: 125, render: ({ priority }: any) => { const value = String(priority || '').toLowerCase(); return ['urgent', 'high', 'medium', 'low'].includes(value) ? <span className={'to-priority-pill is-' + value}><i />{value}</span> : <span className="to-table-muted">Not set</span>; } },
                                { accessor: 'status', title: 'Status', sortable: false, width: 120, render: ({ status }: any) => status == null ? <span className="to-table-muted">—</span> : <span className={'to-status-pill ' + (status === 1 ? 'is-enabled' : 'is-disabled')}><i />{status === 1 ? t('enabled') : t('disabled')}</span> },
                                { accessor: 'action', title: 'Actions', sortable: false, width: 112, render: ({ id }: any) => id ? <div className="to-task-row-actions"><Tippy content={t('edit')}><Link to={'/tasks/edit/' + id} className="actionButton"><IconPencil className="w-4 h-4" /></Link></Tippy><Tippy content={t('delete')}><button type="button" onClick={() => deleteRow(id)} className="actionButton is-delete"><IconTrashLines className="w-4 h-4" /></button></Tippy></div> : <span className="to-table-muted">—</span> },
                            ]}

                            totalRecords={initialRecords.length}
                            recordsPerPage={pageSize}
                            page={page}
                            onPageChange={(p) => setPage(p)}
                            recordsPerPageOptions={PAGE_SIZES}
                            onRecordsPerPageChange={setPageSize}
                            sortStatus={sortStatus}
                            onSortStatusChange={setSortStatus}
                            selectedRecords={selectedRecords}
                            onSelectedRecordsChange={setSelectedRecords}
                            minHeight={200}
                            paginationText={({ from, to, totalRecords }) =>
                                `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`
                            }
                    />
                </div>
            </div>
        </div>
    );
};

export default TaskListing;
