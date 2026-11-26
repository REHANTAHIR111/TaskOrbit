import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSave from '../../components/Icon/IconSave';
import IconPlus from '../../components/Icon/IconPlus';
import IconMinus from '../../components/Icon/IconMinus';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { get, post } from '../api/ApiCalls';
import Alerts from '../../components/Alerts';
import Select from 'react-select';

const SlotSetting = (props:any) => {
    const { t } = useTranslation();
    const userId = localStorage.getItem('user_id');
    const dispatch = useDispatch();
    const { coloredToast } = Alerts();
    const { id } = useParams();

    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<any>(false);
    const [workingDays, setWorkingDays] = useState<any>([]);
    const [startWorkTime, setStartWorkTime] = useState<any>('');
    const [endWorkTime, setEndWorkTime] = useState<any>('');
    const [startBreakTime, setStartBreakTime] = useState<any>('');
    const [endBreakTime, setEndBreakTime] = useState<any>('');
    const [holidays, setHolidays] = useState([
        {
            holiday_name: '',
            holiday_date: '',
        },
    ]);

    const [errors, setErrors] = useState({
        workingDays: false,
        startWorkTime: false,
        endWorkTime: false,
        startBreakTime: false,
        endBreakTime: false,
        holidays: [] as any[],
    });

    useEffect(() => {
        dispatch(setPageTitle('Slot Auto Setting'));
        getData()
    }, [props]);

    const daysData = [
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' },
        { value: 7, label: 'Sunday' },
    ]
    

    const addHoliday = () => {
        setHolidays([
            ...holidays,
            {
                holiday_name: '',
                holiday_date: '',
            },
        ]);
    };

    const removeHoliday = (index: number) => {
        const data = [...holidays];
        data.splice(index, 1);
        setHolidays(data);
    };

    const updateHoliday = (
        index: number,
        field: string,
        value: string
    ) => {
        const data = [...holidays];
        data[index] = {
            ...data[index],
            [field]: value,
        };

        setHolidays(data);
    };

    const getData = () => {
        get(`get_slot_setting/${userId}`).then((responseJson: any) => {
            const edit = responseJson.data;

            // Working Days
            const selectedDays = edit?.working_days
                ? edit.working_days.split(',').map((day: string) => {
                    return daysData.find(
                        (item: any) => item.value === Number(day)
                    );
                }).filter(Boolean)
                : [];

            setWorkingDays(selectedDays);

            // Working Times
            setStartWorkTime(edit?.start_work_time || '');
            setEndWorkTime(edit?.end_work_time || '');

            // Break Times
            setStartBreakTime(edit?.start_break_time || '');
            setEndBreakTime(edit?.end_break_time || '');

            // Holidays
            setHolidays(
                edit?.holidays?.length
                    ? edit.holidays
                    : [
                        {
                            holiday_name: '',
                            holiday_date: '',
                        },
                    ]
            );

            // Status
            setStatus(edit?.status == 1);
        });
    };
    
    const clearErrors = () => {
        setTimeout(() => {
            setErrors({
                workingDays: false,
                startWorkTime: false,
                endWorkTime: false,
                startBreakTime: false,
                endBreakTime: false,
                holidays: holidays.map(() => ({
                    holiday_name: false,
                    holiday_date: false,
                })),
            });
        }, 3000);
    };

    function updateData(val: any) {

        setErrors({
            workingDays: false,
            startWorkTime: false,
            endWorkTime: false,
            startBreakTime: false,
            endBreakTime: false,
            holidays: holidays.map(() => ({
                holiday_name: false,
                holiday_date: false,
            })),
        });

        if((!workingDays || workingDays.length === 0) || (!startWorkTime || !endWorkTime)){

            if (!workingDays || workingDays.length === 0) {
                coloredToast('danger', 'Please select Working Days.');
                setErrors((prev) => ({
                    ...prev,
                    workingDays: true,
                }));
                clearErrors();
            }
    
            if (!startWorkTime) {
                setErrors((prev) => ({
                    ...prev,
                    startWorkTime: true,
                }));
                coloredToast('danger', 'Start Working Time is required.');
                
                clearErrors();
            }
    
            if (!endWorkTime) {
                setErrors((prev) => ({
                    ...prev,
                    endWorkTime: true,
                }));
    
                clearErrors();
    
                coloredToast('danger', 'End Working Time is required.');
            }

            return;
        }

        if (startWorkTime >= endWorkTime) {
            setErrors((prev) => ({
                ...prev,
                startWorkTime: true,
                endWorkTime: true,
            }));
            coloredToast('danger', 'End Working Time must be greater than Start Working Time.');
            return;
        }

        if (startBreakTime && endBreakTime) {
            if (startBreakTime >= endBreakTime) {
                coloredToast('danger', 'Break End Time must be greater than Break Start Time.');
                return;
            }
        }

        const holidayErrors = holidays.map(() => ({
            holiday_name: false,
            holiday_date: false,
        }));


        for (let i = 0; i < holidays.length; i++) {
            if (holidays[i].holiday_name && !holidays[i].holiday_date) {
                holidayErrors[i].holiday_date = true;

                setErrors((prev) => ({
                    ...prev,
                    holidays: holidayErrors,
                }));
                clearErrors();

                coloredToast('danger', 'Holiday Date is required.');
                return;
            }

            if (holidays[i].holiday_date && !holidays[i].holiday_name) {
                holidayErrors[i].holiday_name = true;

                setErrors((prev) => ({
                    ...prev,
                    holidays: holidayErrors,
                }));
                clearErrors();

                coloredToast('danger', 'Holiday Name is required.');
                return;
            }

            if (
                holidays[i].holiday_date &&
                holidays[i].holiday_date < new Date().toISOString().split('T')[0]
            ) {
                holidayErrors[i].holiday_date = true;

                setErrors((prev) => ({
                    ...prev,
                    holidays: holidayErrors,
                }));
                clearErrors();

                coloredToast('danger', 'Past date is not allowed.');
                return;
            }
        }

        const userID = localStorage.getItem('user_id');

        setSaving(true);

        const sendData = {
            user_id: userID,
            working_days: workingDays.map((item: any) => item.value),
            start_work_time: startWorkTime,
            end_work_time: endWorkTime,
            start_break_time: startBreakTime,
            end_break_time: endBreakTime,
            holidays,
            status: status ? 1 : 0,
        };

        post('save_slot_setting', sendData).then((responseJson: any) => {
            if (responseJson.success == true) {
                coloredToast('success', responseJson?.message);
                getData();
            } else {
                coloredToast('danger', t('pleaseCheckDataAndTryAgain'));
            }
        })
        .catch(() => {
            coloredToast('danger', t('pleaseCheckDataAndTryAgain'));
        })
        .finally(() => {
            setSaving(false);
        });
    }


    return (
        <>
            <div className="flex xl:flex-row flex-col gap-2">
                <div className="px-0 flex-1 py-0 ltr:xl:mr-1 rtl:xl:ml-1">
                    <div className="panel mb-3">
                        <div className=''>
                            <h3 className='font-bold text-lg text-gray-400'>Working Days</h3>
                            <hr className='opacity-50 mt-0.5' />
                        </div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-3">
                            <div className="w-full col-span-2">
                                <label htmlFor="work_days" className={`mb-1 ${errors.workingDays ? '!text-red-500' : ''}`}>Select Working Days</label>
                                <Select
                                    classNamePrefix="react-select"
                                    className={errors.workingDays ? "!border !border-red-500 !rounded-md" : ""}
                                    isSearchable={true}
                                    placeholder={t('select')}
                                    isMulti
                                    options={daysData}
                                    value={workingDays}
                                    onChange={(e: any) => {
                                        setWorkingDays(e);

                                        setErrors(prev => ({
                                            ...prev,
                                            workingDays: false,
                                        }));
                                    }}
                                />
                            </div>
                        </div>
                        <div className='mt-5'>
                            <h3 className='font-bold text-lg text-gray-400'>Working Hours</h3>
                            <hr className='opacity-50 mt-0.5' />
                        </div>
                        <div className='grid grid-cols-2 gap-3 mt-3'>
                            <div className="w-full">
                                <label htmlFor="start_work_time" className={`mb-1 ${errors.startWorkTime ? "!text-red-500" : ""}`}>Start Working Time</label>
                                <input
                                    id="start_work_time"
                                    type="time"
                                    name="start_work_time"
                                    value={startWorkTime}
                                    onChange={(e) => {
                                        setStartWorkTime(e.target.value);

                                        setErrors(prev => ({
                                            ...prev,
                                            startWorkTime: false,
                                        }));
                                    }}
                                    className={`form-input ${errors.startWorkTime ? '!border-red-500 !bg-red-50 !focus:ring-red-500 placeholder:!text-red-300' : 'border-gray-200'}`}
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="end_work_time" className={`mb-1 ${errors.startWorkTime ? "!text-red-500" : ""}`}>End Working Time</label>
                                <input
                                    id="end_work_time"
                                    type="time"
                                    name="end_work_time"
                                    value={endWorkTime}
                                    onChange={(e: any) => { 
                                        setEndWorkTime(e.target.value); 
                                        setErrors(prev => ({
                                            ...prev,
                                            endWorkTime: false,
                                        }));
                                    }}
                                    className={`form-input ${errors.endWorkTime ? "!border !border-red-500 !rounded-md" : ""}`}
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="start_break_time" className={`mb-1`}>Break End Time</label>
                                <input
                                    id="start_break_time"
                                    type="time"
                                    name="start_break_time"
                                    value={startBreakTime}
                                    onChange={(e: any) => { setStartBreakTime(e.target.value); }}
                                    className={`form-input`}
                                />
                            </div>
                            <div className="w-full">
                                <label htmlFor="end_break_time" className={`mb-1`}>Break Start Time</label>
                                <input
                                    id="end_break_time"
                                    type="time"
                                    name="end_break_time"
                                    value={endBreakTime}
                                    onChange={(e: any) => { setEndBreakTime(e.target.value); }}
                                    className={`form-input`}
                                />
                            </div>
                        </div>
                        <div className='mt-5'>
                            <div className='flex justify-between items-center'>
                                <h3 className='font-bold text-lg text-gray-400'>Holidays</h3>
                                <button 
                                    className="btn btn-sm btn-glow"
                                    onClick={addHoliday}
                                >
                                    <IconPlus className='!text-white'/>
                                </button>
                            </div>
                            <hr className='opacity-50 mt-1.5' />
                        </div>
                        {holidays.map((item, index) => (
                            <div
                                className="grid grid-cols-2 gap-3 mt-3"
                                key={index}
                            >
                                <div>
                                    <label className={`mb-1 ${errors.holidays[index]?.holiday_name ? "!text-red-500" : ""}`}>Holiday</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Holiday Name..."
                                        value={item.holiday_name}
                                        className={`form-input ${
                                            errors.holidays[index]?.holiday_name
                                                ? "!border !border-red-500 !rounded-md"
                                                : ""
                                        }`}
                                        onChange={(e) => {
                                            updateHoliday(index, "holiday_name", e.target.value);

                                            setErrors((prev) => {
                                                const holidayErrors = [...prev.holidays];
                                                holidayErrors[index] = {
                                                    ...holidayErrors[index],
                                                    holiday_name: false,
                                                };

                                                return {
                                                    ...prev,
                                                    holidays: holidayErrors,
                                                };
                                            });
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className={`mb-1 ${errors.holidays[index]?.holiday_date ? "!text-red-500" : ""}`}>Holiday Date</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            min={new Date().toISOString().split("T")[0]}
                                            value={item.holiday_date}
                                            className={`form-input w-full ${
                                                errors.holidays[index]?.holiday_date
                                                    ? "!border !border-red-500 !rounded-md"
                                                    : ""
                                            }`}
                                            onChange={(e) => {
                                                updateHoliday(index, "holiday_date", e.target.value);

                                                setErrors((prev) => {
                                                    const holidayErrors = [...prev.holidays];
                                                    holidayErrors[index] = {
                                                        ...holidayErrors[index],
                                                        holiday_date: false,
                                                    };

                                                    return {
                                                        ...prev,
                                                        holidays: holidayErrors,
                                                    };
                                                });
                                            }}
                                        />

                                        {holidays.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn btn-glow w-[46px] !py-1 !px-2"
                                                onClick={() => removeHoliday(index)}
                                            >
                                                <IconMinus />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="xl:w-96 w-full xl:mt-0">
                    <div className="panel mb-4">
                        <div className="flex xl:grid-cols-1 lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-2">
                            <button
                                type="button"
                                className="btn btn-glow w-full gap-2 shadow-none"
                                onClick={() => updateData(false)}
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
                                        Save
                                    </>
                                )}
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
                            <label htmlFor="status" className=''>Enable Auto Setting</label>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SlotSetting;