import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

const CreateUser = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        email: '',
        password: '',
        confirmPassword: '',
        roles: 'user'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordRequirements, setPasswordRequirements] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'password') {
            const requirements = {
                length: value.length >= 8,
                uppercase: /[A-Z]/.test(value),
                lowercase: /[a-z]/.test(value),
                number: /[0-9]/.test(value),
                special: /[!@#$%^&*(),.?":{}|<>]/.test(value)
            };
            setPasswordRequirements(requirements);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const response = await api.post('/admin/create', {
                prenom: formData.prenom,
                nom: formData.nom,
                email: formData.email,
                password: formData.password,
                roles: formData.roles
            });

            if (response.success) {
                setSuccess('User created successfully');
                setTimeout(() => {
                    navigate('/admin/dashboard');
                }, 2000);
            } else {
                setError(response.message || 'Failed to create user');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Creează utilizator nou</h2>
                        <p className="mt-2 text-sm text-gray-600">Adaugă un nou utilizator în sistem</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-600">{success}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prenume
                                </label>
                                <input
                                    type="text"
                                    name="prenom"
                                    value={formData.prenom}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Introdu prenumele"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nume
                                </label>
                                <input
                                    type="text"
                                    name="nom"
                                    value={formData.nom}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Introdu numele"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Introdu adresa de email"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Parolă
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
                                    placeholder="Introdu parola"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirmă parolă
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
                                    placeholder="Confirmă parola"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rol
                            </label>
                            <select
                                name="roles"
                                value={formData.roles}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                                <option value="user">User</option>
                                <option value="responsable">Responsible</option>
                            </select>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Cerințe parolă:</h3>
                            <ul className="space-y-2">
                                <li className="flex items-center text-sm">
                                    {passwordRequirements.length ? (
                                        <CheckCircle2 className="text-green-500 mr-2" size={16} />
                                    ) : (
                                        <XCircle className="text-gray-400 mr-2" size={16} />
                                    )}
                                    <span className={passwordRequirements.length ? "text-gray-700" : "text-gray-500"}>
                                        Cel puțin 8 caractere
                                    </span>
                                </li>
                                <li className="flex items-center text-sm">
                                    {passwordRequirements.uppercase ? (
                                        <CheckCircle2 className="text-green-500 mr-2" size={16} />
                                    ) : (
                                        <XCircle className="text-gray-400 mr-2" size={16} />
                                    )}
                                    <span className={passwordRequirements.uppercase ? "text-gray-700" : "text-gray-500"}>
                                        Contine litera mare
                                    </span>
                                </li>
                                <li className="flex items-center text-sm">
                                    {passwordRequirements.lowercase ? (
                                        <CheckCircle2 className="text-green-500 mr-2" size={16} />
                                    ) : (
                                        <XCircle className="text-gray-400 mr-2" size={16} />
                                    )}
                                    <span className={passwordRequirements.lowercase ? "text-gray-700" : "text-gray-500"}>
                                        Contine litera mica
                                    </span>
                                </li>
                                <li className="flex items-center text-sm">
                                    {passwordRequirements.number ? (
                                        <CheckCircle2 className="text-green-500 mr-2" size={16} />
                                    ) : (
                                        <XCircle className="text-gray-400 mr-2" size={16} />
                                    )}
                                    <span className={passwordRequirements.number ? "text-gray-700" : "text-gray-500"}>
                                        Contine număr
                                    </span>
                                </li>
                                <li className="flex items-center text-sm">
                                    {passwordRequirements.special ? (
                                        <CheckCircle2 className="text-green-500 mr-2" size={16} />
                                    ) : (
                                        <XCircle className="text-gray-400 mr-2" size={16} />
                                    )}
                                    <span className={passwordRequirements.special ? "text-gray-700" : "text-gray-500"}>
                                        Contine caracter special
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/dashboard')}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Creează utilizator
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateUser; 