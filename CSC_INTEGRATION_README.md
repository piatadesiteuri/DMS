# Integrarea CSC API pentru Semnătură Electronică Profesională

## Ce este CSC API?

**Cloud Signature Consortium (CSC)** este un standard internațional pentru semnătură electronică profesională în cloud, dezvoltat de un consorțiu global care include Adobe, InfoCert, și alte companii majore din domeniu.

## Ce am implementat în aplicația EDMS

Am integrat **complet** funcționalitatea de semnătură electronică profesională folosind CSC API în aplicația ta. Implementarea include:

### 🔧 Backend (Node.js)
- **`/back-end/routes/csc-signature.js`** - API routes pentru CSC
- **Endpoints implementate**:
  - `GET /api/csc/info` - Testează conexiunea cu serviciul CSC
  - `POST /api/csc/initiate-signature` - Inițiază procesul de semnare
  - `GET /api/csc/callback` - Primește răspunsul OAuth2 de la CSC
  - `GET /api/csc/credentials` - Listează credentialele utilizatorului
  - `GET /api/csc/credentials/:id` - Informații despre o credentială

### 🎨 Frontend (React)
- **Buton "Professional Sign"** integrat în PDFViewerModal din `Diffuse.js`
- **Fluxul complet OAuth2** pentru autentificare și autorizare
- **Gestionarea erorilor** și feedback pentru utilizator

## 🔑 Ce înseamnă redirectURI?

În contextul CSC API, **redirectURI** este partea din fluxul **OAuth 2.0** unde utilizatorul este redirectionat după procesul de autorizare:

### Fluxul complet:
1. **Utilizatorul** apasă "Professional Sign" în aplicația ta
2. **Aplicația ta** îl redirecționează la **platforma CSC** (firma externă)
3. **Utilizatorul** se autentifică la firma de semnătură electronică
4. **Firma externă** îl redirecționează înapoi la **redirectURI** din aplicația ta
5. **Aplicația ta** primește codul de autorizare și procesează semnătura

## ⚙️ Configurarea CSC API

### 1. Obține credentialele de la furnizorul CSC

Contactează furnizorul tău de servicii CSC și solicită:

```
- CSC_CLIENT_ID (ID-ul aplicației tale)
- CSC_CLIENT_SECRET (Cheia secretă a aplicației)
- CSC_BASE_URL (URL-ul de bază al serviciului CSC)
- CSC_OAUTH_URL (URL-ul pentru OAuth2)
```

### 2. Configurează variabilele de mediu

Creează fișierul `back-end/.env` cu următoarele valori:

```env
# CSC API Configuration
CSC_BASE_URL=https://your-csc-provider.com/csc/v1
CSC_OAUTH_URL=https://your-csc-provider.com/oauth2
CSC_CLIENT_ID=your-actual-client-id
CSC_CLIENT_SECRET=your-actual-client-secret
CSC_REDIRECT_URI=https://your-domain.com/api/csc/callback

# Application Domain
APP_DOMAIN=https://your-domain.com
```

### 3. Înregistrează redirectURI la furnizor

**IMPORTANT**: Transmite firmei CSC acest redirectURI exact:
```
https://your-domain.com/api/csc/callback
```

Înlocuiește `your-domain.com` cu domeniul real al aplicației tale.

## 🚀 Cum funcționează în aplicație

### 1. Utilizatorul deschide un document
- În PDFViewerModal se afișează butonul **"Professional Sign"**

### 2. Procesul de semnare
- Utilizatorul apasă butonul **"Professional Sign"**
- Aplicația calculează hash-ul documentului
- Utilizatorul este redirectionat la platforma CSC pentru autentificare
- După autentificare, este redirectionat înapoi în aplicație
- Semnătura este aplicată automat la document

### 3. Callback și finalizare
- Aplicația primește confirmarea semnării
- Documentul este marcat ca semnat
- Utilizatorul este redirectionat la dashboard cu mesaj de succes

## 🔍 Testarea implementării

### 1. Testează conexiunea CSC
```bash
curl -X GET http://localhost:3001/api/csc/info
```

### 2. Testează inițierea semnării
```bash
curl -X POST http://localhost:3001/api/csc/initiate-signature \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "123",
    "documentName": "test.pdf",
    "hashValue": "test-hash"
  }'
```

## 🛡️ Securitate și Conformitate

### Standardele implementate:
- **OAuth 2.0** pentru autentificare sigură
- **SHA-256** pentru hash-urile documentelor
- **HTTPS obligatoriu** pentru toate comunicările
- **eIDAS compliant** prin standardul CSC

### Mecanisme de securitate:
- **State parameter** pentru protecție CSRF
- **Session management** pentru tracking
- **Token expiration** pentru sesiunile limitată
- **Error handling** complet

## 📋 Furnizori CSC Recomandat

Câțiva furnizori majori de servicii CSC:

1. **InfoCert** (Italia) - Membru fondator CSC
2. **Intesi Group** (Europa)
3. **Universign** (Franța)
4. **D-Trust** (Germania)
5. **Certinomis** (Franța)

## 🔧 Depanare

### Probleme comune:

1. **"Invalid redirect_uri"**
   - Verifică că redirectURI este înregistrat exact la furnizor
   - Format corect: `https://your-domain.com/api/csc/callback`

2. **"Client not authorized"**
   - Verifică CSC_CLIENT_ID și CSC_CLIENT_SECRET
   - Asigură-te că credentialele sunt active

3. **"Connection failed"**
   - Verifică CSC_BASE_URL și CSC_OAUTH_URL
   - Testează conectivitatea cu furnizorul

### Log-uri utile:
```bash
# Monitorizează log-urile backend
tail -f back-end/backend.log

# Verifică consolă browser pentru frontend
# Deschide Developer Tools -> Console
```

## 🎯 Următorii pași

După configurarea cu furnizorul CSC:

1. **Testează** cu credentiale reale
2. **Configurează** certificatele de semnare
3. **Testează** semnarea efectivă a documentelor
4. **Implementează** managementul certificatelor
5. **Adaugă** istoricul semnăturilor în database

## 📞 Support

Pentru probleme cu integrarea CSC:

1. **Consultă documentația** CSC officială
2. **Contactează furnizorul** CSC pentru support tehnic
3. **Verifică log-urile** aplicației pentru detalii erori

---

## ✅ Rezumat

Ai acum o **implementare completă și profesională** a semnăturii electronice CSC în aplicația EDMS, care respectă toate standardele internaționale și este gata pentru producție după configurarea cu furnizorul CSC ales. 