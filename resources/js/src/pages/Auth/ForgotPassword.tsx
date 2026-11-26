import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../api/ApiCalls';
import Alerts from '../../components/Alerts';

const ForgotPassword = () => {
    const { coloredToast } = Alerts();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!email.trim()) {
            coloredToast('danger', 'Enter the email address for your account.');
            return;
        }
        setLoading(true);
        try {
            const response: any = await post('account/forgot-password', { email: email.trim() });
            if (response?.success) {
                setSubmitted(true);
                coloredToast('success', response.message || 'If your account exists, a reset link is on its way.');
            } else {
                coloredToast('danger', response?.message || 'We could not send a reset link. Please try again.');
            }
        } catch {
            coloredToast('danger', 'We could not send a reset link right now. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="to-auth-page">
            <section className="to-auth-shell">
                <aside className="to-auth-story">
                    <a href="/auth/login" className="to-brand"><span className="to-brand-mark">T</span><span>TaskOrbit</span></a>
                    <div className="to-story-copy"><span className="to-eyebrow">ACCOUNT RECOVERY</span><h1>Get back to<br/><span>your best work.</span></h1><p>We’ll help you securely regain access to your workspace and get your plans moving again.</p></div>
                    <div className="to-story-foot">Your work is worth protecting.</div>
                </aside>
                <section className="to-auth-form-panel">
                    <div className="to-auth-mobile-brand"><span className="to-brand-mark">T</span><strong>TaskOrbit</strong></div>
                    <div className="to-auth-form-wrap">
                        <span className="to-eyebrow to-eyebrow-light">FORGOT PASSWORD</span>
                        <h2>Reset your password</h2>
                        <p className="to-auth-subtitle">Enter the email address associated with your account. If it exists, we’ll send you a secure reset link.</p>
                        <form className="to-auth-form" onSubmit={submit}>
                            <div className="to-field"><label htmlFor="forgot-email">Email address</label><input id="forgot-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div>
                            <button className="to-primary-button" type="submit" disabled={loading}>{loading ? 'Sending link…' : 'Send reset link'}</button>
                        </form>
                        {submitted && <p className="to-auth-success" role="status">If an account matches that email, you’ll receive a password reset link shortly.</p>}
                        <p className="to-auth-switch"><Link to="/auth/login">Back to sign in</Link></p>
                    </div>
                    <footer className="to-auth-legal">© {new Date().getFullYear()} TaskOrbit. Built for focused work.</footer>
                </section>
            </section>
        </main>
    );
};

export default ForgotPassword;
