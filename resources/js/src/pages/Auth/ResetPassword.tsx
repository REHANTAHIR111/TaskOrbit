import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { post } from '../api/ApiCalls';
import Alerts from '../../components/Alerts';
import TaskOrbitMark from '../../components/TaskOrbitMark';

const ResetPassword = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { coloredToast } = Alerts();
    const token = params.get('token') || '';
    const email = params.get('email') || '';
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token || !email) {
            coloredToast('danger', 'This reset link is incomplete. Request a new password reset link.');
            return;
        }
        if (password !== confirmation) {
            coloredToast('danger', 'Your password confirmation does not match.');
            return;
        }
        setLoading(true);
        try {
            const response: any = await post('account/reset-password', {
                token, email, password, password_confirmation: confirmation,
            });
            if (response?.success) {
                coloredToast('success', response.message || 'Your password has been updated.');
                navigate('/auth/login');
            } else {
                coloredToast('danger', response?.message || 'This reset link is invalid or expired.');
            }
        } catch {
            coloredToast('danger', 'We could not update your password. Request a new reset link and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="to-auth-page">
            <section className="to-auth-shell">
                <aside className="to-auth-story">
                    <a href="/auth/login" className="to-brand"><TaskOrbitMark /><span>TaskOrbit</span></a>
                    <div className="to-story-copy"><span className="to-eyebrow">SECURE YOUR WORKSPACE</span><h1>A fresh start<br/><span>starts here.</span></h1><p>Choose a strong password to keep your tasks, schedule and account protected.</p></div>
                    <div className="to-story-foot">Keep your account secure.</div>
                </aside>
                <section className="to-auth-form-panel">
                    <div className="to-auth-mobile-brand"><TaskOrbitMark /><strong>TaskOrbit</strong></div>
                    <div className="to-auth-form-wrap">
                        <span className="to-eyebrow to-eyebrow-light">NEW PASSWORD</span>
                        <h2>Choose a new password</h2>
                        <p className="to-auth-subtitle">{email ? `Set a new password for ${email}.` : 'Use the secure link from your password reset email.'}</p>
                        {!token || !email ? <div className="to-dashboard-notice">This reset link is missing information or is no longer valid. Request a new link to continue.</div> : (
                            <form className="to-auth-form" onSubmit={submit}>
                                <div className="to-field"><label htmlFor="reset-password">New password</label><div className="to-password-field"><input id="reset-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder="Create a new password" minLength={6} maxLength={16} required/><button type="button" className="to-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div><small className="to-field-hint">6–16 characters with uppercase, lowercase, number and special character.</small></div>
                                <div className="to-field"><label htmlFor="reset-confirm-password">Confirm new password</label><input id="reset-confirm-password" type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Re-enter your new password" required/></div>
                                <button className="to-primary-button" type="submit" disabled={loading}>{loading ? 'Updating password…' : 'Update password'}</button>
                            </form>
                        )}
                        <p className="to-auth-switch"><Link to="/auth/login">Back to sign in</Link></p>
                    </div>
                    <footer className="to-auth-legal">© {new Date().getFullYear()} TaskOrbit. Built for focused work.</footer>
                </section>
            </section>
        </main>
    );
};

export default ResetPassword;
