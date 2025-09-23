import React from 'react';
import { Outlet } from 'react-router-dom';

const UserPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
};

export default UserPage; 