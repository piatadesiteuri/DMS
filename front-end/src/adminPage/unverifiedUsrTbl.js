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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"

import Toast from "../ui/toast"

import React, { useState, useEffect, useRef } from 'react'
import { backend } from '../config';
export default function BasicTable() {
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [checkboxStates, setCheckboxStates] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'warning' });
  const [tableData, setTableData] = useState([]);

  // Initialize refs as objects instead of arrays
  const uploadRef = useRef({});
  const printRef = useRef({});
  const downloadRef = useRef({});
  const rolesRef = useRef({});
  const diffuseRef = useRef({});

  useEffect(() => {
    // Initial data fetch
    fetch(`${backend}/admin/validation`, {
      credentials: 'include'
    }).then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }
      return res.json();
    }).then(results => { 
      setTableData(results);
      // Initialize checkbox states
      const newStates = {};
      results.forEach((user, index) => {
        newStates[user.id_user] = {
          diffuse: user.diffuse === 1,
          upload: user.upload === 1,
          download: user.download === 1,
          print: user.print === 1,
          roles: user.roles || 'user'
        };
      });
      setCheckboxStates(newStates);
    }).catch(error => {
      console.error('Error fetching data:', error);
    });

    // Listen for refresh events
    const handleRefresh = () => {
      fetch(`${backend}/admin/validation`, {
        credentials: 'include'
      }).then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch data');
        }
        return res.json();
      }).then(results => { 
        setTableData(results);
        // Update checkbox states
        const newStates = {};
        results.forEach((user, index) => {
          newStates[user.id_user] = {
            diffuse: user.diffuse === 1,
            upload: user.upload === 1,
            download: user.download === 1,
            print: user.print === 1,
            roles: user.roles || 'user'
          };
        });
        setCheckboxStates(newStates);
      }).catch(error => {
        console.error('Error fetching data:', error);
      });
    };

    window.addEventListener('refreshActivateEmployees', handleRefresh);

    return () => {
      window.removeEventListener('refreshActivateEmployees', handleRefresh);
    };
  }, []);
  
  const handleCheckboxChange = (userId, field, value) => {
    setCheckboxStates(prev => ({
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
    setCheckboxStates(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        roles: value,
        upload: value === 'responsable' ? false : prev[userId].upload
      }
    }));
  };

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
          checked={checkboxStates[cell.row.original.id_user]?.diffuse || false}
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
          checked={checkboxStates[cell.row.original.id_user]?.upload || false}
          onChange={(e) => handleCheckboxChange(cell.row.original.id_user, 'upload', e.target.checked)}
          disabled={checkboxStates[cell.row.original.id_user]?.roles === 'responsable'}
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
          checked={checkboxStates[cell.row.original.id_user]?.download || false}
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
          checked={checkboxStates[cell.row.original.id_user]?.print || false}
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
          className='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-max p-1.5'
          value={checkboxStates[cell.row.original.id_user]?.roles || 'user'}
          onChange={(e) => handleRoleChange(cell.row.original.id_user, e.target.value)}
        >
          <option value="user">User</option>
          <option value="responsable">Responsable</option>
        </select>
      ),
    },
    {
      header: 'Activate',
      accessorKey: 'add',
      cell: (cell) => {
        return (
          <button 
            onClick={() => {
              setSelectedUser(cell.row.original);
              setActivateDialogOpen(true);
            }}
          >
            Activate
          </button>
        );
      }
    },
    {
      header: 'Delete',
      cell: ({ cell }) => {
        return (
          <button className='text-red-500' onClick={() => handleClickdelete(cell.row.original.id_user)}>Delete</button>
        )
      }
    }
  ];

  const handleClickdelete = (id) => {
    deleteRow(id);
    window.location.reload();
  }
  async function deleteRow(id){
    try {
      const res = await fetch(`${backend}/admin/delete`,{
        method : 'POST', 
        credentials : "include",
        headers : {
            "Content-Type" : "application/json"
        },
        body : JSON.stringify({
          id : id
        })
      });
      
      if (res.ok) {
        setToast({
          show: true,
          message: 'User deleted successfully!',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setToast({
        show: true,
        message: 'Failed to delete user',
        type: 'warning'
      });
    }
  }

  const [sorting, setSorting] = useState([])
  const [filtering, setFiltering] = useState('')
  const [pagination, setPagination] = useState({
    pageIndex: 0, //initial page index
    pageSize: 5, //default page size
  });
  
  const table = useReactTable({
    data: tableData,
    columns : columns,
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
  })

  async function addPreUser(e, diffuse, upload, download, print, roles) {
    try {
      const res = await fetch(`${backend}/admin/reactivate`, {
        method: 'POST',
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          e: e,
          diffuse: diffuse,
          upload: upload,
          print: print,
          download: download,
          roles: roles
        })
      });

      if (!res.ok) {
        throw new Error('Failed to activate user');
      }

      // Refresh the table data after successful activation
      const updatedData = await fetch(`${backend}/admin/validation`, {
        credentials: 'include'
      }).then(res => res.json());
      setTableData(updatedData);
      setActivateDialogOpen(false);
      setToast({
        show: true,
        message: 'User activated successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error activating user:', error);
      setToast({
        show: true,
        message: 'Failed to activate user',
        type: 'warning'
      });
    }
  }

  return (<>
    <h1 className="text-3xl font-poppins mb-4 p-2">Unverified Users</h1>
    {toast.show && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ show: false, message: '', type: 'warning' })}
      />
    )}
    <div className="relative overflow-x-auto shadow-lg sm:rounded-xl w-[100%] left-4 top-24 bg-white">
      <div className="pb-4 bg-white m-2  ">
        <div className="relative mt-1">
          <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
          <input
            className='block pt-2 ps-10 pb-2 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500'
            type="text" id="table-search"
            value={filtering}
            onChange={e => setFiltering(e.target.value)}
            placeholder='Search'
          /> <label htmlFor="table-search" className="sr-only">Search</label>
        </div>
      </div>
      <table className="w-full text-sm text-left rtl:text-right  text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-200">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th className="px-6 py-3"
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder ? null : (
                    <div>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {
                        { asc: ' ↓', desc: ' ↑' }[
                          header.column.getIsSorted() ?? null
                        ]
                      }
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr className="bg-white border-b   hover:bg-gray-50 " key={row.id}>
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
          className=' px-3 h-8 ms-3 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700'
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          Previous
        </button>
        <button
          className=" px-3 h-8 ms-3 text-sm m-2 font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          Next
        </button>
      </div>
    </div>

    <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Activate User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to activate {selectedUser?.prenom} {selectedUser?.nom}? 
            This will restore their access to the system with the selected permissions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            onClick={() => setActivateDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            onClick={() => {
              if (selectedUser) {
                const userStates = checkboxStates[selectedUser.id_user];
                addPreUser(
                  selectedUser.id_user,
                  userStates.diffuse,
                  userStates.upload,
                  userStates.download,
                  userStates.print,
                  userStates.roles
                );
              }
            }}
          >
            Activate User
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>);
}
