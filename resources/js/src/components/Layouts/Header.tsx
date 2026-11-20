import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { IRootState } from '../../store';
import { toggleRTL, toggleTheme, toggleSidebar, toggleLocale } from '../../store/themeConfigSlice';
import { useTranslation } from 'react-i18next';
import Dropdown from '../Dropdown';
import IconMenu from '../Icon/IconMenu';
import IconSearch from '../Icon/IconSearch';
import IconSun from '../Icon/IconSun';
import IconMoon from '../Icon/IconMoon';
import IconLaptop from '../Icon/IconLaptop';
import IconUser from '../Icon/IconUser';
import IconLockDots from '../Icon/IconLockDots';
import IconLogout from '../Icon/IconLogout';
import i18n from '../../i18n';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [username, setusername] = useState<any>('');
    const [email, setemail] = useState<any>('')
    const [role, setrole] = useState<any>('role')
    useEffect(() => {
        if (localStorage.getItem("username")) {
            setusername(localStorage.getItem("username"))
        }
        if (localStorage.getItem("email")) {
            setemail(localStorage.getItem("email"))
        }
        const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }, [location]);

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    function createMarkup(messages: any) {
        return { __html: messages };
    }
    const [messages, setMessages] = useState([
        {
            id: 1,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>',
            title: 'Congratulations!',
            message: 'Your OS has been updated.',
            time: '1hr',
        },
        {
            id: 2,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg g xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>',
            title: 'Did you know?',
            message: 'You can switch between artboards.',
            time: '2hr',
        },
        {
            id: 3,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>',
            title: 'Something went wrong!',
            message: 'Send Reposrt',
            time: '2days',
        },
        {
            id: 4,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>',
            title: 'Warning',
            message: 'Your password strength is low.',
            time: '5days',
        },
    ]);

    const removeMessage = (value: number) => {
        setMessages(messages.filter((user) => user.id !== value));
    };

    const [notifications, setNotifications] = useState([
        {
            id: 1,
            profile: 'user-profile.jpeg',
            message: '<strong className="text-sm mr-1">John Doe</strong>invite you to <strong>Prototyping</strong>',
            time: '45 min ago',
        },
        {
            id: 2,
            profile: 'profile-34.jpeg',
            message: '<strong className="text-sm mr-1">Adam Nolan</strong>mentioned you to <strong>UX Basics</strong>',
            time: '9h Ago',
        },
        {
            id: 3,
            profile: 'profile-16.jpeg',
            message: '<strong className="text-sm mr-1">Anna Morgan</strong>Upload a file',
            time: '9h Ago',
        },
    ]);

    const removeNotification = (value: number) => {
        setNotifications(notifications.filter((user) => user.id !== value));
    };

    useEffect(() => {
        dispatch(toggleLocale(i18n.language == 'ar' ? 'ar' : 'en'));
        i18n.changeLanguage(i18n.language == 'ar' ? 'ar' : 'en');
        setLocale(i18n.language == 'ar' ? 'ar' : 'en');
    }, [])

    const [search, setSearch] = useState(false);
    const setLocale = (flag: string) => {
        setFlag(flag);
        if (flag.toLowerCase() === 'ar') {
            dispatch(toggleRTL('rtl'));
        } else {
            dispatch(toggleRTL('ltr'));
        }
    };
    const [flag, setFlag] = useState(themeConfig.locale);
    const { t } = useTranslation();

    function signout() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }

        try {
            navigate("/auth/login");
        } catch (error) {
            console.error('Error navigating to /admin/signin:', error);
        }
    }
    const timerRef = useRef<any>(null);
    const idleTimeReach = useRef<any>(false)
    useEffect(() => {
        const minutes = 180; // Set the idle timeout in minutes
        const IDLE_TIMEOUT = minutes * 60 * 1000;//convert from minutes to milliseconds
        const handleUserActivity = () => {
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                idleTimeReach.current = true;
                if(document.visibilityState === 'visible') {
                    window.location.reload();
                }
            }, IDLE_TIMEOUT); // Debounce to 1s
        };
        const events = ['mousedown', 'keydown', 'mousemove'];
        events.forEach((event) => document.addEventListener(event, handleUserActivity, { passive: true }));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && idleTimeReach.current) {
                window.location.reload();
            }
        })
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', handleUserActivity);
        } else {
            // DOM already loaded (e.g., reload, cached, or script at bottom)
            handleUserActivity();
        }
        return () => {
            // Cleanup event listeners
            events.forEach((event) => document.removeEventListener(event, handleUserActivity));
            clearTimeout(timerRef.current!);
        };
    }, []);

    return (
        <header className={`z-40 dark`}>
            <div className="shadow-sm">
                <div className="relative flex w-full items-center px-5 py-2.5 bg-black shadow-[1px 1px 2px darkgrey]">
                    <div className="horizontal-logo flex lg:hidden justify-between items-center ltr:mr-2 rtl:ml-2">
                        {/* <Link to="/" className="main-logo flex items-center shrink-0">
                            <img className="w-8 ltr:-ml-1 rtl:-mr-1 inline" src="/assets/images/icon_blue.png" alt="logo" />
                            <span className="text-2xl ltr:ml-1.5 rtl:mr-1.5  font-semibold  align-middle hidden md:inline dark:text-white-light transition-all duration-300">{t('tamkeenStores')}</span>
                        </Link> */}
                        <button
                            type="button"
                            className="collapse-icon flex-none dark:text-[#d0d2d6] hover:text-primary dark:hover:text-primary flex lg:hidden ltr:ml-2 rtl:mr-2 p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
                            onClick={() => {
                                dispatch(toggleSidebar());
                            }}
                        >
                            <IconMenu className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="sm:flex-1 ltr:sm:ml-0 ltr:ml-auto sm:rtl:mr-0 rtl:mr-auto flex items-center space-x-1.5 lg:space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                        <div className="hidden md:block sm:ltr:mr-auto sm:rtl:ml-auto">
                            {/* <div>Streamline Your Slot Management Workflow</div> */}
                            {/* <div>Take control of your scheduling with ease</div> */}
                            <div>Manage, organize, and optimize your slots seamlessly</div>
                            <button
                                type="button"
                                onClick={() => setSearch(!search)}
                                className="search_btn sm:hidden p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
                            >
                                <IconSearch className="w-4.5 h-4.5 mx-auto dark:text-[#d0d2d6]" />
                            </button>
                        </div>
                        <div className="dropdown shrink-0 flex">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative group block"
                                button={
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm p-1.5">
                                        <img
                                            className="w-auto rounded-full object-cover"
                                            src="/assets/images/user-personal/default-avatar.svg"
                                            alt="userProfile"
                                        />
                                    </div>
                                }
                            >
                                <ul
                                    className="
                                        !py-0
                                        w-[250px]
                                        overflow-hidden
                                        rounded-md
                                        border
                                        border-gray-600
                                        bg-[#1b304d]
                                        shadow-[0_8px_25px_rgba(0,0,0,0.35)]
                                        text-white
                                    "
                                >
                                    {/* Profile Header */}
                                    <li>
                                        <div className="flex items-center gap-3 px-4 py-4">
                                            <div className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center">
                                                <img
                                                    className="w-7 h-7 rounded-full object-cover"
                                                    src="/assets/images/user-personal/default-avatar.svg"
                                                    alt="userProfile"
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <h4 className="truncate text-sm font-semibold text-white">
                                                    {username}
                                                </h4>

                                                <p className="mt-1 truncate text-xs font-medium text-[#8fa8c7]">
                                                    {email}
                                                </p>
                                            </div>
                                        </div>
                                    </li>

                                    {/* Divider */}
                                    <li className="border-t border-gray-600" />

                                    {/* Sign Out */}
                                    <li>
                                        <button
                                            type="button"
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                px-4
                                                py-3
                                                text-left
                                                text-sm
                                                font-semibold
                                                text-[#ff5c5c]
                                                transition
                                                duration-200
                                                hover:!bg-danger
                                                hover:!text-white
                                            "
                                            onClick={() => {
                                                signout();
                                            }}
                                        >
                                            <IconLogout
                                                className="
                                                    h-4.5
                                                    w-4.5
                                                    shrink-0
                                                    ltr:mr-3
                                                    rtl:ml-3
                                                    rotate-90
                                                "
                                            />

                                            {t('signOut')}
                                        </button>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
