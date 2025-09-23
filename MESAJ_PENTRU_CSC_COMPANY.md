# Mesaj pentru Compania CSC - Configurare redirectURI

---

**Subiect:** Configurare redirectURI pentru integrarea CSC API - Aplicația EDMS

Bună ziua,

În urma discuțiilor pentru integrarea serviciului de semnătură electronică CSC în aplicația noastră EDMS, vă transmitem informațiile necesare pentru configurare:

## 🔑 redirectURI pentru configurare

**Vă rugăm să configurați următorul redirectURI exact așa cum este specificat:**

```
http://192.168.0.13:3003/post_docs/csc/callback
```

**IMPORTANT:** Acesta este redirectURI-ul exact pentru aplicația noastră EDMS care rulează pe IP local (development). Pentru producție, va fi înlocuit cu domeniul real.

## 👥 Utilizatori demo pentru înrolare

Pentru testarea pe mediul de demo, vă rugăm să înrolați următorii utilizatori:

**Utilizator 1:**
- Nume complet: Alexandru Popescu
- Email: alexandru.popescu@edms-demo.com
- Telefon: +40 721 123 456

**Utilizator 2:**
- Nume complet: Maria Ionescu  
- Email: maria.ionescu@edms-demo.com
- Telefon: +40 722 234 567

**Utilizator 3:**
- Nume complet: Andrei Gheorghe
- Email: andrei.gheorghe@edms-demo.com
- Telefon: +40 723 345 678

## 📋 Informații aplicație

- **Aplicația:** EDMS (Electronic Document Management System)
- **Tip integrare:** CSC API v1.0.4.0
- **Conformitate:** eIDAS compliant
- **Mediu:** Demo + Producție

## 🔧 Informații necesare pentru configurarea finală

După configurarea redirectURI și înrolarea utilizatorilor, vă rugăm să ne transmiteți:

1. **CSC_CLIENT_ID** - ID-ul aplicației noastre
2. **CSC_CLIENT_SECRET** - Cheia secretă a aplicației  
3. **CSC_BASE_URL** - URL-ul de bază pentru API CSC
4. **CSC_OAUTH_URL** - URL-ul pentru OAuth 2.0

## 📞 Contact

Pentru orice întrebări sau clarificări suplimentare, vă rugăm să ne contactați.

Mulțumim pentru colaborare!

Echipa EDMS Development

---

**Notă tehnică:** Am implementat complet CSC API v1.0.4.0 conform documentației oficiale Cloud Signature Consortium. 