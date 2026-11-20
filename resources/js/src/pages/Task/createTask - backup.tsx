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

    const [name, setName] = useState<any>('');
    const [description, setDescription] = useState<any>('');
    const [hours, setHours] = useState<any>('');
    const [startDate, setStartDate] = useState<any>('');
    const [endDate, setEndDate] = useState<any>('');
    const [startTime, setStartTime] = useState<any>('');
    const [endTime, setEndTime] = useState<any>('');
    const [priority, setPriority] = useState<any>(null); // Changed to null for single select
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

    useEffect(() => {
        dispatch(setPageTitle('Create new Task'));
        getAndCheckData()
    }, [props]);

    useEffect(() => {
        getAndCheckData()
    }, [props,hours]);

    const convertToTimeInput = (time: string) => {
        if (!time) return '';

        const [timePart, modifier] = time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);

        if (modifier === 'PM' && hours !== 12) {
            hours += 12;
        }

        if (modifier === 'AM' && hours === 12) {
            hours = 0;
        }

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const getAndCheckData = () => {
        get(`task/create?user_id=${UserId}`).then((responseJson: any) => {
            setIsSettingSaved(responseJson?.setting_filled)
            // setStartTime(responseJson?.available_start_time || '');
            // setEndTime(convertToTimeInput(responseJson?.calcalted_end_time || ''));
        });
    };

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

    function submitData(val: any) {
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

        if (!isSettingSaved) {
            sendData.start_time = startTime;
            sendData.end_time = endTime;
        }

        if (!name || !hours /*|| !startDate || !endDate*/) {
            const errors = [];
            if (!name) errors.push('Name');
            if (!hours) errors.push('Hours');
            // if (!startDate) errors.push('Start Date');
            // if (!endDate) errors.push('End Date');

            const message = errors.length === 0 ? 'All fields are filled!' :
                            errors.length === 1 ? `Please fill ${errors[0]}!` :
                            errors.length === 2 ? `Please fill ${errors.join(' & ')}!` :
                            `Please fill ${errors.slice(0, -1).join(', ')} & ${errors[errors.length - 1]}!`;

            coloredToast('danger', message);
            if (!name) {
                setError(true);
                setTimeout(function () {
                    setError(false);
                }, 3000);
            }
            if (!hours) {
                setHourError(true);
                setTimeout(function () {
                    setHourError(false);
                }, 3000);
            }
            // if (!startDate) {
            //     setStartDateError(true);
            //     setTimeout(function () {
            //         setStartDateError(false);
            //     }, 3000);
            // }
            // if (!endDate) {
            //     setEndDateError(true);
            //     setTimeout(function () {
            //         setEndDateError(false);
            //     }, 3000);
            // }
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
                } else {
                    navigate('/tasklist');
                    coloredToast('success', responseJson?.message);
                }
            } else {
                coloredToast('danger', responseJson?.message, 15000);
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
                                <label htmlFor="name" className={`mb-1 ${error ? '!text-danger' : ''}`}>Task</label>
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
                                <label htmlFor="name" className={`mb-1 ${hourError ? '!text-danger' : ''}`}>Duration {' '} <span className={`text-xs text-gray-500 ${hourError ? '!text-danger/80' : ''}`}>(in hours)</span></label>
                                <input
                                    id="hours"
                                    type="number"
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
                                <label htmlFor="name" className={`mb-1 ${startDateError ? '!text-danger' : ''}`}>Start Date</label>
                                <input
                                    id="startDate"
                                    type="date"
                                    name="startDate"
                                    value={startDate}
                                    onChange={(e: any) => { setStartDate(e.target.value); }}
                                    className={`form-input ${startDateError ? '!border-danger placeholder:text-red-300' : ''}`}
                                    placeholder='Enter Start Date'
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="name" className={`mb-1 ${endDateError ? '!text-danger' : ''}`}>End Date</label>
                                <input
                                    id="endDate"
                                    type="date"
                                    name="endDate"
                                    value={endDate}
                                    onChange={(e: any) => { setEndDate(e.target.value); }}
                                    className={`form-input ${endDateError ? '!border-danger placeholder:text-red-300' : ''}`}
                                    placeholder='Enter End Date'
                                />
                            </div>
                        </div>
                        <div className="w-full flex items-center gap-3 mb-3">
                            <div className="w-full">
                                <label htmlFor="startTime" className="mb-1">Start Time {isSettingSaved ? <span className='text-xs text-gray-500'>(This will set automatically)</span> : ''}</label>
                                <input
                                    id="startTime"
                                    type="time"
                                    name="startTime"
                                    value={startTime}
                                    disabled={isSettingSaved == true}
                                    onChange={(e: any) => { setStartTime(e.target.value); }}
                                    className="form-input"
                                    placeholder='Enter Start Time'
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="endTime" className="mb-1">End Time {isSettingSaved ? <span className='text-xs text-gray-500'>(This will set automatically)</span> : ''}</label>
                                <input
                                    id="endTime"
                                    type="time"
                                    name="endTime"
                                    value={endTime}
                                    disabled={isSettingSaved == true}
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
                    </div>
                </div>
                <div className="xl:w-96 w-full xl:mt-0">
                    <div className="panel mb-4">
                        <div className="flex xl:grid-cols-1 lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-2">
                            <button
                                type="button"
                                className="btn btn-glow w-full gap-2 shadow-none"
                                onClick={() => {
                                    submitData(false);
                                }}
                            >
                                <IconSave className="ltr:mr-2 rtl:ml-2 shrink-0" />
                                Save & Close
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
                                    checked={status}
                                    onChange={(e) => setStatus(e.target.checked)}
                                />
                                <span className="bg-[#ebedf2] dark:bg-black-light block h-full rounded-full before:absolute before:left-1 before:bg-[#060606] dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-[#377fbe] before:transition-all before:duration-300"></span>
                            </label>
                            <label htmlFor="status" className='form-label'>Enable this Task</label>
                        </div>
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

export default CreateTask;