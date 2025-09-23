import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    
  } from '@tanstack/react-table' 
import { isVisible } from '@testing-library/user-event/dist/utils'
  import { backend } from '../config'
  
  import React, { useState, useEffect,useRef } from 'react'
  import { Document, Page } from 'react-pdf'
  import { pdfjs } from 'react-pdf';
  import { Eye } from 'lucide-react';
  import 'react-pdf/dist/Page/AnnotationLayer.css';
  import 'react-pdf/dist/Page/TextLayer.css';
  pdfjs.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.min.js');

const VerifyDoc = () => {





  

  const [isOpen, setIsOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
   const docNameRef = useRef(null);
   const keyWordRef = useRef(null);
   const closePopup = () => setIsOpen(false);
   const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };
   const onPageChange = (newPage) => {
    setPageNumber(newPage);
  };
 
    
   
   
   

   const [tableData, setTableData] = useState([]);
   useEffect(() => {
    fetch(`${backend}/verifydoc`).then(res=>res.json()).then(results =>{ 
   
    setTableData(results);
 
   })}, []);
   
 



    
  async function verify(nom_doc, id_user) {
    const res = await fetch(`${backend}/VerifyFun`, {
        method: 'POST', headers: {
            "Content-Type": "application/json"
        }, body: JSON.stringify({
            nom_doc: nom_doc,
            id_user: id_user
        })
    });
  
    const data = await res.json();
    if (data.message) {
        alert(data.message);
    } else {
        alert(data.message);
    }
}
      
      


   
   
   
   async function handlelcickk(nom_doc,id_user){


verify(nom_doc,id_user)
window.location.reload()
   }
   
   
   
   

   
   
   
   

   
    const columns = [
     {
       header: 'Document Name',
       accessorKey: 'nom_doc',
     },
    
     {
       header: 'Sender',
    
       cell:({cell})=>{
        return(<p>{cell.row.original.nom+" "+cell.row.original.prenom}</p>)
       }
    
     },
    
     {
      header: 'Upload Date',
     
cell:({cell})=>{

return (<p>{(cell.row.original.date_time.replace('.000Z','').replace('T',' at '))}</p>)
}
    },
   
     {
         header: 'Verify document',
         accessorKey: 'verify',
         cell: ({ cell }) =>{
            console.log(cell.row.original.id_user_source);
        return (
        
      <button onClick={() => handlelcickk(cell.row.original.nom_doc, cell.row.original.id_user_source)}>Verify</button>
       
       )}
       },
       {
        header : "Decline document",
        cell:({cell})=>{return(
          <button className='text-red-500'>Decline</button>)
        }
       },{
        header: 'Visualize',
        accessorKey: 'visualize',
        cell : ({ cell }) =>{ 

       


          return( 
            <button onClick={() =>fetchPdfUrl(cell.row.original.path.replace(".","")+"/"+cell.row.original.nom_doc,cell.row.original.nom_doc )} className="ml-5"><Eye /></button>
         
         )
        }
      }
    
   ];
   
   const fetchPdfUrl = async (doc, docName) => {
    try {
      console.log("Attempting to fetch PDF:", { doc, docName });
      setPdfUrl('');
      setIsOpen(true);

      // Extract directory from path if available
      let directoryName = '';
      if (doc) {
        // Remove leading slash if present
        doc = doc.replace(/^\/+/, '');
        // Handle special case with 'uploads' already in the path
        if (doc.includes('uploads/')) {
          // Extract the part after 'uploads/'
          directoryName = doc.split('uploads/')[1];
        } else {
          // Extract last part of the path which should be the directory name
          const pathParts = doc.split('/');
          directoryName = pathParts[pathParts.length - 1].trim();
        }
      }

      // Try multiple path formats in sequence
      const pathsToTry = [
        // Format 1: Direct PDF with directory
        `${backend}/direct-pdf/${directoryName}/${docName}`,
        // Format 2: PDFs uploads with directory
        `${backend}/pdfs/uploads/${directoryName}/${docName}`,
        // Format 3: Find PDF by filename
        `${backend}/find-pdf/${docName}`
      ];

      let succeeded = false;
      let lastError = null;

      // Try each path format
      for (const url of pathsToTry) {
        console.log(`Trying PDF path: ${url}`);
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf'
            }
          });

          if (response.ok) {
            const pdfBlob = await response.blob();
            if (pdfBlob.type !== 'application/pdf') {
              continue;
            }

            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPdfUrl(pdfUrl);
            setPageNumber(1);

            // Get document ID from the response headers or make a separate request
            try {
              const docResponse = await fetch(`${backend}/api/documents/${docName}`, {
                credentials: 'include'
              });
              if (docResponse.ok) {
                const docData = await docResponse.json();
                // Record view statistics
                await fetch(`${backend}/record-view`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    documentId: docData.id_document
                  })
                });
                console.log('Successfully recorded view statistics');
              }
            } catch (viewError) {
              console.error('Error recording view statistics:', viewError);
            }

            // Record document opening event
            await fetch(`${backend}/doc/open/${docName}`, {
              method: 'POST',
              credentials: 'include',
            });

            succeeded = true;
            break;
          } else {
            lastError = `Failed with status: ${response.status}`;
          }
        } catch (err) {
          lastError = err.message;
        }
      }

      if (!succeeded) {
        throw new Error(`Failed to fetch PDF for document: ${docName} - ${lastError || 'All paths attempted failed.'}`);
      }
    } catch (error) {
      console.error('Error fetching PDF:', error);
      alert(`Could not open the PDF: ${error.message}`);
      setIsOpen(false);
    }
  };
 
   
   
   
     const [sorting, setSorting] = useState([])
     const [filtering, setFiltering] = useState('')
   
     const table = useReactTable({
       data: tableData,
       columns : columns,
       getCoreRowModel: getCoreRowModel(),
       getPaginationRowModel: getPaginationRowModel(),
       getSortedRowModel: getSortedRowModel(),
       getFilteredRowModel: getFilteredRowModel(),
       
    
       state: {
         sorting: sorting,
         globalFilter: filtering,
       },
       onSortingChange: setSorting,
       onGlobalFilterChange: setFiltering,
     
     })











    return (  
        <>
     <h1 className="text-3xl font-poppins mb-4 ">Verify Documents</h1>
        <div className="relative overflow-x-auto shadow-lg sm:rounded-xl w-250 left-24 top-32 bg-white">
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
  {isOpen && (
          <div className="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-75 transition-opacity">
            <div className="fixed inset-0 flex items-center justify-center">
              <div className="fixed transform origin-center rounded-lg bg-white shadow-xl p-6">
                <button type="button" onClick={closePopup}>
                  <svg
                    className="absolute right-3 top-3 h-6 w-6 cursor-pointer text-gray-400 hover:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                >
                  <Page width={400} height={400} pageNumber={pageNumber} />
                </Document>
                <div className="pagination-container">
                  <button
                    className="bg-gray-700 text-white font-bold py-2 px-4 rounded w-28"
                    disabled={pageNumber === 1}
                    onClick={() => onPageChange(pageNumber - 1)}
                  >
                    Previous
                  </button>

                  <button 
                    className="ml-52 w-28 bg-gray-700 text-white font-bold py-2 px-4 rounded" 
                    disabled={pageNumber === numPages} 
                    onClick={() => onPageChange(pageNumber + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}</> );
}
 
export default VerifyDoc;