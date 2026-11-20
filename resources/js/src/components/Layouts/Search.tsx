import React, { useState, Fragment, lazy } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link } from 'react-router-dom';
// import IconSearch from '../Icon/IconSearchh';
// import IconCancel from '../Icon/IconCancel';
// import IconUserr from '../Icon/IconUserr';
// import IconMails from '../Icon/IconMails';
// import IconProduct from '../Icon/IconProduct';
// import IconDepartment from '../Icon/IconDepartment';
// import IconMobileDevice from '../Icon/IconMobileDevice';

const IconSearch = lazy(() => import('../Icon/IconSearch'));
const IconCancel = lazy(() => import('../Icon/IconCancel'));
const IconUserr = lazy(() => import('../Icon/IconUserr'));
const IconMails = lazy(() => import('../Icon/IconMails'));
const IconProduct = lazy(() => import('../Icon/IconProduct'));
const IconDepartment = lazy(() => import('../Icon/IconDepartment'));
const IconMobileDevice = lazy(() => import('../Icon/IconMobileDevice'));

const Search = () => {
    const [searchModal, setSearchModal] = useState(false);

    return (
        <>
            <div
                onClick={() => setSearchModal(true)}
                className="quick_search_toggle ml-auto bg-white hover:ring-[#314158]/5 flex h-9 w-fit cursor-pointer items-center rounded-full border px-4 ring-1 ring-transparent ring-offset-2 ring-offset-transparent transition-all duration-300 ease-in-out"
            >
                <div className="flex items-center gap-3 opacity-70">
                    <IconSearch className="size-4 stroke-[1.5] text-[#314158] stroke-[#314158] fill-[#314158]/25" />
                    ⌘K
                </div>
            </div>                   
                      
            {/* Search Modal */}
            <div className="mb-5">
                <Transition appear show={searchModal} as={Fragment}>
                    <Dialog as="div" className="relative z-[999]"  onClose={() => setSearchModal(false)}>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0" />
                        </Transition.Child>
                        <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                            <div className="flex items-center justify-center min-h-screen px-4 rounded-3xl">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >
                                    <Dialog.Panel
                                        as="div"
                                        className="panel !p-0 relative before:absolute before:inset-0 before:mx-3 before:-mb-3 before:border before:border-[#314158]/10 before:z-[-1] after:absolute after:inset-0 after:border after:border-white/10 after:bg-[#fbfbfb] after:shadow-[0px_3px_5px_#0000000b] after:z-[-1] after:backdrop-blur-md before:bg-[#fbfbfb]/60 dark:before:shadow-[#314158] before:shadow-[#314158]/60 z-50 mx-auto transition-[margin-top,transform] duration-[0.4s,0.3s] before:rounded-3xl before:shadow-2xl after:rounded-3xl sm:max-w-2xl sm:w-full rounded-3xl"
                                    >
                                        <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between border-b border-dashed rounded-t-3xl overflow-hidden">
                                            <div className="flex items-center bg-[#fbfbfb] grow py-3 px-4">
                                                <IconSearch className="size-4 stroke-[1.5] text-[#314158] stroke-[#314158] fill-[#314158]/25" />
                                                <input
                                                    className="rounded-md border px-3 py-2 ring-offset-[#314158] placeholder:text-[#314158]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 w-full disabled:cursor-not-allowed disabled:opacity-50  bg-transparent border-none focus:ring-offset-transparent focus-visible:ring-transparent text-sm"
                                                    type="text"
                                                    placeholder="Quick search..."
                                                />
                                                <div className="flex items-center h-6 px-2 text-[#314157] my-auto border rounded-lg">esc</div>
                                                {/* <button type="button" className="text-white-dark hover:text-dark w-5 h-5" onClick={() => setSearchModal(false)}>
                                                    <IconCancel className="w-5 h-5" />
                                                </button> */}
                                            </div>
                                        </div>
                                        <div className="overflow-auto h-[500px] mb-[20px]">
                                            <div className="flex flex-wrap gap-2 mt-4 px-4 text-[#314157]">
                                                <Link className="hover:bg-[#314157]/5 flex items-center gap-x-1.5 rounded-full border px-3 py-0.5 text-sm" to="">
                                                    <IconUserr className="size-4 stroke-[1.5] stroke-[#314157] fill-[#314157]/25" />
                                                    Users
                                                </Link>
                                                <Link className="hover:bg-[#314157]/5 flex items-center gap-x-1.5 rounded-full border px-3 py-0.5 text-sm" to="">
                                                    <IconDepartment className="size-4 stroke-[1.5] stroke-[#314157] fill-[#314157]/25" />
                                                    Departments
                                                </Link>
                                                <Link className="hover:bg-[#314157]/5 flex items-center gap-x-1.5 rounded-full border px-3 py-0.5 text-sm" to="">
                                                    <IconProduct className="size-4 stroke-[1.5] stroke-[#314157] fill-[#314157]/25" />
                                                    Products
                                                </Link>
                                                <Link className="hover:bg-[#314157]/5 flex items-center gap-x-1.5 rounded-full border px-3 py-0.5 text-sm" to="">
                                                    <IconMails className="size-4 stroke-[1.5] stroke-[#314157] fill-[#314157]/25" />
                                                    Mails
                                                </Link>
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center text-[#314157]">
                                                    <div className="text-xs uppercase opacity-70">Users</div>
                                                    <Link className="ml-auto text-xs opacity-70" to="">
                                                        See All
                                                    </Link>
                                                </div>
                                                <div className="mt-3.5 flex flex-col gap-1">
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <span
                                                            data-content=""
                                                            className="tooltip border-white/5 block relative flex-none overflow-hidden rounded-full border-[3px] ring-1 ring-[#314158]/25 text-[#314158] size-8"
                                                        >
                                                            <img className="absolute top-0 size-full object-cover" src="/assets/images/user-profile.jpeg" alt="Profile" />
                                                        </span>
                                                        <div className="font-semibold truncate text-[#314157]">Johnny Depp</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Frontend Engineer</div>
                                                    </Link>
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <span
                                                            data-content=""
                                                            className="tooltip border-white/5 block relative flex-none overflow-hidden rounded-full border-[3px] ring-1 ring-[#314158]/25 text-[#314158] size-8"
                                                        >
                                                            <img className="absolute top-0 size-full object-cover" src="/assets/images/user-profile.jpeg" alt="Profile" />
                                                        </span>
                                                        <div className="font-semibold truncate text-[#314157]">Johnny Depp</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Backend Engineer</div>
                                                    </Link>
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <span
                                                            data-content=""
                                                            className="tooltip border-white/5 block relative flex-none overflow-hidden rounded-full border-[3px] ring-1 ring-[#314158]/25 text-[#314158] size-8"
                                                        >
                                                            <img className="absolute top-0 size-full object-cover" src="/assets/images/user-profile.jpeg" alt="Profile" />
                                                        </span>
                                                        <div className="font-semibold truncate text-[#314157]">Johnny Depp</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Frontend Engineer</div>
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-dashed">
                                                <div className="flex items-center text-[#314157]">
                                                    <div className="text-xs uppercase opacity-70">Departments</div>
                                                    <Link className="ml-auto text-xs opacity-70" to="">
                                                        See All
                                                    </Link>
                                                </div>
                                                <div className="mt-3.5 flex flex-col gap-1">
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <div className="flex items-center justify-center overflow-hidden border rounded-lg border-primary/10 bg-primary/10 text-primary size-8">
                                                            <IconMobileDevice className="size-4 stroke-[1.5] text-[#314158] stroke-[#314158] fill-[#314158]/25" />
                                                        </div>
                                                        <div className="font-semibold truncate text-[#314157]">Samsung Galaxy S20 Ultra</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Smartphone &amp; Tablet</div>
                                                    </Link>
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <div className="flex items-center justify-center overflow-hidden border rounded-lg border-primary/10 bg-primary/10 text-primary size-8">
                                                            <IconMobileDevice className="size-4 stroke-[1.5] text-[#314158] stroke-[#314158] fill-[#314158]/25" />
                                                        </div>
                                                        <div className="font-semibold truncate text-[#314157]">Sony A7 III</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Photography</div>
                                                    </Link>
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <div className="flex items-center justify-center overflow-hidden border rounded-lg border-primary/10 bg-primary/10 text-primary size-8">
                                                            <IconMobileDevice className="size-4 stroke-[1.5] text-[#314158] stroke-[#314158] fill-[#314158]/25" />
                                                        </div>
                                                        <div className="font-semibold truncate text-[#314157]">Sony A7 III</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Photography</div>
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-dashed">
                                                <div className="flex items-center text-[#314157]">
                                                    <div className="text-xs uppercase opacity-70">Products</div>
                                                    <Link className="ml-auto text-xs opacity-70" to="">
                                                        See All
                                                    </Link>
                                                </div>
                                                <div className="mt-3.5 flex flex-col gap-1">
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <span
                                                            data-content=""
                                                            className="tooltip border-[#314158]/5 block relative flex-none overflow-hidden rounded-full border-[3px] ring-1 ring-[#314158]/25 text-[#314158] size-8"
                                                        >
                                                            <img className="absolute top-0 size-full object-cover" src="/assets/images/user-profile.jpeg" alt="Profile" />
                                                        </span>
                                                        <div className="font-semibold truncate text-[#314157]">Virginia Cheese Wedges</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Sport &amp; Outdoor</div>
                                                    </Link>
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <span
                                                            data-content=""
                                                            className="tooltip border-[#314158]/5 block relative flex-none overflow-hidden rounded-full border-[3px] ring-1 ring-[#314158]/25 text-[#314158] size-8"
                                                        >
                                                            <img className="absolute top-0 size-full object-cover" src="/assets/images/user-profile.jpeg" alt="Profile" />
                                                        </span>
                                                        <div className="font-semibold truncate text-[#314157]">Hotdog</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">Smartphone &amp; Tablet</div>
                                                    </Link>
                                                    <Link
                                                        className="hover:border-[#314158]/10 hover:bg-[#314158]/5 -mx-1 flex items-center gap-2.5 rounded-xl border border-transparent p-1 text-sm"
                                                        to=""
                                                    >
                                                        <span
                                                            data-content=""
                                                            className="tooltip border-[#314158]/5 block relative flex-none overflow-hidden rounded-full border-[3px] ring-1 ring-[#314158]/25 text-[#314158] size-8"
                                                        >
                                                            <img className="absolute top-0 size-full object-cover" src="/assets/images/user-profile.jpeg" alt="Profile" />
                                                        </span>
                                                        <div className="font-semibold truncate text-[#314157]">Chicken Wings</div>
                                                        <div className="hidden opacity-70 sm:block text-[#314157]">PC &amp; Laptop</div>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>
            </div>
        </>
    );
};

export default Search;
