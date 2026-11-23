import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState, useContext } from 'react';
import sortBy from 'lodash/sortBy';
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
    const [initialRecords, setInitialRecords] = useState(sortBy(rowData, 'id'));
    const [selectedRecords, setSelectedRecords] = useState<any>([]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'id', direction: 'asc' });
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

    useEffect(() => {
        setInitialRecords(taskData);
    }, [taskData]);

    const handleSearch = () => {
        var filterData = taskData.filter((item: any) => {
            return (
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

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData([...initialRecords?.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        setPage(1);
    }, [sortStatus]);

    const deleteRow = async (id: any = null) => {
        const result = await Swal.fire({
            title: 'Delete this task?',
            text: 'Would you also like to move the following tasks earlier and automatically reschedule them?',
            icon: 'warning',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Yes, move following tasks',
            denyButtonText: 'No, delete only this task',
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
            await Swal.fire({
                title: 'Deleted',
                text: responseJson.message || 'Task has been deleted successfully.',
                icon: 'success',
                confirmButtonText: t('ok'),
            });
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
            const swalWithBootstrapButtons = Swal.mixin({
                customClass: {
                    confirmButton: 'btn btn-secondary',
                    cancelButton: 'btn btn-dark ltr:mr-3 rtl:ml-3',
                    popup: 'sweet-alerts',
                },
                buttonsStyling: false,
            });
            swalWithBootstrapButtons
                .fire({
                    title: t('areyouSure'),
                    text: t('youWontBeAbleToRevertThis'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: t('yesDeleteIt'),
                    cancelButtonText: t('noCancel'),
                    reverseButtons: true,
                    padding: '2em',
                })
                .then((result) => {
                    if (result.value) {
                        post('task/multidelete', {
                            id: selectedRecords.map(function (a: { id: any }) {
                                return a.id;
                            }),
                        }).then((responseJson: any) => {
                            if (responseJson.success === 'true') {
                                getTask();
                                setSelectedRecords([]);
                                swalWithBootstrapButtons.fire({
                                    title: 'Deleted',
                                    text: 'Task has been Deleted',
                                    icon: 'success',
                                    confirmButtonText: t('ok'),
                                });
                            }
                        });
                    } else if (result.dismiss === Swal.DismissReason.cancel) {
                        swalWithBootstrapButtons.fire({
                            title: 'Cancelled',
                            text: 'Task is Safe :)',
                            icon: 'error',
                            confirmButtonText: t('ok'),
                        });
                    }
                });
        }
    };


    return (
        <div>
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {t('Task Listing')}
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                            Create and manage your available slots
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
                                                <span className="text-sm font-semibold text-slate-200">
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
                                    title: t('Hour'),
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
                                    accessor: 'Start date',
                                    title: t('Start date'),
                                    sortable: false,
                                    render: ({ start_date }: any) => (
                                        <span className="text-sm text-slate-300">
                                            {start_date || '—'}
                                        </span>
                                    ),
                                },

                                {
                                    accessor: 'End date',
                                    title: t('End date'),
                                    sortable: false,
                                    render: ({ end_date }: any) => (
                                        <span className="text-sm text-slate-300">
                                            {end_date || '—'}
                                        </span>
                                    ),
                                },

                                {
                                    accessor: 'Start Time',
                                    title: t('Start Time'),
                                    sortable: false,
                                    render: ({ start_time }: any) => (
                                        <span className="text-sm text-slate-300">
                                            {formatTime(start_time) || '—'}
                                        </span>
                                    ),
                                },

                                {
                                    accessor: 'End time',
                                    title: t('End time'),
                                    sortable: false,
                                    render: ({ end_time }: any) => (
                                        <span className="text-sm text-slate-300">
                                            {formatTime(end_time) || '—'}
                                        </span>
                                    ),
                                },

                                {
                                    accessor: 'segments',
                                    title: 'Scheduled segments',
                                    sortable: false,
                                    width: 300,
                                    render: ({ segments }: any) => (
                                        <div className="space-y-1 whitespace-normal">
                                            {(segments || []).map((segment: any, index: number) => (
                                                <div key={segment.id || index} className="text-xs text-slate-300">
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
