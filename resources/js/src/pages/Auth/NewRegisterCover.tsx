import React, { useState } from 'react';
import Alerts from '../../components/Alerts';
import { useNavigate } from 'react-router-dom';
import { post } from '../api/ApiCalls';
import TaskOrbitMark from '../../components/TaskOrbitMark';

const NewRegisterCover = () => {
    const navigate = useNavigate();
    const { coloredToast } = Alerts();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({
        firstName: false,
        lastName: false,
        phone: false,
        email: false,
        password: false,
        passwordConfirmation: false
    });
    const [errorMessages, setErrorMessages] = useState({
        phone: '',
        email: '',
        password: '',
        passwordConfirmation: ''
    });

    // Validate email format
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Validate phone number (Pakistan: 11 digits, starts with 03)
    const validatePhone = (phone: string) => {
        const phoneRegex = /^03[0-9]{9}$/;
        return phoneRegex.test(phone);
    };

    // Validate password: min 6, max 16, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
    const validatePassword = (password: string) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,16}$/;
        return passwordRegex.test(password);
    };

    const submitData = async () => {
        if (isSubmitting) return;
        let hasError = false;
        const newErrors = {
            firstName: !firstName,
            lastName: !lastName,
            phone: !phone,
            email: !email,
            password: !password,
            passwordConfirmation: !passwordConfirmation
        };
        
        const newErrorMessages = {
            phone: '',
            email: '',
            password: '',
            passwordConfirmation: ''
        };

        // Phone validation
        if (phone && !validatePhone(phone)) {
            newErrors.phone = true;
            newErrorMessages.phone = 'Phone number must be 11 digits and start with 03 (e.g., 03XXXXXXXXX)';
            hasError = true;
        }

        // Email validation
        if (email && !validateEmail(email)) {
            newErrors.email = true;
            newErrorMessages.email = 'Please enter a valid email address (e.g., name@example.com)';
            hasError = true;
        }

        // Password validation
        if (password && !validatePassword(password)) {
            newErrors.password = true;
            newErrorMessages.password = 'Password must be 6-16 characters and contain at least: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)';
            hasError = true;
        }

        // Confirm password validation
        if (passwordConfirmation && password !== passwordConfirmation) {
            newErrors.passwordConfirmation = true;
            newErrorMessages.passwordConfirmation = 'Password confirmation does not match';
            hasError = true;
        }

        // Check for empty fields
        if (!firstName || !lastName || !phone || !email || !password || !passwordConfirmation) {
            hasError = true;
            let missingFields = '';
            if (!firstName) missingFields += 'First Name, ';
            if (!lastName) missingFields += 'Last Name, ';
            if (!phone) missingFields += 'Phone, ';
            if (!email) missingFields += 'Email, ';
            if (!password) missingFields += 'Password, ';
            if (!passwordConfirmation) missingFields += 'Password Confirmation, ';
            missingFields = missingFields.slice(0, -2);
            coloredToast('danger', `Please fill: ${missingFields}!`);
        }

        setErrors(newErrors);
        setErrorMessages(newErrorMessages);

        if (hasError) {
            setTimeout(() => {
                setErrors({
                    firstName: false,
                    lastName: false,
                    phone: false,
                    email: false,
                    password: false,
                    passwordConfirmation: false
                });
                setErrorMessages({
                    phone: '',
                    email: '',
                    password: '',
                    passwordConfirmation: ''
                });
            }, 3000);
            return;
        }

        const sendData = {
            first_name: firstName,
            last_name: lastName,
            phone_number: phone,
            email: email,
            password: password,
        };

        setIsSubmitting(true);
        try {
            const responseJson: any = await post('account/registeration', sendData);
            if (responseJson.status == 'success') {
                coloredToast('success', 'Your account has been created successfully!');
                navigate('/auth/login');
            } else {
                coloredToast('danger', 'We could not create your account. Please review your details and try again.');
            }
        } catch {
            coloredToast('danger', 'We could not create your account right now. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="to-auth-page to-auth-register">
            <section className="to-auth-shell">
                <aside className="to-auth-story">
                    <a href="/auth/login" className="to-brand" aria-label="TaskOrbit home"><TaskOrbitMark /><span>TaskOrbit</span></a>
                    <div className="to-story-copy">
                        <span className="to-eyebrow">A BETTER WAY TO PLAN</span>
                        <h1>Your time.<br/><span>Your priorities.</span></h1>
                        <p>Create a workspace that helps you turn busy days into purposeful progress.</p>
                        <div className="to-story-points">
                            <div><span>01</span><p>One clear view of your tasks</p></div>
                            <div><span>02</span><p>Schedules built around your day</p></div>
                            <div><span>03</span><p>More control, less busywork</p></div>
                        </div>
                    </div>
                    <div className="to-story-foot">Start with a plan. Make progress every day.</div>
                </aside>
                <section className="to-auth-form-panel">
                    <div className="to-auth-mobile-brand"><TaskOrbitMark /><strong>TaskOrbit</strong></div>
                    <div className="to-auth-form-wrap to-register-wrap">
                        <span className="to-eyebrow to-eyebrow-light">GET STARTED</span>
                        <h2>Create your account</h2>
                        <p className="to-auth-subtitle">A few details and your workspace is ready to begin.</p>
                        <form className="to-auth-form" onSubmit={(event) => { event.preventDefault(); submitData(); }}>
                            <div className="to-auth-grid">
                                <div className="to-field"><label htmlFor="register-first-name">First name</label><input id="register-first-name" value={firstName} onChange={(e) => {setFirstName(e.target.value); if(errors.firstName) setErrors({...errors, firstName:false});}} autoComplete="given-name" placeholder="First name" aria-invalid={errors.firstName}/>{errors.firstName && <small className="to-field-error">First name is required.</small>}</div>
                                <div className="to-field"><label htmlFor="register-last-name">Last name</label><input id="register-last-name" value={lastName} onChange={(e) => {setLastName(e.target.value); if(errors.lastName) setErrors({...errors, lastName:false});}} autoComplete="family-name" placeholder="Last name" aria-invalid={errors.lastName}/>{errors.lastName && <small className="to-field-error">Last name is required.</small>}</div>
                            </div>
                            <div className="to-field"><label htmlFor="register-phone">Phone number</label><input id="register-phone" type="tel" value={phone} onChange={(e) => {setPhone(e.target.value); if(errors.phone) setErrors({...errors, phone:false});}} autoComplete="tel" placeholder="03XXXXXXXXX" aria-invalid={errors.phone}/>{errors.phone && errorMessages.phone && <small className="to-field-error">{errorMessages.phone}</small>}</div>
                            <div className="to-field"><label htmlFor="register-email">Email address</label><input id="register-email" type="email" value={email} onChange={(e) => {setEmail(e.target.value); if(errors.email) setErrors({...errors, email:false});}} autoComplete="email" placeholder="you@example.com" aria-invalid={errors.email}/>{errors.email && errorMessages.email && <small className="to-field-error">{errorMessages.email}</small>}</div>
                            <div className="to-field"><label htmlFor="register-password">Password</label><div className="to-password-field"><input id="register-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => {setPassword(e.target.value); if(errors.password) setErrors({...errors, password:false});}} autoComplete="new-password" placeholder="Create a password" aria-invalid={errors.password}/><button type="button" className="to-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div>{errors.password && errorMessages.password && <small className="to-field-error">{errorMessages.password}</small>}<small className="to-field-hint">6–16 characters with uppercase, lowercase, number and special character.</small></div>
                            <div className="to-field"><label htmlFor="register-confirm-password">Confirm password</label><div className="to-password-field"><input id="register-confirm-password" type={showConfirmPassword ? "text" : "password"} value={passwordConfirmation} onChange={(e) => {setPasswordConfirmation(e.target.value); if(errors.passwordConfirmation) setErrors({...errors, passwordConfirmation:false});}} autoComplete="new-password" placeholder="Re-enter your password" aria-invalid={errors.passwordConfirmation}/><button type="button" className="to-password-toggle" aria-label={showConfirmPassword ? 'Hide confirmation' : 'Show confirmation'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? "Hide" : "Show"}</button></div>{errors.passwordConfirmation && errorMessages.passwordConfirmation && <small className="to-field-error">{errorMessages.passwordConfirmation}</small>}</div>
                            <button type="submit" className="to-primary-button" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
                        </form>
                        <p className="to-auth-switch">Already have an account? <button type="button" onClick={() => navigate('/auth/login')}>Sign in</button></p>
                    </div>
                    <footer className="to-auth-legal">© {new Date().getFullYear()} TaskOrbit. Built for focused work.</footer>
                </section>
            </section>
        </main>
    );
};

export default NewRegisterCover;
