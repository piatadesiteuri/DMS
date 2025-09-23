import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Search, BarChart2, Users, Settings } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/documents', icon: FileText, label: 'My Documents' },
    { path: '/all-documents', icon: Search, label: 'All Documents' },
    { path: '/statistics', icon: BarChart2, label: 'Statistics' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="fixed left-0 top-0 w-64 h-full bg-white border-r border-gray-200 pt-16">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <nav className="mt-5 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 transition-colors duration-200 ${
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 