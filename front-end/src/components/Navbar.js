import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaBell, FaSearch } from 'react-icons/fa';
import { User, LogOut, Settings, ChevronDown, Cloud, Search } from 'lucide-react';
import { Menu, MenuButton, MenuList, MenuItem, MenuDivider, Icon, Button } from '@chakra-ui/react';
import { backend } from '../config';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserInfo();
        // Fetch notifications
        fetchNotifications();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const response = await fetch(`${backend}/api/user/user_info`, {
                credentials: 'include',
                headers: {
                    'Origin': window.location.origin
                }
            });
            const data = await response.json();
            setUserName(data.userName);
            setUserRole(data.userRole);
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await fetch(`${backend}/api/notifications`, {
                credentials: 'include',
                headers: {
                    'Origin': window.location.origin
                }
            });
            const data = await response.json();
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:3000/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Logout failed');
            }
            
            localStorage.removeItem('token');
            localStorage.removeItem('isAuthenticated');
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0 shadow-sm">
            <div className="px-4 py-3 lg:px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => document.documentElement.classList.toggle('dark')}
                            className="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors duration-200"
                        >
                            <span className="sr-only">Open sidebar</span>
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path clipRule="evenodd" fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"></path>
                            </svg>
                        </button>
                        <div className="ml-3 flex md:mr-24">
                            <img 
                                src='../../logo2.png' 
                                className='h-8 w-8 rounded-lg shadow-lg mr-3' 
                                alt="Logo"
                            />
                            <div className="flex flex-col">
                                <span className="text-xl font-semibold sm:text-2xl whitespace-nowrap text-gray-800">EDMS</span>
                                <span className="text-xs text-gray-500">Document Management System</span>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors duration-200"
                                onClick={() => setIsOpen(!isOpen)}
                            >
                                <FaBell className="w-5 h-5" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center space-x-3">
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-medium text-gray-900">{userName || 'User Name'}</p>
                                <p className="text-xs text-gray-500">{userRole || 'User'}</p>
                            </div>
                        <Menu>
                            <MenuButton
                                as={Button}
                                rightIcon={<ChevronDown />}
                                variant="ghost"
                                className="flex items-center text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 transition-all duration-200 hover:ring-2 hover:ring-gray-300"
                            >
                                    <div className="relative w-8 h-8 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                                        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">
                                            {userName ? userName.split(' ').map(n => n.charAt(0)).join('').toUpperCase() : 'U'}
                                        </span>
                                </div>
                            </MenuButton>
                            <MenuList>
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                                    <p className="text-xs text-gray-500">{userRole}</p>
                                </div>
                                <MenuItem as={Link} to="/user/profile">
                                    <Icon as={User} mr={2} />
                                    Profile
                                </MenuItem>
                                <MenuItem as={Link} to="/user/settings">
                                    <Icon as={Settings} mr={2} />
                                    Settings
                                </MenuItem>
                                <MenuDivider />
                                <MenuItem onClick={handleLogout}>
                                    <Icon as={LogOut} mr={2} />
                                    Logout
                                </MenuItem>
                            </MenuList>
                        </Menu>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar; 