import React, { useRef, useState } from 'react';
import { Navigate, redirect, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Shield, ArrowRight, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import config from '../config';

const LoginPageAlt = ({isLogged, onReplace}) => {
  const navigate = useNavigate();
  const [wr,setWr] = useState(0)
  const [NoCr,setNoCr] = useState(0)
  const usernameRef = useRef(null); 
  const passwordRef = useRef(null); 
  const [usrNotVerified,setUsrNotVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        type: "spring",
        stiffness: 100
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.98 }
  };

  const sparkleVariants = {
    animate: {
      rotate: [0, 360],
      scale: [1, 1.2, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  async function postinfolog(e){
    e.preventDefault();
    setIsLoading(true);
    
    const Email = usernameRef.current.value;
    const password = passwordRef.current.value;
   
    if (Email === "" || password === "") {
      setNoCr(1);
      setWr(0);
      setUsrNotVerified(false);
      setIsLoading(false);
      return;
    }

    setNoCr(0);
    
    try {
      console.log("LoginPage.js: Preparing login request with email:", Email);
      
      const requestBody = {
        loguser: Email,
        logpass: password
      };

      console.log("LoginPage.js: Sending login request...");
      const res = await fetch(`${config.apiUrl}/login`, {
        method: 'POST',
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Origin": config.frontendUrl
        },
        body: JSON.stringify(requestBody)
      });

      console.log("LoginPage.js: Login response status:", res.status);
      
      const responseData = await res.json();
      console.log("LoginPage.js: Login response data:", responseData);

      if (responseData.success === true) {
        console.log("LoginPage.js: Login successful! Role:", responseData.role);
        
        // Verificăm dacă sesiunea a fost creată corect
        try {
          console.log("LoginPage.js: Checking session...");
          const sessionCheck = await fetch(`${config.apiUrl}/session-check`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              "Origin": config.frontendUrl
            }
          });
          
          const sessionData = await sessionCheck.json();
          console.log("LoginPage.js: Session check response:", sessionData);
          
          if (!sessionData.valid) {
            console.error("LoginPage.js: Session was not properly established!");
          } else {
            console.log("LoginPage.js: Session established successfully for user:", sessionData.id_user);
          }
        } catch (sessionError) {
          console.error("LoginPage.js: Session check failed:", sessionError);
        }
        
        // Setăm starea și redirecționăm
        isLogged(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', responseData.role);
        
        // Redirect based on role
        if (responseData.role === "superadmin") {
          console.log("LoginPage.js: Redirecting to superadmin dashboard");
          window.location.href = "/superadmin";
        } else if (responseData.role === "admin") {
          console.log("LoginPage.js: Redirecting to admin dashboard");
          window.location.href = "/admin/dashboard";
        } else if (responseData.role === "director") {
          console.log("LoginPage.js: Redirecting to director dashboard");
          window.location.href = "/director/dashboard";
        } else {
          console.log("LoginPage.js: Redirecting to home page");
          window.location.href = "/";
        }
      } else if (responseData === 0) {
        console.log("LoginPage.js: Account not verified");
        setUsrNotVerified(true);
        setWr(0);
        setNoCr(0);
      } else {
        console.log("LoginPage.js: Login failed - invalid credentials");
        setUsrNotVerified(false);
        setWr(1);
        setNoCr(0);
      }
    } catch (error) {
      console.error('LoginPage.js: Login error:', error);
      setWr(1);
      setNoCr(0);
      isLogged(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center space-x-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">DocDiL</span>
            </motion.div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="/#features" className="text-slate-300 hover:text-white transition-colors">Funcționalități</a>
              <a href="/pricing" className="text-slate-300 hover:text-white transition-colors">Prețuri</a>
              <a href="/about" className="text-slate-300 hover:text-white transition-colors">Despre</a>
              <a href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</a>
            </div>

            {/* Sign In Button */}
            <motion.button
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Sign In</span>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><defs><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23000B1E;stop-opacity:1" /><stop offset="50%" style="stop-color:%231A1B4B;stop-opacity:1" /><stop offset="100%" style="stop-color:%23000B1E;stop-opacity:1" /></linearGradient><pattern id="b" patternUnits="userSpaceOnUse" width="100" height="100"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="20" cy="20" r="0.5" fill="%23ffffff" opacity="0.05"/><circle cx="80" cy="80" r="0.5" fill="%23ffffff" opacity="0.05"/></pattern></defs><rect width="100%" height="100%" fill="url(%23a)"/><rect width="100%" height="100%" fill="url(%23b)"/></svg>')`
        }}
      >
        {/* Animated Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-indigo-900/40">
          {/* Floating Elements */}
          <motion.div
            className="absolute top-32 left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-32 right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
            animate={{
              y: [20, -20, 20],
              x: [10, -10, 10],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
      </div>

      {/* Left Side - Welcome Section */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative z-10 pt-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-md text-white">
          <motion.div variants={itemVariants} className="mb-8">
            <motion.div 
              className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mb-6 flex items-center justify-center shadow-2xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <Shield className="w-10 h-10" />
            </motion.div>
            <motion.h1 
              className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent"
              variants={itemVariants}
            >
              DocDiL
            </motion.h1>
            <motion.p 
              className="text-xl text-blue-100 mb-6"
              variants={itemVariants}
            >
              Secure Document Management System
            </motion.p>
            <motion.p 
              className="text-blue-200/80 leading-relaxed"
              variants={itemVariants}
            >
              Experience the future of document management with our advanced, secure, and intuitive platform designed for modern organizations.
            </motion.p>
          </motion.div>

          {/* Features */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center text-blue-100">
              <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
              <span>Advanced Security & Encryption</span>
            </div>
            <div className="flex items-center text-blue-100">
              <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
              <span>Real-time Collaboration</span>
            </div>
            <div className="flex items-center text-blue-100">
              <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
              <span>Intelligent Search & Organization</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10 pt-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="w-full max-w-md"
          variants={cardVariants}
        >
          <motion.div 
            className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8"
            variants={itemVariants}
          >
            {/* Header */}
            <motion.div className="text-center mb-8" variants={itemVariants}>
              <motion.div 
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  variants={sparkleVariants}
                  animate="animate"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
              </motion.div>
              <motion.h2 
                className="text-3xl font-bold text-white mb-2"
                variants={itemVariants}
              >
                Welcome Back
              </motion.h2>
              <motion.p 
                className="text-blue-200 text-sm"
                variants={itemVariants}
              >
                Sign in to access your documents
              </motion.p>
            </motion.div>

            {/* Form */}
            <motion.form onSubmit={postinfolog} className="space-y-6" variants={itemVariants}>
              {/* Email Field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="LogEmail" className="block text-sm font-semibold text-blue-100 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="LogEmail"
                    type="email"
                    ref={usernameRef}
                    className="w-full px-4 py-4 text-white bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/60"
                    placeholder="Enter your email"
                  />
                  <motion.div
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Mail className="w-5 h-5 text-blue-200/60" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="passlog" className="block text-sm font-semibold text-blue-100 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="passlog"
                    type={showPassword ? "text" : "password"}
                    ref={passwordRef}
                    className="w-full px-4 py-4 text-white bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/60"
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
                      <EyeOff className="w-5 h-5 text-blue-200/60" />
                    ) : (
                      <Eye className="w-5 h-5 text-blue-200/60" />
                    )}
                  </motion.button>
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden group mt-8"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                disabled={isLoading}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <motion.span className="relative flex items-center justify-center">
                  {isLoading ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </motion.span>
              </motion.button>
            </motion.form>

            {/* Error Messages */}
            <AnimatePresence>
              {wr === 1 && (
                <motion.div
                  className="mt-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center text-red-300">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p className="text-sm font-medium">Invalid Email or Password</p>
                  </div>
                </motion.div>
              )}
              
              {NoCr === 1 && (
                <motion.div
                  className="mt-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center text-red-300">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p className="text-sm font-medium">Please Enter Email and Password</p>
                  </div>
                </motion.div>
              )}
              
              {usrNotVerified && (
                <motion.div
                  className="mt-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center text-red-300">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p className="text-sm font-medium">Please Verify Your Email</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <motion.div 
              className="mt-8 text-center"
              variants={itemVariants}
            >
              <p className="text-blue-200/60 text-sm">
                Secure access to your documents
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPageAlt;
