import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface LockScreenRouteProps {
    children: React.ReactNode;
}

const LockScreenRoute: React.FC<LockScreenRouteProps> = ({ children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        const lockScreen: any = localStorage.getItem('lockScreen');
        
        // If lockScreen is not '1', redirect to login page
        if (lockScreen == 1) {
            navigate('/auth/profile-lockscreen');
        }
    }, [navigate]);

    return (<>{children}</>);
};

export default LockScreenRoute;

