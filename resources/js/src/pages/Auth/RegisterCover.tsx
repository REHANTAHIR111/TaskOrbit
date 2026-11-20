import React from 'react'
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setPageTitle, toggleRTL } from '../../store/themeConfigSlice';
import Dropdown from '../../components/Dropdown';
import { IRootState } from '../../store';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import i18n from '../../../src/i18n';

const RegisterCover = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    useEffect(() => {
        dispatch(setPageTitle('Register Cover'));
    });
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
    const [flag, setFlag] = useState(themeConfig.locale);

    const submitForm = () => {
        navigate('/');
    };

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
                                <img src="/assets/images/logo/techenix-logo.png" alt="Logo" className="h-[69px] w-28" />
                                <h2 className='text-[24px] font-bold text-gray-200 my-auto text-shadow-md'>TECHENIX</h2>
                            </Link>
                            <div className="mt-24 hidden w-full max-w-[430px] lg:block">
                                <img src="/assets/images/auth/register.svg" alt="Cover Image" className="w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                        <div className="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                            <Link to="/" className="w-8 block lg:hidden">
                                <img src="/assets/images/logo.svg" alt="Logo" className="mx-auto w-10" />
                            </Link>
                            <div className="dropdown ms-auto w-max">
                                {/* <Dropdown
                                    offset={[0, 8]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="flex items-center gap-2.5 rounded-lg border border-white-dark/30 bg-white px-2 py-1.5 text-white-dark hover:border-primary hover:text-primary dark:bg-black"
                                    button={
                                        <>
                                            <div>
                                                <img src={`/assets/images/flags/${flag.toUpperCase()}.svg`} alt="image" className="h-5 w-5 rounded-full object-cover" />
                                            </div>
                                            <div className="text-base font-bold uppercase">{flag}</div>
                                            <span className="shrink-0">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        </>
                                    }
                                >
                                    <ul className="!px-2 text-dark dark:text-white-dark grid grid-cols-2 gap-2 font-semibold dark:text-white-light/90 w-[280px]">
                                        {themeConfig.languageList.map((item: any) => {
                                            return (
                                                <li key={item.code}>
                                                    <button
                                                        type="button"
                                                        className={`flex w-full hover:text-primary rounded-lg ${flag === item.code ? 'bg-primary/10 text-primary' : ''}`}
                                                        onClick={() => {
                                                            i18next.changeLanguage(item.code);
                                                            setLocale(item.code);
                                                        }}
                                                    >
                                                        <img src={`/assets/images/flags/${item.code.toUpperCase()}.svg`} alt="flag" className="w-5 h-5 object-cover rounded-full" />
                                                        <span className="ltr:ml-3 rtl:mr-3">{item.name}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </Dropdown> */}
                            </div>
                        </div>
                        <div className="w-full max-w-[440px] lg:mt-16">
                            <div className="mb-10">
                                <h1 className="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">{t('signUp')}</h1>
                                <p className="text-base font-bold leading-normal text-white-dark">{t('enterEmailPasswordToRegister')}</p>
                            </div>
                            <form className="space-y-5 dark:text-white" onSubmit={submitForm}>
                                <div>
                                    <label htmlFor="Name">{t('name')}</label>
                                    <div className="relative text-white-dark">
                                        <input id="Name" type="text" placeholder="Enter Name" className="form-input ps-10 placeholder:text-white-dark" />
                                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
                                                <path
                                                    opacity='1'
                                                    d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="Email">{t('email')}</label>
                                    <div className="relative text-white-dark">
                                        <input id="Email" type="email" placeholder={t("pleaseFillEmail")} className="form-input ps-10 placeholder:text-white-dark" />
                                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
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
                                        <input id="Password" type="password" placeholder="Enter Password" className="form-input ps-10 placeholder:text-white-dark" />
                                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
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
                                <div>
                                    <label className="flex cursor-pointer items-center">
                                        <input type="checkbox" className="form-checkbox bg-white dark:bg-black" />
                                        <span className="text-white-dark">{t('subscribeToWeeklyNewsletter')}</span>
                                    </label>
                                </div>
                                <button type="submit" className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                                    {t('signUp')}
                                </button>
                            </form>

                            <div className="relative my-7 text-center md:mb-9">
                                <span className="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 bg-white-light dark:bg-white-dark"></span>
                                <span className="relative bg-white px-2 font-bold uppercase text-white-dark dark:bg-dark dark:text-white-light">or</span>
                            </div>
                            <div className="mb-10 md:mb-[60px]">
                                <ul className="flex justify-center gap-3.5 text-white">
                                    <li>
                                        <Link
                                            to="#"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                            style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path
                                                    d="M8 2.05C9.925 2.05 10.1875 2.05 10.975 2.05C11.675 2.05 12.025 2.225 12.2875 2.3125C12.6375 2.4875 12.9 2.575 13.1625 2.8375C13.425 3.1 13.6 3.3625 13.6875 3.7125C13.775 3.975 13.8625 4.325 13.95 5.025C13.95 5.8125 13.95 5.9875 13.95 8C13.95 10.0125 13.95 10.1875 13.95 10.975C13.95 11.675 13.775 12.025 13.6875 12.2875C13.5125 12.6375 13.425 12.9 13.1625 13.1625C12.9 13.425 12.6375 13.6 12.2875 13.6875C12.025 13.775 11.675 13.8625 10.975 13.95C10.1875 13.95 10.0125 13.95 8 13.95C5.9875 13.95 5.8125 13.95 5.025 13.95C4.325 13.95 3.975 13.775 3.7125 13.6875C3.3625 13.5125 3.1 13.425 2.8375 13.1625C2.575 12.9 2.4 12.6375 2.3125 12.2875C2.225 12.025 2.1375 11.675 2.05 10.975C2.05 10.1875 2.05 10.0125 2.05 8C2.05 5.9875 2.05 5.8125 2.05 5.025C2.05 4.325 2.225 3.975 2.3125 3.7125C2.4875 3.3625 2.575 3.1 2.8375 2.8375C3.1 2.575 3.3625 2.4 3.7125 2.3125C3.975 2.225 4.325 2.1375 5.025 2.05C5.8125 2.05 6.075 2.05 8 2.05ZM8 0.737503C5.9875 0.737503 5.8125 0.737503 5.025 0.737503C4.2375 0.737503 3.7125 0.912504 3.275 1.0875C2.8375 1.2625 2.4 1.525 1.9625 1.9625C1.525 2.4 1.35 2.75 1.0875 3.275C0.912504 3.7125 0.825003 4.2375 0.737503 5.025C0.737503 5.8125 0.737503 6.075 0.737503 8C0.737503 10.0125 0.737503 10.1875 0.737503 10.975C0.737503 11.7625 0.912504 12.2875 1.0875 12.725C1.2625 13.1625 1.525 13.6 1.9625 14.0375C2.4 14.475 2.75 14.65 3.275 14.9125C3.7125 15.0875 4.2375 15.175 5.025 15.2625C5.8125 15.2625 6.075 15.2625 8 15.2625C9.925 15.2625 10.1875 15.2625 10.975 15.2625C11.7625 15.2625 12.2875 15.0875 12.725 14.9125C13.1625 14.7375 13.6 14.475 14.0375 14.0375C14.475 13.6 14.65 13.25 14.9125 12.725C15.0875 12.2875 15.175 11.7625 15.2625 10.975C15.2625 10.1875 15.2625 9.925 15.2625 8C15.2625 6.075 15.2625 5.8125 15.2625 5.025C15.2625 4.2375 15.0875 3.7125 14.9125 3.275C14.7375 2.8375 14.475 2.4 14.0375 1.9625C13.6 1.525 13.25 1.35 12.725 1.0875C12.2875 0.912504 11.7625 0.825003 10.975 0.737503C10.1875 0.737503 10.0125 0.737503 8 0.737503Z"
                                                    fill="currentColor"
                                                />
                                                <path
                                                    d="M8 4.2375C5.9 4.2375 4.2375 5.9 4.2375 8C4.2375 10.1 5.9 11.7625 8 11.7625C10.1 11.7625 11.7625 10.1 11.7625 8C11.7625 5.9 10.1 4.2375 8 4.2375ZM8 10.45C6.6875 10.45 5.55 9.4 5.55 8C5.55 6.6875 6.6 5.55 8 5.55C9.3125 5.55 10.45 6.6 10.45 8C10.45 9.3125 9.3125 10.45 8 10.45Z"
                                                    fill="currentColor"
                                                />
                                                <path
                                                    d="M11.85 5.025C12.3333 5.025 12.725 4.63325 12.725 4.15C12.725 3.66675 12.3333 3.275 11.85 3.275C11.3668 3.275 10.975 3.66675 10.975 4.15C10.975 4.63325 11.3668 5.025 11.85 5.025Z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="#"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                            style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path
                                                    d="M14 7C14 3.15 10.85 0 7 0C3.15 0 0 3.15 0 7C0 10.5 2.5375 13.3875 5.8625 13.9125V9.0125H4.1125V7H5.8625V5.425C5.8625 3.675 6.9125 2.7125 8.4875 2.7125C9.275 2.7125 10.0625 2.8875 10.0625 2.8875V4.6375H9.1875C8.3125 4.6375 8.05 5.1625 8.05 5.6875V7H9.975L9.625 9.0125H7.9625V14C11.4625 13.475 14 10.5 14 7Z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="#"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                            style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                                            </svg>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="#"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110"
                                            style={{ background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M13.8512 7.15912C13.8512 6.66275 13.8066 6.18548 13.7239 5.72729H7.13116V8.43503H10.8984C10.7362 9.31003 10.243 10.0514 9.50162 10.5478V12.3041H11.7639C13.0875 11.0855 13.8512 9.29094 13.8512 7.15912Z"
                                                    fill="currentColor"
                                                />
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M7.13089 14C9.0209 14 10.6054 13.3731 11.7636 12.3041L9.50135 10.5477C8.87454 10.9677 8.07272 11.2159 7.13089 11.2159C5.30771 11.2159 3.76452 9.9845 3.21407 8.32996H0.875427V10.1436C2.02725 12.4313 4.39453 14 7.13089 14Z"
                                                    fill="currentColor"
                                                />
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M3.21435 8.32997C3.07435 7.90997 2.99481 7.46133 2.99481 6.99997C2.99481 6.5386 3.07435 6.08996 3.21435 5.66996V3.85632H0.875712C0.40162 4.80133 0.131165 5.87042 0.131165 6.99997C0.131165 8.12951 0.40162 9.19861 0.875712 10.1436L3.21435 8.32997Z"
                                                    fill="currentColor"
                                                />
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M7.13089 2.7841C8.15862 2.7841 9.08135 3.13728 9.80681 3.83092L11.8145 1.82319C10.6023 0.693638 9.01772 0 7.13089 0C4.39453 0 2.02725 1.56864 0.875427 3.85637L3.21407 5.67001C3.76452 4.01546 5.30771 2.7841 7.13089 2.7841Z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div className="text-center dark:text-white">
                                    {t('alreadyHaveAccount')}&nbsp;
                                <Link to="/auth/cover-login" className="uppercase text-primary underline transition hover:text-black dark:hover:text-white">
                                    {t('signUp')}
                                </Link>
                            </div>
                        </div>
                        <p className="absolute bottom-6 w-full text-center dark:text-white">{i18n.language === 'ae' ? `© ${new Date().getFullYear()}.Chatenix جميع الحقوق محفوظة.` : `© ${new Date().getFullYear()}.Chatenix All Rights Reserved.`}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterCover;
