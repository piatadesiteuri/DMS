import React, { useState, useEffect } from 'react';
import { Sun, Moon, Globe, Check } from 'lucide-react';

const Settings = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [language, setLanguage] = useState('en');
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

    useEffect(() => {
        // Check if dark mode is enabled in localStorage
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(isDarkMode);
        
        // Check saved language preference
        const savedLanguage = localStorage.getItem('language') || 'en';
        setLanguage(savedLanguage);
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('darkMode', newDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    const changeLanguage = (lang) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
        setShowLanguageDropdown(false);
        // Here you would typically trigger a language change in your app
    };

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'ro', name: 'Română' },
        { code: 'fr', name: 'Français' },
        { code: 'es', name: 'Español' }
    ];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">Settings</h1>
            
            <div className="space-y-6">
                {/* Dark Mode Toggle */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {darkMode ? (
                                <Moon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                            ) : (
                                <Sun className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                            )}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Dark Mode</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={toggleDarkMode}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                darkMode ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    darkMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Language Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Globe className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                            <div>
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Language</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Choose your preferred language
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <span>{languages.find(lang => lang.code === language)?.name}</span>
                            </button>
                            
                            {showLanguageDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => changeLanguage(lang.code)}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <span>{lang.name}</span>
                                            {language === lang.code && (
                                                <Check className="h-4 w-4 text-blue-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings; 