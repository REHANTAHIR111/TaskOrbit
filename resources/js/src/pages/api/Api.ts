import config from '../../../../../public/frontend-config.json';
// const Api = 'https://dashboard.techenix.com/api/';
const Api = config?.base_url+'api/';
console.log('api',Api)
export { Api };