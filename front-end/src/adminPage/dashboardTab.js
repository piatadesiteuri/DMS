import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'

import { FileUp, FileDown, FileInput, Printer } from "lucide-react"

import React, { useState, useEffect } from 'react'
import StatisticsPanel from './StatisticsPanel'
import { api } from '../utils/api'

const DashboardTab = () => {
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get('/admin/modify');
                console.log("Fetched results:", response);

                if (!Array.isArray(response)) {
                    throw new Error('Invalid response format');
                }

                setTableData(response);
            } catch (error) {
                console.error("Error fetching data:", error);
                setError(error.message);
                setTableData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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
            cell: ({ cell }) => {
                if (cell.row.original.diffuse) {
                    return <FileInput className='text-green-500' />;
                }
                return <FileInput className='text-red-500' />;
            }
        },
        {
            header: 'Upload',
            accessorKey: 'upload',
            cell: ({ cell }) => {
                if (cell.row.original.upload) {
                    return <FileUp className='text-green-500' />;
                }
                return <FileUp className='text-red-500' />;
            }
        },
        {
            header: 'Download',
            accessorKey: 'download',
            cell: ({ cell }) => {
                if (cell.row.original.download) {
                    return <FileDown className='text-green-500' />;
                }
                return <FileDown className='text-red-500' />;
            }
        },
        {
            header: 'Print',
            accessorKey: 'print',
            cell: ({ cell }) => {
                if (cell.row.original.diffuse) {
                    return <Printer className='text-green-500' />;
                }
                return <Printer className='text-red-500' />;
            }
        },
        {
            header: 'Roles',
            accessorKey: 'roles',
            cell: (cell) => {
                return (
                    <p>{cell.row.original.roles === "responsable" ? "Responsible" : cell.row.original.roles}</p>
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            </div>
        );
    }

    return (
        <>
                    <br /><br />

            {/* Statistics Panel */}
            <div className="mb-8">
                <StatisticsPanel />
            </div>
        </>
    );
};

export default DashboardTab;