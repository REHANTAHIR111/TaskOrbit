import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconX from '../../components/Icon/IconX';
import IconSave from '../../components/Icon/IconSave';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { get, post } from '../api/ApiCalls';
import CreatableSelect from 'react-select/creatable';
import Alerts from '../../components/Alerts';

const CreateTask = (props: any) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { coloredToast } = Alerts();
    const UserId = localStorage.getItem('user_id');

    const [saving, setSaving] = useState(false);
    const [name, setName] = useState<any>('');
    const [description, setDescription] = useState<any>('');
    const [hours, setHours] = useState<any>('');
    const [startDate, setStartDate] = useState<any>('');
    const [endDate, setEndDate] = useState<any>('');
    const [startTime, setStartTime] = useState<any>('');
    const [endTime, setEndTime] = useState<any>('');
    const [priority, setPriority] = useState<any>(null);
    const [status, setStatus] = useState<any>(false);
    const [isSettingSaved, setIsSettingSaved] = useState<any>(false);
    const [priorityOptions, setPriorityOptions] = useState<any>([
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
    ]);

    const [error, setError] = useState<any>('');
    const [hourError, setHourError] = useState<any>('');
    const [startDateError, setStartDateError] = useState<any>('');
    const [endDateError, setEndDateError] = useState<any>('');

    // Use local calendar dates so the defaults are not shifted by UTC timezone conversion.
    const initializeDates = () => {
        const today = new Date();
        const formatLocalDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        setStartDate(formatLocalDate(today));
        setEndDate(formatLocalDate(tomorrow));
    };

    useEffect(() => {
        dispatch(setPageTitle('Create new Task'));
        getAndCheckData();
        initializeDates();
    }, [props]);

    const getAndCheckData = () => {
        get(`task/create?user_id=${UserId}`).then((responseJson: any) => {
            setIsSettingSaved(responseJson?.setting_filled || false);
        });
    };

    const handleCreatePriority = (inputValue: string) => {
        const newPriority = {
            value: inputValue.toLowerCase().replace(/\s+/g, '_'),
            label: inputValue
        };
        setPriorityOptions([...priorityOptions, newPriority]);
        setPriority(newPriority);
        return newPriority;
    };

    function submitData(val: any) {

        setSaving(true);

        var sendData: any = {
            user_id: UserId,
            task_name: name,
            description: description,
            priority: priority?.value,
            status: status ? '1' : '0',
            hour: hours,
            start_date: startDate,
            end_date: endDate,
        };

        // Only send time if setting is not saved (manual mode)
        if (!isSettingSaved) {
            sendData.start_time = startTime;
            sendData.end_time = endTime;
        }

        if (!name || !hours || !startDate || !endDate) {
            const errors = [];
            if (!name) errors.push('Task Name');
            if (!hours) errors.push('Hours');
            if (!startDate) errors.push('Start Date');
            if (!endDate) errors.push('End Date');

            const message = errors.length === 0 ? 'All fields are filled!' :
                            errors.length === 1 ? `Please fill ${errors[0]}!` :
                            errors.length === 2 ? `Please fill ${errors.join(' & ')}!` :
                            `Please fill ${errors.slice(0, -1).join(', ')} & ${errors[errors.length - 1]}!`;

            coloredToast('danger', message);

            if (!name) {
                setError(true);
                setTimeout(() => setError(false), 3000);
            }
            if (!hours) {
                setHourError(true);
                setTimeout(() => setHourError(false), 3000);
            }
            if (!startDate) {
                setStartDateError(true);
                setTimeout(() => setStartDateError(false), 3000);
            }
            if (!endDate) {
                setEndDateError(true);
                setTimeout(() => setEndDateError(false), 3000);
            }
            setSaving(false);
            return false;
        }

        post('task', sendData).then((responseJson: any) => {
            if (responseJson.success == true) {
                if (val == true) {
                    coloredToast('success', responseJson?.message);
                    // Reset form
                    setPriority(null);
                    setName('');
                    setHours('');
                    setStartDate('');
                    setEndDate('');
                    setStartTime('');
                    setEndTime('');
                    setStatus(false);
                    setDescription('');
                    initializeDates();
                } else {
                    navigate('/tasklist');
                    coloredToast('success', responseJson?.message);
                }
            } else {
                coloredToast('danger', responseJson?.message || 'Error creating task', 15000);
            }
        }).catch((error) => {
            coloredToast('danger', error?.response?.data?.message || 'Error creating task', 15000);
        }).finally(() => {
            setSaving(false);
        });
    }

    return (
        <>
            <div className="flex xl:flex-row flex-col gap-2">            <div className="to-page-heading"><div><span>PLAN YOUR WORK</span><h1>Create a task</h1><p>Add a task and choose when it should fit into your schedule.</p></div></div>

                <div className="px-0 flex-1 py-0 ltr:xl:mr-1 rtl:xl:ml-1">
                    <div className="panel mb-3">
                        <div className="w-full flex items-center gap-3 mb-3">
                            <div className="w-full">
                                <label htmlFor="name" className={`mb-1 ${error ? '!text-danger' : ''}`}>Task <span className="text-danger">*</span></label>
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
                                <label htmlFor="name" className={`mb-1 ${hourError ? '!text-danger' : ''}`}>
                                    Duration <span className="text-xs text-gray-500">(in hours)</span> <span className="text-danger">*</span>
                                </label>
                                <input
                                    id="hours"
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    name="hours"
                                    value={hours}
                                    onChange={(e: any) => { setHours(e.target.value); }}
                                    className={`form-input ${hourError ? '!border-danger placeholder:text-red-300' : ''}`}
                                    placeholder='Enter task Hours'
                                />
                            </div>
                        </div>
                        <div className="w-full flex items-center gap-3 mb-3">
                            <div className="w-full">
                                <label htmlFor="startDate" className={`mb-1 ${startDateError ? '!text-danger' : ''}`}>Start Date <span className="text-danger">*</span></label>
                                <input
                                    id="startDate"
                                    type="date"
                                    name="startDate"
                                    value={startDate}
                                    onChange={(e: any) => { setStartDate(e.target.value); }}
                                    className={`form-input ${startDateError ? '!border-danger placeholder:text-red-300' : ''}`}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="endDate" className={`mb-1 ${endDateError ? '!text-danger' : ''}`}>End Date <span className="text-danger">*</span></label>
                                <input
                                    id="endDate"
                                    type="date"
                                    name="endDate"
                                    value={endDate}
                                    onChange={(e: any) => { setEndDate(e.target.value); }}
                                    className={`form-input ${endDateError ? '!border-danger placeholder:text-red-300' : ''}`}
                                    min={startDate || new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                        <div className="w-full flex items-center gap-3 mb-3">
                            <div className="w-full">
                                <label htmlFor="startTime" className="mb-1">
                                    Start Time
                                    {isSettingSaved ?
                                        <span className='text-xs text-gray-500 ml-1'>(Auto-calculated from settings)</span> :
                                        <span className='text-danger'>*</span>
                                    }
                                </label>
                                <input
                                    id="startTime"
                                    type="time"
                                    name="startTime"
                                    value={startTime}
                                    disabled={isSettingSaved}
                                    onChange={(e: any) => { setStartTime(e.target.value); }}
                                    className={`form-input ${!isSettingSaved && !startTime ? 'border-yellow-400' : ''}`}
                                    placeholder='Enter Start Time'
                                    required={!isSettingSaved}
                                />
                                {!isSettingSaved && !startTime && (
                                    <small className="text-yellow-600">Required for manual scheduling</small>
                                )}
                            </div>
                            <div className="w-full">
                                <label htmlFor="endTime" className="mb-1">
                                    End Time
                                    {isSettingSaved ?
                                        <span className='text-xs text-gray-500 ml-1'>(Auto-calculated from settings)</span> :
                                        <span className='text-danger'>*</span>
                                    }
                                </label>
                                <input
                                    id="endTime"
                                    type="time"
                                    name="endTime"
                                    value={endTime}
                                    disabled={isSettingSaved}
                                    onChange={(e: any) => { setEndTime(e.target.value); }}
                                    className={`form-input ${!isSettingSaved && !endTime ? 'border-yellow-400' : ''}`}
                                    placeholder='Enter End Time'
                                    required={!isSettingSaved}
                                />
                                {!isSettingSaved && !endTime && (
                                    <small className="text-yellow-600">Required for manual scheduling</small>
                                )}
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
                    </div>
                </div>
                <div className="xl:w-96 w-full xl:mt-0">
                    <div className="panel mb-4">
                        <div className="flex xl:grid-cols-1 lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-2">
                            <button
                                type="button"
                                className="btn btn-glow w-full gap-2 shadow-none"
                                onClick={() => submitData(false)}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <IconSave className="ltr:mr-2 rtl:ml-2 shrink-0" />
                                        Save & CLose
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-glow w-1/1 gap-2 shadow-none"
                                onClick={() => navigate('/tasklist')}
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
                                    checked={status}
                                    onChange={(e) => setStatus(e.target.checked)}
                                />
                                <span className="bg-[#ebedf2] dark:bg-black-light block h-full rounded-full before:absolute before:left-1 before:bg-[#060606] dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-[#377fbe] before:transition-all before:duration-300"></span>
                            </label>
                            <label htmlFor="status" className='form-label'>Enable this Task</label>
                        </div>
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

export default CreateTask;