import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Check,
  Star,
  Users,
  Zap,
  Database,
  Lock,
  ArrowRight,
  Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PricingPage = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      description: "Perfect pentru echipe mici",
      price: isAnnual ? "99" : "119",
      period: isAnnual ? "/an" : "/lună",
      savings: isAnnual ? "Economisește 20%" : "",
      features: [
        "Până la 5 utilizatori",
        "10 GB spațiu de stocare",
        "Căutare de bază",
        "Suport prin email",
        "Backup automat",
        "Acces mobil"
      ],
      notIncluded: [
        "Căutare cu AI",
        "Semnături digitale",
        "Integrări avansate",
        "Suport prioritare"
      ],
      popular: false,
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "Professional",
      description: "Pentru companii în creștere",
      price: isAnnual ? "299" : "359",
      period: isAnnual ? "/an" : "/lună",
      savings: isAnnual ? "Economisește 20%" : "",
      features: [
        "Până la 25 utilizatori",
        "100 GB spațiu de stocare",
        "Căutare cu AI",
        "Semnături digitale",
        "Suport prioritare",
        "Integrări API",
        "Control acces avansat",
        "Analytics de bază"
      ],
      notIncluded: [
        "Semnături certificate",
        "Integrări enterprise",
        "Suport dedicat"
      ],
      popular: true,
      color: "from-purple-500 to-purple-600"
    },
    {
      name: "Enterprise",
      description: "Pentru organizații mari",
      price: "Personalizat",
      period: "",
      savings: "",
      features: [
        "Utilizatori nelimitați",
        "Stocare nelimitată",
        "Căutare cu AI avansată",
        "Semnături certificate",
        "Suport dedicat 24/7",
        "Integrări enterprise",
        "Analytics avansate",
        "Conformitate GDPR",
        "SLA garantat",
        "Implementare personalizată"
      ],
      notIncluded: [],
      popular: false,
      color: "from-orange-500 to-red-500"
    }
  ];

  const features = [
    {
      category: "Securitate",
      items: [
        { name: "Criptare end-to-end", starter: true, professional: true, enterprise: true },
        { name: "Autentificare 2FA", starter: true, professional: true, enterprise: true },
        { name: "Audit trail complet", starter: false, professional: true, enterprise: true },
        { name: "Conformitate GDPR", starter: false, professional: false, enterprise: true }
      ]
    },
    {
      category: "Colaborare",
      items: [
        { name: "Partajare documente", starter: true, professional: true, enterprise: true },
        { name: "Comentarii și feedback", starter: true, professional: true, enterprise: true },
        { name: "Workflow automatizat", starter: false, professional: true, enterprise: true },
        { name: "Integrare cu Slack/Teams", starter: false, professional: true, enterprise: true }
      ]
    },
    {
      category: "Analytics",
      items: [
        { name: "Rapoarte de bază", starter: true, professional: true, enterprise: true },
        { name: "Analytics avansate", starter: false, professional: true, enterprise: true },
        { name: "Dashboard personalizat", starter: false, professional: false, enterprise: true },
        { name: "Export date personalizat", starter: false, professional: false, enterprise: true }
      ]
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
              <a href="/pricing" className="text-white font-medium">Prețuri</a>
              <a href="/about" className="text-slate-300 hover:text-white transition-colors">Despre</a>
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
              Planuri și
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Prețuri
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Alege planul perfect pentru nevoile companiei tale. Toate planurile includ perioada de probă gratuită de 14 zile.
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span className={`text-lg ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>Lunar</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isAnnual ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-lg ${isAnnual ? 'text-white' : 'text-slate-400'}`}>
                Anual
                {isAnnual && <span className="text-green-400 text-sm ml-2">(Economisește 20%)</span>}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border ${
                  plan.popular 
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                    : 'border-slate-700'
                } hover:border-slate-600 transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                      <Star className="w-4 h-4" />
                      <span>Popular</span>
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 mb-6">{plan.description}</p>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">
                      {plan.price === "Personalizat" ? "" : "€"}
                      {plan.price}
                    </span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                  
                  {plan.savings && (
                    <p className="text-green-400 text-sm font-medium">{plan.savings}</p>
                  )}
                </div>
                
                <div className="space-y-4 mb-8">
                  <h4 className="text-white font-semibold mb-3">Inclus în plan:</h4>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </div>
                  ))}
                  
                  {plan.notIncluded.length > 0 && (
                    <>
                      <h4 className="text-white font-semibold mb-3 mt-6">Nu este inclus:</h4>
                      {plan.notIncluded.map((feature, idx) => (
                        <div key={idx} className="flex items-center space-x-3">
                          <div className="w-5 h-5 text-slate-500 flex-shrink-0">×</div>
                          <span className="text-slate-500">{feature}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                
                <motion.button
                  onClick={() => plan.name === "Enterprise" ? navigate('/contact') : navigate('/login')}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>
                    {plan.name === "Enterprise" ? "Contactează-ne" : "Începe Gratuit"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
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
              Comparație Funcționalități
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Vezi exact ce funcționalități sunt incluse în fiecare plan
            </p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-white font-semibold">Funcționalitate</th>
                  <th className="text-center py-4 px-6 text-white font-semibold">Starter</th>
                  <th className="text-center py-4 px-6 text-white font-semibold">Professional</th>
                  <th className="text-center py-4 px-6 text-white font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((category, categoryIndex) => (
                  <React.Fragment key={categoryIndex}>
                    <tr className="border-b border-slate-700">
                      <td colSpan="4" className="py-3 px-6">
                        <h3 className="text-lg font-semibold text-blue-400">{category.category}</h3>
                      </td>
                    </tr>
                    {category.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="border-b border-slate-700/50">
                        <td className="py-4 px-6 text-slate-300">{item.name}</td>
                        <td className="text-center py-4 px-6">
                          {item.starter ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <div className="w-5 h-5 text-slate-500 mx-auto">×</div>
                          )}
                        </td>
                        <td className="text-center py-4 px-6">
                          {item.professional ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <div className="w-5 h-5 text-slate-500 mx-auto">×</div>
                          )}
                        </td>
                        <td className="text-center py-4 px-6">
                          {item.enterprise ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <div className="w-5 h-5 text-slate-500 mx-auto">×</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Întrebări Frecvente
            </h2>
            <p className="text-xl text-slate-300">
              Răspunsuri la cele mai comune întrebări despre planurile noastre
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: "Pot să schimb planul în orice moment?",
                answer: "Da, poți să faci upgrade sau downgrade la planul tău în orice moment. Modificările se vor aplica la următoarea perioadă de facturare."
              },
              {
                question: "Există o perioadă de probă gratuită?",
                answer: "Da, oferim o perioadă de probă gratuită de 14 zile pentru toate planurile. Nu este nevoie de card de credit pentru a începe."
              },
              {
                question: "Ce se întâmplă după perioada de probă?",
                answer: "După perioada de probă, vei fi automat trecut la planul ales. Poți să anulezi abonamentul în orice moment din setările contului."
              },
              {
                question: "Suportul tehnic este inclus?",
                answer: "Da, toate planurile includ suport tehnic. Planul Professional include suport prioritare, iar Enterprise include suport dedicat 24/7."
              },
              {
                question: "Pot să export datele mele?",
                answer: "Da, poți să exporti toate datele tale în orice moment. Oferim export în multiple formate pentru a-ți facilita migrarea."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700"
              >
                <h3 className="text-xl font-semibold text-white mb-3">{faq.question}</h3>
                <p className="text-slate-300">{faq.answer}</p>
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
              Gata să Începi?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Începe perioada de probă gratuită de 14 zile. Fără obligații, fără card de credit.
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
                Contactează Vânzările
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

export default PricingPage;
