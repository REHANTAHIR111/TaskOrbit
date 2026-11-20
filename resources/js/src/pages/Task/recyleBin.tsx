import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState, Fragment, useContext } from 'react';
import sortBy from 'lodash/sortBy';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPencil from '../../components/Icon/IconPencil';
import IconEye from '../../components/Icon/IconEye';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { Link } from 'react-router-dom';
import { List } from 'lodash';
import { useNavigate } from 'react-router-dom';
import IconPlus from '../../components/Icon/IconPlus';
import { get, post } from '../api/ApiCalls';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import IconRestore from '../../components/Icon/IconRestore';
import GlobalContext from '../../GlobalContext';

const RecycleBin = (props: any) => {
    const dispatch = useDispatch();
    const userId = localStorage.getItem('user_id');
    const { t } = useTranslation();
    const { verifyAuth } = useContext(GlobalContext);
    const rowData: any[] | null | undefined = [];
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(sortBy(rowData, 'id'));
    const [selectedRecords, setSelectedRecords] = useState<any>([]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'id', direction: 'asc' });
    const [loader, setLoader] = useState(false);
    const [taskData, setTaskData] = useState<any>([]);
    const [recordsData, setRecordsData] = useState(initialRecords);

    const getTask = () => {
        setLoader(true)
        get(`deleted-tasks/${userId}`).then((responseJson: any) => {
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
        dispatch(setPageTitle('Deleted Tasks'));
        getTask();
        verifyAuth();
    }, [props]);

    useEffect(() => {
        setInitialRecords(taskData);
    }, [taskData]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

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

    const restoreTask = (id: any = null) => {
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
                title: t('areYouSureRestore'),
                text: 'This will restore the task to your active list.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, restore it!',
                cancelButtonText: t('noCancel'),
                reverseButtons: true,
                padding: '2em',
            })
            .then((result: any) => {
                if (result.value) {
                    // Call API to restore single task
                    post(`task/restore/${id}`, {}).then((responseJson: any) => {
                        if (responseJson?.success === 'true') {
                            getTask(); // Refresh the list
                            swalWithBootstrapButtons.fire({
                                title: 'Restored!',
                                text: 'Task has been Restored Successfully',
                                icon: 'success',
                                confirmButtonText: t('ok'),
                            });
                        } else {
                            swalWithBootstrapButtons.fire({
                                title: 'Error!',
                                text: responseJson?.message || 'Failed to restore task',
                                icon: 'error',
                                confirmButtonText: t('ok'),
                            });
                        }
                    }).catch((error) => {
                        swalWithBootstrapButtons.fire({
                            title: 'Error!',
                            text: 'Something went wrong',
                            icon: 'error',
                            confirmButtonText: t('ok'),
                        });
                    });
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    swalWithBootstrapButtons.fire({
                        title: 'Cancelled',
                        text: 'Task was not restored',
                        icon: 'error',
                        confirmButtonText: t('ok'),
                    });
                }
            });
    };

    const restoreMultiple = async () => {
        if (selectedRecords.length === 0) {
            Swal.fire({
                title: 'No Selection',
                text: 'Please select tasks to restore',
                icon: 'warning',
                confirmButtonText: t('ok'),
            });
            return;
        }

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
                title: 'Are you sure you want to restore selected tasks?',
                text: 'This will restore all selected tasks to your active list.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, restore all!',
                cancelButtonText: t('noCancel'),
                reverseButtons: true,
                padding: '2em',
            })
            .then((result) => {
                if (result.value) {
                    const ids = selectedRecords.map((a: { id: any }) => a.id);
                    
                    post('task/restore-multiple', {
                        id: selectedRecords.map(function (a: { id: any }) {
                            return a.id;
                        }),
                    }).then((responseJson: any) => {
                        if (responseJson.success === 'true') {
                            getTask(); // Refresh the list
                            setSelectedRecords([]); // Clear selection
                            swalWithBootstrapButtons.fire({
                                title: 'Restored!',
                                text: 'Tasks have been Restored Successfully',
                                icon: 'success',
                                confirmButtonText: t('ok'),
                            });
                        } else {
                            swalWithBootstrapButtons.fire({
                                title: 'Error!',
                                text: responseJson?.message || 'Failed to restore tasks',
                                icon: 'error',
                                confirmButtonText: t('ok'),
                            });
                        }
                    });
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    swalWithBootstrapButtons.fire({
                        title: 'Cancelled',
                        text: 'Tasks were not restored',
                        icon: 'error',
                        confirmButtonText: t('ok'),
                    });
                }
            });
    };

    const deleteRow = (id: any = null) => {
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
            .then((result: any) => {
                if (result.value) {
                    get('task/' + id + '/force-delete').then((responseJson: any) => {
                        if (responseJson?.success === 'true') {
                            getTask();
                            swalWithBootstrapButtons.fire({
                                title: 'Deleted',
                                text: 'Task has been Deleted Permanantly',
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
                        post('task/force-multidelete', {
                            id: selectedRecords.map(function (a: { id: any }) {
                                return a.id;
                            }),
                        }).then((responseJson: any) => {
                            if (responseJson.success === 'true') {
                                getTask();
                                setSelectedRecords([]);
                                swalWithBootstrapButtons.fire({
                                    title: 'Deleted',
                                    text: 'Task has been Deleted Permanantly',
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
                <div className="mb-4.5 flex md:items-center md:flex-row flex-col gap-5">
                    <div className="flex items-center gap-2">
                        <Tippy content="Delete Permanantly">
                            <button type="button" className="listingTrashButton" disabled={selectedRecords?.length >= 1 ? false : true} onClick={() => showAlert(11)}>
                                <IconTrashLines className='w-4.5 h-4.5'/>
                            </button>
                        </Tippy>
                        <Tippy content="Restore Seleted">
                            <button 
                                type="button" 
                                className="btn btn-success !bg-green-600 !border-green-600 gap-2 w-fit" 
                                disabled={selectedRecords?.length >= 1 ? false : true} 
                                onClick={restoreMultiple}
                            >
                                <IconRestore className='w-4.5 h-4.5'/>
                            </button>
                        </Tippy>
                    </div>
                </div>
                <div className="datatables">
                    <DataTable
                        noRecordsText="No results match your search query"
                        highlightOnHover
                        className="whitespace-nowrap table-hover"
                        records={initialRecords}
                        fetching={loader}
                        customLoader={<span className="animate-spin border-4 border-transparent border-l-primary rounded-full w-10 h-10 inline-block align-middle mb-10"></span>}
                        loaderBackgroundBlur={0}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('id'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                width: 80,
                                render: ({ id }: any) => (
                                    <strong className="text-[#a6d8ff]">
                                        {id || <span className="text-gray-400">- - -</span>}
                                    </strong>
                                ),
                            },
                            {
                                accessor: 'Task name',
                                title: t('Task name'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ task_name }: any) => (
                                    <div className="font-semibold">
                                        {task_name || <span className="text-gray-400 font-normal">- - -</span>}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'Hour',
                                title: t('Hour'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ hour }: any) => {
                                    if (hour) {
                                        return (
                                            <div className="font-semibold bg-green-200 border border-green-300 text-green-900 rounded-full px-3 py-1.5 w-[fit-content]">
                                                {hour + 'h'}
                                            </div>
                                        );
                                    }
                                    return <span className="text-gray-400">- - -</span>;
                                },
                            },
                            {
                                accessor: 'Start date',
                                title: t('Start date'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ start_date }: any) => (
                                    <div className="font-semibold">
                                        {start_date || <span className="text-gray-400 font-normal">- - -</span>}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'End date',
                                title: t('End date'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ end_date }: any) => (
                                    <div className="font-semibold">
                                        {end_date || <span className="text-gray-400 font-normal">- - -</span>}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'Start Time',
                                title: t('Start Time'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ start_time }: any) => (
                                    <div className="font-semibold">
                                        {start_time || <span className="text-gray-400 font-normal">- - -</span>}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'End time',
                                title: t('End time'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ end_time }: any) => (
                                    <div className="font-semibold">
                                        {end_time || <span className="text-gray-400 font-normal">- - -</span>}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'Priority',
                                title: t('Priority'),
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ priority }: any) => {
                                    if (!priority) {
                                        return <span className="text-gray-400">- - -</span>;
                                    }
                                    
                                    const accentColors: any = {
                                        high: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
                                        medium: 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
                                        low: 'border-l-4 border-l-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
                                        urgent: 'border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300'
                                    };
                                    
                                    const color = accentColors[priority?.toLowerCase()] || accentColors.low;
                                    
                                    return (
                                        <div className={`${color} px-3 py-1.5 rounded-r-full text-xs font-bold w-[fit-content]`}>
                                            {priority.toUpperCase()}
                                        </div>
                                    );
                                },
                            },
                            {
                                accessor: 'status',
                                title: t('status'),
                                titleClassName: 'uppercase',
                                render: ({ status }: any) => {
                                    if (status === undefined || status === null) {
                                        return <span className="text-gray-400">- - -</span>;
                                    }
                                    
                                    return (
                                        <div className={`font-semibold rounded-full px-3 py-1.5 w-[fit-content] ${status === 1 ? 'text-success bg-green-200 border border-green-300' : 'text-red-600 bg-red-100 border border-red-300'}`}>
                                            {status === 1 ? t('enabled') : t('disabled')}
                                        </div>
                                    );
                                }
                            },
                            {
                                accessor: 'action',
                                title: t('action'),
                                titleClassName: 'uppercase !text-center',
                                render: ({ id }: any) => {
                                    if (!id) {
                                        return <span className="text-gray-400">- - -</span>;
                                    }
                                    
                                    return (
                                        <div className="flex items-center w-max mx-auto gap-2">
                                            <Tippy content="Restore">
                                                <button type="button" onClick={() => restoreTask(id)}>
                                                    <IconRestore />
                                                </button>
                                            </Tippy>
                                            <Tippy content="Delete">
                                                <button type="button" onClick={() => deleteRow(id)}>
                                                    <IconTrashLines />
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
                        paginationText={({ from, to, totalRecords }) => `${t('showing')}  ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default RecycleBin;
