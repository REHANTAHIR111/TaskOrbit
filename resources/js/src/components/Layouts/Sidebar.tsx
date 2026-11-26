import React, { lazy, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IRootState } from '../../store';
import { toggleSidebar } from '../../store/themeConfigSlice';
import IconLogout from '../Icon/IconLogout';

const IconAutoSetting = lazy(() => import('../../components/Icon/IconAutoSetting'));
const IconListCheck = lazy(() => import('../../components/Icon/IconListCheck'));
const IconTrashLines = lazy(() => import('../../components/Icon/IconTrashLines'));
const IconMenuScrumboard = lazy(() => import('../../components/Icon/IconMenuScrumboard'));

const Sidebar = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const [username, setUsername] = useState(() => localStorage.getItem('username') || 'My account');
    const [email, setEmail] = useState(() => localStorage.getItem('email') || '');

    useEffect(() => {
        setUsername(localStorage.getItem('username') || 'My account');
        setEmail(localStorage.getItem('email') || '');

        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [dispatch, location.pathname]);

    const signOut = () => {
        localStorage.clear();
        navigate('/auth/login');
    };

    return (
        <nav className="sidebar to-sidebar fixed top-0 bottom-0 left-0 z-50 h-screen">
            <div className="main_sidebar to-sidebar-surface h-full">
                <div className="to-sidebar-brand-row">
                    <NavLink to="/" className="to-sidebar-brand" aria-label="TaskOrbit dashboard">
                        <span className="to-brand-mark" aria-hidden="true">T</span>
                        <span>TaskOrbit</span>
                    </NavLink>
                    <button
                        type="button"
                        className="to-sidebar-collapse"
                        aria-label="Close navigation"
                        onClick={() => dispatch(toggleSidebar())}
                    >
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="to-sidebar-account">
                    <span className="to-avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
                    <span className="to-sidebar-account-copy">
                        <strong>{username}</strong>
                        <span>{email || 'Personal workspace'}</span>
                    </span>
                </div>

                <div className="to-sidebar-nav">
                    <p className="to-sidebar-section-label">Workspace</p>
                    <ul className="to-sidebar-nav-list">
                        <li className="nav-item">
                            <NavLink to="/" end className={({ isActive }) => 'nav-link to-sidebar-link' + (isActive ? ' active' : '')}>
                                <React.Suspense fallback={<span aria-hidden="true" className="to-sidebar-icon-placeholder">◷</span>}>
                                    <IconMenuScrumboard aria-hidden="true" />
                                </React.Suspense>
                                <span>Dashboard</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/tasklist" className={({ isActive }) => 'nav-link to-sidebar-link' + (isActive ? ' active' : '')}>
                                <React.Suspense fallback={<span aria-hidden="true" className="to-sidebar-icon-placeholder">☷</span>}>
                                    <IconListCheck aria-hidden="true" />
                                </React.Suspense>
                                <span>All tasks</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/recyclebin" className={({ isActive }) => 'nav-link to-sidebar-link' + (isActive ? ' active' : '')}>
                                <React.Suspense fallback={<span aria-hidden="true" className="to-sidebar-icon-placeholder">↶</span>}>
                                    <IconTrashLines aria-hidden="true" />
                                </React.Suspense>
                                <span>Recycle bin</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/slotsetting" className={({ isActive }) => 'nav-link to-sidebar-link' + (isActive ? ' active' : '')}>
                                <React.Suspense fallback={<span aria-hidden="true" className="to-sidebar-icon-placeholder">◴</span>}>
                                    <IconAutoSetting aria-hidden="true" />
                                </React.Suspense>
                                <span>Working hours</span>
                            </NavLink>
                        </li>
                    </ul>
                </div>

                <div className="to-sidebar-footer">
                    <button type="button" className="nav-link to-sidebar-link to-sidebar-signout" onClick={signOut}>
                        <IconLogout aria-hidden="true" className="w-4.5 h-4.5" />
                        <span>Sign out</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;
