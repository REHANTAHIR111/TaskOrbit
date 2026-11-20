import React, { useContext } from 'react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setPageTitle, toggleMenu, toggleRTL } from '../../store/themeConfigSlice';
import { IRootState } from '../../store';
import { get, post } from "../api/ApiCalls";
import Swal from 'sweetalert2';
import i18next from 'i18next';
import DeviceDetector from "device-detector-js";
import { useTranslation } from 'react-i18next';
import i18n from '../../../src/i18n';
import GlobalContext from '../../GlobalContext';

const LoginCover = (props: any) => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    useEffect(() => {
        dispatch(setPageTitle('Login Cover'));
        dispatch(toggleMenu('vertical'))
    }, [dispatch]);
    const navigate = useNavigate();
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const setLocale = (flag: string) => {
        setFlag(flag);
        if (flag.toLowerCase() === 'ae') {
            dispatch(toggleRTL('rtl'));
        } else {
            dispatch(toggleRTL('ltr'));
        }
    };
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>('');
    const [Loader, setLoader] = useState<any>('');
    const [passwordError, setpasswordError] = useState(false);
    const [forgot, setForgot] = useState<any>(false);
    const [showPassword, setShowPassword] = useState(false);
    const [flag, setFlag] = useState(themeConfig.locale);
    const {userPersonalGlobal,setUserPersonalGlobal} = useContext<any>(GlobalContext);

    const handleSubmit = (event: any) => {
        event.preventDefault();
        submitData();
    };


    // function submitData() {
    //     const deviceDetector = new DeviceDetector();
    //     const device:any = deviceDetector.parse(navigator.userAgent); 

    //     const deviceInfo = `Browser: ${device?.client?.name || "Unknown"},
    //                 Device Type: ${device?.device?.type || "Unknown"},
    //                 OS: ${device?.os?.name || "Unknown"}`;
    //     var sendData = {
    //         email: email,
    //         password: password,
    //         device_info: deviceInfo
    //     }

    //     if (!email || !password) {
    //         coloredToast('danger', `${t('pleaseAdd')} ` + (!email ? `${t('email')}, ` : '') + (!password ? `${t('password')}, ` : '') + '!')
    //         if (!email) {
    //             setError(true)
    //             setTimeout(function () {
    //                 setError(false)
    //             }, 3000)
    //         }
    //         if (!password) {
    //             setpasswordError(true)
    //             setTimeout(function () {
    //                 setpasswordError(false)
    //             }, 3000)
    //         }
    //         return false
    //     }
    //     setLoader(true)
    //     post("user/login", sendData).then(async (responseJson: any) => {
    //         if (responseJson.success === true) {
    //             localStorage.setItem('user_id', responseJson.user_data?.id || "");
    //             localStorage.setItem('role', responseJson.role?.id || "");
    //             localStorage.setItem('role_name', responseJson.role?.name || "");
    //             localStorage.setItem('user_code', responseJson?.role?.code || "");
    //             localStorage.setItem('token', responseJson.token || "");
    //             localStorage.setItem('token_expiry', responseJson.token_expiry || "");
    //             localStorage.setItem('userName', responseJson.user_data?.name || "");
    //             localStorage.setItem('userEmail', responseJson.user_data?.email || "");
    //             localStorage.setItem('company_name', responseJson.company?.company_name || "");
    //             localStorage.setItem('company_id',responseJson?.user_data?.company_id || "");
    //             localStorage.setItem('is_company_user',responseJson?.user_data?.company_id || "");
    //             localStorage.setItem('company_identifier',responseJson?.company?.company_identifier || "");
    //             localStorage.setItem('country_name', responseJson.country?.name || "");
    //             localStorage.setItem('country_code', responseJson.country?.code || "");
    //             localStorage.setItem('country_flag', responseJson.country?.flag || "");
    //             localStorage.setItem('country_currency_symbol', responseJson.country?.currency_symbol || "");
    //             localStorage.setItem('country_currency_name', responseJson.country?.currency_name || "");
    //             localStorage.setItem('country_dial_code', responseJson.country?.dial_code || "");

    //             const LangData = responseJson.language_data;
    //             const defaultLanguageCode = 'en';
    //             const languageCode: string = LangData[0]?.code || defaultLanguageCode;

    //             i18next.changeLanguage(languageCode);
    //             const arabicLanguages:any = LangData.filter((lang: any) => lang.code === 'ae');
    //             const isArabicLanguage:any = arabicLanguages.length > 0;
    //             localStorage.setItem('language_code', isArabicLanguage ? 'ae' : 'en');
    //             if (languageCode.toLowerCase() === 'ae' || languageCode.toLowerCase() === 'ar') {
    //                 localStorage.setItem('rtlClass', 'rtl'); 
    //                 dispatch(toggleRTL('rtl'));
    //             } else {
    //                 localStorage.setItem('rtlClass', 'ltr'); 
    //                 dispatch(toggleRTL('ltr'));  
    //             }
    //             navigate("/");

    //             coloredToast('success', t('youAreSuccessfullyLoggedIn'));
    //         } else {
    //             coloredToast('danger', t('invalidCredentials'));
    //         }
    //         setLoader(false);
    //     }).catch((error: any) => {
    //         console.error('Login failed:', error);
    //         coloredToast('danger', t('invalidCredentials'));
    //         setLoader(false);
    //     });
    // }

    // function submitData() {
    //     localStorage.removeItem('lockScreen')
    //     const deviceDetector = new DeviceDetector();
    //     const device: any = deviceDetector.parse(navigator.userAgent);

    //     const deviceInfo = `Browser: ${device?.client?.name || "Unknown"},
    //                         Device Type: ${device?.device?.type || "Unknown"},
    //                         OS: ${device?.os?.name || "Unknown"}`;
    
    //     var sendData = {
    //         email: email,
    //         password: password,
    //         device_info: deviceInfo
    //     };
    
    //     if (!email || !password) {
    //         coloredToast('danger', `${t('pleaseAdd')} ` + (!email ? `${t('email')} ${!email && password ? '' : ', '} ` : '') + (!password ? `${t('password')} ${!password && email ? '' : !password && !email ? '' : ', '} ` : '') + '!');
    //         if (!email) {
    //             setError(true);
    //             setTimeout(function () {
    //                 setError(false);
    //             }, 3000);
    //         }
    //         if (!password) {
    //             setpasswordError(true);
    //             setTimeout(function () {
    //                 setpasswordError(false);
    //             }, 3000);
    //         }
    //         return false;
    //     }
    
    //     setLoader(true);
    
    //     // Post login request
    //     post("user/login", sendData).then(async (responseJson: any) => {
    
    //             if (responseJson.message && responseJson.message == 'Multiple login detected. You are already logged in on another device.') {
    
    //                 const userConfirmed = confirm(responseJson.message + " Do you want to log out the other session?");
    
    //                 if (userConfirmed) {
    //                     console.log('User confirmed to log out the other session');
    //                     // If user clicked "OK", proceed with login logic
    //                     const revokeData = { user_id: responseJson?.user_data?.id ,current_token: responseJson?.token_id};
    
    //                     post("user/revoke-old-session", revokeData).then((revokeResponse: any) => {
    //                         if (revokeResponse.success) {
    //                             // Proceed with successful login after logging out the previous session
    //                             localStorage.setItem('user_id', responseJson?.user_data?.id || "");
    //                             localStorage.setItem('user_personal', JSON.stringify(responseJson?.user_data?.user_personale || {}));
    //                             localStorage.setItem('role', responseJson?.role?.id || "");
    //                             localStorage.setItem('role_name', responseJson?.role?.name || "");
    //                             localStorage.setItem('user_code', responseJson?.role?.code || "");
    //                             localStorage.setItem('token', responseJson?.token || "");
    //                             localStorage.setItem('token_expiry', responseJson?.token_expiry || "");
    //                             localStorage.setItem('userName', responseJson?.user_data?.name || "");
    //                             localStorage.setItem('userEmail', responseJson?.user_data?.email || "");
    //                             localStorage.setItem('company_name', responseJson?.company?.company_name || "");
    //                             localStorage.setItem('company_id', responseJson?.user_data?.company_id || "");
    //                             localStorage.setItem('is_company_user', responseJson?.user_data?.company_id || "");
    //                             localStorage.setItem('company_identifier', responseJson?.company?.company_identifier || "");
    //                             localStorage.setItem('country_name', responseJson?.country?.name || "");
    //                             localStorage.setItem('country_code', responseJson?.country?.code || "");
    //                             localStorage.setItem('country_flag', responseJson?.country?.flag || "");
    //                             localStorage.setItem('country_currency_symbol', responseJson?.country?.currency_symbol || "");
    //                             localStorage.setItem('country_currency_name', responseJson?.country?.currency_name || "");
    //                             localStorage.setItem('country_dial_code', responseJson?.country?.dial_code || "");
    //                             localStorage.setItem('user_image', responseJson?.user_data?.image || "");
    //                             localStorage.setItem('departments',JSON.stringify(responseJson?.user_data?.departments) || "")
    //                             const LangData = responseJson?.language_data;
    //                             const defaultLanguageCode = 'en';
    //                             const languageCode: string = LangData[0]?.code || defaultLanguageCode;
    
    //                             i18next.changeLanguage(languageCode);
    //                             const arabicLanguages: any = LangData.filter((lang: any) => lang.code === 'ae');
    //                             const isArabicLanguage: any = arabicLanguages.length > 0;
    //                             localStorage.setItem('language_code', isArabicLanguage ? 'ae' : 'en');
    //                             if (languageCode.toLowerCase() === 'ae' || languageCode.toLowerCase() === 'ar') {
    //                                 localStorage.setItem('rtlClass', 'rtl');
    //                                 dispatch(toggleRTL('rtl'));
    //                             } else {
    //                                 localStorage.setItem('rtlClass', 'ltr');
    //                                 dispatch(toggleRTL('ltr'));
    //                             }
    
    //                             navigate("/");
    
    //                             coloredToast('success', t('youAreSuccessfullyLoggedIn'));
    //                         } else {
    //                             coloredToast('danger', t('failedToLogOutPreviousSession'));
    //                             setLoader(false);
    //                         }
    //                     }).catch((error: any) => {
    //                         console.error('Failed to revoke session:', error);
    //                         coloredToast('danger', t('failedToLogOutPreviousSession'));
    //                         setLoader(false);
    //                     });
    //                 } else {
    //                     console.log('User canceled the action');
    //                     // If user clicked "Cancel", stay on the login page
    //                     setLoader(false);
    //                 }
    //             } else {
    //                 localStorage.setItem('user_id', responseJson?.user_data?.id || "");
    //                 localStorage.setItem('user_personal', JSON.stringify(responseJson?.user_data?.user_personale || {}));
    //                 localStorage.setItem('role', responseJson?.role?.id || "");
    //                 localStorage.setItem('role_name', responseJson?.role?.name || "");
    //                 localStorage.setItem('user_code', responseJson?.role?.code || "");
    //                 localStorage.setItem('token', responseJson?.token || "");
    //                 localStorage.setItem('token_expiry', responseJson?.token_expiry || "");
    //                 localStorage.setItem('userName', responseJson?.user_data?.name || "");
    //                 localStorage.setItem('userEmail', responseJson?.user_data?.email || "");
    //                 localStorage.setItem('company_name', responseJson?.company?.company_name || "");
    //                 localStorage.setItem('company_id', responseJson?.user_data?.company_id || "");
    //                 localStorage.setItem('is_company_user', responseJson?.user_data?.company_id || "");
    //                 localStorage.setItem('company_identifier', responseJson?.company?.company_identifier || "");
    //                 localStorage.setItem('country_name', responseJson?.country?.name || "");
    //                 localStorage.setItem('country_code', responseJson?.country?.code || "");
    //                 localStorage.setItem('country_flag', responseJson?.country?.flag || "");
    //                 localStorage.setItem('country_currency_symbol', responseJson?.country?.currency_symbol || "");
    //                 localStorage.setItem('country_currency_name', responseJson?.country?.currency_name || "");
    //                 localStorage.setItem('country_dial_code', responseJson?.country?.dial_code || "");
    //                 localStorage.setItem('departments',JSON.stringify(responseJson?.user_data?.departments) || "")

    //                 const LangData = responseJson?.language_data;
    //                 const defaultLanguageCode = 'en';
    //                 const languageCode: string = LangData[0]?.code || defaultLanguageCode;
    
    //                 i18next.changeLanguage(languageCode);
    //                 const arabicLanguages: any = LangData.filter((lang: any) => lang.code === 'ae');
    //                 const isArabicLanguage: any = arabicLanguages.length > 0;
    //                 localStorage.setItem('language_code', isArabicLanguage ? 'ae' : 'en');
    //                 if (languageCode.toLowerCase() === 'ae' || languageCode.toLowerCase() === 'ar') {
    //                     localStorage.setItem('rtlClass', 'rtl');
    //                     dispatch(toggleRTL('rtl'));
    //                 } else {
    //                     localStorage.setItem('rtlClass', 'ltr');
    //                     dispatch(toggleRTL('ltr'));
    //                 }
    
    //                 navigate("/");
    
    //                 coloredToast('success', t('youAreSuccessfullyLoggedIn'));
    //             }
            
    //     }).catch((error: any) => {
    //         console.error('Login failed:', error);
    //         coloredToast('danger', t('invalidCredentials'));
    //         setLoader(false);
    //     });
    // }

    async function submitData() {
        localStorage.removeItem('lockScreen');
        const deviceDetector = new DeviceDetector();
        const device: any = deviceDetector.parse(navigator.userAgent);
        
        const deviceInfo = `Browser: ${device?.client?.name || "Unknown"},
                            Device Type: ${device?.device?.type || "Unknown"},
                            OS: ${device?.os?.name || "Unknown"}`;
        
        if (!email || !password) {
            coloredToast('danger', `${t('pleaseAdd')} ` + 
                (!email ? `${t('email')} ` : '') + 
                (!password ? `${t('password')} ` : '') + '!');
            
            if (!email) {
                setError(true);
                setTimeout(() => setError(false), 3000);
            }
            if (!password) {
                setpasswordError(true);
                setTimeout(() => setpasswordError(false), 3000);
            }
            return;
        }
    
        setLoader(true);
    
        try {
            // Send login request
            const responseJson: any = await post("user/login", {
                email,
                password,
                device_info: deviceInfo
            });
    
            // If multiple login detected, ask the user
            if (responseJson?.message === 'Multiple login detected. You are already logged in on another device.') {
                const result = await Swal.fire({
                    title: t('multipleLoginDetected'),
                    text: t('logoutOtherSession'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: t('yesLogout'),
                    cancelButtonText: t('loginCancel'),
                    reverseButtons: true,
                    customClass: {
                        confirmButton: 'btn btn-secondary',
                        cancelButton: 'btn btn-dark ltr:mr-3 rtl:ml-3',
                        popup: 'sweet-alerts',
                    },
                    buttonsStyling: false,
                    didOpen: () => {
                        const htmlContainer = document.querySelector('.swal2-html-container') as any;
                        if (htmlContainer) {
                            htmlContainer.setAttribute(
                                'style',
                                'color: gray !important; font-size: 13px;'
                            );
                            
                        }
                    }
                });                
    
                if (!result.isConfirmed) {
                    setLoader(false);
                    return;
                }
    
                // Revoke old session before continuing
                const revokeResponse: any = await post("user/revoke-old-session", {
                    user_id: responseJson?.user_data?.id,
                    current_token: responseJson?.token_id
                });
    
                if (!revokeResponse.success) {
                    // Swal.fire({
                    //     title: t('error'),
                    //     text: t('failedToLogOutPreviousSession'),
                    //     icon: 'error',
                    //     confirmButtonText: t('ok')
                    // });
                    setLoader(false);
                    return;
                }
            }
            
            const user_displayname: any = responseJson?.user_data?.user_personale?.display_name ? responseJson?.user_data?.user_personale?.display_name : responseJson?.user_data?.name + ' ' + responseJson?.user_data?.name;
            // Handle successful login
            localStorage.setItem('user_id', responseJson?.user_data?.id || "");
            localStorage.setItem('user_personal', JSON.stringify(responseJson?.user_data?.user_personale || {}));
            setUserPersonalGlobal(responseJson?.user_data?.user_personale)
            localStorage.setItem('role', responseJson?.role?.id || "");
            localStorage.setItem('role_name', responseJson?.role?.name || "");
            localStorage.setItem('user_code', responseJson?.role?.code || "");
            localStorage.setItem('token', responseJson?.token || "");
            localStorage.setItem('token_expiry', responseJson?.token_expiry || "");
            localStorage.setItem('userName', responseJson?.user_data?.name || "");
            localStorage.setItem('userDisplayName', user_displayname || "");
            localStorage.setItem('userEmail', responseJson?.user_data?.email || "");
            localStorage.setItem('company_name', responseJson?.company?.company_name || "");
            localStorage.setItem('company_image', responseJson?.company?.image || "");
            localStorage.setItem('allow_tag_creation', responseJson?.company?.account?.allow_chat_creation || "");
            localStorage.setItem('timezone', responseJson?.company?.account?.timezone ? responseJson?.company?.account?.timezone : "");
            const companies = responseJson?.all_companies;
            localStorage.setItem('company_id', responseJson?.user_data?.company_id || "");
            localStorage.setItem('is_company_user', responseJson?.user_data?.company_id || "");
            localStorage.setItem('company_identifier', responseJson?.company?.company_identifier || "");
            if(companies?.length == 1 && !responseJson?.user_data?.company_id) {
                localStorage.setItem('company_id', companies[0]?.id || "");
                localStorage.setItem('is_company_user', companies[0]?.id || "");
                localStorage.setItem('company_identifier', companies[0]?.company_identifier || "");
                localStorage.setItem('high_load_dashboard', companies[0]?.high_load_dashboard || "");
            }
            localStorage.setItem('country_name', responseJson?.country?.name || "");
            localStorage.setItem('country_code', responseJson?.country?.code || "");
            localStorage.setItem('country_flag', responseJson?.country?.flag || "");
            localStorage.setItem('country_currency_symbol', responseJson?.country?.currency_symbol || "");
            localStorage.setItem('country_currency_name', responseJson?.country?.currency_name || "");
            localStorage.setItem('country_dial_code', responseJson?.country?.dial_code || "");
            localStorage.setItem('user_image', responseJson?.user_data?.image || "");
            localStorage.setItem('departments',JSON.stringify(responseJson?.user_data?.departments) || "")
            localStorage.setItem('chatWindow_open', '0');
            localStorage.setItem('package_id', responseJson?.company?.package_id);

    
            // Handle Language
            const LangData = responseJson?.language_data;
            const defaultLanguageCode = 'en';
            const languageCode: string = LangData[0]?.code || defaultLanguageCode;
            i18next.changeLanguage(languageCode);
            localStorage.setItem('language_code', languageCode === 'ae' ? 'ae' : 'en');
    
            if (languageCode.toLowerCase() === 'ae' || languageCode.toLowerCase() === 'ar') {
                localStorage.setItem('rtlClass', 'rtl');
                dispatch(toggleRTL('rtl'));
            } else {
                localStorage.setItem('rtlClass', 'ltr');
                dispatch(toggleRTL('ltr'));
            }
    
            navigate("/");
            // Swal.fire({
            //     title: t('success'),
            //     text: t('youAreSuccessfullyLoggedIn'),
            //     icon: 'success',
            //     confirmButtonText: t('ok')
            // });
            coloredToast('success', t('youAreSuccessfullyLoggedIn'));
    
        } catch (error) {
            console.error('Login failed:', error);
            coloredToast('danger', t('invalidCredentials'));
            setLoader(false);
        }
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

    const handleKeyPress = (event: { keyCode: number; which: number; }) => {
        // look for the `Enter` keyCode
        if (event.keyCode === 13 || event.which === 13) {
            submitData()
        }
    }

    return (
        <div>
            <div className="absolute inset-0">
                <img src="/assets/images/auth/bg-gradient.png" alt="image" className="h-full w-full object-cover" />
            </div>
            <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
                <img src="/assets/images/auth/coming-soon-object1.png" alt="image" className="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2" />
                <img src="/assets/images/auth/coming-soon-object2.png" alt="image" className="absolute left-24 top-0 h-40 md:left-[30%]" />
                <img src="/assets/images/auth/coming-soon-object3.png" alt="image" className="absolute right-0 top-0 h-[300px]" />
                <img src="/assets/images/auth/polygon-object.svg" alt="image" className="absolute bottom-0 end-[28%]" />
                <div className="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:min-h-[758px] lg:flex-row lg:gap-10 xl:gap-0">
                    <div className="relative hidden w-full items-center justify-center bg-[linear-gradient(225deg,rgba(239,18,98,1)_0%,rgba(67,97,238,1)_100%)] p-5 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]">
                        <div className="absolute inset-y-0 w-8 from-primary/10 via-transparent to-transparent ltr:-right-10 ltr:bg-gradient-to-r rtl:-left-10 rtl:bg-gradient-to-l xl:w-16 ltr:xl:-right-20 rtl:xl:-left-20"></div>
                        <div className="ltr:xl:-skew-x-[14deg] rtl:xl:skew-x-[14deg]">
                            <Link to="/" className="w-48 flex gap-4 lg:w-72 mx-auto">
                                <img className="w-40 h-40 hue-rotate-337" src="/assets/images/logo/logo.png" alt="#" />
                                <span className="text-2xl font-bold text-indigo-200" style={{ textShadow: '-3px 4px black' }}>
                                    TaskOrbit
                                </span>
                            </Link>
                            <div className="mt-24 hidden w-full max-w-[430px] lg:block">
                                <img src="/assets/images/auth/login.svg" alt="Cover Image" className="w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                        <div className="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                            <Link to="/" className="w-8 block lg:hidden">
                                <img src="/assets/images/logo.svg" alt="Logo" className="mx-auto w-10" />
                            </Link>
                        </div>
                        <div className="w-full max-w-[440px] lg:mt-16">
                            <div className="mb-10">
                                <h1 className="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">{t('signIn')}</h1>
                                <p className="text-base font-bold leading-normal text-white-dark">{t('enterEmailAndPasswordToLogin')}</p>
                            </div>
                            <form className="space-y-5 dark:text-white" onSubmit={handleSubmit}>
                                <div>
                                    <label htmlFor="Email">{t('email')}</label>
                                    <div className="relative text-white-dark">
                                        <input
                                            id="Email"
                                            type="name"
                                            placeholder={t("pleaseFillEmail")}
                                            className="form-input pl-10 placeholder:text-white-dark"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                        />
                                        {error ? (
                                            <label
                                                htmlFor="invalid"
                                                className="d-block fs-9 mt-1 text-danger">
                                                {t('addEmailAddress')}
                                            </label>
                                        ) : null}
                                        <span className={`absolute start-4 top-1/2 -translate-y-1/2 transition-all ${error ? '!top-5' : ''} `}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    opacity='1'
                                                    d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                                <path
                                                    d="M6 8L8.1589 9.79908C9.99553 11.3296 10.9139 12.0949 12 12.0949C13.0861 12.0949 14.0045 11.3296 15.8411 9.79908L18 8"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="Password">{t('password')}</label>
                                    <div className="relative text-white-dark">
                                        <input
                                            id="Password"
                                            type="password"
                                            placeholder={t("pleaseFillPassword")}
                                            className="form-input pl-10 placeholder:text-white-dark"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                        />
                                        {passwordError ? (
                                            <label
                                                htmlFor="invalid"
                                                className="d-block fs-9 mt-1 text-danger">
                                                {t('pleaseFillPassword')}
                                            </label>
                                        ) : null}
                                        <span className={`absolute start-4 top-1/2 -translate-y-1/2 transition-all ${passwordError ? '!top-5' : ''} `}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.75736 10 5.17157 10 8 10H16C18.8284 10 20.2426 10 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                                <path opacity='1' d="M6 10V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                <g opacity='1'>
                                                    <path d="M9 16C9 16.5523 8.55228 17 8 17C7.44772 17 7 16.5523 7 16C7 15.4477 7.44772 15 8 15C8.55228 15 9 15.4477 9 16Z" fill="currentColor" />
                                                    <path d="M13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15C12.5523 15 13 15.4477 13 16Z" fill="currentColor" />
                                                    <path d="M17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16C15 15.4477 15.4477 15 16 15C16.5523 15 17 15.4477 17 16Z" fill="currentColor" />
                                                </g>
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                                {Loader ?
                                    <button disabled type="button" className="btn btn-secondary !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                                        <svg aria-hidden="true" role="status" className="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                        </svg>
                                        {t('loading')}
                                    </button>
                                    :
                                <button type="submit" disabled={loading} className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                                    {t('signIn')}
                                </button>
                                }
                            </form>
                        </div>
                        <p className="absolute bottom-6 w-full text-center dark:text-white">{i18n.language === 'ae' ? `© ${new Date().getFullYear()}.TaskOrbit جميع الحقوق محفوظة.` : `© ${new Date().getFullYear()}.TaskOrbit All Rights Reserved.`}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginCover;
