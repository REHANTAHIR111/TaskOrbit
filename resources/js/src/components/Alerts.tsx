import React from 'react'
import Swal from 'sweetalert2';

const Alerts = () => {

    const coloredToast = (color: any, message: any, duration?: any) => {
        const toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: duration ? duration : 3000,
            showCloseButton: true,
            customClass: {
                popup: `color-${color}`,
            },
        });
        toast.fire({
            title: message,
            icon: color == 'danger' ? 'error' : color,
        });
    };

    return {
        coloredToast: coloredToast,
    }
}

export default Alerts;
