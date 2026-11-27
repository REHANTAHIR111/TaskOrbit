import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IRootState } from '../../store';
import { toggleSidebar } from '../../store/themeConfigSlice';
import TaskOrbitMark from '../TaskOrbitMark';

type NavIconName = 'dashboard' | 'tasks' | 'trash' | 'hours' | 'logout' | 'chevron';
function NavIcon({ name }: { name: NavIconName }) {
    const common = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
    const paths: Record<NavIconName, React.ReactNode> = {
        dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.7" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.7" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.7" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.7" /></>,
        tasks: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8" /></>,
        trash: <><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></>,
        hours: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /><path d="M4 4 2.8 5.2M20 4l1.2 1.2" /></>,
        logout: <><path d="M10 17l5-5-5-5M15 12H3.5" /><path d="M12 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
        chevron: <path d="m14.5 5-7 7 7 7" />,
    };
    return <svg {...common}>{paths[name]}</svg>;
}

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
        if (window.innerWidth < 1024 && themeConfig.sidebar) dispatch(toggleSidebar());
    }, [dispatch, location.pathname]);

    const signOut = () => {
        localStorage.clear();
        navigate('/auth/login');
    };

    const links: { to: string; label: string; icon: NavIconName; end?: boolean }[] = [
        { to: '/', label: 'Overview', icon: 'dashboard', end: true },
        { to: '/tasklist', label: 'All tasks', icon: 'tasks' },
        { to: '/recyclebin', label: 'Recycle bin', icon: 'trash' },
        { to: '/slotsetting', label: 'Working hours', icon: 'hours' },
    ];

    return (
        <aside className="sidebar to-sidebar fixed top-0 bottom-0 left-0 z-50 h-screen" aria-label="Primary navigation">
            <div className="main_sidebar to-sidebar-surface h-full">
                <div className="to-sidebar-brand-row">
                    <NavLink to="/" className="to-sidebar-brand" aria-label="TaskOrbit dashboard">
                        <span className="to-sidebar-brand-mark"><TaskOrbitMark /></span>
                        <span className="to-sidebar-brand-name">TaskOrbit</span>
                        <span className="to-sidebar-brand-caption">WORKSPACE</span>
                    </NavLink>
                    <button type="button" className="to-sidebar-collapse" aria-label="Close navigation" onClick={() => dispatch(toggleSidebar())}>
                        <NavIcon name="chevron" />
                    </button>
                </div>

                <div className="to-sidebar-account">
                    <span className="to-avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
                    <span className="to-sidebar-account-copy">
                        <strong>{username}</strong>
                        <span>{email || 'Personal workspace'}</span>
                    </span>
                    <span className="to-sidebar-account-status" aria-label="Account active" />
                </div>

                <div className="to-sidebar-nav">
                    <p className="to-sidebar-section-label">Workspace</p>
                    <ul className="to-sidebar-nav-list">
                        {links.map((item) => (
                            <li className="nav-item" key={item.to}>
                                <NavLink to={item.to} end={item.end} className={({ isActive }) => 'nav-link to-sidebar-link' + (isActive ? ' active' : '')}>
                                    <span className="to-sidebar-link-icon"><NavIcon name={item.icon} /></span>
                                    <span className="to-sidebar-link-label">{item.label}</span>
                                    {item.to === '/tasklist' && <span className="to-sidebar-link-arrow">↗</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                    <div className="to-sidebar-divider" />
                    <p className="to-sidebar-section-label">Productivity</p>
                    <div className="to-sidebar-note">
                        <span className="to-sidebar-note-mark">✦</span>
                        <span><strong>Make time count.</strong><small>Your work, thoughtfully planned.</small></span>
                    </div>
                </div>

                <div className="to-sidebar-footer">
                    <button type="button" className="nav-link to-sidebar-link to-sidebar-signout" onClick={signOut}>
                        <span className="to-sidebar-link-icon"><NavIcon name="logout" /></span>
                        <span className="to-sidebar-link-label">Sign out</span>
                    </button>
                    <span className="to-sidebar-version">TASKORBIT · WORKSPACE</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
