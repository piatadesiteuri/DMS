import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table' 

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../ui/alert-dialog"

import Toast from "../ui/toast"

import React, { useState, useEffect, useRef } from 'react'

const AcceptedUsrTbl = () => {
    const [tableData, setTableData] = useState([]);
    const [changes, setChanges] = useState({});
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'warning' });
    const [openn, setOpenn] = useState(0);

    // Remove unused refs
    const uploadRef = useRef({});
    const printRef = useRef({});
    const downloadRef = useRef({});
    const diffuseRef = useRef({});
    const rolesRef = useRef({});

    useEffect(() => {
        fetch('http://localhost:3000/admin/modify', {
            credentials: 'include'
        }).then(res => res.json()).then(results => {
            setTableData(results);
            // Initialize changes state
            const initialChanges = {};
            results.forEach(user => {
                initialChanges[user.id_user] = {
                    diffuse: user.diffuse === 1,
                    upload: user.upload === 1,
                    download: user.download === 1,
                    print: user.print === 1,
                    roles: user.roles || 'user'
                };
            });
            setChanges(initialChanges);
        });
    }, []);

    const handleCheckboxChange = (userId, field, value) => {
        setChanges(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: value
            }
        }));
    };

    const handleRoleChange = (userId, value) => {
        if (value === 'responsable') {
            setToast({
                show: true,
                message: 'Warning: Responsable role has restricted permissions. Upload permission will be disabled.',
                type: 'warning'
            });
        }
        setChanges(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                roles: value,
                upload: value === 'responsable' ? false : prev[userId].upload
            }
        }));
    };

    const hasChanges = (userId) => {
        const user = tableData.find(u => u.id_user === userId);
        if (!user) return false;
        
        const currentChanges = changes[userId];
        return (
            currentChanges.diffuse !== (user.diffuse === 1) ||
            currentChanges.upload !== (user.upload === 1) ||
            currentChanges.download !== (user.download === 1) ||
            currentChanges.print !== (user.print === 1) ||
            currentChanges.roles !== user.roles
        );
    };

    async function updateUser(userId) {
        try {
            const userChanges = changes[userId];
            const res = await fetch('http://localhost:3000/admin/update-user', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: userId,
                    diffuse: userChanges.diffuse ? 1 : 0,
                    upload: userChanges.upload ? 1 : 0,
                    download: userChanges.download ? 1 : 0,
                    print: userChanges.print ? 1 : 0,
                    roles: userChanges.roles
                })
            });

            if (res.ok) {
                // Refresh the table data
                const updatedData = await fetch('http://localhost:3000/admin/modify', {
                    credentials: 'include'
                }).then(res => res.json());
                setTableData(updatedData);
                setUpdateDialogOpen(false);
                setToast({
                    show: true,
                    message: 'User permissions updated successfully!',
                    type: 'success'
                });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            setToast({
                show: true,
                message: 'Failed to update user permissions',
                type: 'warning'
            });
        }
    }

    async function blockUser(userId) {
        try {
            const res = await fetch('http://localhost:3000/admin/block-user', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: userId
                })
            });
            
            if (res.ok) {
                const updatedData = await fetch('http://localhost:3000/admin/modify', {
                    credentials: 'include'
                }).then(res => res.json());
                setTableData(updatedData);
                window.dispatchEvent(new CustomEvent('refreshActivateEmployees'));
                setBlockDialogOpen(false);
                setToast({
                    show: true,
                    message: 'User blocked successfully!',
                    type: 'success'
                });
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            setToast({
                show: true,
                message: 'Failed to block user',
                type: 'warning'
            });
        }
    }

    const columns = [
        {
            header: '#',
            accessorKey: 'id_user',
        },
        {
            header: 'First Name',
            accessorKey: 'prenom',
        },
        {
            header: 'Last Name',
            accessorKey: 'nom',
        },
        {
            header: 'Email',
            accessorKey: 'email',
        },
        {
            header: 'Diffuse',
            accessorKey: 'diffuse',
            cell: ({ cell }) => (
                <input 
                    ref={(el) => (diffuseRef.current[cell.row.original.id_user] = el)} 
                    type="checkbox"
                    checked={changes[cell.row.original.id_user]?.diffuse || false}
                    onChange={(e) => handleCheckboxChange(cell.row.original.id_user, 'diffuse', e.target.checked)}
                />
            ),
        },
        {
            header: 'Upload',
            accessorKey: 'upload',
            cell: ({ cell }) => (
                <input 
                    ref={(el) => (uploadRef.current[cell.row.original.id_user] = el)} 
                    type="checkbox"
                    checked={changes[cell.row.original.id_user]?.upload || false}
                    onChange={(e) => handleCheckboxChange(cell.row.original.id_user, 'upload', e.target.checked)}
                    disabled={changes[cell.row.original.id_user]?.roles === 'responsable'}
                />
            ),
        },
        {
            header: 'Download',
            accessorKey: 'download',
            cell: ({ cell }) => (
                <input 
                    ref={(el) => (downloadRef.current[cell.row.original.id_user] = el)} 
                    type="checkbox"
                    checked={changes[cell.row.original.id_user]?.download || false}
                    onChange={(e) => handleCheckboxChange(cell.row.original.id_user, 'download', e.target.checked)}
                />
            ),
        },
        {
            header: 'Print',
            accessorKey: 'print',
            cell: ({ cell }) => (
                <input 
                    ref={(el) => (printRef.current[cell.row.original.id_user] = el)} 
                    type="checkbox"
                    checked={changes[cell.row.original.id_user]?.print || false}
                    onChange={(e) => handleCheckboxChange(cell.row.original.id_user, 'print', e.target.checked)}
                />
            ),
        },
        {
            header: 'Roles',
            accessorKey: 'roles',
            cell: ({ cell }) => (
                <select 
                    ref={(el) => (rolesRef.current[cell.row.original.id_user] = el)}
                    value={changes[cell.row.original.id_user]?.roles || 'user'}
                    onChange={(e) => handleRoleChange(cell.row.original.id_user, e.target.value)}
                    className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-max p-1.5'
                >
                    <option value="user">User</option>
                    <option value="responsable">Responsable</option>
                </select>
            ),
        },
        {
            header: "Actions",
            cell: ({ cell }) => {
                const userId = cell.row.original.id_user;
                return (
                    <div className="flex gap-4 items-center">
                        <button 
                            className={`px-3 py-1 text-sm font-medium rounded-md ${
                                hasChanges(userId)
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            disabled={!hasChanges(userId)}
                            onClick={() => {
                                setSelectedUser(cell.row.original);
                                setUpdateDialogOpen(true);
                            }}
                        >
                            Update
                        </button>
                        <button 
                            className='text-red-500 hover:text-red-700 ml-4'
                            onClick={() => {
                                setSelectedUser(cell.row.original);
                                setBlockDialogOpen(true);
                            }}
                        >
                            Block
                        </button>
                    </div>
                );
            }
        }
    ];

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 5,
    });

    const [sorting, setSorting] = useState([]);
    const [filtering, setFiltering] = useState('');

    const table = useReactTable({
        data: tableData,
        columns: columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onPaginationChange: setPagination,
        state: {
            sorting: sorting,
            globalFilter: filtering,
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setFiltering,
    });

    return (
        <>
            <h1 className="text-3xl font-poppins mb-4 p-2">Modify Employee's Account</h1>
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ show: false, message: '', type: 'warning' })}
                />
            )}
            <div className="relative overflow-x-auto shadow-lg sm:rounded-xl w-[100%] left-4 top-4">
                <div className="pb-4 bg-white m-2">
                    <div className="relative mt-1">
                        <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                            </svg>
                        </div>
                        <input
                            className='block pt-2 ps-10 pb-2 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500'
                            type="text"
                            id="table-search"
                            value={filtering}
                            onChange={e => setFiltering(e.target.value)}
                            placeholder='Search'
                        />
                        <label htmlFor="table-search" className="sr-only">Search</label>
                    </div>
                </div>
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-200">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th className="px-6 py-3" key={header.id} onClick={header.column.getToggleSortingHandler()}>
                                        {header.isPlaceholder ? null : (
                                            <div>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {{ asc: ' ↓', desc: ' ↑' }[header.column.getIsSorted() ?? null]}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr className="bg-white border-b hover:bg-gray-50" key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap" key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div>
                    <button
                        className='px-3 h-8 ms-3 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700'
                        disabled={!table.getCanPreviousPage()}
                        onClick={() => table.previousPage()}
                    >
                        Previous
                    </button>
                    <button
                        className="px-3 h-8 ms-3 text-sm m-2 font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700"
                        disabled={!table.getCanNextPage()}
                        onClick={() => table.nextPage()}
                    >
                        Next
                    </button>
                </div>
            </div>
            
            {/* Update Confirmation Dialog */}
            <AlertDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Update User Permissions</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to update the permissions for {selectedUser?.prenom} {selectedUser?.nom}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <button
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            onClick={() => setUpdateDialogOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                            onClick={() => {
                                updateUser(selectedUser?.id_user);
                            }}
                        >
                            Update
                        </button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Block Confirmation Dialog */}
            <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Block User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to block {selectedUser?.prenom} {selectedUser?.nom}? This action will prevent them from accessing the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <button
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            onClick={() => setBlockDialogOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                            onClick={() => {
                                blockUser(selectedUser?.id_user);
                                setBlockDialogOpen(false);
                            }}
                        >
                            Block User
                        </button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default AcceptedUsrTbl;