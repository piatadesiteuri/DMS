import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Target, 
  Award,
  Globe,
  Heart,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AboutPage = () => {
  const navigate = useNavigate();

  const stats = [
    { number: "10,000+", label: "Utilizatori Activi" },
    { number: "500+", label: "Companii" },
    { number: "1M+", label: "Documente Gestionate" },
    { number: "99.9%", label: "Uptime" }
  ];

  const values = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Securitate",
      description: "Protejăm datele clienților noștri cu cele mai avansate tehnologii de criptare"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Colaborare",
      description: "Credem în puterea lucrului în echipă și construim instrumente care facilitează acest lucru"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Inovație",
      description: "Suntem mereu în căutarea celor mai noi tehnologii pentru a îmbunătăți experiența utilizatorilor"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Pasiune",
      description: "Suntem dedicați să creăm soluții care fac diferența în viața profesională a clienților noștri"
    }
  ];

  const team = [
    {
      name: "Alexandru Popescu",
      role: "CEO & Founder",
      description: "Expert în tehnologii cloud cu 15+ ani de experiență în dezvoltarea de soluții enterprise"
    },
    {
      name: "Maria Ionescu",
      role: "CTO",
      description: "Specialist în securitate cibernetică și arhitectură de sisteme scalabile"
    },
    {
      name: "Andrei Dumitrescu",
      role: "Head of Product",
      description: "Product manager cu focus pe experiența utilizatorului și inovație în produs"
    },
    {
      name: "Elena Vasilescu",
      role: "Head of Customer Success",
      description: "Dedicați să asigurăm că fiecare client obține valoarea maximă din DocDiL"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
              <a href="/about" className="text-white font-medium">Despre</a>
              <a href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</a>
            </div>

            {/* Sign In Button */}
            <motion.button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Sign In</span>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Despre
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                DocDiL
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Transformăm modul în care întreprinderile gestionează documentele prin tehnologie inovatoare și design intuitiv
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Misiunea Noastră
              </h2>
              <p className="text-xl text-slate-300 mb-6">
                Să democratizăm accesul la tehnologii avansate de management documentar, 
                făcându-le accesibile pentru întreprinderi de toate dimensiunile.
              </p>
              <p className="text-lg text-slate-400">
                Credem că fiecare organizație merită să aibă acces la instrumente profesionale 
                care să simplifice și să securizeze procesele de lucru cu documentele.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700"
            >
              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                      {stat.number}
                    </div>
                    <div className="text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Valorile Noastre
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Principiile care ne ghidează în dezvoltarea produselor și serviciilor
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
                <p className="text-slate-300">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Echipa Noastră
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Profesioniști dedicați cu experiență în tehnologie și business
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{member.name}</h3>
                <p className="text-blue-400 font-medium mb-3">{member.role}</p>
                <p className="text-slate-300 text-sm">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Alătură-te Revoluției
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Fii parte din viitorul managementului documentar
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Începe Gratuit
              </motion.button>
              <motion.button
                onClick={() => navigate('/contact')}
                className="border border-slate-600 text-slate-300 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-800 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Contactează-ne
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">DocDiL</span>
              </div>
              <p className="text-slate-400">
                Platforma de management documentar pentru întreprinderi moderne.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Produs</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/#features" className="hover:text-white transition-colors">Funcționalități</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Prețuri</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">Despre</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Companie</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/about" className="hover:text-white transition-colors">Despre</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cariere</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Suport</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentație</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Centru Ajutor</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Comunitate</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 DocDiL. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
