import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { IRootState } from '../../store';
import { setPageTitle, toggleSidebar, toggleTheme } from '../../store/themeConfigSlice';
import Dropdown from '../Dropdown';
import IconMenu from '../Icon/IconMenu';
import IconSun from '../Icon/IconSun';
import IconMoon from '../Icon/IconMoon';
import IconLogout from '../Icon/IconLogout';

const pageContext: Record<string, { title: string; description: string }> = {
    '/': { title: 'Dashboard', description: 'Your planning workspace' },
    '/tasklist': { title: 'All tasks', description: 'Review and manage your schedule' },
    '/tasks/create': { title: 'Create task', description: 'Add work to your schedule' },
    '/recyclebin': { title: 'Recycle bin', description: 'Restore or remove deleted tasks' },
    '/slotsetting': { title: 'Working hours', description: 'Manage your availability' },
};

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const [username, setUsername] = useState(() => localStorage.getItem('username') || 'My account');
    const [email, setEmail] = useState(() => localStorage.getItem('email') || '');

    const context = useMemo(() => {
        if (location.pathname.startsWith('/tasks/edit/')) {
            return { title: 'Edit task', description: 'Update task details and review schedule changes' };
        }

        return pageContext[location.pathname] || { title: 'TaskOrbit', description: 'Plan your work and protect your time' };
    }, [location.pathname]);

    useEffect(() => {
        dispatch(setPageTitle(context.title));
        setUsername(localStorage.getItem('username') || 'My account');
        setEmail(localStorage.getItem('email') || '');
    }, [context.title, dispatch, location.pathname]);

    const signOut = () => {
        localStorage.clear();
        navigate('/auth/login');
    };

    const toggleColorTheme = () => {
        dispatch(toggleTheme(themeConfig.theme === 'dark' ? 'light' : 'dark'));
    };

    return (
        <header className="z-40">
            <div className="taskorbit-header-surface">
                <button
                    type="button"
                    className="to-header-icon-button to-header-nav-toggle"
                    aria-label={themeConfig.sidebar ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={themeConfig.sidebar}
                    onClick={() => dispatch(toggleSidebar())}
                >
                    <IconMenu className="h-5 w-5" />
                </button>

                <div className="to-header-context" aria-live="polite">
                    <strong>{context.title}</strong>
                    <span>{context.description}</span>
                </div>

                <div className="to-header-actions">
                    <button
                        type="button"
                        className="to-header-icon-button"
                        aria-label={themeConfig.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                        aria-pressed={themeConfig.theme === 'dark'}
                        onClick={toggleColorTheme}
                    >
                        {themeConfig.theme === 'dark' ? <IconSun className="h-4.5 w-4.5" /> : <IconMoon className="h-4.5 w-4.5" />}
                    </button>

                    <Dropdown
                        offset={[0, 8]}
                        placement="bottom-end"
                        btnClassName="to-account-dropdown-trigger"
                        button={
                            <span className="to-account-trigger">
                                <span className="to-avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
                                <span>{username}</span>
                            </span>
                        }
                    >
                        <ul className="to-account-menu">
                            <li className="to-account-menu-profile">
                                <strong>{username}</strong>
                                {email && <span>{email}</span>}
                            </li>
                            <li>
                                <button type="button" className="to-account-menu-action" onClick={signOut}>
                                    <IconLogout className="h-4 w-4" />
                                    <span>Sign out</span>
                                </button>
                            </li>
                        </ul>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
};

export default Header;
