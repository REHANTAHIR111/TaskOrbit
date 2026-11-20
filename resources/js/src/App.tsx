import React, { PropsWithChildren, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from './store';
import {
    toggleRTL,
    toggleTheme,
    toggleLocale,
    toggleMenu,
    toggleLayout,
    toggleAnimation,
    toggleNavbar,
    toggleSemidark,
} from './store/themeConfigSlice';
import LockScreenRoute from './components/LockScreenRoute';

function App({ children }: PropsWithChildren) {
    const dispatch = useDispatch();

    const {
        sidebar,
        theme,
        menu,
        layout,
        rtlClass,
        animation,
        navbar,
        locale,
        semidark,
    } = useSelector((state: IRootState) => state.themeConfig);

    useEffect(() => {
        dispatch(toggleTheme(localStorage.getItem('theme') || theme));
        dispatch(toggleMenu(localStorage.getItem('menu') || menu));
        dispatch(toggleLayout(localStorage.getItem('layout') || layout));
        dispatch(toggleRTL(localStorage.getItem('rtlClass') || rtlClass));
        dispatch(toggleAnimation(localStorage.getItem('animation') || animation));
        dispatch(toggleNavbar(localStorage.getItem('navbar') || navbar));
        dispatch(toggleLocale(localStorage.getItem('i18nextLng') || locale));
        dispatch(toggleSemidark(localStorage.getItem('semidark') || semidark));
    }, [
        dispatch,
        theme,
        menu,
        layout,
        rtlClass,
        animation,
        navbar,
        locale,
        semidark,
    ]);

    return (
        <LockScreenRoute>
            <div
                className={`${sidebar ? 'toggle-sidebar' : ''} ${menu} ${layout} ${rtlClass} main-section antialiased relative font-nunito text-sm font-normal`}
            >
                {children}
            </div>
        </LockScreenRoute>
    );
}

export default App;