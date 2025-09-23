import React, { useRef, useState } from 'react';
import { Navigate, redirect, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Shield, ArrowRight, CheckCircle, AlertCircle, Sparkles, Zap, UserPlus } from 'lucide-react';
import config from '../config';

const LoginPagePro = ({isLogged, onReplace}) => {
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
              <Shield className="w-12 h-12 relative z-10" />
            </motion.div>
            <motion.h1 
              className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent"
              variants={itemVariants}
            >
              DocDiL
            </motion.h1>
            <motion.p 
              className="text-2xl text-blue-100 mb-8 font-light"
              variants={itemVariants}
            >
              Enterprise Document Management
            </motion.p>
            <motion.p 
              className="text-blue-200/90 leading-relaxed text-lg"
              variants={itemVariants}
            >
              Transform your document workflow with our cutting-edge platform. Secure, scalable, and designed for the modern enterprise.
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
                <span className="font-semibold">Advanced Security</span>
                <p className="text-blue-200/70 text-sm">End-to-end encryption & compliance</p>
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
                <span className="font-semibold">Real-time Sync</span>
                <p className="text-blue-200/70 text-sm">Instant updates across all devices</p>
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
                <span className="font-semibold">AI-Powered Search</span>
                <p className="text-blue-200/70 text-sm">Find documents instantly</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
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
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
              </motion.div>
              <motion.h2 
                className="text-4xl font-bold text-white mb-3"
                variants={itemVariants}
              >
                Welcome Back
              </motion.h2>
              <motion.p 
                className="text-blue-200 text-lg"
                variants={itemVariants}
              >
                Access your secure workspace
              </motion.p>
            </motion.div>

            {/* Form */}
            <motion.form onSubmit={postinfolog} className="space-y-8" variants={itemVariants}>
              {/* Email Field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="LogEmail" className="block text-sm font-semibold text-blue-100 mb-3">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="LogEmail"
                    type="email"
                    ref={usernameRef}
                    className="w-full px-6 py-5 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50 text-lg"
                    placeholder="Enter your email"
                  />
                  <motion.div
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Mail className="w-6 h-6 text-blue-200/50" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants}>
                <label htmlFor="passlog" className="block text-sm font-semibold text-blue-100 mb-3">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="passlog"
                    type={showPassword ? "text" : "password"}
                    ref={passwordRef}
                    className="w-full px-6 py-5 text-white bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out placeholder-blue-200/50 text-lg"
                    placeholder="Enter your password"
                  />
                  <motion.button
                    type="button"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword ? (
                      <EyeOff className="w-6 h-6 text-blue-200/50" />
                    ) : (
                      <Eye className="w-6 h-6 text-blue-200/50" />
                    )}
                  </motion.button>
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                className="w-full py-5 px-8 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out relative overflow-hidden group mt-10 text-lg"
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
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </motion.span>
              </motion.button>
            </motion.form>

            {/* Error Messages */}
            <AnimatePresence>
              {wr === 1 && (
                <motion.div
                  className="mt-8 p-5 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center text-red-300">
                    <AlertCircle className="w-6 h-6 mr-3" />
                    <p className="text-sm font-medium">Invalid Email or Password</p>
                  </div>
                </motion.div>
              )}
              
              {NoCr === 1 && (
                <motion.div
                  className="mt-8 p-5 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center text-red-300">
                    <AlertCircle className="w-6 h-6 mr-3" />
                    <p className="text-sm font-medium">Please Enter Email and Password</p>
                  </div>
                </motion.div>
              )}
              
              {usrNotVerified && (
                <motion.div
                  className="mt-8 p-5 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center text-red-300">
                    <AlertCircle className="w-6 h-6 mr-3" />
                    <p className="text-sm font-medium">Please Verify Your Email</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create Account Button */}
            <motion.div 
              className="mt-8"
              variants={itemVariants}
            >
              <motion.button
                type="button"
                onClick={() => navigate('/signup')}
                className="w-full py-4 px-8 bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 hover:border-white/30 transition-all duration-300 ease-in-out relative overflow-hidden group text-lg"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <motion.span className="relative flex items-center justify-center">
                  <UserPlus className="w-5 h-5 mr-3" />
                  Create Account
                </motion.span>
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

export default LoginPagePro;
