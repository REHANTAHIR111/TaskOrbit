 import moment from 'moment-timezone';

 export const convertInLocalTime: any = (time: any) => {
        const localTimezone: any = moment?.tz?.guess();
        const timeZone: any = localStorage.getItem('timezone');
        const selectedTimezone = timeZone ? timeZone : localTimezone;
        return moment?.tz(time, 'UTC').clone().tz(selectedTimezone).format('YYYY-MM-DD HH:mm:ss');
};