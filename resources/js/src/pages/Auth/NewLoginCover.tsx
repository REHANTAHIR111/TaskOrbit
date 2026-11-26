import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import { post } from "../api/ApiCalls";
import { useTranslation } from 'react-i18next';
import Alerts from '../../components/Alerts';

const NewLoginConver = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { coloredToast } = Alerts();
    
    // State management
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [inputError, setInputError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Login'));
    }, [dispatch]);

    // Validate email format
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };


    // Handle input change
    const handleInputChange = (value: string) => {
        setEmail(value);
        setInputError(false);
        setErrorMessage('');
    };

    // Handle login submission
    const submitData = async () => {
        setIsLoading(true);
        setInputError(false);
        setPasswordError(false);
        setErrorMessage('');

        // Validation
        let hasError = false;

        if (!email) {
            setInputError(true);
            setErrorMessage('Please enter email address');
            hasError = true;
        } else if (!validateEmail(email)) {
            setInputError(true);
            setErrorMessage('Please enter a valid email address');
            hasError = true;
        }

        if (!password) {
            setPasswordError(true);
            hasError = true;
        }

        if (hasError) {
            if (!email) {
                coloredToast('danger', 'Please enter email address');
            } else if (!password) {
                coloredToast('danger', 'Please enter password');
            } else if (!validateEmail(email)) {
                coloredToast('danger', 'Please enter a valid email address');
            } else if (!password) {
                coloredToast('danger', 'Please enter password');
            }

            setIsLoading(false);

            setTimeout(() => {
                setInputError(false);
                setPasswordError(false);
                setErrorMessage('');
            }, 3000);

            return;
        }

        try {
            const sendData = {
                email,
                password,
            };

            const responseJson: any = await post('account/login', sendData);

            if (responseJson?.success === true) {
                coloredToast('success', responseJson?.message);

                localStorage.setItem('user_id', responseJson?.user_data?.id);
                localStorage.setItem('username', responseJson?.user_data?.name);
                localStorage.setItem('email', responseJson?.user_data?.email);

                navigate('/');
            } else {
                coloredToast(
                    'danger',
                    responseJson?.message || 'Error! Please check data and try again'
                );
            }
        } catch (error: any) {
            console.error('Login failed:', error);

            const errorMsg = 'We could not sign you in. Check your details and try again.';

            coloredToast('danger', errorMsg);

            if (errorMsg.toLowerCase().includes('password')) {
                setPasswordError(true);
            } else {
                setInputError(true);
                setErrorMessage(errorMsg);
            }
        } finally {
            // Always stop loader after API finishes
            setIsLoading(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitData();
        }
    };

    return (
        <main className="to-auth-page">
            <section className="to-auth-shell">
                <aside className="to-auth-story">
                    <a href="/auth/login" className="to-brand" aria-label="TaskOrbit home">
                        <span className="to-brand-mark">T</span><span>TaskOrbit</span>
                    </a>
                    <div className="to-story-copy">
                        <span className="to-eyebrow">PLAN WITH PURPOSE</span>
                        <h1>Make room for<br/><span>meaningful work.</span></h1>
                        <p>Bring your tasks, time and priorities together. Build a schedule that works as hard as you do.</p>
                        <div className="to-story-points">
                            <div><span>01</span><p>Plan every day with clarity</p></div>
                            <div><span>02</span><p>Protect time for what matters</p></div>
                            <div><span>03</span><p>Stay on track as plans change</p></div>
                        </div>
                    </div>
                    <div className="to-story-foot">A calmer way to get things done.</div>
                </aside>
                <section className="to-auth-form-panel">
                    <div className="to-auth-mobile-brand"><span className="to-brand-mark">T</span><strong>TaskOrbit</strong></div>
                    <div className="to-auth-form-wrap">
                        <span className="to-eyebrow to-eyebrow-light">WELCOME BACK</span>
                        <h2>Sign in to your workspace</h2>
                        <p className="to-auth-subtitle">Enter your account details to continue.</p>
                        <form className="to-auth-form" onSubmit={(event) => { event.preventDefault(); submitData(); }}>
                            <div className="to-field">
                                <label htmlFor="login-email">Email address</label>
                                <input id="login-email" type="email" value={email} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={handleKeyPress} autoComplete="username" placeholder="you@example.com" aria-invalid={inputError}/>
                                {inputError && errorMessage && <small className="to-field-error">{errorMessage}</small>}
                            </div>
                            <div className="to-field">
                                <label htmlFor="login-password">Password</label>
                                <div className="to-password-field">
                                    <input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }} onKeyDown={handleKeyPress} autoComplete="current-password" placeholder="Enter your password" aria-invalid={passwordError}/>
                                    <button type="button" className="to-password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
                                </div>
                                {passwordError && <small className="to-field-error">Please enter your password.</small>}
                            </div>
                            <div className="to-auth-meta">
                                <label className="to-checkbox"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}/> <span>Remember me</span></label>
                                <button type="button" className="to-forgot-link" onClick={() => navigate('/auth/forgot-password')}>Forgot password?</button>
                            </div>
                            <button type="submit" disabled={isLoading} className="to-primary-button">
                                {isLoading ? <><span className="to-spinner"/> Signing in…</> : "Sign in"}
                            </button>
                        </form>
                        <p className="to-auth-switch">New to TaskOrbit? <button type="button" onClick={() => navigate('/auth/register')}>Create an account</button></p>
                    </div>
                    <footer className="to-auth-legal">© {new Date().getFullYear()} TaskOrbit. Built for focused work.</footer>
                </section>
            </section>
        </main>
    );
};

export default NewLoginConver;