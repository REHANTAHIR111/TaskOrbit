import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconX from '../../components/Icon/IconX';
import IconSave from '../../components/Icon/IconSave';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { get, post } from '../api/ApiCalls';
import CreatableSelect from 'react-select/creatable';
import Alerts from '../../components/Alerts';
import Swal from 'sweetalert2';

const EditTask = (props: any) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { coloredToast } = Alerts();
    const { id } = useParams();

    const [name, setName] = useState<any>('');
    const [description, setDescription] = useState<any>('');
    const [hours, setHours] = useState<any>('');
    const [startDate, setStartDate] = useState<any>('');
    const [endDate, setEndDate] = useState<any>('');
    const [startTime, setStartTime] = useState<any>('');
    const [endTime, setEndTime] = useState<any>('');
    const [priority, setPriority] = useState<any>(null); // Changed to null for single select
    const [status, setStatus] = useState<any>(false);
    const [segments, setSegments] = useState<any[]>([]);
    const [originalSchedule, setOriginalSchedule] = useState<any>({ start_date: '', end_date: '', start_time: '', end_time: '' });
    const [autoSchedule, setAutoSchedule] = useState(false);
    const [reflowMode, setReflowMode] = useState<'keep' | 'backfill' | 'forward' | 'manual' | 'mixed'>('keep');
    const [originalHours, setOriginalHours] = useState('');
    const [priorityOptions, setPriorityOptions] = useState<any>([
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
    ]);

    const [error, setError] = useState<any>('');
    const [errorarabic, setErrorArabic] = useState<any>('');
    const [errormin, setErrorMin] = useState<any>('');
    const escapeHtml = (value: any) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[character] as string));
    const durationChanged = Number(hours) !== Number(originalHours);
    const scheduleChanged = durationChanged || startDate !== originalSchedule.start_date || endDate !== originalSchedule.end_date || startTime !== originalSchedule.start_time || endTime !== originalSchedule.end_time;
    const willAutoSchedule = autoSchedule || durationChanged;
    const needsSchedulePreview = autoSchedule || scheduleChanged;

    useEffect(() => {
        dispatch(setPageTitle('Edit Task'));
        getData()
    }, [props, id]);

    // Handle creating new priority
    const handleCreatePriority = (inputValue: string) => {
        const newPriority = { 
            value: inputValue.toLowerCase().replace(/\s+/g, '_'), 
            label: inputValue 
        };
        setPriorityOptions([...priorityOptions, newPriority]);
        setPriority(newPriority); // Auto-select the newly created priority
        return newPriority;
    };

    const getData = () => {
        get(`task/${id}/edit`).then((responseJson: any) => {
            var edit = responseJson.editdata

            setName(edit?.task_name)
            setDescription(edit?.description)
            setStatus(edit?.status == 1 ? true : false)
            setStartDate(edit?.start_date)
            setEndDate(edit?.end_date)
            const loadedStartTime = edit?.start_time ? String(edit.start_time).slice(0, 5) : '';
            const loadedEndTime = edit?.end_time ? String(edit.end_time).slice(0, 5) : '';
            setStartTime(loadedStartTime)
            setEndTime(loadedEndTime)
            setOriginalSchedule({ start_date: edit?.start_date || '', end_date: edit?.end_date || '', start_time: loadedStartTime, end_time: loadedEndTime })
            setSegments(responseJson?.segments || edit?.segments || []);
            setAutoSchedule(false);
            const allocatedMinutes = Number(responseJson?.total_allocated_minutes || 0);
            const loadedHours = allocatedMinutes ? String(allocatedMinutes / 60) : String(edit?.hour || '');
            setHours(loadedHours)
            setOriginalHours(loadedHours)

            if (edit?.priority) {
            const existingPriority = priorityOptions.find(
                (opt: any) => opt.value == edit.priority
            );
            if (existingPriority) {
                setPriority(existingPriority);
            } else {
                const newPriority = { 
                    value: edit.priority, 
                    label: edit.priority.charAt(0).toUpperCase() + edit.priority.slice(1) 
                };
                setPriorityOptions([...priorityOptions, newPriority]);
                setPriority(newPriority);
            }
        }
        })
    }

    async function updateData(selectedReflowMode: 'keep' | 'backfill' | 'forward' | 'manual' | 'mixed' = reflowMode) {
        const shouldReschedule = willAutoSchedule;
        if (!name || !Number(hours) || Number(hours) <= 0) {
            coloredToast('danger', 'Enter a task name and a duration greater than zero.');
            return;
        }

        const minutes = Math.round(Number(hours) * 60);
        const normalizedStartTime = String(startTime || '').slice(0, 5);
        const normalizedEndTime = String(endTime || '').slice(0, 5);
        let preview = needsSchedulePreview ? await post(`task/${id}/schedule-preview`, {
            start_date: startDate,
            end_date: endDate,
            start_time: normalizedStartTime,
            end_time: normalizedEndTime,
            hour: hours,
            auto_schedule: shouldReschedule,
            reflow_mode: selectedReflowMode,
        }) : null;
        if (needsSchedulePreview && (!preview?.success || !preview?.segments?.length)) {
            if (preview?.conflicts?.length && selectedReflowMode === 'keep') {
                const blockers = preview.conflicts.slice(0, 6).map((conflict: any) =>
                    `<li><strong>Task #${conflict.id} ${escapeHtml(conflict.task_name)}</strong> — ${escapeHtml(conflict.segment_date)}, ${escapeHtml(String(conflict.start_time).slice(0, 5))}–${escapeHtml(String(conflict.end_time).slice(0, 5))}</li>`
                ).join('');
                const choice = await Swal.fire({
                    title: 'Other tasks use this time',
                    html: `<p>This task needs ${Number(preview.required_minutes || minutes)} minutes; ${Number(preview.available_minutes || 0)} minutes are currently free in the selected working periods.</p><ul class="list-disc pl-5 text-left">${blockers}</ul><p class="mt-2">Choose how to make room, or cancel and adjust the dates.</p>`,
                    icon: 'warning',
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: 'Move later tasks forward',
                    denyButtonText: 'Move later tasks earlier',
                    cancelButtonText: 'Cancel',
                });
                if (choice.isConfirmed) return updateData('forward');
                if (choice.isDenied) return updateData('backfill');
                return;
            }
            await Swal.fire({
                title: 'No schedule available',
                text: preview?.message || 'This duration cannot fit in the selected dates. No changes were made.',
                icon: 'warning',
                confirmButtonText: 'OK',
            });
            return;
        }

        let confirmedMode = selectedReflowMode;
        let confirmedTaskIds: number[] | undefined;
        let confirmedTaskModes: any[] | undefined;
        let confirmedTaskSchedules: any[] | undefined;
        let confirmedTaskDeadlines: any[] | undefined;
        if (preview?.automatic_fallback || preview?.fallback_manual_required) {
            confirmedMode = 'mixed';
            if (preview.automatic_fallback) {
                confirmedTaskIds = (preview.suggested_task_ids || []).map(Number);
                confirmedTaskModes = preview.suggested_task_modes || [];
            }
        }
        if (needsSchedulePreview && durationChanged && Number(hours) < Number(originalHours) && selectedReflowMode === 'keep') {
            const backfillPreview = await post(`task/${id}/schedule-preview`, {
                start_date: startDate,
                end_date: endDate,
                start_time: normalizedStartTime,
                end_time: normalizedEndTime,
                hour: hours,
                auto_schedule: shouldReschedule,
                reflow_mode: 'backfill',
            });
            if (backfillPreview?.success && backfillPreview.affected_tasks?.length) {
                const firstAffected = backfillPreview.affected_tasks[0];
                const before = (firstAffected.previous_segments || []).map((segment: any) => `${segment.segment_date} ${String(segment.start_time).slice(0, 5)}–${String(segment.end_time).slice(0, 5)}`).join(', ');
                const after = (firstAffected.segments || []).map((segment: any) => `${segment.segment_date} ${String(segment.start_time).slice(0, 5)}–${String(segment.end_time).slice(0, 5)}`).join(', ');
                const releasedMinutes = Math.round((Number(originalHours) - Number(hours)) * 60);
                const decision = await Swal.fire({
                    title: `${releasedMinutes} minutes freed`,
                    html: `<p>Keep later tasks where they are, or use this time to move them earlier?</p><p class="mt-2"><strong>Task #${firstAffected.id} ${escapeHtml(firstAffected.task_name)}</strong><br/>Was: ${escapeHtml(before)}<br/>Could move to: ${escapeHtml(after)}</p>`,
                    icon: 'question',
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: 'Keep current times',
                    denyButtonText: 'Move tasks earlier',
                    cancelButtonText: 'Cancel edit',
                });
                if (decision.isDismissed) return;
                if (decision.isDenied) {
                    preview = backfillPreview;
                    confirmedMode = 'backfill';
                }
            }
        }

        if (needsSchedulePreview) {
            const planHtml = (plan: any, allowSelection: boolean) => {
                const segmentList = plan.segments.map((segment: any) =>
                    `<li>${escapeHtml(segment.segment_date)} ${escapeHtml(String(segment.start_time).slice(0, 5))}–${escapeHtml(String(segment.end_time).slice(0, 5))} (${Number(segment.allocated_minutes)} min)</li>`
                ).join('');
                const affectedTaskList = (plan.affected_tasks || []).map((task: any) => {
                    const oldSchedule = (task.previous_segments || []).map((segment: any) => `${escapeHtml(segment.segment_date)} ${escapeHtml(String(segment.start_time).slice(0, 5))}–${escapeHtml(String(segment.end_time).slice(0, 5))}`).join(', ');
                    const newSchedule = (task.segments || []).map((segment: any) => `${escapeHtml(segment.segment_date)} ${escapeHtml(String(segment.start_time).slice(0, 5))}–${escapeHtml(String(segment.end_time).slice(0, 5))}`).join(', ');
                    const dateLimits = task.date_limits?.end_date
                        ? `<br/><span class="text-slate-500">Allowed dates: ${escapeHtml(task.date_limits.start_date || 'Any')} to ${escapeHtml(task.date_limits.end_date)}</span>`
                        : '';
                    const deadlineEditor = allowSelection && (plan.needs_task_strategy || plan.mode === 'manual') && task.date_limits?.end_date
                        ? `<label class="task-deadline-fields mt-2 flex items-center gap-2">End-date limit<input class="form-input reflow-task-deadline" data-task-id="${Number(task.id)}" data-original-end-date="${escapeHtml(task.date_limits.end_date)}" type="date" value="${escapeHtml(task.date_limits.end_date)}"/></label>`
                        : '';
                    const manualStart = task.segments?.[0];
                    const mixedEditor = allowSelection && plan.mode === 'mixed' && plan.needs_task_strategy;
                    const manualInputs = allowSelection && mixedEditor
                        ? `<div class="manual-task-fields mt-2 flex gap-2 ${mixedEditor ? 'hidden' : ''}"><label>Preferred date<input class="form-input manual-task-date" data-task-id="${Number(task.id)}" type="date" value="${escapeHtml(manualStart?.segment_date || '')}"/></label><label>Preferred start<input class="form-input manual-task-time" data-task-id="${Number(task.id)}" type="time" value="${escapeHtml(String(manualStart?.start_time || '').slice(0, 5))}"/></label></div>`
                        : '';
                    const mixedChoice = mixedEditor
                        ? `<label class="mt-2 block text-sm">For this task<select class="form-select task-direction-choice mt-1" data-task-id="${Number(task.id)}"><option value="keep">Keep current time</option><option value="forward">Move forward</option><option value="backfill">Move backward</option><option value="manual">Choose date and time</option></select></label>${manualInputs}`
                        : '';
                    const checkboxChoice = allowSelection && plan.mode === 'manual'
                        ? `<label class="ml-2 inline-flex items-center gap-2"><input class="reflow-task-choice" type="checkbox" value="${Number(task.id)}" checked/> Move this task</label><div class="manual-task-fields mt-2 flex gap-2"><label>Preferred date<input class="form-input manual-task-date" data-task-id="${Number(task.id)}" type="date" value="${escapeHtml(manualStart?.segment_date || '')}"/></label><label>Preferred start<input class="form-input manual-task-time" data-task-id="${Number(task.id)}" type="time" value="${escapeHtml(String(manualStart?.start_time || '').slice(0, 5))}"/></label></div>`
                        : '';
                    const actionLabel = !mixedEditor && task.mode ? `<span class="text-slate-500">Action: ${escapeHtml(task.mode === 'keep' ? 'Keep current time' : task.mode === 'backfill' ? 'Move backward' : task.mode === 'forward' ? 'Move forward' : 'Manual placement')}</span><br/>` : '';
                    const scheduleLines = mixedEditor
                        ? `<br/><span>Current schedule: ${oldSchedule || 'Not available'}</span>`
                        : `<br/><span>Was: ${oldSchedule || 'Not available'}</span><br/><span>Will be: ${newSchedule || 'Not available'}</span>`;
                    return `<li class="mb-3"><strong>Task #${task.id} ${escapeHtml(task.task_name)}</strong>${scheduleLines}${dateLimits}<br/>${actionLabel}${mixedChoice}${checkboxChoice}${deadlineEditor}</li>`;
                }).join('');
                const moveDescription = plan.needs_task_strategy ? 'Choose a direction for each task. Kept tasks stay unchanged and still reserve their times.' : plan.automatic_fallback ? 'Review the recommended direction and new times for each task.' : plan.mode === 'mixed' ? 'The selected directions are shown for each task.' : plan.mode === 'forward' ? 'Later tasks will move forward.' : plan.mode === 'manual' ? 'Choose which tasks to move and set a preferred start for each.' : 'Later tasks may move earlier to use the released time.';
                const fallbackMessage = plan.fallback_message
                    ? `<p class="mb-2 rounded bg-amber-50 p-3 text-amber-900">${escapeHtml(plan.fallback_message)}${plan.fallback_reason ? `<br/><span>${escapeHtml(plan.fallback_reason)}</span>` : ''}</p>`
                    : '';
                return `<div class="max-h-[55vh] overflow-auto text-left">${fallbackMessage}<p class="mb-2">Original schedule: ${(segments || []).map((segment: any) => `${escapeHtml(segment.segment_date)} ${escapeHtml(String(segment.start_time).slice(0, 5))}–${escapeHtml(String(segment.end_time).slice(0, 5))}`).join(', ') || 'Not available'}.</p><p class="mb-2">${durationChanged ? `Duration: ${originalHours}h → <strong>${hours}h</strong>.` : `Duration: <strong>${hours}h</strong>.`} Updated schedule:</p><ol class="list-decimal pl-5">${segmentList}</ol><p class="mt-2">Total allocated: <strong>${minutes} minutes</strong></p>${affectedTaskList ? `<hr class="my-3"/><p>${moveDescription}${plan.mode === 'manual' ? ' Uncheck any task you want to keep as-is.' : ''}</p><ul class="list-none pl-0">${affectedTaskList}</ul>` : '<p class="mt-2">No other tasks will move.</p>'}</div>`;
            };
            const automaticFallback = Boolean(preview?.automatic_fallback);
            const fallbackNeedsChoices = Boolean(preview?.fallback_manual_required);
            const confirmation = await Swal.fire({
                title: fallbackNeedsChoices ? 'Choose task actions' : automaticFallback ? 'Alternative schedule found' : durationChanged ? 'Confirm duration and schedule' : 'Confirm reschedule',
                html: planHtml(preview, preview.affected_tasks?.length > 0),
                icon: 'question',
                showCancelButton: true,
                showDenyButton: automaticFallback,
                confirmButtonText: fallbackNeedsChoices ? 'Preview choices' : automaticFallback ? 'Use this schedule' : 'Save schedule',
                denyButtonText: 'Choose task actions',
                cancelButtonText: automaticFallback || fallbackNeedsChoices ? 'Cancel edit' : 'Cancel',
                didOpen: () => {
                    document.querySelectorAll<HTMLSelectElement>('.task-direction-choice').forEach((select) => {
                        const syncTaskFields = () => {
                            const taskRow = select.closest('li');
                            taskRow?.querySelector('.manual-task-fields')?.classList.toggle('hidden', select.value !== 'manual');
                            const deadlineInput = taskRow?.querySelector<HTMLInputElement>('.reflow-task-deadline');
                            if (deadlineInput) deadlineInput.disabled = select.value === 'keep';
                        };
                        select.addEventListener('change', syncTaskFields);
                        syncTaskFields();
                    });
                    document.querySelectorAll<HTMLInputElement>('.reflow-task-choice').forEach((checkbox) => {
                        const syncDeadline = () => {
                            const deadlineInput = checkbox.closest('li')?.querySelector<HTMLInputElement>('.reflow-task-deadline');
                            if (deadlineInput) deadlineInput.disabled = !checkbox.checked;
                        };
                        checkbox.addEventListener('change', syncDeadline);
                        syncDeadline();
                    });
                },
                preConfirm: () => {
                    const taskModes = Array.from(document.querySelectorAll<HTMLSelectElement>('.task-direction-choice')).map((select) => ({
                        task_id: Number(select.dataset.taskId), mode: select.value,
                    }));
                    const isMixedSetup = preview?.mode === 'mixed' && preview?.needs_task_strategy;
                    const taskIds = isMixedSetup ? taskModes.filter((item) => item.mode !== 'keep').map((item) => item.task_id) : Array.from(document.querySelectorAll<HTMLInputElement>('.reflow-task-choice:checked')).map((input) => Number(input.value));
                    const manualTaskIds = isMixedSetup
                        ? taskModes.filter((item) => item.mode === 'manual').map((item) => item.task_id)
                        : preview?.mode === 'manual' ? taskIds : [];
                    const deadlines = Array.from(document.querySelectorAll<HTMLInputElement>('.reflow-task-deadline')).map((input) => ({
                        task_id: Number(input.dataset.taskId), end_date: input.value, original_end_date: input.dataset.originalEndDate || '',
                    })).filter((item) => taskIds.includes(item.task_id) && item.end_date && item.end_date !== item.original_end_date)
                        .map(({ task_id, end_date }) => ({ task_id, end_date }));
                    return {
                    taskIds,
                    taskModes,
                    deadlines,
                    schedules: Array.from(document.querySelectorAll<HTMLInputElement>('.manual-task-date')).map((dateInput) => {
                        const taskId = Number(dateInput.dataset.taskId);
                        const timeInput = document.querySelector<HTMLInputElement>(`.manual-task-time[data-task-id="${taskId}"]`);
                        return { task_id: taskId, start_date: dateInput.value, start_time: timeInput?.value || '' };
                    }).filter((schedule) => manualTaskIds.includes(schedule.task_id)),
                    };
                },
            });
            if (automaticFallback && confirmation.isDenied) return updateData('mixed');
            if (!confirmation.isConfirmed) return;
            if (preview?.automatic_fallback) {
                confirmedTaskIds = (preview.suggested_task_ids || []).map(Number);
                confirmedTaskModes = preview.suggested_task_modes || [];
            } else if (confirmation.value && preview.affected_tasks?.length) {
                confirmedTaskDeadlines = confirmation.value.deadlines || [];
                const allIds = preview.affected_tasks.map((task: any) => Number(task.id)).sort((a: number, b: number) => a - b);
                confirmedTaskIds = confirmation.value.taskIds.sort((a: number, b: number) => a - b);
                const schedulesChanged = confirmedMode === 'manual' || confirmedMode === 'mixed';
                const selectionChanged = confirmedTaskIds.length !== allIds.length || confirmedTaskIds.some((taskId, index) => taskId !== allIds[index]);
                if (confirmedMode === 'mixed' || selectionChanged || schedulesChanged) {
                    const selectedModes = (confirmation.value.taskModes || []).filter((item: any) => item.mode !== 'keep');
                    confirmedTaskModes = confirmedMode === 'mixed' ? selectedModes : undefined;
                    const manualIds = confirmedMode === 'mixed' ? selectedModes.filter((item: any) => item.mode === 'manual').map((item: any) => item.task_id) : confirmedTaskIds;
                    const selectedSchedules = confirmation.value.schedules.filter((schedule: any) => manualIds.includes(schedule.task_id));
                    confirmedTaskSchedules = (confirmedMode === 'manual' || confirmedMode === 'mixed') ? selectedSchedules : undefined;
                    preview = await post(`task/${id}/schedule-preview`, {
                        start_date: startDate, end_date: endDate, start_time: normalizedStartTime, end_time: normalizedEndTime,
                        hour: hours, auto_schedule: shouldReschedule, reflow_mode: confirmedMode, reflow_task_ids: confirmedTaskIds,
                        reflow_task_modes: confirmedTaskModes, reflow_task_schedules: confirmedTaskSchedules, reflow_task_deadlines: confirmedTaskDeadlines,
                    });
                    if (!preview?.success || !preview?.segments?.length) {
                        const blockers = (preview?.conflicts || []).slice(0, 5).map((conflict: any) => `<li>Task #${Number(conflict.id)} ${escapeHtml(conflict.task_name)} — ${escapeHtml(conflict.segment_date)} ${escapeHtml(String(conflict.start_time).slice(0, 5))}–${escapeHtml(String(conflict.end_time).slice(0, 5))}</li>`).join('');
                        const retry = await Swal.fire({
                            title: 'This choice still conflicts',
                            html: `<p>${escapeHtml(preview?.message || 'No changes were made. Choose another direction, move more tasks, or adjust the dates.')}</p>${blockers ? `<ul class="mt-2 list-disc pl-5 text-left">${blockers}</ul>` : ''}<p class="mt-2">You can choose different actions for each task or enter preferred times.</p>`,
                            icon: 'warning', showDenyButton: true, showCancelButton: true,
                            confirmButtonText: 'Choose task actions', denyButtonText: 'Place tasks manually', cancelButtonText: 'Cancel edit',
                        });
                        if (retry.isConfirmed) return updateData('mixed');
                        if (retry.isDenied) return updateData('manual');
                        return;
                    }
                    const revised = await Swal.fire({
                        title: 'Review selected changes',
                        html: planHtml(preview, false),
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Confirm & save',
                        cancelButtonText: 'Go back & adjust',
                    });
                    if (!revised.isConfirmed) return;
                }
            }
        }

        var sendData: any = {
            task_name: name,
            description: description,
            priority: priority?.value,
            status: status ? '1' : '0',
            hour: hours,
            start_date: startDate,
            end_date: endDate,
            auto_schedule: shouldReschedule,
            schedule_changed: needsSchedulePreview,
        };
        if (needsSchedulePreview) sendData.reflow_mode = confirmedMode;
        if (confirmedTaskIds) sendData.reflow_task_ids = confirmedTaskIds;
        if (confirmedTaskModes) sendData.reflow_task_modes = confirmedTaskModes;
        if (confirmedTaskSchedules) sendData.reflow_task_schedules = confirmedTaskSchedules;
        if (confirmedTaskDeadlines?.length) sendData.reflow_task_deadlines = confirmedTaskDeadlines;
        if (needsSchedulePreview && preview?.schedule_preview_token) sendData.schedule_preview_token = preview.schedule_preview_token;
        if (shouldReschedule || needsSchedulePreview) sendData.start_time = normalizedStartTime;
        if (!shouldReschedule) {
            sendData.start_time = normalizedStartTime;
            sendData.end_time = normalizedEndTime;
        }

        post('task/' + id + '/update', sendData).then(async (responseJson: any) => {
            if (responseJson.success == 'true' || responseJson.success === true) {
                navigate('/tasklist');
                coloredToast('success', responseJson?.message);
            } else {
                if (responseJson?.stale_preview) {
                    await Swal.fire({ title: 'Schedule changed', text: responseJson.message, icon: 'warning', confirmButtonText: 'Review again' });
                    return;
                }
                const validationErrors = responseJson?.errors ? Object.values(responseJson.errors).flat().join(' ') : '';
                coloredToast('danger', responseJson?.message && responseJson.message !== 'Validation failed' ? responseJson.message : (validationErrors || 'The task could not be saved. Check the duration, dates, and available working time.'));
            }
        });
    }


    return (
        <>
            <div className="flex xl:flex-row flex-col gap-2">
                <div className="px-0 flex-1 py-0 ltr:xl:mr-1 rtl:xl:ml-1">
                    <div className="panel mb-3">
                        <div className="w-full flex items-center gap-3 mb-3">
                            <div className="w-full">
                                <label htmlFor="name" className={`mb-1 ${error ? 'text-danger' : ''}`}>Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    value={name}
                                    onChange={(e: any) => { setName(e.target.value); }}
                                    className={`form-input ${error ? '!border-danger placeholder:text-red-300' : ''}`}
                                    placeholder='Enter task Name'
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="hours" className="mb-1">Duration (hours)</label>
                                <input
                                    id="hours"
                                    type="number"
                                    name="hours"
                                    value={hours}
                                    onChange={(e: any) => { setHours(e.target.value); }}
                                    className="form-input"
                                    placeholder='Enter task Hours'
                                />
                            </div>
                        </div>
                        <div className="w-full flex items-center gap-3 mb-3">
                            <div className="w-full">
                                <label htmlFor="startDate" className="mb-1">Start Date</label>
                                <input
                                    id="startDate"
                                    type="date"
                                    name="startDate"
                                    value={startDate}
                                    onChange={(e: any) => { setStartDate(e.target.value); }}
                                    className="form-input"
                                    placeholder='Enter Start Date'
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="endDate" className="mb-1">End Date</label>
                                <input
                                    id="endDate"
                                    type="date"
                                    name="endDate"
                                    value={endDate}
                                    onChange={(e: any) => { setEndDate(e.target.value); }}
                                    className="form-input"
                                    placeholder='Enter End Date'
                                />
                            </div>
                        </div>
                        <div className="w-full flex items-center gap-3 mb-3">
                            <div className="w-full">
                            <label htmlFor="startTime" className="mb-1">{willAutoSchedule ? 'Preferred Start Time' : 'Start Time'}</label>
                                <input
                                    id="startTime"
                                    type="time"
                                    name="startTime"
                                    value={startTime}
                                    onChange={(e: any) => { setStartTime(e.target.value); }}
                                    className="form-input"
                                    placeholder='Enter Start Time'
                                />
                            </div>
                            <div className="w-full">
                            <label htmlFor="endTime" className="mb-1">{willAutoSchedule ? 'End Time (calculated)' : 'End Time'}</label>
                                <input
                                    id="endTime"
                                    type="time"
                                    name="endTime"
                                    value={endTime}
                                    disabled={willAutoSchedule}
                                    onChange={(e: any) => { setEndTime(e.target.value); }}
                                    className="form-input"
                                    placeholder='Enter End Time'
                                />
                            </div>
                        </div>
                        
                        <div className="w-full mb-3">
                            <label htmlFor="description" className="mb-1">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={description}
                                onChange={(e: any) => { setDescription(e.target.value); }}
                                className="form-input min-h-[100px]"
                                placeholder='Enter task description'
                            />
                        </div>
                        <div className="panel mt-4">
                            <h3 className="mb-2 font-semibold">Current schedule · {segments.reduce((sum, segment) => sum + Number(segment.allocated_minutes || 0), 0)} minutes</h3>
                            {segments.length ? (
                                <ol className="space-y-2">
                                    {segments.map((segment, index) => (
                                        <li key={segment.id || `${segment.segment_date}-${index}`} className="rounded border border-slate-300 p-3 text-slate-700 dark:border-slate-600 dark:text-slate-200">
                                            <strong>{segment.segment_date}</strong>: {segment.start_time?.slice(0, 5)}–{segment.end_time?.slice(0, 5)} ({segment.allocated_minutes} min)
                                        </li>
                                    ))}
                                </ol>
                            ) : <p className="text-sm text-slate-500">Save to calculate the updated segments.</p>}
                        </div>
                    </div>
                </div>
                <div className="xl:w-96 w-full xl:mt-0">
                    <div className="panel mb-4">
                        <div className="flex xl:grid-cols-1 lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-2">
                            <button
                                type="button"
                                className="btn btn-glow w-full gap-2 shadow-none"
                                onClick={() => {
                                    updateData();
                                }}
                            >
                                <IconSave className="ltr:mr-2 rtl:ml-2 shrink-0" />
                                Update & Close
                            </button>
                            <button
                                type="button"
                                className="btn btn-glow w-1/1 gap-2 shadow-none"
                                onClick={() => {
                                    navigate('/tasklist');
                                }}
                            >
                                <IconX className="shrink-0" />
                            </button>
                        </div>
                        <div className="flex gap-3 mt-6 items-center">
                            <label className="w-12 h-6 relative">
                                <input 
                                    type="checkbox" 
                                    className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" 
                                    id="custom_switch_checkbox1"
                                    checked={status == 1 ? true : false}
                                    onChange={(e) => setStatus(e.target.checked)}
                                />
                                <span className="bg-[#ebedf2] dark:bg-black-light block h-full rounded-full before:absolute before:left-1 before:bg-[#060606] dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-[#377fbe] before:transition-all before:duration-300"></span>
                            </label>
                            <label htmlFor="status" className=''>Enable this Task</label>
                        </div>
                        <div className="flex gap-3 mt-4 items-center">
                            <label className="w-12 h-6 relative">
                                <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" checked={autoSchedule} onChange={(e) => setAutoSchedule(e.target.checked)} />
                                <span className="bg-[#ebedf2] dark:bg-black-light block h-full rounded-full before:absolute before:left-1 before:bg-[#060606] dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-[#377fbe] before:transition-all before:duration-300"></span>
                            </label>
                            <label>Automatically fit into available working time</label>
                        </div>
                        {needsSchedulePreview && (
                            <div className="mt-4">
                                <label htmlFor="reflowMode" className="mb-1">When another task needs this time</label>
                                <select id="reflowMode" className="form-select" value={reflowMode} onChange={(event) => setReflowMode(event.target.value as 'keep' | 'backfill' | 'forward' | 'manual' | 'mixed')}>
                                    <option value="keep">Keep other tasks in place</option>
                                    <option value="backfill">Move later tasks earlier into free time</option>
                                    <option value="forward">Move later tasks forward</option>
                                    <option value="manual">Choose tasks and preferred times manually</option>
                                    <option value="mixed">Choose a direction for each task</option>
                                </select>
                                <small className="mt-1 block text-slate-500">You will review every proposed change before saving. No other task moves without your confirmation.</small>
                            </div>
                        )}
                        <p className="mt-2 text-sm text-slate-500">{durationChanged || autoSchedule ? 'Choose a preferred start time. The end time is calculated around working hours, breaks, and other tasks.' : 'Manual mode uses the exact start and end times you select. You will preview the schedule before saving.'} Other task schedules change only if you choose a reflow option.</p>
                        {/* Priority Field - Creatable */}
                        <div className="w-full flex items-center gap-3 mt-3">
                            <div className="w-full">
                                <label htmlFor="priority" className="mb-1">Select Priority</label>
                                <CreatableSelect
                                    id="priority"
                                    options={priorityOptions}
                                    value={priority}
                                    onChange={(newValue: any) => setPriority(newValue)}
                                    onCreateOption={handleCreatePriority}
                                    placeholder="Select or create priority..."
                                    className="react-select"
                                    classNamePrefix="react-select"
                                    isClearable={true}
                                    formatCreateLabel={(inputValue: string) => `Create priority "${inputValue}"`}
                                    noOptionsMessage={() => "No priorities available"}
                                />
                                <small className="text-gray-500 mt-1 block">
                                    Type and press Enter to create a new priority
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EditTask;
