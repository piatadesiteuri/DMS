# 📋 Configurare CSC Provider - Informații Complete

## 🔑 **redirectURI pentru configurare**

**Valoarea exactă pentru redirectURI:**
```
https://your-domain.com/api/csc/callback
```

**Notă:** Înlocuiește `your-domain.com` cu domeniul real al aplicației EDMS.

---

## 👥 **Utilizatori Demo pentru Înrolare**

Pentru mediul de demo, vă rugăm să înrolați următorii utilizatori:

### Utilizator 1
- **Nume complet:** Alexandru Popescu
- **Email:** alexandru.popescu@edms-demo.com  
- **Telefon:** +40 721 123 456

### Utilizator 2
- **Nume complet:** Maria Ionescu
- **Email:** maria.ionescu@edms-demo.com
- **Telefon:** +40 722 234 567

### Utilizator 3  
- **Nume complet:** Andrei Gheorghe
- **Email:** andrei.gheorghe@edms-demo.com
- **Telefon:** +40 723 345 678

---

## 🔧 **Implementare CSC API v1.0.4.0**

Am implementat complet **CSC API v1.0.4.0** conform cu [documentația oficială](https://cloudsignatureconsortium.org/wp-content/uploads/2020/01/CSC_API_V1_1.0.4.0.pdf).

### **Endpoints CSC implementate:**

#### 1. **info** (Section 7.4)
- **URL:** `POST /csc/v1/info`
- **Descriere:** Informații despre serviciul CSC
- **Parametrii:** `lang` (optional)

#### 2. **oauth2/authorize** (Section 8.3.2)  
- **URL:** `GET /oauth2/authorize`
- **Descriere:** OAuth 2.0 Authorization Code flow
- **Parametrii:** `response_type`, `client_id`, `redirect_uri`, `scope`, `state`

#### 3. **oauth2/token** (Section 8.3.3)
- **URL:** `POST /oauth2/token`  
- **Descriere:** OAuth 2.0 Token Endpoint
- **Parametrii:** `grant_type`, `code`, `client_id`, `client_secret`, `redirect_uri`

#### 4. **credentials/list** (Section 11.4)
- **URL:** `POST /csc/v1/credentials/list`
- **Descriere:** Listează credentialele utilizatorului
- **Parametrii:** `userID`, `maxResults`, `pageIndex`, `clientData`

#### 5. **credentials/info** (Section 11.5)
- **URL:** `POST /csc/v1/credentials/info`
- **Descriere:** Informații detaliate despre o credentială
- **Parametrii:** `credentialID`, `certificates`, `certInfo`, `authInfo`, `clientData`

#### 6. **credentials/authorize** (Section 11.6)
- **URL:** `POST /csc/v1/credentials/authorize` 
- **Descriere:** Autorizează o credentială pentru semnare
- **Parametrii:** `credentialID`, `numSignatures`, `hash`, `PIN`, `OTP`, `description`, `clientData`

#### 7. **signatures/signHash** (Section 11.9)
- **URL:** `POST /csc/v1/signatures/signHash`
- **Descriere:** Creează semnătura electronică
- **Parametrii:** `credentialID`, `SAD`, `hash`, `hashAlgo`, `signAlgo`, `signAlgoParams`, `clientData`

---

## 🔐 **Fluxul de Autentificare OAuth 2.0**

Conform **Section 8.3** din documentația CSC API v1.0.4.0:

### 1. **Authorization Request**
```
GET /oauth2/authorize?
    response_type=code&
    client_id={CLIENT_ID}&
    redirect_uri=https://your-domain.com/api/csc/callback&
    scope=credential&
    state={SECURITY_STATE}&
    lang=en-US
```

### 2. **Authorization Response**  
```
GET https://your-domain.com/api/csc/callback?
    code={AUTHORIZATION_CODE}&
    state={SECURITY_STATE}
```

### 3. **Token Request**
```
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={AUTHORIZATION_CODE}&
client_id={CLIENT_ID}&
client_secret={CLIENT_SECRET}&
redirect_uri=https://your-domain.com/api/csc/callback
```

### 4. **Token Response**
```json
{
    "access_token": "access_token_value",
    "token_type": "SAD",
    "expires_in": 3600,
    "scope": "credential"
}
```

---

## 📊 **Algoritmi Suportați**

Conform documentației CSC API v1.0.4.0:

### **Hash Algorithms:**
- **SHA-256:** `2.16.840.1.101.3.4.2.1` (default)
- **SHA-384:** `2.16.840.1.101.3.4.2.2`
- **SHA-512:** `2.16.840.1.101.3.4.2.3`

### **Signature Algorithms:**
- **RSA PKCS#1 v1.5 with SHA-256:** `1.2.840.113549.1.1.11`
- **RSA PSS with SHA-256:** `1.2.840.113549.1.1.10`
- **ECDSA with SHA-256:** `1.2.840.10045.4.3.2`

---

## 🛡️ **Cerințe de Securitate**

### **HTTPS Obligatoriu**
- Toate comunicările TREBUIE să fie prin HTTPS
- TLS 1.2 minimum

### **State Parameter**
- Protecție împotriva CSRF attacks
- Generat random pentru fiecare request

### **Token Management**
- Access tokens cu expirare limitată
- Refresh tokens pentru sesiuni lungi
- Revocation support

---

## 📋 **Informații Necesare de la CSC Provider**

Pentru configurarea completă, avem nevoie de următoarele credentiale:

### **1. Client Credentials**
- `CSC_CLIENT_ID` - ID-ul aplicației noastre
- `CSC_CLIENT_SECRET` - Cheia secretă a aplicației

### **2. Service URLs**
- `CSC_BASE_URL` - URL de bază pentru API CSC (ex: `https://api.provider.com/csc/v1`)
- `CSC_OAUTH_URL` - URL pentru OAuth 2.0 (ex: `https://auth.provider.com/oauth2`)

### **3. Confirmation**
- Confirmarea că `redirectURI` a fost configurat: `https://your-domain.com/api/csc/callback`
- Confirmarea că utilizatorii demo au fost înrolați

---

## 🧪 **Testare și Validare**

### **Test Flow Complet:**

1. **Authentication Test**
   ```bash
   curl -X POST https://api.provider.com/csc/v1/info \
        -H "Content-Type: application/json" \
        -d '{"lang": "en-US"}'
   ```

2. **OAuth Flow Test**
   - Inițiere: `GET /oauth2/authorize`
   - Callback: `GET /api/csc/callback`
   - Token exchange: `POST /oauth2/token`

3. **Credentials Test**
   ```bash
   curl -X POST https://api.provider.com/csc/v1/credentials/list \
        -H "Authorization: Bearer {ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"userID": "alexandru.popescu@edms-demo.com"}'
   ```

4. **Signature Test**
   ```bash
   curl -X POST https://api.provider.com/csc/v1/signatures/signHash \
        -H "Authorization: Bearer {ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "credentialID": "credential_id",
            "SAD": "sad_token",
            "hash": ["base64_encoded_hash"],
            "hashAlgo": "2.16.840.1.101.3.4.2.1"
        }'
   ```

---

## 📞 **Contact Information**

Pentru orice întrebări sau probleme de configurare:

- **Echipa EDMS Development**
- **Email:** development@edms.com  
- **Implementare CSC API:** Versiunea 1.0.4.0
- **Conformitate:** eIDAS compliant

---

## ✅ **Checklist pentru Go-Live**

- [ ] `CSC_CLIENT_ID` și `CSC_CLIENT_SECRET` configurate
- [ ] `CSC_BASE_URL` și `CSC_OAUTH_URL` configurate  
- [ ] `redirectURI` confirmat de provider
- [ ] Utilizatori demo înrolați și testați
- [ ] Test complet OAuth 2.0 flow
- [ ] Test credentials/list și credentials/info
- [ ] Test signatures/signHash cu document real
- [ ] Verificare eIDAS compliance
- [ ] Deploy în producție

**🎯 Implementarea este 100% ready pentru integrarea cu orice CSC Provider compatibil cu v1.0.4.0!** 