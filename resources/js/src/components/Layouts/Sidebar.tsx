import React, { useContext, Fragment, lazy, useMemo } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect } from 'react';
import { get } from '../../pages/api/ApiCalls';
import GlobalContext from '../../GlobalContext';
import IconLogout from '../Icon/IconLogout';

// Lazy loaded icons
const IconAutoSetting = lazy(() => import('../../components/Icon/IconAutoSetting'));
const IconArrowLeft = lazy(() => import('../../components/Icon/IconArrowLeft'));
const IconListCheck = lazy(() => import('../../components/Icon/IconListCheck'));
const IconTrashLines = lazy(() => import('../../components/Icon/IconTrashLines'));
const IconMenuScrumboard = lazy(() => import('../../components/Icon/IconMenuScrumboard'));

// Extend the Window interface to include Echo
declare global {
    interface Window {
        Echo: any;
    }
}

const Sidebar = (props: any) => {
    // Context state with proper typing
    const { permissions, setPermissions, visitorChatsCount, setVisitorChatsCount, assignedChatsCount, setAssignedChatsCount, closedChatsUnreadCount, setClosedChatsUnreadCount } = useContext(
        GlobalContext
    ) as {
        permissions: any[];
        setPermissions: React.Dispatch<React.SetStateAction<any[]>>;
        visitorChatsCount: any[];
        setVisitorChatsCount: React.Dispatch<React.SetStateAction<any[]>>;
        assignedChatsCount: number;
        setAssignedChatsCount: React.Dispatch<React.SetStateAction<number>>;
        closedChatsUnreadCount: number;
        setClosedChatsUnreadCount: React.Dispatch<React.SetStateAction<number>>;
    };

    // Local state with proper typing
    const navigate = useNavigate();
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [fbpageData, setFbpageData] = useState([]);
    const [companyUsersData, setCompanyUsersData] = useState<any>([]);
    const [departmentData, setDepartmentData] = useState<any>([]);
    const [viewModal, setViewModal] = useState<boolean>(false);
    const [instaPageData, setInstapageData] = useState([]);
    const { userGlobalData, setUserGlobalData, setOpenProfileViewModal, toggleProfileModal, userAuthData } = useContext<any>(GlobalContext);

    const handleProfileClick = () => {
        setOpenProfileViewModal(true);
    };

    // Redux state
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);

    // Router and other hooks
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };
    let userId: any = userAuthData.user.id;
    parseInt(userId);
    let roleId: any = userAuthData.role.id;
    parseInt(roleId);
    let roleCode: any = userAuthData.role.code;
    let companyId: any = userAuthData.user.company_id;
    let is_company_user: any = userAuthData.user.is_company_user;
    let username: any = localStorage.getItem("username");

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
        
    }, []);

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

    useEffect(() => {
        if (!(window as any).Echo) return;

        const agentStatusChannelName = `agent-online-status-${companyId}`;
        const agentStatusChannel = window.Echo.channel(agentStatusChannelName);

        agentStatusChannel.listen('AgentOnlineStatus', function (event: any) {
            setCompanyUsersData((prevAgents: any) => prevAgents?.map((agent: any) => (agent.id == event?.id ? { ...agent, online_status: event.online_status } : agent)));
        });

        const agentCountChannelName = `user-chat-count-${companyId}`;
        const agentCountChannel = window.Echo.channel(agentCountChannelName);

        agentCountChannel.listen('UserChatCount', function (event: any) {
            setCompanyUsersData((prevAgents: any) => prevAgents?.map((agent: any) => (agent?.id == event?.agent_id ? { ...agent, chats_count: event?.chat_count } : agent)));
        });

        return () => {
            agentStatusChannel.stopListening('AgentOnlineStatus');
            agentCountChannel.stopListening('UserChatCount');
        };
    }, [companyId]);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // getAllData()
        // getInstagram()
    }, [location]);

    // const getAllData = () => {
    //     const url: any = `get-facebook-pages?user_id=${userId}`;
    //     get(url).then((responseJson: any) => {
    //         var data = responseJson?.data;
    //         setFbpageData(data);
    //     });
    // }
    // const getInstagram = () => {
    //     const url: any = `get-instagram-pages?user_id=${userId}`;
    //     get(url).then((responseJson: any) => {
    //         var data = responseJson?.data;
    //         setInstapageData(data);
    //     });
    // }
    const getPermissionData = () => {
        const url2: any = `get-user-permissions?role_id=${roleId}&is_company_user=${is_company_user}&role_code=${roleCode}&company=${companyId}&user_id=${userId}`;
        get(url2).then((responseJson: any) => {
            var data = responseJson?.data;
            setPermissions(data);
            setVisitorChatsCount(responseJson?.visitor_count);
            setCompanyUsersData(responseJson?.company_users || []);
            setDepartmentData(responseJson?.department_data || []);
            setAssignedChatsCount(responseJson?.assigned_chats_count);
            setClosedChatsUnreadCount(responseJson?.closed_chats_unread_count);
            setUserGlobalData(responseJson?.user_data);
        });
    };
        // useEffect(() => {
        //     if(visitorChatsCount?.length && companyId){
        //         const chatRoomChannelName = `chat-rooms-${companyId}`;
        //         const chatRoomChannel = window.Echo.channel(chatRoomChannelName);

        //         const handleChatRoomCreated = (data: any) => {
        //             const chatRoom = data?.data
        //             console.log('chatRoom',chatRoom)
        //             if(chatRoom?.status == 1 && !visitorChatsCount?.find((id) => id == chatRoom?.id)){
        //                 const array = visitorChatsCount;
        //                 array?.push(chatRoom?.id)
        //                 setVisitorChatsCount([...array])
        //             }
        //             if(chatRoom?.status == 0 && visitorChatsCount?.find((id) => id == chatRoom?.id)){
        //                 setVisitorChatsCount((prev: any) => prev?.filter((id) => id != chatRoom?.id))
        //             }
        //         };
        //         // chatRoomChannel.stopListening('ChatRoomCreated');
        //         chatRoomChannel.listen('ChatRoomCreated', handleChatRoomCreated);

        //         // // ✅ Cleanup on unmount to prevent memory leaks and warnings
        //         return () => {
        //             chatRoomChannel.stopListening('ChatRoomCreated');
        //         };
        //     }
        // }, [companyId]);

    const mainPageTitle = useMemo(() => 'px-1.5 text-white dark:text-white dark:group-hover:text-white-dark text-smallFont', []);
    const mainHeadingBar = useMemo(() => 'py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08]', []);

    const renderUserTabView: any = () => {
        const userImage: any = userGlobalData?.user_personal ? '/assets/images/user-personal/' + userGlobalData?.user_personal?.image : '/assets/images/user-profile.jpeg';
        return (
            <>
                <button
                    data-profile-trigger="sidebar"
                    className="side-menu__account group/profile absolute inset-x-0 bottom-0 mx-2 mb-4 transition-[width] text-left"
                    onClick={() => toggleProfileModal('sidebar')}
                >
                    <div className="bg-background/10 border-background/20 dark:bg-foreground/[.02] dark:border-foreground/[.09] flex cursor-pointer items-center rounded-full border p-1.5 opacity-80 backdrop-blur-2xl transition hover:opacity-100">
                        <div className="border-background/20 dark:border-foreground/20 relative h-8 w-8 overflow-hidden rounded-full border flex-none">
                            <img
                                className="absolute top-0 h-full w-full object-cover"
                                src={userImage}
                                alt={userGlobalData?.first_name ? `${userGlobalData?.first_name}'s profile` : 'User Profile'}
                                onError={(e: any) => {
                                    e.currentTarget.src = '/assets/images/user-profile.jpeg';
                                }}
                            />
                        </div>
                        <div className="ms-1.5 flex w-full items-center overflow-hidden transition-opacity">
                            <div className="w-28">
                                <div className="w-full truncate font-semibold text-white line-clamp-1">
                                    {userGlobalData ? `${userGlobalData.first_name} ${userGlobalData.last_name ?? 'User'}` : 'User'}
                                </div>
                                <div className="w-full truncate text-xs opacity-60 text-white line-clamp-1 -mt-1">{userGlobalData ? userGlobalData.role?.name ?? '' : 'Role'}</div>
                            </div>
                            <IconArrowLeft className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </button>
            </>
        );
    };

    useEffect(() => {
        const path = location.pathname;

        if (path.startsWith('/secure/setting/account') || path.startsWith('/secure/setting/personal')) {
            setCurrentMenu('setting');
        } else if (path.startsWith('/secure/setting/agent/add')) {
            setCurrentMenu('setting');
        } else if (path.startsWith('/users/add')) {
            setCurrentMenu('users');
        }
    }, [location.pathname]);
    function formatNumber(num: number): string {
        const suffixes = ['', 'K', 'M', 'B', 'T'];
        const tier = (Math.log10(Math.abs(num)) / 3) | 0;

        if (tier === 0) return num?.toString();

        const suffix = suffixes[tier];
        const scale = Math.pow(10, tier * 3);
        const scaled = num / scale;

        // Keep one decimal if the number is not a whole number
        const formatted = scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
        return formatted + suffix;
    }

    return (
        <>
            <div className={semidark ? 'light' : ''}>
                <nav className={`sidebar borderRightSidebar fixed min-h-screen h-full top-0 bottom-0 w-[240px] z-50 transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}>
                    {/* className="dark:bg-black h-full scroll-h bg-primary-gradient" */}
                    <div className="main_sidebar h-full scroll-h relative overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-3">
                            <NavLink to="/" className="main-logo flex items-center shrink-0 font-raleway md:text-base text-sm font-bold uppercase">
                                {/* <img className="w-32 flex-none brightness-[405%]" src="/assets/images/logo/logo-2.png" alt="logo" /> */}
                                <span className=" text-blue-400 align-middle lg:inline ">Task</span>
                                <span className="text-white align-middle lg:inline">Orbit</span>
                            </NavLink>
                            <button
                                type="button"
                                className="collapse-icon text-white w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                                onClick={() => dispatch(toggleSidebar())}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 m-auto">
                                    <path d="M13 19L7 12L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path opacity="0.5" d="M16.9998 19L10.9998 12L16.9998 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                        <div className="
                            absolute left-0 right-0 shrink-0 mx-6 py-3 text-[12px] leading-4 flex items-center gap-4
                            before:absolute before:-top-[1px] before:left-0 before:right-0 before:h-[1px]
                            before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent
                            after:absolute after:-bottom-[1px] after:left-0 after:right-0 after:h-[1px]
                            after:bg-gradient-to-r after:from-transparent after:via-white/45 after:to-transparent
                        ">
                            <div className='bg-blue-200 p-1 rounded-full w-6'>
                                <img
                                    className="w-auto object-cover"
                                    // style={{ filter: 'invert(1)' }}
                                    src="/assets/images/user-personal/default-avatar.svg"
                                    alt="userProfile"
                                />
                            </div>
                            <div>
                                <span className="truncate mt-0.5 text-white">{username || 'Login'}</span><br />
                                {username ? <span className="truncate mt-0.5 text-gray-400">My Account</span> : null}
                            </div>
                        </div>
                        <div className="h-[calc(100vh-160px)] py-4 absolute left-0 right-0 top-28 [&:-webkit-scrollbar]:w-0 [&_.simplebar-scrollbar]:before:!bg-background/70 [-webkit-mask-composite:_destination-in] [-webkit-mask-image:_linear-gradient(to_top,_rgba(0,_0,_0,_0),_black_30px),_linear-gradient(to_bottom,_rgba(0,_0,_0,_0),_black_30px)]">
                            {/* h-[calc(100vh-80px)] */}
                            <ul className="relative font-semibold space-y-0.5 !px-0 text-xxSmall">
                                    <>
                                        <h2 className="px-6 p-3 flex items-center uppercase font-[900] text-gray-400 mb-1 text-xs">
                                            <svg
                                                className="w-4 h-5 flex-none hidden"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                            <span>{t('Manage Task')}</span>
                                        </h2>
                                        <li className="nav-item">
                                            <ul className='flex flex-col gap-2'>
                                                <li className="menu nav-item">
                                                    <button
                                                        type="button"
                                                        className={`${currentMenu === 'dashboard' ? 'active bg-bgLight' : ''} nav-link group w-full`}
                                                        onClick={() => toggleMenu('dashboard')}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconMenuScrumboard className={`!w-5 !h-5 group-hover:!text-blue-600 shrink-0 ${currentMenu === 'dashboard' ? '!text-blue-600' : ''}`} />
                                                            <span className="ltr:pl-3 rtl:pr-3 text-white dark:text-white dark:group-hover:text-white-dark text-xxSmall">{t('dashboard')}</span>
                                                        </div>

                                                        <div className={currentMenu === 'dashboard' ? 'rotate-90' : 'rtl:rotate-180'}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                    </button>

                                                    <AnimateHeight duration={300} height={currentMenu === 'dashboard' ? 'auto' : 0}>
                                                        <ul className="sub-menu text-white">
                                                            <li>
                                                                <NavLink to="/">{t('Analytics')}</NavLink>
                                                            </li>
                                                        </ul>
                                                    </AnimateHeight>
                                                </li>
                                                <li className="menu nav-item">
                                                    <NavLink to="/tasklist" className="nav-link group">
                                                        <div className="flex items-center">
                                                            <IconListCheck className="group-hover:!text-black shrink-0 !w-4.5 !h-4.5" />
                                                            <span className="ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">All Tasks</span>
                                                        </div>
                                                    </NavLink>
                                                </li>
                                                <li className="menu nav-item">
                                                    <NavLink to="/recyclebin" className="nav-link group">
                                                        <div className="flex items-center">
                                                            <IconTrashLines strokeWidth={2} className="group-hover:!text-black shrink-0 !w-4.5 !h-4.5" />
                                                            <span className="ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Recycle Bin</span>
                                                        </div>
                                                    </NavLink>
                                                </li>
                                                <li className="menu nav-item">
                                                    <NavLink to="/slotsetting" className="nav-link group">
                                                        <div className="flex items-center">
                                                            <IconAutoSetting className="group-hover:!text-black shrink-0 !w-4.5 !h-4.5" />
                                                            <span className="ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Slot Setting</span>
                                                        </div>
                                                    </NavLink>
                                                </li>
                                            </ul>
                                        </li>
                                    </>
                            </ul>
                        </div>
                        <button
                            onClick={() => signout()}
                            className="absolute left-0 right-0 bottom-0 transition-all duration-300 group shrink-0 mx-6 py-3 text-xxSmall flex items-center gap-4
                            before:absolute before:-top-[1px] before:left-0 before:right-0 before:h-[1px]
                            before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent"
                        >
                            <IconLogout className="text-white group-hover:!text-[#ee5761] transition-all duration-300 w-4.5 h-4.5" />

                            <span className="truncate mt-0.5 text-white group-hover:!text-[#ee5761] transition-all duration-300">
                                Log Out
                            </span>
                        </button>
                    </div>
                </nav>
            </div>
        </>
    );
};

export default Sidebar;
