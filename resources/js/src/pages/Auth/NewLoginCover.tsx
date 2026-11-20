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

            const errorMsg =
                error?.response?.data?.message ||
                error?.message ||
                'Something went wrong. Please try again.';

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
        <div className="bg-[url('https://midone-html.left4code.com/dist/images/noise.png')] bg-black xl:bg-none xl:bg-[#f8fafc] after:-mb-[16%] after:-ml-[12%] after:-mt-[28%] after:absolute after:bg-[rgba(0,0,0,0.95)] after:bg-[url('https://midone-html.left4code.com/dist/images/noise.png')] after:hidden after:inset-y-0 after:left-0 after:rotate-[6deg] after:rounded-[35%] after:transform after:w-[57%] after:xl:block h-screen lg:overflow-hidden relative before:hidden before:xl:block before:w-[57%] before:-mt-[20%] before:-mb-[13%] before:-ml-[12%] before:absolute before:inset-y-0 before:left-0 before:transform before:rotate-[-6deg] before:bg-[rgba(30,58,138,0.4)] before:bg-[url('https://midone-html.left4code.com/dist/images/noise.png')] before:border before:border-[rgba(30,58,138,0.5)] before:opacity-60 before:rounded-[20%]">
            <div className="lg:overflow-hidden before:hidden before:xl:block before:content-[''] before:w-[57%] before:-mt-[28%] before:-mb-[16%] before:-ml-[12%] before:absolute before:inset-y-0 before:left-0 before:transform before:rotate-[6deg] before:bg-[url('https://midone-html.left4code.com/dist/images/accent.svg')] before:bg-cover before:blur-xl before:rounded-[35%] before:border-[20px] before:border-[#1c398e] before:z-4"></div>

            <div className="container relative z-10 block xl:grid xl:grid-cols-2 gap-4 p-3 mx-auto sm:px-20">
                <div className="xl:flex hidden min-h-screen flex-col">
                    <a className="flex items-center pt-10" href="#">
                        <img className="w-40 h-40 hue-rotate-337" src="/assets/images/logo/logo.png" alt="#" />
                        <span className="text-2xl font-bold text-indigo-200" style={{ textShadow: '-3px 4px black' }}>
                            TaskOrbit
                        </span>
                    </a>
                    <div className="-auto">
                        <div className="mt-10 text-4xl font-medium leading-tight text-white">
                            Stay organized and <br></br>
                            boost your productivity.
                        </div>
                        <div className="mt-5 text-lg text-white opacity-70">
                            Plan tasks, manage schedules, and track <br/> progress effortlessly with TaskOrbit.
                        </div>
                    </div>
                </div>

                <div className="relative my-10 flex h-screen py-5 xl:my-0 xl:h-auto xl:py-0">
                    <div className="box relative py-5 px-3 before:absolute before:inset-0 before:mx-3 before:-mb-3 before:border before:border-white/10 before:bg-[#f8fafc]/30 before:shadow-[0px_3px_5px_#0000000b] before:z-[-1] before:rounded-xl after:absolute after:inset-0 after:border after:border-white/10 after:bg-[#f8fafc] after:shadow-[0px_3px_5px_#0000000b] after:rounded-xl after:z-[-1] after:backdrop-blur-md sm:px-8 xl:p-0 mx-auto my-auto xl:w-3/4 lg:w-2/4 sm:w-3/4 xl:before:hidden xl:after:hidden bg-[#f8fafc] rounded-[12px]">
                        <h2 className="text-center text-[#314158] text-2xl font-semibold xl:text-left xl:text-3xl">Sign In</h2>
                        <div className="mt-8 flex flex-col gap-5">
                            {/* Email/Phone Field */}
                            <div>
                                <input
                                    className={`bg-[#f8fafc] h-10 w-full px-5 py-6 text-sm text-gray-500 placeholder:gray-500 
                                    border rounded-xl 
                                    focus:ring-1 focus:ring-offset-2 
                                    focus:ring-gray-200 focus:ring-offset-[#f8fafc] 
                                    outline-none transition-all duration-200 ease-in-out
                                    ${inputError ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}`}
                                    type="text"
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    autoComplete="username"
                                />
                                {inputError && errorMessage && (
                                    <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
                                )}
                            </div>

                            {/* Password Field with Eye Icon */}
                            <div className="relative">
                                <input
                                    className={`bg-[#f8fafc] h-10 w-full px-5 py-6 text-sm text-gray-500 placeholder:gray-500 
                                    border rounded-xl 
                                    focus:ring-1 focus:ring-offset-2 
                                    focus:ring-gray-200 focus:ring-offset-[#f8fafc] 
                                    outline-none transition-all duration-200 ease-in-out
                                    ${passwordError ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}
                                    pr-12`}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setPasswordError(false);
                                    }}
                                    onKeyDown={handleKeyPress}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    )}
                                </button>
                                {passwordError && (
                                    <p className="text-red-500 text-xs mt-1">Please enter your password</p>
                                )}
                            </div>

                            {/* Login Button */}
                            <div className="mt-5 text-center">
                                <button
                                    onClick={() => submitData()}
                                    disabled={isLoading}
                                    className="cursor-pointer inline-flex border items-center justify-center gap-2 rounded-xl text-sm font-medium focus-visible:outline-none bg-[#394f8733] border-[#394f8799] text-[#1c398e] hover:bg-[#394f870d] h-10 w-full px-4 py-5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg aria-hidden="true" role="status" className="inline w-4 h-4 me-3 text-primary animate-spin" viewBox="0 0 100 101" fill="none">
                                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB" />
                                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                                            </svg>
                                            {t('loading')}
                                        </>
                                    ) : (
                                        'Login'
                                    )}
                                </button>
                                <button 
                                    onClick={() => navigate('/auth/register')}
                                    className="cursor-pointer inline-flex border items-center justify-center gap-2 rounded-xl text-sm font-medium focus-visible:outline-none text-[#314158] hover:bg-[#394f870d] bg-[#f8fafc] border-[#394f874d] h-10 mt-4 w-full px-4 py-5"
                                >
                                    Register
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewLoginConver;