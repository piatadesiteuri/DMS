import React, { useRef, useState } from 'react';
import { Navigate, redirect } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Shield, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import config from '../config';

const LoginPage = ({isLogged, onReplace}) => {
  const [wr,setWr] = useState(0)
  const [NoCr,setNoCr] = useState(0)
  const usernameRef = useRef(null); 
  const passwordRef = useRef(null); 
  const [usrNotVerified,setUsrNotVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputStyle,setInputStyle] = useState(
    "w-full px-4 py-4 text-gray-700 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 ease-in-out"
  )
  const [labelStyle,setLabelStyle] = useState(
    "block text-sm font-semibold text-gray-700 mb-2"
  )

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  };

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 6,
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
      setInputStyle("w-full px-4 py-4 text-red-700 bg-red-50/80 backdrop-blur-sm border-2 border-red-300 rounded-xl focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all duration-300 ease-in-out");
      setLabelStyle("block text-sm font-semibold text-red-600 mb-2");
      setIsLoading(false);
      return;
    }

    setNoCr(0);
    
    try {
      console.log("LoginPage.js: Preparing login request with email:", Email);
      console.log("LoginPage.js: Password length:", password.length);
      
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
          console.log("LoginPage.js: Redirecting to user dashboard");
          window.location.href = "/dashboard";
        }
      } else if (responseData === 0) {
        console.log("LoginPage.js: Account not verified");
        setUsrNotVerified(true);
        setWr(0);
        setNoCr(0);
        setInputStyle("w-full px-4 py-4 text-red-700 bg-red-50/80 backdrop-blur-sm border-2 border-red-300 rounded-xl focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all duration-300 ease-in-out");
        setLabelStyle("block text-sm font-semibold text-red-600 mb-2");
      } else {
        console.log("LoginPage.js: Login failed - invalid credentials");
        setUsrNotVerified(false);
        setWr(1);
        setNoCr(0);
        setInputStyle("w-full px-4 py-4 text-red-700 bg-red-50/80 backdrop-blur-sm border-2 border-red-300 rounded-xl focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all duration-300 ease-in-out");
        setLabelStyle("block text-sm font-semibold text-red-600 mb-2");
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Floating Elements */}
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"
          variants={floatingVariants}
          animate="animate"
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: "2s" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8"
          variants={itemVariants}
        >
          {/* Header */}
          <motion.div className="text-center mb-8" variants={itemVariants}>
            <motion.div 
              className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h1 
              className="text-3xl font-bold text-white mb-2"
              variants={itemVariants}
            >
              Welcome Back
            </motion.h1>
            <motion.p 
              className="text-gray-300 text-sm"
              variants={itemVariants}
            >
              Sign in to your account to continue
            </motion.p>
          </motion.div>

          {/* Form */}
          <motion.form onSubmit={postinfolog} className="space-y-6" variants={itemVariants}>
            {/* Email Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="LogEmail" className={labelStyle}>
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <div className="relative">
                <input
                  id="LogEmail"
                  type="email"
                  ref={usernameRef}
                  className={inputStyle}
                  placeholder="Enter your email"
                />
                <motion.div
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  whileHover={{ scale: 1.1 }}
                >
                  <Mail className="w-5 h-5 text-gray-400" />
                </motion.div>
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="passlog" className={labelStyle}>
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  id="passlog"
                  type={showPassword ? "text" : "password"}
                  ref={passwordRef}
                  className={inputStyle}
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
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden group"
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
            <p className="text-gray-400 text-sm">
              Secure access to your documents
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
