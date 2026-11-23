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

    const formatTime = (time: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = Number(hours);
        return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
    };
    const formatDuration = (minutes: number) => {
        const hours = Math.floor((minutes || 0) / 60);
        const remainder = (minutes || 0) % 60;
        return `${hours ? `${hours}h` : ''}${remainder ? ` ${remainder}m` : ''}`.trim() || '0m';
    };
    const schedulePoint = (date: string, time: string) => (
        <div className="font-semibold">
            <div>{date || '—'}</div>
            <div className="text-xs text-gray-400">{formatTime(time) || '—'}</div>
        </div>
    );

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

    const restoreTask = async (id: any = null) => {
        const preview: any = await post(`task/${id}/restore-preview`, {});
        if (!preview?.success) {
            await Swal.fire({ title: 'Restore unavailable', text: preview?.message || 'Could not preview this task.', icon: 'error', confirmButtonText: t('ok') });
            return;
        }
        const escapeHtml = (value: any) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
        }[character] as string));
        const describe = (segments: any[]) => (segments || []).length
            ? `<ul class="list-disc pl-5 text-left">${segments.map((segment) => `<li>${escapeHtml(segment.segment_date)} ${escapeHtml(formatTime(segment.start_time))}–${escapeHtml(formatTime(segment.end_time))} (${escapeHtml(formatDuration(Number(segment.allocated_minutes)))})</li>`).join('')}</ul>`
            : '<p>No saved segments</p>';
        const describeMovedTasks = (tasks: any[]) => (tasks || []).length
            ? `<div class="mt-2 space-y-3">${tasks.map((task) => `<div><strong>Task #${escapeHtml(task.id)}${task.task_name ? ` — ${escapeHtml(task.task_name)}` : ''}</strong> (${escapeHtml(formatDuration(Number(task.total_allocated_minutes)))})${describe(task.segments)}</div>`).join('')}</div>`
            : '<p>No other tasks need to move.</p>';
        const taskLabel = `${preview.task?.task_name || 'Task'} (#${preview.task?.id || id})`;
        const blockerId = String(preview.original_conflict || '').match(/Task\s+#?(\d+)/i)?.[1];
        const originalConflictSummary = blockerId ? `Saved time is occupied by task #${blockerId}.` : 'The saved time is no longer available.';
        const reflowTaskId = String(preview.original_reflow_message || '').match(/\(#(\d+)\)/)?.[1];
        const originalPlan = preview.can_restore_original
            ? `<h4>Original schedule is available</h4>${describe(preview.original_segments)}`
            : `<div class="rounded border border-warning p-3 text-left"><strong>Original time is occupied.</strong><p>${escapeHtml(originalConflictSummary)}</p></div>`;
        const reschedulePlan = preview.rescheduled_segments
            ? `<h4>Option: Restore at the next available times (${escapeHtml(formatDuration(preview.duration_minutes))} total)</h4><p>This moves this task only. Other task schedules stay unchanged.</p>${describe(preview.rescheduled_segments)}`
            : `<div class="rounded border border-warning p-3 text-left"><strong>No time fits by ${escapeHtml(preview.task?.end_date || 'the current end date')}.</strong>${preview.extended_rescheduled_segments ? `<p>To restore this task, extend its end date to ${escapeHtml(preview.extended_end_date)}:</p>${describe(preview.extended_rescheduled_segments)}` : `<p>${escapeHtml(preview.reschedule_message || 'No available working time fits the current date range.')}</p>`}</div>`;
        const moveTasksPlan = preview.can_restore_original_by_moving_tasks
            ? `<h4>Option: Keep this task at its original times</h4><p>To avoid overlap, these active tasks will move to the proposed available times:</p>${describeMovedTasks(preview.original_reflow_tasks)}`
            : `<div class="rounded border border-secondary p-3 text-left"><strong>Other tasks cannot move safely.</strong><p>${escapeHtml(reflowTaskId ? `Moving task #${reflowTaskId} would miss its deadline.` : 'The affected tasks cannot fit within their allowed dates.')}</p></div>`;
        const confirmOriginal = Boolean(preview.can_restore_original || preview.can_restore_original_by_moving_tasks);
        const canConfirm = confirmOriginal || Boolean(preview.extended_rescheduled_segments);
        const choice = await Swal.fire({
            title: preview.can_restore_original ? 'Restore task to its saved times?' : 'Choose how to restore this task',
            html: `<div class="space-y-3"><p><strong>${escapeHtml(taskLabel)}</strong> — ${escapeHtml(formatDuration(Number(preview.duration_minutes)))} total.</p>${originalPlan}${!preview.can_restore_original ? moveTasksPlan : ''}${reschedulePlan}<p class="text-sm">Nothing changes unless you choose a restore option. Cancel leaves this task in the recycle bin.</p></div>`,
            icon: preview.can_restore_original ? 'question' : 'warning',
            showConfirmButton: canConfirm,
            confirmButtonText: preview.can_restore_original ? 'Restore to Original Times' : (preview.can_restore_original_by_moving_tasks ? 'Keep Original Time & Move Tasks' : 'Extend Date & Restore'),
            showDenyButton: Boolean(preview.rescheduled_segments || (confirmOriginal && preview.extended_rescheduled_segments)),
            denyButtonText: preview.rescheduled_segments ? 'Restore at Next Available Times' : 'Extend Date & Restore',
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            customClass: { confirmButton: 'btn btn-secondary', denyButton: 'btn btn-primary', cancelButton: 'btn btn-dark', popup: 'sweet-alerts' },
            buttonsStyling: false,
        });
        if (!choice.isConfirmed && !choice.isDenied) return;
        const mode = choice.isConfirmed
            ? (preview.can_restore_original ? 'original' : (preview.can_restore_original_by_moving_tasks ? 'original_reflow' : 'reschedule_extend'))
            : (preview.rescheduled_segments ? 'reschedule' : 'reschedule_extend');
        const segments = mode === 'reschedule'
            ? preview.rescheduled_segments
            : (mode === 'reschedule_extend' ? preview.extended_rescheduled_segments : undefined);
        const responseJson: any = await post(`task/restore/${id}`, { mode, segments });
        if (responseJson?.success === true || responseJson?.success === 'true') {
            await getTask();
            await Swal.fire({ title: 'Restored', text: responseJson.message, icon: 'success', confirmButtonText: t('ok') });
        } else {
            await Swal.fire({ title: 'Restore not completed', text: responseJson?.message || 'The task remains in the recycle bin.', icon: 'error', confirmButtonText: t('ok') });
        }
    };

    const restoreMultiple = async () => {
        if (selectedRecords.length === 0) {
            await Swal.fire({ title: 'Select tasks', text: 'Choose at least one task to restore.', icon: 'info', confirmButtonText: t('ok') });
            return;
        }

        const escapeHtml = (value: any) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
        }[character] as string));
        const describe = (segments: any[]) => (segments || []).length
            ? `<ul class="list-disc pl-5 text-left">${segments.map((segment) => `<li>${escapeHtml(segment.segment_date)} ${escapeHtml(formatTime(segment.start_time))}–${escapeHtml(formatTime(segment.end_time))} (${escapeHtml(formatDuration(Number(segment.allocated_minutes)))})</li>`).join('')}</ul>`
            : '<p>No saved schedule</p>';
        const shortReason = (message: string, fallback: string, deadline?: string, durationMinutes?: number) => {
            if (!message) return fallback;
            if (message.startsWith('An active task already occupies')) {
                const taskMatch = message.match(/Task\s+#?(\d+)/i);
                return taskMatch ? `Saved time is occupied by task #${taskMatch[1]}.` : 'Saved time is now occupied by another task.';
            }
            if (message.includes('end-date limit')) {
                const duration = durationMinutes ? formatDuration(Number(durationMinutes)) : 'This task';
                return `No ${duration} slot fits by ${deadline || 'this task’s deadline'}.`;
            }
            if (message.includes('cannot fit its full') || message.includes('cannot be safely reallocated')) {
                const taskMatch = message.match(/\(#(\d+)\)/);
                return taskMatch ? `Moving task #${taskMatch[1]} would miss its deadline.` : 'Moving other tasks would exceed a task deadline.';
            }
            if (message.includes('holiday') || message.includes('non-working')) return 'Saved time is no longer a working period.';
            return fallback;
        };
        const previews: Array<{ task: any; preview: any }> = [];
        for (const task of selectedRecords) {
            const preview: any = await post(`task/${task.id}/restore-preview`, {});
            if (!preview?.success) {
                await Swal.fire({ title: 'Restore unavailable', text: preview?.message || `Could not preview task #${task.id}.`, icon: 'error', confirmButtonText: t('ok') });
                return;
            }
            previews.push({ task, preview });
        }

        const canRestore = (preview: any) => Boolean(preview.can_restore_original || preview.can_restore_original_by_moving_tasks || preview.rescheduled_segments || preview.extended_rescheduled_segments);
        const eligibleCount = previews.filter(({ preview }) => canRestore(preview)).length;
        const cards = previews.map(({ task, preview }) => {
            const taskId = String(task.id);
            const label = `Task #${escapeHtml(task.id)} — ${escapeHtml(task.task_name || 'Untitled')}`;
            const duration = escapeHtml(formatDuration(Number(preview.duration_minutes)));
            const options = [
                preview.can_restore_original ? `<option value="original">Restore to saved times</option>` : '',
                preview.can_restore_original_by_moving_tasks ? `<option value="original_reflow">Restore to saved times and move affected tasks</option>` : '',
                preview.rescheduled_segments ? `<option value="reschedule">Restore at next available times</option>` : '',
                preview.extended_rescheduled_segments ? `<option value="reschedule_extend">Extend end date to ${escapeHtml(preview.extended_end_date)} and restore</option>` : '',
            ].filter(Boolean).join('');
            const problems = [
                !preview.can_restore_original ? shortReason(preview.original_conflict, 'Saved times are unavailable.') : '',
                !preview.can_restore_original_by_moving_tasks && !preview.can_restore_original ? shortReason(preview.original_reflow_message, 'Other tasks cannot be moved safely.') : '',
                !preview.rescheduled_segments && !preview.extended_rescheduled_segments ? shortReason(preview.reschedule_message, 'No available time fits this task.', preview.task?.end_date, preview.duration_minutes) : '',
            ].filter(Boolean);
            return `<section class="mb-4 rounded border p-3 text-left"><div class="font-semibold">${label} <span class="font-normal">· ${duration}</span></div>${options
                ? `<label class="mt-3 block text-sm">Restore option<select id="restore-mode-${taskId}" class="form-select mt-1">${options}</select></label><details class="mt-2"><summary class="cursor-pointer text-sm">Preview schedule</summary>${preview.can_restore_original ? `<div><strong>Saved</strong>${describe(preview.original_segments)}</div>` : ''}${preview.can_restore_original_by_moving_tasks ? `<div><strong>Other tasks will move</strong>${(preview.original_reflow_tasks || []).map((affected: any) => `<p>Task #${escapeHtml(affected.id)} · ${escapeHtml(formatDuration(Number(affected.total_allocated_minutes)))}</p>${describe(affected.segments)}`).join('')}</div>` : ''}${preview.rescheduled_segments ? `<div><strong>Next available</strong>${describe(preview.rescheduled_segments)}</div>` : ''}${preview.extended_rescheduled_segments ? `<div><strong>With end date extended to ${escapeHtml(preview.extended_end_date)}</strong>${describe(preview.extended_rescheduled_segments)}</div>` : ''}</details>${problems.length ? `<p class="mt-2 text-sm text-warning">${problems.map(escapeHtml).join(' ')}</p>` : ''}`
                : `<ul class="mt-2 list-disc pl-5 text-sm text-danger">${problems.map((problem) => `<li>${escapeHtml(problem)}</li>`).join('')}</ul><p class="mt-2 text-sm">No changes made. This task stays in the recycle bin. Free time or adjust its allowed date range, then try again.</p>`}</section>`;
        }).join('');
        const restoreChoices: Record<string, 'original' | 'original_reflow' | 'reschedule' | 'reschedule_extend'> = {};

        const swalWithBootstrapButtons = Swal.mixin({
            customClass: {
                confirmButton: 'btn btn-secondary',
                cancelButton: 'btn btn-dark ltr:mr-3 rtl:ml-3',
                popup: 'sweet-alerts',
            },
            buttonsStyling: false,
        });
        
        const review = await swalWithBootstrapButtons.fire({
            title: 'Review restore plan',
            html: `<p class="mb-3 text-sm">Choose a restore option for each task. Tasks are restored separately; blocked tasks stay in the recycle bin.</p>${cards}`,
            icon: eligibleCount ? 'question' : 'warning',
            showConfirmButton: eligibleCount > 0,
            confirmButtonText: `Restore ${eligibleCount} available task${eligibleCount === 1 ? '' : 's'}`,
            showCancelButton: true,
            cancelButtonText: eligibleCount ? 'Cancel' : 'Close',
            reverseButtons: true,
            padding: '1.5em',
            preConfirm: () => {
                previews.forEach(({ task }) => {
                    const select = document.getElementById(`restore-mode-${task.id}`) as HTMLSelectElement | null;
                    if (select) restoreChoices[String(task.id)] = select.value as 'original' | 'original_reflow' | 'reschedule' | 'reschedule_extend';
                });
                if (!Object.keys(restoreChoices).length) {
                    Swal.showValidationMessage('No selected task has a safe restore option yet.');
                    return false;
                }
                return true;
            },
        });
        if (!review.isConfirmed) return;

        const restoreQueue = previews
            .filter(({ task }) => Boolean(restoreChoices[String(task.id)]))
            .sort((left, right) => {
                const leftSegment = left.preview.original_segments?.[0];
                const rightSegment = right.preview.original_segments?.[0];
                const leftAnchor = `${leftSegment?.segment_date || left.task.start_date || ''} ${leftSegment?.start_time || left.task.start_time || ''}`;
                const rightAnchor = `${rightSegment?.segment_date || right.task.start_date || ''} ${rightSegment?.start_time || right.task.start_time || ''}`;
                return leftAnchor.localeCompare(rightAnchor) || Number(left.task.id) - Number(right.task.id);
            });
        const restored: Array<{ id: number; mode: string; end_date?: string }> = [];
        const failed: Array<{ id: number; message: string }> = [];
        for (const { task } of restoreQueue) {
            const mode = restoreChoices[String(task.id)];
            try {
                const freshPreview: any = await post(`task/${task.id}/restore-preview`, {});
                if (!freshPreview?.success) {
                    failed.push({ id: Number(task.id), message: 'Could not refresh the schedule preview. Try again.' });
                    continue;
                }
                const segments = mode === 'reschedule'
                    ? freshPreview.rescheduled_segments
                    : (mode === 'reschedule_extend' ? freshPreview.extended_rescheduled_segments : undefined);
                if ((mode === 'reschedule' || mode === 'reschedule_extend') && !segments) {
                    failed.push({ id: Number(task.id), message: 'No matching free-time plan is available now. Review the plan and try again.' });
                    continue;
                }
                const responseJson: any = await post(`task/restore/${task.id}`, { mode, segments });
                if (responseJson?.success === true || responseJson?.success === 'true') {
                    restored.push({ id: Number(task.id), mode, end_date: responseJson.end_date });
                    continue;
                }
                const rawMessage = String(responseJson?.message || 'Restore could not be completed.');
                const message = rawMessage.includes('end-date limit') || /cannot fit its full .*duration.* by /i.test(rawMessage)
                    ? 'No room before its end date. Choose “Extend Date & Restore”.'
                    : rawMessage.includes('cannot fit within available working time')
                        ? 'No working time was available in the extended range. The task remains in the recycle bin.'
                    : rawMessage.includes('active task already occupies')
                        ? 'Its saved time became occupied. Review the plan and try again.'
                        : 'The schedule changed before restore. Review the plan and try again.';
                failed.push({ id: Number(task.id), message });
            } catch {
                failed.push({ id: Number(task.id), message: 'Restore request failed. The task remains in the recycle bin.' });
            }
        }

        await getTask();
        setSelectedRecords([]);
        const extended = restored.filter((task) => task.mode === 'reschedule_extend' && task.end_date);
        const summary = [
            restored.length ? `${restored.length} restored.` : '',
            extended.length ? `End date extended for ${extended.map((task) => `#${task.id} to ${task.end_date}`).join(', ')}.` : '',
            failed.length ? `${failed.length} remain in the recycle bin: ${failed.map((task) => `#${task.id}: ${task.message}`).join(' ')}` : '',
            previews.filter(({ preview }) => !canRestore(preview)).length
                ? `${previews.filter(({ preview }) => !canRestore(preview)).map(({ task }) => `#${task.id}`).join(', ')} had no safe option and remain in the recycle bin.`
                : '',
        ].filter(Boolean).join(' ');
        await swalWithBootstrapButtons.fire({
            title: failed.length || restored.length < previews.length ? 'Restore finished with some tasks left' : 'Restore complete',
            text: summary || 'No tasks were restored. They remain in the recycle bin.',
            icon: failed.length || restored.length < previews.length ? 'warning' : 'success',
            confirmButtonText: t('ok'),
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
                title: `Permanently delete task #${id}?`,
                text: 'This permanently removes the task and all of its scheduled segments. This action cannot be undone.',
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
                        if (responseJson?.success === 'true' || responseJson?.success === true) {
                            getTask();
                            swalWithBootstrapButtons.fire({
                                title: 'Deleted',
                                text: 'Task has been Deleted Permanantly',
                                icon: 'success',
                                confirmButtonText: t('ok'),
                            });
                        } else {
                            swalWithBootstrapButtons.fire({
                                title: 'Permanent deletion failed',
                                text: responseJson?.message || 'The task and its segments were not deleted.',
                                icon: 'error',
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
                title: `Permanently delete ${selectedRecords.length} selected task${selectedRecords.length === 1 ? '' : 's'}?`,
                text: 'This permanently removes each selected task and its scheduled segments. This action cannot be undone.',
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
                            if (responseJson.success === 'true' || responseJson.success === true) {
                                getTask();
                                setSelectedRecords([]);
                                swalWithBootstrapButtons.fire({
                                    title: 'Deleted',
                                    text: 'Task has been Deleted Permanantly',
                                    icon: 'success',
                                    confirmButtonText: t('ok'),
                                });
                            } else {
                                swalWithBootstrapButtons.fire({
                                    title: 'Permanent deletion rolled back',
                                    text: responseJson?.message || 'No selected tasks were changed.',
                                    icon: 'error',
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
                        <button type="button" className="btn btn-outline-primary gap-2" onClick={() => setSelectedRecords(initialRecords)}>
                            Select all
                        </button>
                        <button type="button" className="btn btn-outline-secondary gap-2" onClick={() => setSelectedRecords([])} disabled={!selectedRecords.length}>
                            Clear selection
                        </button>
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
                                render: ({ hour, total_allocated_minutes }: any) => {
                                    if (total_allocated_minutes != null || hour) {
                                        return (
                                            <div className="font-semibold bg-green-200 border border-green-300 text-green-900 rounded-full px-3 py-1.5 w-[fit-content]">
                                                {formatDuration(total_allocated_minutes != null ? Number(total_allocated_minutes) : Math.round(Number(hour) * 60))}
                                            </div>
                                        );
                                    }
                                    return <span className="text-gray-400">- - -</span>;
                                },
                            },
                            {
                                accessor: 'segments',
                                title: 'Scheduled segments',
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ segments }: any) => (
                                    <div className="space-y-1 whitespace-normal">
                                        {(segments || []).map((segment: any, index: number) => (
                                            <div key={segment.id || index} className="text-xs">
                                                {segment.segment_date} {formatTime(segment.start_time)}–{formatTime(segment.end_time)} ({formatDuration(Number(segment.allocated_minutes))})
                                            </div>
                                        ))}
                                        {(!segments || segments.length === 0) && <span className="text-gray-400">- - -</span>}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'deleted_at',
                                title: 'Deleted on',
                                titleClassName: 'uppercase',
                                sortable: true,
                                render: ({ deleted_at }: any) => (
                                    <span className="text-sm">{deleted_at ? new Date(deleted_at).toLocaleString() : '—'}</span>
                                ),
                            },
                            {
                                accessor: 'first_scheduled',
                                title: 'First scheduled',
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ segments, start_date, start_time }: any) => {
                                    const ordered = [...(segments || [])].sort((a, b) => `${a.segment_date} ${a.start_time}`.localeCompare(`${b.segment_date} ${b.start_time}`));
                                    return schedulePoint(ordered[0]?.segment_date || start_date, ordered[0]?.start_time || start_time);
                                },
                            },
                            {
                                accessor: 'last_scheduled',
                                title: 'Last scheduled',
                                titleClassName: 'uppercase',
                                sortable: false,
                                render: ({ segments, end_date, end_time }: any) => {
                                    const ordered = [...(segments || [])].sort((a, b) => `${a.segment_date} ${a.start_time}`.localeCompare(`${b.segment_date} ${b.start_time}`));
                                    const last = ordered[ordered.length - 1];
                                    return schedulePoint(last?.segment_date || end_date, last?.end_time || end_time);
                                },
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
