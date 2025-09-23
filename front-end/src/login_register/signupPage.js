import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Shield, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Zap,
  UserPlus,
  ArrowLeft
} from 'lucide-react';
import config from '../config';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    personalFolderName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 1,
        staggerChildren: 0.3
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 100, scale: 0.8 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 1, 
        ease: "easeOut",
        type: "spring",
        stiffness: 80
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.95 }
  };

  const sparkleVariants = {
    animate: {
      rotate: [0, 360],
      scale: [1, 1.3, 1],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.personalFolderName.trim()) {
      newErrors.personalFolderName = 'Personal folder name is required';
    } else if (formData.personalFolderName.length < 3) {
      newErrors.personalFolderName = 'Folder name must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${config.apiUrl}/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': config.frontendUrl
        },
        body: JSON.stringify({
          prenom: formData.firstName,
          nom: formData.lastName,
          email: formData.email,
          password: formData.password,
          personal_folder_name: formData.personalFolderName
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setErrors({ general: data.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <motion.div
          className="bg-white/10 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/10 p-12 text-center max-w-md mx-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="w-20 h-20 bg-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-4">Account Created!</h2>
          <p className="text-blue-200 mb-6">Your account has been created successfully. Redirecting to login...</p>
          <motion.div
            className="w-full bg-white/10 rounded-full h-2"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Professional Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><defs><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23000B1E;stop-opacity:1" /><stop offset="25%" style="stop-color:%231A1B4B;stop-opacity:1" /><stop offset="75%" style="stop-color:%232D1B69;stop-opacity:1" /><stop offset="100%" style="stop-color:%23000B1E;stop-opacity:1" /></linearGradient><radialGradient id="b" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:%23ffffff;stop-opacity:0.1" /><stop offset="100%" style="stop-color:%23ffffff;stop-opacity:0" /></radialGradient><pattern id="c" patternUnits="userSpaceOnUse" width="200" height="200"><circle cx="100" cy="100" r="2" fill="%23ffffff" opacity="0.1"/><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.05"/><circle cx="150" cy="150" r="1" fill="%23ffffff" opacity="0.05"/><circle cx="50" cy="150" r="0.5" fill="%23ffffff" opacity="0.03"/><circle cx="150" cy="50" r="0.5" fill="%23ffffff" opacity="0.03"/></pattern></defs><rect width="100%" height="100%" fill="url(%23a)"/><rect width="100%" height="100%" fill="url(%23b)"/><rect width="100%" height="100%" fill="url(%23c)"/></svg>')`
        }}
      >
        {/* Animated Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-indigo-900/30">
          {/* Floating Elements */}
          <motion.div
            className="absolute top-20 left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"
            animate={{
              y: [-30, 30, -30],
              x: [-15, 15, -15],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
            animate={{
              y: [30, -30, 30],
              x: [15, -15, 15],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 6
            }}
          />
        </div>
      </div>

      {/* Left Side - Welcome Section */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-lg text-white">
          <motion.div variants={itemVariants} className="mb-12">
            <motion.div 
              className="w-24 h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-3xl mb-8 flex items-center justify-center shadow-2xl relative overflow-hidden"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-20"
                variants={pulseVariants}
                animate="animate"
              />
              <UserPlus className="w-12 h-12 relative z-10" />
            </motion.div>
            <motion.h1 
              className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent"
              variants={itemVariants}
            >
              Join DocDiL
            </motion.h1>
            <motion.p 
              className="text-2xl text-blue-100 mb-8 font-light"
              variants={itemVariants}
            >
              Start Your Document Journey
            </motion.p>
            <motion.p 
              className="text-blue-200/90 leading-relaxed text-lg"
              variants={itemVariants}
            >
              Create your personal workspace and experience the power of modern document management. Secure, intuitive, and designed for your success.
            </motion.p>
          </motion.div>

          {/* Features */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="flex items-center text-blue-100 group">
              <motion.div 
                className="w-10 h-10 bg-green-500/20 rounded-xl mr-4 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
              </motion.div>
              <div>
                <span className="font-semibold">Personal Workspace</span>
                <p className="text-blue-200/70 text-sm">Your own secure document space</p>
              </div>
            </div>
            <div className="flex items-center text-blue-100 group">
              <motion.div 
                className="w-10 h-10 bg-blue-500/20 rounded-xl mr-4 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <Zap className="w-5 h-5 text-blue-400" />
              </motion.div>
              <div>
                <span className="font-semibold">Instant Access</span>
                <p className="text-blue-200/70 text-sm">Start managing documents immediately</p>
              </div>
            </div>
            <div className="flex items-center text-blue-100 group">
              <motion.div 
                className="w-10 h-10 bg-purple-500/20 rounded-xl mr-4 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <Sparkles className="w-5 h-5 text-purple-400" />
              </motion.div>
              <div>
                <span className="font-semibold">Upgrade Anytime</span>
                <p className="text-blue-200/70 text-sm">Scale to team collaboration when ready</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Signup Form */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="w-full max-w-md"
          variants={cardVariants}
        >
          <motion.div 
            className="bg-white/5 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/10 p-10"
            variants={itemVariants}
          >
            {/* Header */}
            <motion.div className="text-center mb-10" variants={itemVariants}>
              <motion.div 
                className="w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl relative overflow-hidden"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-20"
                  variants={pulseVariants}
                  animate="animate"
                />
                <motion.div
                  variants={sparkleVariants}
                  animate="animate"
                  className="relative z-10"
                >
                  <UserPlus className="w-10 h-10 text-white" />
                </motion.div>
              </motion.div>
              <motion.h2 
                className="text-4xl font-bold text-white mb-3"
                variants={itemVariants}
              >
                Create Account
              </motion.h2>
              <motion.p 
                className="text-blue-200 text-lg"
                variants={itemVariants}
              >
                Start your document management journey
              </motion.p>
            </motion.div>

            {/* Form */}
            <motion.form onSubmit={handleSubmit} className="space-y-6" variants={itemVariants}>
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div variants={itemVariants}>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-blue-100 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-blue-100 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50"
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
                  )}
                </motion.div>
              </div>

              {/* Email Field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="email" className="block text-sm font-semibold text-blue-100 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </motion.div>

              {/* Personal Folder Name */}
              <motion.div variants={itemVariants}>
                <label htmlFor="personalFolderName" className="block text-sm font-semibold text-blue-100 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Personal Folder Name
                </label>
                <input
                  id="personalFolderName"
                  name="personalFolderName"
                  type="text"
                  value={formData.personalFolderName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50"
                  placeholder="MyWorkspace"
                />
                <p className="text-blue-200/70 text-xs mt-1">This will be your personal document folder</p>
                {errors.personalFolderName && (
                  <p className="text-red-400 text-xs mt-1">{errors.personalFolderName}</p>
                )}
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="password" className="block text-sm font-semibold text-blue-100 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-12 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50"
                    placeholder="Enter your password"
                  />
                  <motion.button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-blue-200/50" />
                    ) : (
                      <Eye className="w-5 h-5 text-blue-200/50" />
                    )}
                  </motion.button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                )}
              </motion.div>

              {/* Confirm Password Field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-blue-100 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-12 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50"
                    placeholder="Confirm your password"
                  />
                  <motion.button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-blue-200/50" />
                    ) : (
                      <Eye className="w-5 h-5 text-blue-200/50" />
                    )}
                  </motion.button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out relative overflow-hidden group mt-8"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                disabled={isLoading}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <motion.span className="relative flex items-center justify-center">
                  {isLoading ? (
                    <motion.div
                      className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </motion.span>
              </motion.button>
            </motion.form>

            {/* Error Messages */}
            <AnimatePresence>
              {errors.general && (
                <motion.div
                  className="mt-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center text-red-300">
                    <AlertCircle className="w-5 h-5 mr-3" />
                    <p className="text-sm font-medium">{errors.general}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Back to Login */}
            <motion.div 
              className="mt-8 text-center"
              variants={itemVariants}
            >
              <motion.button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-200 hover:text-white transition-colors duration-300 flex items-center justify-center mx-auto group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Login
              </motion.button>
            </motion.div>

            {/* Footer */}
            <motion.div 
              className="mt-6 text-center"
              variants={itemVariants}
            >
              <p className="text-blue-200/60 text-sm">
                Enterprise-grade security & performance
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
