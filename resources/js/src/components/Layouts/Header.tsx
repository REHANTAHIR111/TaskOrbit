import { useEffect, useMemo, useRef, useState } from 'react';
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
    const [commandOpen, setCommandOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const commandInputRef = useRef<HTMLInputElement>(null);
    const commands = [
        { label: 'Open dashboard', detail: 'Workspace overview', path: '/', icon: '⌂', group: 'Navigate' },
        { label: 'All tasks', detail: 'Search and manage tasks', path: '/tasklist', icon: '☷', group: 'Navigate' },
        { label: 'Create a task', detail: 'Add a task to your schedule', path: '/tasks/create', icon: '+', group: 'Actions' },
        { label: 'Recycle bin', detail: 'Restore or permanently remove tasks', path: '/recyclebin', icon: '↶', group: 'Navigate' },
        { label: 'Working hours', detail: 'Manage availability and breaks', path: '/slotsetting', icon: '◷', group: 'Settings' },
    ];
    const filteredCommands = commands.filter((command) => (command.label + ' ' + command.detail).toLowerCase().includes(commandQuery.trim().toLowerCase()));
    const runCommand = (path: string) => { navigate(path); setCommandOpen(false); setCommandQuery(''); };

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

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandOpen((open) => !open);
            }
            if (event.key === 'Escape') setCommandOpen(false);
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    useEffect(() => {
        if (commandOpen) commandInputRef.current?.focus();
    }, [commandOpen]);

    const signOut = () => {
        localStorage.clear();
        navigate('/auth/login');
    };

    const toggleColorTheme = () => {
        dispatch(toggleTheme(themeConfig.theme === 'dark' ? 'light' : 'dark'));
    };

    return (
        <header className="to-global-header">
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
                    <button type="button" className="to-command-trigger" onClick={() => setCommandOpen(true)} aria-label="Open command menu">
                        <span>Quick actions</span><kbd>Ctrl K</kbd>
                    </button>
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
                                <div className="to-account-menu-heading"><span className="to-avatar" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span><span><strong>{username}</strong>{email && <span>{email}</span>}</span></div>
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
            {commandOpen && (
                <div className="to-command-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
                    <section className="to-command-dialog" role="dialog" aria-modal="true" aria-label="TaskOrbit command menu">
                        <div className="to-command-search-row">
                            <span aria-hidden="true">⌕</span>
                            <input ref={commandInputRef} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0].path); }} placeholder="Search pages and actions…" aria-label="Search commands" />
                            <kbd>ESC</kbd>
                        </div>
                        <div className="to-command-results">
                            <div className="to-command-group-label">Workspace</div>
                            {filteredCommands.length ? filteredCommands.map((command) => (
                                <button type="button" className="to-command-item" key={command.path} onClick={() => runCommand(command.path)}>
                                    <span className="to-command-item-icon" aria-hidden="true">{command.icon}</span>
                                    <span><strong>{command.label}</strong><span style={{ display: 'block', marginTop: 2, color: 'var(--to-muted)', fontSize: 10 }}>{command.detail}</span></span>
                                    <kbd>↵</kbd>
                                </button>
                            )) : <div className="to-command-empty-state">No matching actions. Try another search.</div>}
                        </div>
                        <div className="to-command-footer"><span>Navigate with search</span><span>Enter to open · Esc to close</span></div>
                    </section>
                </div>
            )}
        </header>
    );
};

export default Header;
