import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import React, { useState, useRef, useEffect } from 'react'
import { Document, Page } from 'react-pdf'
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const DownloadPage = () => {
  console.log("Download.js: Component rendering");

  // State variables
  const [tableData, setTableData] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [filtering, setFiltering] = useState("");

  // Refs for debugging only - kept to avoid changing code structure
  const commentRef = useRef([]);

  // Close popup function
  const closePopup = () => setIsOpen(false);

  useEffect(() => {
    console.log("Download.js: Fetching documents...");

    // Verificăm dacă există o sesiune validă
    fetch(`${backend}/admin`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Origin': window.location.origin }
    })
      .then(res => res.json())
      .then(role => {
        console.log("Download.js: Confirmed user role:", role);

        // Acum încercăm să obținem documentele
        return fetch(`${backend}/documents`, {
          method: 'GET',
          credentials: "include",
          headers: {
            "Origin": window.location.origin
          }
        });
      })
      .then(res => {
        console.log("Download.js: Documents response status:", res.status);
        if (!res.ok) {
          console.error("Download.js: Response not OK:", res.statusText);
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(results => {
        console.log("Download.js: Documents received:", results);
        console.log("Download.js: Documents type:", typeof results);
        console.log("Download.js: Is array?", Array.isArray(results));

        if (Array.isArray(results)) {
          setTableData(results);
        } else {
          console.error("Download.js: Expected array but got:", typeof results);
          setTableData([]);
        }
      })
      .catch(err => {
        console.error("Download.js: Error fetching documents:", err);
        setTableData([]); // Asigurăm un array gol în caz de eroare
      });
  }, []);

  async function downloaddoc(doc) {
    try {
      const response = await fetch(`${backend}/download/` + doc, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      a.download = response.headers.get('Content-Disposition').split('=')[1];

      console.log(a.download);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  }

  function onDocumentLoadSuccess({ numPages: pages }) {
    setNumPages(pages);
  }

  function changePage(offset) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function filterBycheck(item) {
    if (item && item.checked) {
      return item.value;
    }
    return null;
  }

  async function diffuse(nom_doc, usrArr) {
    console.log("Diffusing document:", nom_doc, "to users:", usrArr);
    try {
      const response = await fetch(`${backend}/diffuser`, {
        method: 'POST',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nom_doc: nom_doc,
          target: usrArr
        })
      });
      const result = await response.json();
      console.log("Diffuse result:", result);
    } catch (err) {
      console.error("Error diffusing document:", err);
    }
  }

  const fetchPdfUrl = async (doc, docName) => {
    console.log("Fetching PDF:", doc);
    try {
      // Standardizăm calea documentului pentru a funcționa corect
      let pdfPath = doc;

      // Eliminăm toate "./" din cale
      pdfPath = pdfPath.replace(/\.\//g, '');

      // Adăugăm '/' la început dacă nu există deja
      if (!pdfPath.startsWith('/')) {
        pdfPath = '/' + pdfPath;
      }

      // Construim URL-ul complet
      const url = `${backend}/pdfs${pdfPath}`;
      console.log(`Trying to fetch PDF from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Origin': window.location.origin }
      });

      if (response.ok) {
        const blob = await response.blob();
        setPdfFile(URL.createObjectURL(blob));
        setIsOpen(true);
        setPageNumber(1);
      } else {
        console.error(`Failed to fetch PDF: ${response.status} - ${response.statusText}`);
        alert(`Could not open the PDF. Server returned: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Error fetching PDF: ${error.message}`);
    }
  };

  const onPageChange = (newPage) => {
    setPageNumber(newPage);
  };

  const columns = [
    {
      header: 'Document Name',
      accessorKey: 'nom_doc',
    },
    {
      header: 'Sending Date',
      accessorKey: 'date_time',
    },
    {
      header: 'Sender',
      cell: ({ cell }) => {
        return (
          <p>{cell.row.original.nom + " " + cell.row.original.prenom}</p>
        )
      }
    },
    {
      header: 'Comments',
      accessorKey: 'commentaire',
      cell: ({ cell }) => {
        return (
          <></>
        )
      }
    }
  ];

  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });

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
      pagination
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
  });

  // Adăugăm componenta de debug
  const DebugTable = ({ data }) => {
    const [showDebug, setShowDebug] = useState(false);

    if (!showDebug) {
      return (
        <div className="mb-4">
          <button
            onClick={() => setShowDebug(true)}
            className="bg-gray-200 px-3 py-1 rounded text-gray-700 text-sm hover:bg-gray-300"
          >
            Show Debug Info
          </button>
        </div>
      );
    }

    return (
      <div className="mb-4 bg-gray-100 p-4 rounded">
        <div className="flex justify-between mb-2">
          <h3 className="font-bold">Debug Info (Download.js):</h3>
          <button
            onClick={() => setShowDebug(false)}
            className="bg-gray-200 px-3 py-1 rounded text-gray-700 text-sm hover:bg-gray-300"
          >
            Hide Debug
          </button>
        </div>
        <div><strong>Table Data Count:</strong> {data.length}</div>
        <div><strong>Data Type:</strong> {typeof data}</div>
        <div><strong>Is Array?</strong> {Array.isArray(data).toString()}</div>

        {data.length > 0 && (
          <div className="mt-2">
            <details>
              <summary className="cursor-pointer font-semibold">First Record Sample</summary>
              <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs mt-2 overflow-auto">
                {JSON.stringify(data[0], null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex-col">
        <h2 className="text-3xl font-poppins mb-4">Documents Received</h2>

        {/* Adăugăm componenta de debug */}
        <DebugTable data={tableData} />

        <div className="flex justify-between items-center mb-4">
          <div>
            <input
              type="text"
              value={filtering}
              onChange={e => setFiltering(e.target.value)}
              placeholder="Search..."
              className="border border-gray-300 p-2 rounded"
            />
          </div>
        </div>

        {/* Tabel de documente simplu */}
        <div className="mb-8">
          {tableData.length === 0 ? (
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-yellow-700">No documents found. Check back later!</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData
                    .filter(doc => filtering === "" ||
                      (doc.nom_doc && doc.nom_doc.toLowerCase().includes(filtering.toLowerCase())) ||
                      (doc.nom && doc.nom.toLowerCase().includes(filtering.toLowerCase())) ||
                      (doc.date_time && doc.date_time.toLowerCase().includes(filtering.toLowerCase())))
                    .map((doc, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{doc.nom_doc}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{doc.nom} {doc.prenom}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{doc.date_time}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => fetchPdfUrl(doc.path.replace(".", "") + "/" + doc.nom_doc, doc.nom_doc)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            View
                          </button>
                          <button
                            onClick={() => downloaddoc(doc.nom_doc)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal pentru vizualizare PDF */}
      {isOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto bg-gray-500 bg-opacity-75 transition-opacity">
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all max-w-5xl w-full">
              <div className="bg-gray-100 px-4 py-3 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Document Preview</h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={closePopup}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 flex flex-col items-center">
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  className="pdf-container"
                >
                  <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
                <div className="mt-4 flex items-center space-x-4">
                  <button
                    onClick={previousPage}
                    disabled={pageNumber <= 1}
                    className={`px-4 py-2 rounded ${pageNumber <= 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    Previous
                  </button>
                  <p className="text-sm text-gray-700">
                    Page {pageNumber} of {numPages || '-'}
                  </p>
                  <button
                    onClick={nextPage}
                    disabled={pageNumber >= numPages}
                    className={`px-4 py-2 rounded ${pageNumber >= numPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadPage;