import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client'

// Perfect Scrollbar
import 'react-perfect-scrollbar/dist/css/styles.css';

// Tailwind css
import './tailwind.css';
import './taskorbit-design.css';
import './taskorbit-workspace.css';

// i18n (needs to be bundled)
import './i18n';

// Router
import { RouterProvider } from 'react-router-dom';
import router from './router/index';

// Redux
import { Provider } from 'react-redux';
import store from './store/index';
import { GlobalProvider } from './GlobalContext';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    // <React.StrictMode>
        <Suspense>
            <GlobalProvider>
                <Provider store={store}>
                    <RouterProvider router={router} />
                </Provider>
            </GlobalProvider>
        </Suspense>
    // </React.StrictMode>
);

