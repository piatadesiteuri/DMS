import React, { useState, useCallback } from 'react';
import RealTimeSync from './RealTimeSync';
import { FaFolderPlus, FaFilePdf, FaSync } from 'react-icons/fa';

const TestRealTimeSync = () => {
  const [userId] = useState(25); // Example user ID - replace with actual userId from session
  const [currentPath, setCurrentPath] = useState(''); // Current folder path
  const [lastEvent, setLastEvent] = useState(null);
  const [eventsLog, setEventsLog] = useState([]);

  // Handler for real-time data changes
  const handleRealTimeDataChange = useCallback((eventType, data) => {
    console.log('🔄 Real-time data change detected:', eventType, data);
    
    const eventInfo = {
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    
    setLastEvent(eventInfo);
    setEventsLog(prev => [eventInfo, ...prev.slice(0, 9)]); // Keep last 10 events
    
    // Here you would normally call your fetchData() function
    // fetchData();
  }, []);

  const simulateEvents = () => {
    // This is just for demonstration - real events come from Electron
    const mockEvents = [
      {
        type: 'folder_create',
        data: {
          folderName: 'New Folder From Electron',
          folderPath: 'Documents/NewFolder',
          parentPath: currentPath,
          userId: userId
        }
      },
      {
        type: 'document_add',
        data: {
          documentName: 'Document.pdf',
          folderPath: currentPath,
          sourceFolder: currentPath,
          userId: userId
        }
      }
    ];

    // Simulate event with delay
    setTimeout(() => {
      const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      handleRealTimeDataChange(randomEvent.type, randomEvent.data);
    }, 1000);
  };

  return (
    <RealTimeSync
      userId={userId}
      currentPath={currentPath}
      onDataChanged={handleRealTimeDataChange}
    >
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚀 Real-Time Sync Demo
            </h1>
            <p className="text-gray-600">
              This demonstrates real-time synchronization between React and Electron.
              When you drag & drop files in Electron, they will appear here instantly!
            </p>
          </div>

          {/* Status Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Current State */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaSync className="text-blue-500" />
                Current State
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">User ID:</span>
                  <span className="ml-2 text-gray-900">{userId}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Current Path:</span>
                  <span className="ml-2 text-gray-900">{currentPath || 'Root'}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Change Current Path:
                  </label>
                  <input
                    type="text"
                    value={currentPath}
                    onChange={(e) => setCurrentPath(e.target.value)}
                    placeholder="e.g., Documents/Folder1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Last Event */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📡 Last Event
              </h3>
              {lastEvent ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${lastEvent.type === 'folder_create' ? 'bg-purple-100 text-purple-800' :
                        lastEvent.type === 'document_add' ? 'bg-green-100 text-green-800' :
                        lastEvent.type === 'move' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {lastEvent.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(lastEvent.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(lastEvent.data, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No events received yet. Try dragging files in Electron!
                </p>
              )}
            </div>
          </div>

          {/* Test Button */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🧪 Test Events
            </h3>
            <p className="text-gray-600 mb-4">
              Click the button below to simulate events (for testing the toast system):
            </p>
            <button
              onClick={simulateEvents}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaFolderPlus />
              Simulate Real-Time Event
            </button>
          </div>

          {/* Events Log */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📜 Events Log
            </h3>
            {eventsLog.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {eventsLog.map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${event.type === 'folder_create' ? 'bg-purple-100 text-purple-800' :
                          event.type === 'document_add' ? 'bg-green-100 text-green-800' :
                          event.type === 'move' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto text-gray-700">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No events logged yet. Events will appear here when received from Electron.
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📋 How to Test Real-Time Sync
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Make sure the backend server is running (port 3000)</li>
              <li>Open the Electron sync-agent application</li>
              <li>Drag and drop PDF files or folders into Electron</li>
              <li>Watch the beautiful toast notifications appear here in React!</li>
              <li>The events log will show all real-time events received</li>
              <li>Data will automatically refresh to show new content</li>
            </ol>
          </div>
        </div>
      </div>
    </RealTimeSync>
  );
};

export default TestRealTimeSync; 