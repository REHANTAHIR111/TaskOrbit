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
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'first_scheduled', direction: 'desc' });
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
        setInitialRecords(sorted);
        setPage(1);
    }, [taskData, sortStatus]);

    const handleSearch = () => {
        var filterData = taskData.filter((item: any) => {
            return (
                item.task_name?.toString().toLowerCase().includes(search.toLowerCase()) ||
                item.name?.toString().toLowerCase().includes(search.toLowerCase()) ||
                item.name_ar?.toString().toLowerCase().includes(search.toLowerCase())
            );
        });
        setInitialRecords(filterData);
    };

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
        <div>
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h1>
                            All tasks
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                            Review your tasks, scheduled time, and upcoming work.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="listingTrashButton"
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
                <div className="datatables">
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
                                {
                                    accessor: 'id',
                                    title: t('id'),
                                    sortable: true,
                                    width: 70,
                                    render: ({ id }: any) => (
                                        <span className="text-xs font-semibold text-slate-400">
                                            #{id || '-'}
                                        </span>
                                    ),
                                },

                                {
                                    accessor: 'task_name',
                                    title: t('Task name'),
                                    sortable: false,
                                    width: 220,
                                    render: ({ task_name }: any) => (
                                        <div className="max-w-[220px] truncate">
                                            {task_name ? (
                                                <span className="text-sm font-semibold">
                                                    {task_name}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-500">—</span>
                                            )}
                                        </div>
                                    ),
                                },

                                {
                                    accessor: 'hour',
                                    title: t('Duration'),
                                    sortable: false,
                                    width: 100,
                                    render: ({ hour, total_allocated_minutes }: any) => (
                                        total_allocated_minutes != null || hour ? (
                                            <span className="
                                                inline-flex items-center
                                                rounded-md
                                                border border-slate-600
                                                bg-slate-800/70
                                                px-2.5 py-1
                                                text-xs font-medium
                                                text-slate-300
                                            ">
                                                {formatDuration(total_allocated_minutes != null ? total_allocated_minutes : Math.round(Number(hour) * 60))}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">—</span>
                                        )
                                    ),
                                },

                                {
                                    accessor: 'first_scheduled',
                                    title: 'First scheduled',
                                    sortable: true,
                                    render: ({ segments, start_date, start_time }: any) => {
                                        const first = [...(segments || [])].sort((a, b) => `${a.segment_date} ${a.start_time}`.localeCompare(`${b.segment_date} ${b.start_time}`))[0];
                                        return schedulePoint(first?.segment_date || start_date, first?.start_time || start_time);
                                    },
                                },

                                {
                                    accessor: 'last_scheduled',
                                    title: 'Last scheduled',
                                    sortable: false,
                                    render: ({ segments, end_date, end_time }: any) => {
                                        const ordered = [...(segments || [])].sort((a, b) => `${a.segment_date} ${a.start_time}`.localeCompare(`${b.segment_date} ${b.start_time}`));
                                        const last = ordered[ordered.length - 1];
                                        return schedulePoint(last?.segment_date || end_date, last?.end_time || end_time);
                                    },
                                },

                                {
                                    accessor: 'segments',
                                    title: 'Scheduled segments',
                                    sortable: false,
                                    width: 300,
                                    render: ({ segments }: any) => (
                                        <div className="space-y-1 whitespace-normal">
                                            {(segments || []).map((segment: any, index: number) => (
                                                <div key={segment.id || index} className="text-xs">
                                                    <span className="text-slate-400">{segment.segment_date}</span>{' '}
                                                    {formatTime(segment.start_time)}–{formatTime(segment.end_time)}{' '}
                                                    <span className="text-slate-500">({formatDuration(Number(segment.allocated_minutes))})</span>
                                                </div>
                                            ))}
                                            {(!segments || segments.length === 0) && <span className="text-slate-500">—</span>}
                                        </div>
                                    ),
                                },

                                {
                                    accessor: 'Priority',
                                    title: t('Priority'),
                                    sortable: false,
                                    width: 120,
                                    render: ({ priority }: any) => {

                                        if (!priority) {
                                            return <span className="text-slate-500">—</span>;
                                        }

                                        const priorityConfig: any = {
                                            urgent: {
                                                dot: 'bg-red-500',
                                                text: 'text-red-400',
                                            },
                                            high: {
                                                dot: 'bg-orange-400',
                                                text: 'text-orange-400',
                                            },
                                            medium: {
                                                dot: 'bg-yellow-400',
                                                text: 'text-yellow-400',
                                            },
                                            low: {
                                                dot: 'bg-blue-400',
                                                text: 'text-blue-400',
                                            },
                                        };

                                        const config =
                                            priorityConfig[priority?.toLowerCase()] ||
                                            priorityConfig.low;

                                        return (
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`w-2 h-2 rounded-full ${config.dot}`}
                                                />

                                                <span
                                                    className={`text-xs font-semibold capitalize ${config.text}`}
                                                >
                                                    {priority.toLowerCase()}
                                                </span>
                                            </div>
                                        );
                                    },
                                },

                                {
                                    accessor: 'status',
                                    title: t('status'),
                                    sortable: false,
                                    width: 110,
                                    render: ({ status }: any) => {

                                        if (status === undefined || status === null) {
                                            return <span className="text-slate-500">—</span>;
                                        }

                                        const enabled = status === 1;

                                        return (
                                            <span
                                                className={`
                                                    inline-flex items-center gap-1.5
                                                    text-xs font-semibold
                                                    ${enabled
                                                        ? 'text-emerald-400'
                                                        : 'text-slate-400'
                                                    }
                                                `}
                                            >
                                                <span
                                                    className={`
                                                        w-1.5 h-1.5 rounded-full
                                                        ${enabled
                                                            ? 'bg-emerald-400'
                                                            : 'bg-slate-500'
                                                        }
                                                    `}
                                                />

                                                {enabled
                                                    ? t('enabled')
                                                    : t('disabled')
                                                }
                                            </span>
                                        );
                                    },
                                },

                                {
                                    accessor: 'action',
                                    title: t('action'),
                                    sortable: false,
                                    width: 110,
                                    titleClassName: '!text-center',
                                    render: ({ id }: any) => {

                                        if (!id) {
                                            return <span className="text-slate-500">—</span>;
                                        }

                                        return (
                                            <div className="flex items-center justify-center gap-2">

                                                <Tippy content={t('edit')}>
                                                    <Link
                                                        to={`/tasks/edit/${id}`}
                                                        className="
                                                            actionButton
                                                        "
                                                    >
                                                        <IconPencil className="w-4 h-4" />
                                                    </Link>
                                                </Tippy>

                                                <Tippy content={t('delete')}>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteRow(id)}
                                                        className="
                                                            actionButton
                                                            hover:!border-red-400
                                                            hover:!bg-red-500/10
                                                            hover:!text-red-400
                                                        "
                                                    >
                                                        <IconTrashLines className="w-4.5 h-4.5" />
                                                    </button>
                                                </Tippy>

                                            </div>
                                        );
                                    },
                                },
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
        </div>
    );
};

export default TaskListing;
