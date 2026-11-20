// import { DateTime } from "luxon"; // If you plan to use Luxon, you can re-enable this
import { get } from "./pages/api/ApiCalls";
import Swal from "sweetalert2";
import i18n from "./i18n";
import moment from "moment-timezone";
import { useContext } from "react";
import GlobalContext from "./GlobalContext";
// Get stored timezone or default to UTC
export const getStoredTimezone = (): string => {
    return localStorage.getItem("timezone") || "UTC";
};

// If you want to use Luxon instead of moment
// export const getCurrentTime = (): string => {
//     const timezone = getStoredTimezone();
//     return DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd HH:mm:ss");
// };

// export const convertToStoredTimezone = (date: Date | string): string => {
//     const timezone = getStoredTimezone();
//     return DateTime.fromJSDate(new Date(date)).setZone(timezone).toFormat("yyyy-MM-dd HH:mm:ss");
// };

// Get states by country_id
export const getStates = async (country_id: number | string): Promise<any> => {
    return get(`get-states?country_id=${country_id}`);
};

// Get cities by state_id
export const getCities = async (state_id: number | string): Promise<any> => {
    return get(`get-cities?state_id=${state_id}`);
};

// Get areas by city_id
export const getAreas = async (city_id: number | string): Promise<any> => {
    return get(`get-areas?city_id=${city_id}`);
};

// Show colored toast using SweetAlert2
export const coloredToast = (color: string, message: string): void => {
    const toast = Swal.mixin({
        toast: true,
        position: i18n.language === "ae" ? "top-start" : "top-end",
        showConfirmButton: false,
        timer: 3000,
        showCloseButton: true,
        customClass: {
            popup: `color-${color}`,
        },
    });

    toast.fire({
        title: message,
    });
};

// Convert UTC time to local (or stored) timezone
export const convertInLocalTime = (time: any,timeZone: any): string => {
    const localTimezone = moment.tz.guess();
    const storedTimezone = timeZone;
    const selectedTimezone = storedTimezone || localTimezone;
    return moment.tz(time, "UTC").tz(selectedTimezone).format("YYYY-MM-DD HH:mm:ss");
};