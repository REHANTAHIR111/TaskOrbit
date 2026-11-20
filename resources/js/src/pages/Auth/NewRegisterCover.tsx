import React, { useState } from 'react';
import Alerts from '../../components/Alerts';
import { useNavigate } from 'react-router-dom';
import { post } from '../api/ApiCalls';

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

    const submitData = () => {
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

        post('account/registeration', sendData).then((responseJson: any) => {
            if (responseJson.status == 'success') {
                coloredToast('success', 'Your account has been created successfully!');
                navigate('/auth/login');
            } else {
                coloredToast('danger', 'Error! Please check data and try again');
            }
        });
    }

    return (
        <>
            <div className="bg-[url('https://midone-html.left4code.com/dist/images/noise.png')] bg-black xl:bg-none xl:bg-[#f8fafc] after:-mb-[16%] after:-ml-[12%] after:-mt-[28%] after:absolute after:bg-[rgba(0,0,0,0.95)] after:bg-[url('https://midone-html.left4code.com/dist/images/noise.png')] after:hidden after:inset-y-0 after:left-0 after:rotate-[6deg] after:rounded-[35%] after:transform after:w-[57%] after:xl:block h-screen lg:overflow-hidden relative before:hidden before:xl:block before:w-[57%] before:-mt-[20%] before:-mb-[13%] before:-ml-[12%] before:absolute before:inset-y-0 before:left-0 before:transform before:rotate-[-6deg] before:bg-[rgba(30,58,138,0.4)] before:bg-[url('https://midone-html.left4code.com/dist/images/noise.png')] before:border before:border-[rgba(30,58,138,0.5)] before:opacity-60 before:rounded-[20%]">
                <div className="lg:overflow-hidden before:hidden before:xl:block before:content-[''] before:w-[57%] before:-mt-[28%] before:-mb-[16%] before:-ml-[12%] before:absolute before:inset-y-0 before:left-0 before:transform before:rotate-[6deg] before:bg-[url('https://midone-html.left4code.com/dist/images/accent.svg')] before:bg-cover before:blur-xl before:rounded-[35%] before:border-[20px] before:border-[#1c398e] before:z-4"></div>

                <div className="container relative z-10 block xl:grid xl:grid-cols-2 gap-4 p-3 mx-auto sm:px-20">
                    <div className="xl:flex hidden min-h-screen flex-col">
                        <a className="flex items-center pt-10" href="">
                            <img className="w-40 h-40 hue-rotate-337" src="/assets/images/logo/logo.png" alt="#" />
                            <span className={`text-2xl font-bold text-indigo-300`} style={{ textShadow: '-3px 4px black' }}>
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
                        <div className="box relative py-5 px-3 before:absolute before:inset-0 before:mx-3 before:-mb-3 before:border before:border-white/10 before:bg-[#f8fafc]/30 before:shadow-[0px_3px_5px_#0000000b] before:z-[-1] before:rounded-xl after:absolute after:inset-0 after:border after:border-white/10 after:bg-[#f8fafc] after:shadow-[0px_3px_5px_#0000000b] after:rounded-xl after:z-[-1] after:backdrop-blur-md sm:px-8 xl:p-0 mx-auto my-auto xl:w-3/4 lg:w-2/4 sm:w-3/4 w- xl:before:hidden xl:after:hidden bg-[#f8fafc] rounded-[12px]">
                            <h2 className="text-center text-[#314158] text-2xl font-semibold xl:text-left xl:text-3xl">Sign Up</h2>
                            <div className="mt-8 flex flex-col gap-5">
                                <div>
                                    <input
                                        className={`bg-[#f8fafc] h-10 w-full px-5 py-6 text-sm text-gray-500 placeholder:gray-500 
                                        border rounded-xl 
                                        focus:ring-1 focus:ring-offset-2 
                                        focus:ring-gray-200 focus:ring-offset-[#f8fafc] 
                                        outline-none transition-all duration-200 ease-in-out
                                        ${errors.firstName ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}`}
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) => {
                                            setFirstName(e.target.value);
                                            if (errors.firstName) setErrors({...errors, firstName: false});
                                        }}
                                    />
                                </div>

                                <div>
                                    <input
                                        className={`bg-[#f8fafc] h-10 w-full px-5 py-6 text-sm text-gray-500 placeholder:gray-500 
                                        border rounded-xl 
                                        focus:ring-1 focus:ring-offset-2 
                                        focus:ring-gray-200 focus:ring-offset-[#f8fafc] 
                                        outline-none transition-all duration-200 ease-in-out
                                        ${errors.lastName ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}`}
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={(e) => {
                                            setLastName(e.target.value);
                                            if (errors.lastName) setErrors({...errors, lastName: false});
                                        }}
                                    />
                                </div>

                                <div>
                                    <input
                                        className={`bg-[#f8fafc] h-10 w-full px-5 py-6 text-sm text-gray-500 placeholder:gray-500 
                                        border rounded-xl 
                                        focus:ring-1 focus:ring-offset-2 
                                        focus:ring-gray-200 focus:ring-offset-[#f8fafc] 
                                        outline-none transition-all duration-200 ease-in-out
                                        ${errors.phone ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}
                                        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={phone}
                                        onChange={(e) => {
                                            setPhone(e.target.value);
                                            if (errors.phone) setErrors({...errors, phone: false});
                                        }}
                                    />
                                    {errors.phone && errorMessages.phone && (
                                        <p className="text-red-500 text-xs mt-1">{errorMessages.phone}</p>
                                    )}
                                </div>

                                <div>
                                    <input
                                        className={`bg-[#f8fafc] h-10 w-full px-5 py-6 text-sm text-gray-500 placeholder:gray-500 
                                        border rounded-xl 
                                        focus:ring-1 focus:ring-offset-2 
                                        focus:ring-gray-200 focus:ring-offset-[#f8fafc] 
                                        outline-none transition-all duration-200 ease-in-out
                                        ${errors.email ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}`}
                                        type="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (errors.email) setErrors({...errors, email: false});
                                        }}
                                    />
                                    {errors.email && errorMessages.email && (
                                        <p className="text-red-500 text-xs mt-1">{errorMessages.email}</p>
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
                                        ${errors.password ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}
                                        pr-12`}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (errors.password) setErrors({...errors, password: false});
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                                    {errors.password && errorMessages.password && (
                                        <p className="text-red-500 text-xs mt-1">{errorMessages.password}</p>
                                    )}
                                </div>

                                {/* Confirm Password Field with Eye Icon */}
                                <div className="relative">
                                    <input
                                        className={`bg-[#f8fafc] h-10 w-full px-5 py-6 text-sm text-gray-500 placeholder:gray-500 
                                        border rounded-xl 
                                        focus:ring-1 focus:ring-offset-2 
                                        focus:ring-gray-200 focus:ring-offset-[#f8fafc] 
                                        outline-none transition-all duration-200 ease-in-out
                                        ${errors.passwordConfirmation ? 'border-red-500 bg-red-50 focus:ring-red-500 placeholder:text-red-300' : 'border-gray-200'}
                                        pr-12`}
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm Password"
                                        value={passwordConfirmation}
                                        onChange={(e) => {
                                            setPasswordConfirmation(e.target.value);
                                            if (errors.passwordConfirmation) setErrors({...errors, passwordConfirmation: false});
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showConfirmPassword ? (
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
                                    {errors.passwordConfirmation && errorMessages.passwordConfirmation && (
                                        <p className="text-red-500 text-xs mt-1">{errorMessages.passwordConfirmation}</p>
                                    )}
                                </div>

                                <div className="mt-5 text-center">
                                    <button
                                        onClick={() => submitData()}
                                        className="cursor-pointer inline-flex border items-center justify-center gap-2 rounded-xl text-sm font-medium focus-visible:outline-none bg-[#394f8733] border-[#394f8799] text-[#1c398e] hover:bg-[#394f870d] h-10 w-full px-4 py-5"
                                    >
                                        Register
                                    </button>
                                    <button 
                                        onClick={() => navigate('/auth/login')}
                                        className="cursor-pointer inline-flex border items-center justify-center gap-2 rounded-xl text-sm font-medium focus-visible:outline-none text-[#314158] hover:bg-[#394f870d] bg-[#f8fafc] border-[#394f874d] h-10 mt-4 w-full px-4 py-5"
                                    >
                                        Login
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default NewRegisterCover;