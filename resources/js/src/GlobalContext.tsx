import React, { createContext, useEffect, useState, useCallback } from 'react';
import { post } from '../src/pages/api/ApiCalls';

interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  company_id: string;
  departments: any[];
  is_company_user: number;
  user_personal?: {};
  lockScreen: number;
}

interface Role {
  id: string;
  name: string;
  code: string;
}

interface Company {
  company_name: string;
  image: string;
  high_load_dashboard: boolean;
  company_identifier: string;
  timezone: string;
  allow_chat_creation: boolean;
  package_id: any
}

interface Country {
  name: string;
  code: string;
  flag: string;
  currency_symbol: string;
  currency_name: string;
  dial_code: string;
}

interface UserAuthState {
  user: User;
  role: Role;
  company: Company;
  country: Country;
  token: string;
  token_expiry: string;
  languageCode: string;
  chatWindow_open: string;
  all_companies: any;
  cx_user_companies: any,
  widget_settings: any,
}

const defaultUserAuthState: UserAuthState = {
    user: {
        id: '',
        name: '',
        email: '',
        image: '',
        company_id: '',
        departments: [],
        is_company_user : 0,
        user_personal: {},
        lockScreen: 0
    },
    role: {
        id: '',
        name: '',
        code: '',
    },
    company: {
        company_name: '',
        image: '',
        high_load_dashboard: false,
        company_identifier: '',
        timezone: "",
        allow_chat_creation: false,
        package_id: null
    },
    country: {
        name: '',
        code: '',
        flag: '',
        currency_symbol: '',
        currency_name: '',
        dial_code: '',
    },
    token: '',
    token_expiry: '',
    languageCode: 'en',
    chatWindow_open: '0',
    all_companies: '',
    cx_user_companies: '',
    widget_settings: '',
};

interface GlobalContextType {
    // Login state
    userAuthData: UserAuthState;
    setUserAuthData: React.Dispatch<React.SetStateAction<UserAuthState>>;
    // check if user is authenticated
    checkUserIsAuthenticated: () => boolean;
    verifyAuth: () => boolean;
    //logout state
    logoutContext: (isNavigate?: boolean) => Promise<boolean>;
    //

    tabsArray: string[];
    setTabsArray: React.Dispatch<React.SetStateAction<string[]>>;
    incomingVisitorTone: string;
    setIncomingVisitorTone: React.Dispatch<React.SetStateAction<string>>;
    incomingVisitorToneVolume: number;
    setIncomingVisitorToneVolume: React.Dispatch<React.SetStateAction<number>>;
    incomingMsgTone: string;
    setIncomingMsgTone: React.Dispatch<React.SetStateAction<string>>;
    incomingMsgToneVolume: number;
    setIncomingMsgToneVolume: React.Dispatch<React.SetStateAction<number>>;
    chatRequestTone: string;
    setChatRequestTone: React.Dispatch<React.SetStateAction<string>>;
    chatRequestToneVolume: number;
    setChatRequestToneVolume: React.Dispatch<React.SetStateAction<number>>;
    chatRequestRepeat: number;
    setChatRequestRepeat: React.Dispatch<React.SetStateAction<number>>;
    triggerActivatedTone: string;
    setTriggerActivatedTone: React.Dispatch<React.SetStateAction<string>>;
    triggerActivatedToneVolume: number;
    setTriggerActivatedToneVolume: React.Dispatch<React.SetStateAction<number>>;
    automaticStatusTone: string;
    setAutomaticStatusTone: React.Dispatch<React.SetStateAction<string>>;
    automaticStatusToneVolume: number;
    setAutomaticStatusToneVolume: React.Dispatch<React.SetStateAction<number>>;
    permissions: any[];
    setPermissions: React.Dispatch<React.SetStateAction<any[]>>;
    showCompanyPopup: boolean;
    setShowCompanyPopup: React.Dispatch<React.SetStateAction<boolean>>;
    popupSelectedCompany: any;
    setPopupSelectedCompany: React.Dispatch<React.SetStateAction<any>>;
    userPersonalGlobal: any;
    setUserPersonalGlobal: React.Dispatch<React.SetStateAction<any>>;
    visitorChatsCount: any[];
    setVisitorChatsCount: React.Dispatch<React.SetStateAction<any[]>>;
    assignedChatsCount: number;
    setAssignedChatsCount: React.Dispatch<React.SetStateAction<number>>;
    closedChatsUnreadCount: number;
    setClosedChatsUnreadCount: React.Dispatch<React.SetStateAction<number>>;
    openProfileViewModal: boolean;
    setOpenProfileViewModal: React.Dispatch<React.SetStateAction<boolean>>;
    userGlobalData: any;
    setUserGlobalData: React.Dispatch<React.SetStateAction<any>>;
    profileViewSource: 'header' | 'sidebar' | null;
    setProfileViewSource: React.Dispatch<React.SetStateAction<'header' | 'sidebar' | null>>;
    toggleProfileModal: (source: 'header' | 'sidebar') => void;
    setChatFileErr: React.Dispatch<React.SetStateAction<any>>;
    chatFileErr: any;
    setErrFileName: React.Dispatch<React.SetStateAction<any>>;
    errFilename: any;
    setShortcutSelectedMsg: React.Dispatch<React.SetStateAction<any>>;
    shortcutSelectedMsg: any;
    setMsgCreatedShortcut: React.Dispatch<React.SetStateAction<any>>;
    msgCreatedShortcut: any;
    fileErroChatId: any;
setFileErroChatId: React.Dispatch<React.SetStateAction<any>>;
}

const GlobalContext = createContext<GlobalContextType>({
    // Login state
    userAuthData: defaultUserAuthState,
    setUserAuthData: () => {},
    // check if user is authenticated
    checkUserIsAuthenticated: () => false,
    verifyAuth: () => false,
    // logout state
    logoutContext: async () => false,
    //

    tabsArray: [],
    setTabsArray: () => { },
    incomingVisitorTone: '',
    setIncomingVisitorTone: () => { },
    incomingVisitorToneVolume: 0,
    setIncomingVisitorToneVolume: () => { },
    incomingMsgTone: '',
    setIncomingMsgTone: () => { },
    incomingMsgToneVolume: 0,
    setIncomingMsgToneVolume: () => { },
    chatRequestTone: '',
    setChatRequestTone: () => { },
    chatRequestToneVolume: 0,
    setChatRequestToneVolume: () => { },
    chatRequestRepeat: 1,
    setChatRequestRepeat: () => { },
    triggerActivatedTone: '',
    setTriggerActivatedTone: () => { },
    triggerActivatedToneVolume: 0,
    setTriggerActivatedToneVolume: () => { },
    automaticStatusTone: '',
    setAutomaticStatusTone: () => { },
    automaticStatusToneVolume: 0,
    setAutomaticStatusToneVolume: () => { },
    permissions: [],
    setPermissions: () => { },
    showCompanyPopup: false,
    setShowCompanyPopup: () => { },
    popupSelectedCompany: null,
    setPopupSelectedCompany: () => { },
    userPersonalGlobal: {},
    setUserPersonalGlobal: () => { },
    visitorChatsCount: [],
    setVisitorChatsCount: () => { },
    assignedChatsCount: 0,
    setAssignedChatsCount: () => { },
    closedChatsUnreadCount: 0,
    setClosedChatsUnreadCount: () => { },
    openProfileViewModal: false,
    setOpenProfileViewModal: () => { },
    userGlobalData: null,
    setUserGlobalData: () => { },
    profileViewSource: null,
    setProfileViewSource: () => { },
    toggleProfileModal: () => { },
    setChatFileErr: () => { },
    chatFileErr: '',
    setErrFileName: () => { },
    errFilename: '',
    setShortcutSelectedMsg: () => { },
    shortcutSelectedMsg: '',
    setMsgCreatedShortcut: () => { },
    msgCreatedShortcut: null,
    fileErroChatId: null,
setFileErroChatId: () => { },
});

export const GlobalProvider = ({ children }: any) => {
    const [tabsArray, setTabsArray] = useState<string[]>([]);
    const [tabStatus, settabStatus] = useState<boolean>(false);
    const [incomingVisitorTone, setIncomingVisitorTone] = useState<string>('');
    const [incomingVisitorToneVolume, setIncomingVisitorToneVolume] = useState<number>(0);
    const [incomingMsgTone, setIncomingMsgTone] = useState<string>('');
    const [incomingMsgToneVolume, setIncomingMsgToneVolume] = useState<number>(0);
    const [chatRequestTone, setChatRequestTone] = useState<string>('');
    const [chatRequestToneVolume, setChatRequestToneVolume] = useState<number>(0);
    const [triggerActivatedTone, setTriggerActivatedTone] = useState<string>('');
    const [triggerActivatedToneVolume, setTriggerActivatedToneVolume] = useState<number>(0);
    const [automaticStatusTone, setAutomaticStatusTone] = useState<string>('');
    const [automaticStatusToneVolume, setAutomaticStatusToneVolume] = useState<number>(0);
    const [chatRequestRepeat, setChatRequestRepeat] = useState<number>(1);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [showCompanyPopup, setShowCompanyPopup] = useState<boolean>(false);
    const [popupSelectedCompany, setPopupSelectedCompany] = useState<any>(null);
    const [userPersonalGlobal, setUserPersonalGlobal] = useState<any>({});
    const [visitorChatsCount, setVisitorChatsCount] = useState<any>([]);
    const [assignedChatsCount, setAssignedChatsCount] = useState<number>(0);
    const [closedChatsUnreadCount, setClosedChatsUnreadCount] = useState<number>(0);
    const [openProfileViewModal, setOpenProfileViewModal] = useState<boolean>(false);
    const [profileViewSource, setProfileViewSource] = useState<'header' | 'sidebar' | null>(null);
    const [chatFileErr, setChatFileErr] = useState<any>('');
    const [errFilename, setErrFileName] = useState<any>('');
    const [shortcutSelectedMsg, setShortcutSelectedMsg] = useState<any>('');
    const [msgCreatedShortcut, setMsgCreatedShortcut] = useState<any>(null);
    const [userGlobalData, setUserGlobalData] = useState<any>(null);
    const [fileErroChatId, setFileErroChatId] = useState<any>(null);


    // User state
    const [userAuthData, setUserAuthData] = useState<UserAuthState>(() => { const storedAuth = localStorage.getItem('userData'); return storedAuth ? JSON.parse(storedAuth) : defaultUserAuthState; });
    //

    const toggleProfileModal = useCallback((source: 'header' | 'sidebar') => {
        if (openProfileViewModal && profileViewSource === source) {
            setOpenProfileViewModal(false);
            return;
        }
        setProfileViewSource(source);
        setOpenProfileViewModal(true);
    }, [openProfileViewModal, profileViewSource]);

    useEffect(() => {
        if (tabsArray.length || tabStatus)
            localStorage.setItem('tabsArray', JSON.stringify(tabsArray));
        if (!tabStatus) settabStatus(true);
    }, [tabsArray]);

    useEffect(() => {
        const tabsDataArray = localStorage.getItem('tabsArray');
        if (tabsDataArray) {
            setTabsArray(JSON.parse(tabsDataArray));
        }
    }, []);

    useEffect(() => {
        if (popupSelectedCompany) {
            localStorage.setItem('popupSelectedCompany', JSON.stringify(popupSelectedCompany));
        } else {
            localStorage.removeItem('popupSelectedCompany');
        }
    }, [popupSelectedCompany]);

    useEffect(() => {
        const popupSelectedCompanyLocal = localStorage.getItem('popupSelectedCompany');
        if (popupSelectedCompanyLocal) {
            setPopupSelectedCompany(JSON.parse(popupSelectedCompanyLocal));
        }
        const uPersonal: any = userAuthData.user.user_personal ? JSON.stringify(userAuthData.user.user_personal) : '';
        if (uPersonal) {
            setUserPersonalGlobal(JSON.parse(uPersonal));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('userData', JSON.stringify(userAuthData));
    }, [userAuthData])

    const checkUserIsAuthenticated = () => {
        const storedAuth = localStorage.getItem('userData');
        if (storedAuth) {
            const userData: UserAuthState = JSON.parse(storedAuth);
            if (userData.token && userData.token_expiry) {
                const expiryDate = new Date(userData.token_expiry);
                return expiryDate > new Date();
            }
        }
        return false;
    };

    const verifyAuth = () => {
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            window.location.href = '/auth/login';
        }

        return false;
    };

    const logoutContext = async (isNavigate: boolean = false): Promise<boolean> => {
        try {
            // Early return if already logged out
            // if (!userAuthData.token) return true;
            const token = userAuthData.token || "";
            const tokenId = token.split("|")[0];
            const response: any = await post("user/logout", {
                user_id: userAuthData.user.id,
                token_id: tokenId,
            });

            if (response?.success) {
                // Navigate first if needed
                if(isNavigate){
                    window.location.href = '/auth/login';
                    // return true;
                }             
                // Then clear state
                setUserAuthData(defaultUserAuthState);
                localStorage.clear();
                setTabsArray([]);
                setPopupSelectedCompany(null);
                setUserPersonalGlobal({});
                setVisitorChatsCount([]);
                setAssignedChatsCount(0);
                setClosedChatsUnreadCount(0);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Logout failed:", error);
            return false;
        }
    };


    return (
        <GlobalContext.Provider value={{
            tabsArray, setTabsArray, incomingVisitorTone, setIncomingVisitorTone, incomingVisitorToneVolume, setIncomingVisitorToneVolume,
            incomingMsgTone, setIncomingMsgTone, incomingMsgToneVolume, setIncomingMsgToneVolume, chatRequestTone, setChatRequestTone,
            chatRequestToneVolume, setChatRequestToneVolume, chatRequestRepeat, setChatRequestRepeat, triggerActivatedTone, setTriggerActivatedTone,
            triggerActivatedToneVolume, setTriggerActivatedToneVolume, automaticStatusTone, setAutomaticStatusTone, automaticStatusToneVolume,
            setAutomaticStatusToneVolume, permissions, setPermissions, showCompanyPopup, setShowCompanyPopup, popupSelectedCompany,
            setPopupSelectedCompany, userPersonalGlobal, setUserPersonalGlobal, visitorChatsCount, setVisitorChatsCount, closedChatsUnreadCount,
            setClosedChatsUnreadCount, assignedChatsCount, setAssignedChatsCount, openProfileViewModal, setOpenProfileViewModal, userGlobalData,
            setUserGlobalData, profileViewSource, setProfileViewSource, toggleProfileModal, setChatFileErr, chatFileErr, setErrFileName, errFilename,
            setShortcutSelectedMsg, shortcutSelectedMsg, setMsgCreatedShortcut, msgCreatedShortcut,
            userAuthData, setUserAuthData,logoutContext, checkUserIsAuthenticated,fileErroChatId,setFileErroChatId, verifyAuth
        }}>
            {children}
        </GlobalContext.Provider>
    );
};

export default GlobalContext;