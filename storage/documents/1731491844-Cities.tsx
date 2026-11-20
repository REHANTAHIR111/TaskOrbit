import React from 'react'
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState, Fragment } from 'react';
import sortBy from 'lodash/sortBy';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPencil from '../../../components/Icon/IconPencil';
import IconEye from '../../../components/Icon/IconEye';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { Link } from 'react-router-dom';
import IconPlus from '../../../components/Icon/IconPlus';
import { Dialog, Transition, Tab } from '@headlessui/react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import IconDownload from '../../../components/Icon/IconDownload';
import IconLogout from '../../../components/Icon/IconLogout';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchData, get, post } from '../../api/ApiCalls';
import { List } from 'lodash';
import { Api } from '../../api/Api';

const Cities = (props: any) => {

    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const rowData: List<any> | null | undefined = [];
    
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(sortBy(rowData, 'id'));
    const [recordsData, setRecordsData] = useState(initialRecords);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);
    const [modal5, setModal5] = useState(false);
    const [editeddata, seteditdata] = useState<any>(false);
    const [viewdata, setviewdata] = useState<any>(false);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'id', direction: 'asc' });
    const [cities, setcities] = useState<any>([]);
    const [selectedCountry, setselectedCountry] = useState<any>({});
    const [selectedState, setselectedState] = useState<any>({});
    const [data, setdata] = useState<any>('');
    const [name, setname] = useState<any>('');
    const [nameArabic, setnameArabic] = useState<any>('');
    const [cityCode, setcityCode] = useState<any>('');
    const [status, setstatus] = useState<any>(false);
    const [dataid, setid] = useState<any>('');
    const [loader, setLoader] = useState(true);
    const [error, setError] = useState<any>('');
    const [errorarabic, setErrorArabic] = useState<any>('');
    const [errorCode, seterrorCode] = useState<any>('');
    const [errorCountry, seterrorCountry] = useState<any>('');
    const [errorState, seterrorState] = useState<any>('');
    const [countries, setcountries] = useState<any>([]);
    const [states, setstates] = useState<any>([]);
    const [modal6, setModal6] = useState(false);

    // Export CSV 
    const [LoadingCsvButton, SetLoadingCsvButton] = useState(false);
    const [permissionsData, setpermissionsData] = useState<any>([])
    const [importLoader, setimportLoader] = useState(false);

    // File
    const [File, setFile] = useState<any>([]);
    const [csvError, setcsvError] = useState(false);

    const getCities = () => {
        get('city').then((responseJson: any) => {
            setcities(responseJson.data)
        })
    }
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        const token_expiry = localStorage.getItem('token_expiry');
        let isExpired = false;
        if(token_expiry){
            var current_date = new Date();
            var expiry = new Date(token_expiry);
            if(current_date>expiry){
                isExpired=true;
            }
        }
        if (!token || isExpired) {
  var senddata = {
        };
        post('user/logout',senddata).then((responseJson: any) => {
            if (responseJson.success === true) {
                localStorage.clear()
                navigate('/auth/login')
            } else {
                console.error('Logout failed', responseJson);
            }
        });
            navigate('/auth/login')
        }
        else {
            getCities()
            getLocationData()
            setTimeout(
                function () {
                    setLoader(false)
                }.bind(this),
                3000
            );
        }
        dispatch(setPageTitle('Cities Listing'));
    }, [props]);

    const EditData = (id: any) => {
        const maindata = cities.filter((item: any) =>
            item.id === id
        );
        setdata(maindata[0])
        setname(maindata[0]?.name)
        setnameArabic(maindata[0]?.name_arabic)
        setcityCode(maindata[0]?.code)
        setstatus(maindata[0]?.status)
        var selectedCountry = countries?.filter((item:any ) => item?.value == maindata[0]?.country_id)[0]
        setselectedCountry(selectedCountry)
        var selectedState = states?.filter((item:any ) => item?.value == maindata[0]?.state_id)[0]
        setselectedState(selectedState)
        setid(maindata[0]?.id)
    }

    const coloredToast = (color: any, message: any) => {
        const toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: {
                popup: `color-${color}`,
            },
        });
        toast.fire({
            title: message,
        });
    };

    const UpdateData = () => {
        var sendUpdateData = {
            name: name,
            name_arabic: nameArabic,
            status: status ? '1' : '0',
            code: cityCode,
            country_id: selectedCountry?.value,
            state_id: selectedState?.value,
        }
        if (!name || !nameArabic || !cityCode || (!selectedCountry || !Object?.values(selectedCountry)?.length) || (!selectedState || !Object?.values(selectedState)?.length)) {
            if (!name) {
                setError(true)
                setTimeout(function () {
                    setError(false)
                }, 3000)
            }
            if (!nameArabic) {
                setErrorArabic(true)
                setTimeout(function () {
                    setErrorArabic(false)
                }, 3000)
            }
            if (!cityCode) {
                seterrorCode(true)
                setTimeout(function () {
                    seterrorCode(false)
                }, 3000)
            }
            if (!selectedCountry || !Object?.values(selectedCountry)?.length) {
                seterrorCountry(true)
                setTimeout(function () {
                    seterrorCountry(false)
                }, 3000)
            }
            if (!selectedState || !Object?.values(selectedState)?.length) {
                seterrorState(true)
                setTimeout(function () {
                    seterrorState(false)
                }, 3000)
            }
            return false
        }
        post('city/' + dataid + '/update', sendUpdateData).then((responseJson: any) => {
            if (responseJson.success === true) {
                setModal5(false)
                coloredToast('success', 'Success! City successfully update')
                getCities();
            }
            else if (Object?.values(responseJson?.errors)?.length) {
                coloredToast('danger', 'Error! ' + responseJson?.message)
            }
            else {
                coloredToast('danger', 'Error! Please check data and try again')
            }
        })
    }
    function submitData() {
        var sendData = {
            name: name,
            name_arabic: nameArabic,
            status: status ? '1' : '0',
            code: cityCode,
            country_id: selectedCountry?.value,
            state_id: selectedState?.value,
        }
        if (!name || !nameArabic || !cityCode || (!selectedCountry || !Object?.values(selectedCountry)?.length) || (!selectedState || !Object?.values(selectedState)?.length)) {
            if (!name) {
                setError(true)
                setTimeout(function () {
                    setError(false)
                }, 3000)
            }
            if (!nameArabic) {
                setErrorArabic(true)
                setTimeout(function () {
                    setErrorArabic(false)
                }, 3000)
            }
            if (!cityCode) {
                seterrorCode(true)
                setTimeout(function () {
                    seterrorCode(false)
                }, 3000)
            }
            if (!selectedCountry || !Object?.values(selectedCountry)?.length) {
                seterrorCountry(true)
                setTimeout(function () {
                    seterrorCountry(false)
                }, 3000)
            }
            if (!selectedState || !Object?.values(selectedState)?.length) {
                seterrorState(true)
                setTimeout(function () {
                    seterrorState(false)
                }, 3000)
            }
            return false
        }
        post("city", sendData).then((responseJson: any) => {
            if (responseJson.success === true) {
                setModal5(false)
                coloredToast('success', 'Success! City successfully created')
                getCities();
            }
            else if (Object?.values(responseJson?.errors)?.length) {
                coloredToast('danger', 'Error! ' + responseJson?.message)
            }
            else {
                coloredToast('danger', 'Error! Please check data and try again')
            }
        })
    }

    const getLocationData = () => {
        if(editeddata === true) {
            get('city/'+ dataid +'/edit').then((responseJson: any) => {
                var edit = responseJson.editdata
                var data = responseJson.data
                setcountries(data.country_data)
                setstates(data.state_data)
            })
        }
        else {
            get('city/create').then((responseJson: any) => {
                var data = responseJson.data
                setcountries(data.country_data)
                setstates(data.state_data)
            })
        }
    }

    useEffect(() => {
        setInitialRecords(cities);
    }, [cities]);

    useEffect(() => {
        var filterData = cities.filter((item: any) => {
            return (
                item.name?.toString().toLowerCase().includes(search.toLowerCase()) ||
                item.name_arabic?.toString().toLowerCase().includes(search.toLowerCase()) ||
                item.code?.toString().toLowerCase().includes(search.toLowerCase())
            );
        });
        setInitialRecords(filterData);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        setPage(1);
    }, [sortStatus]);
    useEffect(() => {
        if (!modal5) {
            setdata([])
            setname('')
            setnameArabic('')
            setcityCode('')
            setselectedCountry('')
            setselectedState('')
            setstatus(false)
            setid(false)
        }
    }, [modal5])

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
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'No, cancel!',
                reverseButtons: true,
                padding: '2em',
            })
            .then((result) => {
                if (result.value) {
                    get('city/' + id + '/delete').then((responseJson: any) => {
                        if (responseJson?.success === true) {
                            getCities();
                            swalWithBootstrapButtons.fire('Deleted!', 'City has been deleted.', 'success');
                        }
                    })
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    swalWithBootstrapButtons.fire('Cancelled', 'City is safe :)', 'error');
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
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'No, cancel!',
                reverseButtons: true,
                padding: '2em',
            })
            .then((result) => {
                if (result.value) {
                    post('city/multidelete', { id: selectedRecords.map(function (a: { id: any; }) { return a.id; }) }).then((responseJson: any) => {
                        if (responseJson.success === true) {
                            getCities();
                            setSelectedRecords([])
                            swalWithBootstrapButtons.fire('Deleted!', 'Your cities has been deleted.', 'success');
                        }
                    })

                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    swalWithBootstrapButtons.fire('Cancelled', 'Your cities is safe :)', 'error');
                }
            });
        }
    };

    const exportCsvFun = () => {
        SetLoadingCsvButton(true)
        var sendExportData = {
            id: true,
            name: true,
            name_arabic: true,
            code: true,
            status: true,
            country: true,
            state: true,
        }
        fetchData('cities-csv', sendExportData).then((responseJson: any) => {
            const url = window.URL.createObjectURL(responseJson);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'cities.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            SetLoadingCsvButton(false)
        })
    }

    const importCSV = async () => {
        if (!File.length) {
            if (!File.length) {
                setcsvError(true)
                setTimeout(function () {
                    setcsvError(false)
                }, 3000)
            }
            return false
        }
        setimportLoader(true)
        const formData = new FormData();
        formData.append("file", File[0]);
        const data = await fetch(Api + 'csv/cities', {
            method: "post",
            body: formData,
        });
        const uploadFile = await data.json();
        if (uploadFile.success === true) {
            coloredToast('success', 'Success! Cities successfully imported')
            getCities()
            setModal6(false)
            setimportLoader(false)
        } else {
            coloredToast('danger', 'Error! Please check data and try again')
            setimportLoader(false)
        }
    } 

    return (
        <div>
            <div className="panel">
                <div className="md:items-center md:flex-row flex-col gap-5">
                    <div className="flex items-center gap-2 pb-5">
                        <button type="button" className="btn btn-danger gap-2"
                            disabled={selectedRecords?.length >= 1 ? false : true}
                            onClick={() => showAlert(11)}>
                            <IconTrashLines />
                        </button>
                        <button type="button" onClick={() => setModal6(true)} className="btn btn-success gap-2">
                            <IconDownload className='shrink-0' />
                            {t('import')}
                        </button>
                        {LoadingCsvButton == true ?  
                            <button disabled type="button" className="btn btn-primary text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:focus:ring-white-800 inline-flex items-center">
                            <svg aria-hidden="true" role="status" className="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                            </svg>
                            {t('loading')}
                            </button>
                            :
                            <button type="button" className="btn btn-warning gap-2" onClick={() => {
                                exportCsvFun()
                            }}>
                                <IconLogout className='shrink-0' />
                                {t('export')}
                            </button>
                        }
                        <button type="button" onClick={() => { seteditdata(false), setviewdata(false), setModal5(true) }} className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('createCities')}
                        </button>
                        <div className="flex gap-2 items-center ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <Transition appear show={modal5} as={Fragment}>
                            <Dialog as="div" open={modal5} onClose={() => setModal5(false)}>
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0"
                                    enterTo="opacity-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100"
                                    leaveTo="opacity-0"
                                >
                                    <div className="fixed inset-0" />
                                </Transition.Child>
                                <div className="fixed inset-0 bg-[black]/60 z-[999]">
                                    <div className="flex items-start justify-center min-h-screen px-4">
                                        <Transition.Child
                                            as={Fragment}
                                            enter="ease-out duration-300"
                                            enterFrom="opacity-0 scale-95"
                                            enterTo="opacity-100 scale-100"
                                            leave="ease-in duration-200"
                                            leaveFrom="opacity-100 scale-100"
                                            leaveTo="opacity-0 scale-95"
                                        >
                                            <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-4xl my-8 text-black dark:text-white-dark h-[62vh]">
                                                <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                                    <h5 className="font-bold text-lg">{editeddata ? t("editCity") : viewdata ? t("viewCity") : t("addNewCity")}</h5>
                                                    <button onClick={() => setModal5(false)} type="button" className="text-white-dark hover:text-dark">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round">
                                                            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="p-5">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="w-full">
                                                            <label htmlFor="country" className='text-sm'>{t('selectCountry')}</label>
                                                            <Select
                                                                options={countries}
                                                                value={selectedCountry}
                                                                isSearchable={true}
                                                                placeholder={t('select')}
                                                                isDisabled={viewdata}
                                                                className=' text-sm'
                                                                onChange={(e:any) => {
                                                                    setselectedCountry(e)
                                                                }}
                                                            />
                                                            {errorCountry ? (
                                                                <label
                                                                    htmlFor="invalid"
                                                                    className="d-block fs-9 mt-0 text-danger text-sm "
                                                                >
                                                                    {t('pleaseAddCountry')}
                                                                </label>
                                                            ) : null}
                                                        </div>
                                                        <div className="w-full">
                                                            <label htmlFor="state" className='text-sm'>{t('selectState')}</label>
                                                            <Select
                                                                options={states}
                                                                value={selectedState}
                                                                isSearchable={true}
                                                                placeholder={t('select')}
                                                                isDisabled={viewdata}
                                                                className=' text-sm'
                                                                onChange={(e:any) => {
                                                                    setselectedState(e)
                                                                }}
                                                            />
                                                            {errorState ? (
                                                                <label
                                                                    htmlFor="invalid"
                                                                    className="d-block fs-9 mt-0 text-danger text-sm "
                                                                >
                                                                    {t('pleaseAddState')}
                                                                </label>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3 mt-3">
                                                        <div className="w-full">
                                                            <label htmlFor="name" className="mb-1 text-sm">
                                                                {t('cityName-En')}
                                                            </label>
                                                            <input id="name" type="text" name="name" disabled={viewdata} className="form-input w-6/6 text-sm" placeholder={t('cityName-En')} 
                                                            value={name}
                                                            onChange={(e: any) => {
                                                                setname(e.target.value)
                                                            }}
                                                            />
                                                            {error ? (
                                                                <label
                                                                    htmlFor="invalid"
                                                                    className="d-block fs-9 mt-0 text-danger text-sm "
                                                                >
                                                                    {t('pleaseFillName')}
                                                                </label>
                                                            ) : null}
                                                        </div>
                                                        <div className="w-full">
                                                            <label htmlFor="nameArabic" className="mb-1 text-sm">
                                                                {t('cityName-Ar')}
                                                            </label>
                                                            <input id="nameArabic" type="text" name="name_arabic" disabled={viewdata} className="form-input w-6/6 text-sm  text-right" placeholder="المدينة (الاسم عربي)" 
                                                            value={nameArabic}
                                                            onChange={(e: any) => {
                                                                setnameArabic(e.target.value)
                                                            }}
                                                            />
                                                            {errorarabic ? (
                                                                <label
                                                                    htmlFor="invalid"
                                                                    className="d-block fs-9 mt-0 text-danger text-sm "
                                                                >
                                                                    {t('pleaseFillNameArabic')}
                                                                </label>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3 mt-3">
                                                        <div className="w-full">
                                                            <label htmlFor="code" className="mb-1 text-sm">
                                                                {t('cityCode')}
                                                            </label>
                                                            <input id="code" type="text" name="code" disabled={viewdata} className="form-input w-6/6 text-sm" placeholder={t('code')} 
                                                            value={cityCode}
                                                            onChange={(e: any) => {
                                                                setcityCode(e.target.value)
                                                            }}
                                                            />
                                                            {errorCode ? (
                                                                <label
                                                                    htmlFor="invalid"
                                                                    className="d-block fs-9 mt-0 text-danger text-sm "
                                                                >
                                                                    {t('pleaseFillCode')}
                                                                </label>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className='flex justify-end items-center mt-8'>
                                                        <div className="w-full absolute left-3 bottom-4">
                                                            <label className="mb-0">
                                                                <input type="checkbox" name="status" className="form-checkbox" disabled={viewdata} 
                                                                checked={status == 1 ? true : false}
                                                                onChange={(e: any) => {
                                                                    setstatus(e.target.checked)
                                                                }}
                                                                />
                                                                <span className="mb-0 text-sm">{t('enableCity')}</span>
                                                            </label>
                                                        </div>
                                                        <button onClick={() => {
                                                            if (viewdata === false) {
                                                                if (editeddata == true) {
                                                                    UpdateData();
                                                                }
                                                                else {
                                                                    submitData();
                                                                }
                                                            } else {
                                                                setModal5(false)
                                                                setviewdata(false)
                                                            }
                                                        }}
                                                            type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4 absolute right-3 bottom-4 ">
                                                            {viewdata ? t('close') : t('save')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </Dialog.Panel>
                                        </Transition.Child>
                                    </div>
                                </div>
                            </Dialog>
                        </Transition>
                    </div>
                </div>
                <Transition appear show={modal6} as={Fragment}>
                    <Dialog as="div" open={modal6} onClose={() => setModal6(false)}>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0" />
                        </Transition.Child>
                        <div className="fixed inset-0 bg-[black]/60 z-[999]">
                            <div className="flex items-start justify-center min-h-screen px-4">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >
                                    <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-4xl my-8 text-black dark:text-white-dark h-[62vh]">
                                        <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                            <h5 className="font-bold text-lg">{t('uploadFile')}</h5>
                                            <button onClick={() => {
                                                seteditdata(false)
                                                setModal6(false)
                                            }} type="button" className="text-white-dark hover:text-dark">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin ="round"
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="p-4">
                                            <div>
                                                <input
                                                    id="ctnFile"
                                                    type="file"
                                                    className="form-input file:py-2 file:px-4 file:border-0 file:font-semibold p-0 file:bg-primary/90 ltr:file:mr-5 rtl:file-ml-5 file:text-white file:hover:bg-primary"
                                                    required
                                                    onChange={(e) => {
                                                        setFile(e.target.files)
                                                    }}
                                                />
                                                <a href={'/assets/csv-doc/city-sample.csv'} download="city-sample.csv">
                                                    <button className='underline mt-2 float-right text-sm font-bold text-success mb-6'>
                                                        {t('downloadSampleCsv')}
                                                    </button>
                                                </a>
                                                {csvError ? (
                                                    <label
                                                        htmlFor="invalid"
                                                        className="d-block fs-9 mt-0 text-danger text-sm "
                                                    >
                                                        {t('pleaseUploadFile!')}
                                                    </label>
                                                ) : null}
                                            </div>
                                            <div className="flex justify-end items-center mt-20">
                                                {importLoader == true ?
                                                    <button disabled type="button" className="btn btn-primary text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 dark:focus:ring-white-800 inline-flex items-center">
                                                        <svg aria-hidden="true" role="status" className="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                                                        </svg>
                                                        {t('loading')}
                                                    </button>
                                                    :
                                                    <button onClick={() => { importCSV() }} type="button" className="absolute right-3 bottom-4 btn btn-primary ltr:ml-4 rtl:mr-4">
                                                        {t('import')}
                                                    </button>
                                                }
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>   
                <div className="datatables">
                    <DataTable
                        noRecordsText={("noResultsMatchQuery")}
                        highlightOnHover
                        className="whitespace-nowrap table-hover"
                        records={recordsData}
                        fetching={loader}
                        customLoader={
                            <span className="animate-spin border-4 border-transparent border-l-primary rounded-full w-10 h-10 inline-block align-middle mb-10"></span>
                        }
                        loaderBackgroundBlur={5}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('sNo'),
                                sortable: true,
                                render: ({ id }: any) => <strong className="text-info">{id}</strong>,
                            },
                            {
                                accessor: 'cityCode',
                                title: t('cityCode'),
                                sortable: true,
                                render: ({ code }: any) => <div className="font-semibold">{code}</div>,
                            },
                            {
                                accessor: 'name',
                                title: t('cityNameEn'),
                                sortable: true,
                                render: ({ name }: any) => <div className="font-semibold">{name}</div>,
                            },
                            {
                                accessor: 'name_arabic',
                                title: t('cityNameAr'),
                                sortable: true,
                                render: ({ name_arabic }: any) => <div className="font-semibold">{name_arabic}</div>,
                            },
                            {
                                accessor: 'stateName',
                                title: t('stateName'),
                                sortable: true,
                                render: ({ state_data }: any) => <div className="font-semibold">{state_data?.name}</div>,
                            },
                            {
                                accessor: 'countryName',
                                title: t('countryName'),
                                sortable: true,
                                render: ({ country_data }: any) => <div className="font-semibold">{country_data?.name}</div>,
                            },
                            {
                                accessor: 'status',
                                title: t('status'),
                                sortable: true,
                                render: ({ status, id }: any) => <div className={`font-semibold ${status === 1 ? 'text-success' : 'text-danger'}`}>{status === 1 ? 'Enable' : 'Disable'}</div>,
                            },
                            {
                                accessor: 'action',
                                title: t('action'),
                                titleClassName: '!text-center',
                                render: ({ id }: any) => (
                                    <div className="flex items-center w-max mx-auto gap-2">
                                        <Tippy content="View">
                                            <button type="button" onClick={() => {
                                                seteditdata(true);
                                                EditData(id);
                                                setviewdata(true)
                                                setModal5(true);
                                            }} >
                                                <IconEye />
                                            </button>
                                        </Tippy>
                                        <Tippy content="Edit">
                                            <button type="button" onClick={() => {
                                                seteditdata(true);
                                                setviewdata(false)
                                                EditData(id);
                                                setModal5(true);
                                            }} >
                                                <IconPencil />
                                            </button>
                                        </Tippy>
                                        <Tippy content="Delete">
                                            <button type="button" onClick={() => deleteRow(id)}>
                                                <IconTrashLines />
                                            </button>
                                        </Tippy>
                                    </div>
                                ),
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
                        paginationText={({ from, to, totalRecords }) => `${t("showing")}  ${from} ${t("to")} ${to} ${t("of")} ${totalRecords} ${t("entries")}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default Cities;
