import { UserCheck, UserX, UserCog } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import CountUp from 'react-countup';
import { api } from '../utils/api';

const InfoPannels = () => {
    const [countVer, setCountVer] = useState(0);
    const [countUnver, setCountUnver] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const response = await api.get('/admin/info');
                console.log("Admin info response:", response);

                if (!response || !Array.isArray(response)) {
                    throw new Error('Invalid response format');
                }

                const acceptedUsers = response[0]?.[0]?.accepted_users || 0;
                const unacceptedUsers = response[1]?.[0]?.unaccepted_users || 0;

                setCountVer(acceptedUsers);
                setCountUnver(unacceptedUsers);
            } catch (error) {
                console.error("Error fetching admin info:", error);
                setError(error.message);
                setCountVer(0);
                setCountUnver(0);
            }
        };

        fetchInfo();
    }, []);

    if (error) {
        console.error("Error in InfoPannels:", error);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div className="p-3 rounded-full bg-green-100">
                        <UserCheck className="text-green-500 size-8" />
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Accepted Employees</p>
                        <p className="text-2xl font-bold">
                            <CountUp duration={2} end={countVer} />
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div className="p-3 rounded-full bg-yellow-100">
                        <UserCog className="text-yellow-600 size-8" />
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Pending Employees</p>
                        <p className="text-2xl font-bold">
                            <CountUp duration={2} end={countUnver} />
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoPannels;