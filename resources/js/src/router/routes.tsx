import React from 'react';
import { lazy } from 'react';

//main page
const Index = lazy(() => import('../pages/Index'));

// auth pages
const LoginCover = lazy(() => import('../pages/Auth/NewLoginCover'));
const NewRegisterCover = lazy(() => import('../pages/Auth/NewRegisterCover'));
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'));

//task management pages
const TaskList = lazy(() => import('../pages/Task/tasklist'));
const RecycleBin = lazy(() => import('../pages/Task/recyleBin'));
const CreateTask = lazy(() => import('../pages/Task/createTask'));
const EditTask = lazy(() => import('../pages/Task/editTask'));
const SlotSetting = lazy(() => import('../pages/Task/slotSetting'));

const routes = [
    // dashboard
    {
        path: '/',
        element: <Index />,
    },

    {
        path: '/auth/login',
        element: <LoginCover />,
        layout: "blank",
    },
    {
        path: '/auth/register',
        element: <NewRegisterCover />,
        layout: "blank",
    },
    
    {
        path: '/tasklist',
        element: <TaskList />,
    },
    {
        path: '/tasks/create',
        element: <CreateTask />,
    },
    {
        path: '/tasks/edit/:id',
        element: <EditTask />,
    },
    {
        path: '/recyclebin',
        element: <RecycleBin />,
    },
    {
        path: '/slotsetting',
        element: <SlotSetting />,
    },
];

export { routes };
