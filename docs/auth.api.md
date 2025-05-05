## Auth API Dokümantasyonu

Bu modül, sistemdeki kullanıcı kayıt/giriş/çıkış ve kimlik doğrulama işlemlerini yönetir.

### 1. Kullanıcı Kaydı

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "name": "Erdal Gümüş",
  "email": "erdal@example.com",
  "password": "12345678",
  "phone": "+905551112233"
}
```

**Başarılı Yanıt:**

```json
{
  "success": true,
  "data": {
    "_id": "userId",
    "name": "Erdal Gümüş",
    "email": "erdal@example.com",
    "role": "user"
  }
}
```

---

### 2. E-Posta Doğrulama

**Endpoint:** `GET /api/auth/verify-email?token=<token>`

---

### 3. Giriş Yap

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "erdal@example.com",
  "password": "12345678"
}
```

**Yanıt:**

* `access_token` (cookie)
* `refresh_token` (cookie)

---

### 4. Çıkış Yap

**Endpoint:** `POST /api/auth/logout`

**Gereksinimler:**

* `access_token` (header ya da cookie içinde)

---

### 5. Token Yenileme

**Endpoint:** `POST /api/auth/refresh`

**Gereksinimler:**

* `refresh_token` (cookie içinde olmalı)

---

### 6. Şifre Sıfırlama Talebi

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**

```json
{
  "email": "erdal@example.com"
}
```

---

### 7. Şifre Sıfırla

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**

```json
{
  "token": "reset-token",
  "newPassword": "yeniŞifre123"
}
```




Eklenmesi Gereken Auth Endpointleri (Örnekler)

## Auth API Dokümantasyonu

Bu modül, sistemdeki kullanıcı kayıt/giriş/çıkış ve kimlik doğrulama işlemlerini yönetir.

### 1. Kullanıcı Kaydı

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "name": "Erdal Gümüş",
  "email": "erdal@example.com",
  "password": "12345678",
  "phone": "+905551112233"
}
```

**Başarılı Yanıt:**

```json
{
  "success": true,
  "data": {
    "_id": "userId",
    "name": "Erdal Gümüş",
    "email": "erdal@example.com",
    "role": "user"
  }
}
```

---

### 2. E-Posta Doğrulama

**Endpoint:** `GET /api/auth/verify-email?token=<token>`

---

### 3. Giriş Yap

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "erdal@example.com",
  "password": "12345678"
}
```

**Yanıt:**

* `access_token` (cookie)
* `refresh_token` (cookie)

---

### 4. Çıkış Yap

**Endpoint:** `POST /api/auth/logout`

**Gereksinimler:**

* `access_token` (header ya da cookie içinde)

---

### 5. Token Yenileme

**Endpoint:** `POST /api/auth/refresh`

**Gereksinimler:**

* `refresh_token` (cookie içinde olmalı)

---

### 6. Şifre Sıfırlama Talebi

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**

```json
{
  "email": "erdal@example.com"
}
```

---

### 7. Şifre Sıfırla

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**

```json
{
  "token": "reset-token",
  "newPassword": "yeniŞifre123"
}
```

---

### 8. E-posta Doğrulama Kodunun Yeniden Gönderilmesi

**Endpoint:** `POST /api/auth/resend-email-verification`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Verification email sent."
}
```

---

### 9. İki Adımlı Doğrulama (2FA) Kodu Doğrulama

**Endpoint:** `POST /api/auth/verify-2fa`

**Request Body:**

```json
{
  "userId": "64fcabc...78",
  "code": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "2FA verified successfully",
  "token": "newly_generated_access_token"
}
```

---

### 10. Telefon Doğrulama Kodunu Yeniden Gönderme (OTP)

**Endpoint:** `POST /api/auth/resend-phone-otp`

**Request Body:**

```json
{
  "phone": "+905XXXXXXXXX"
}
```

**Response:**

```json
{
  "success": true,
  "expiresAt": "2024-05-10T10:15:00Z"
}
```

---

### 11. Yetki Bazlı Erişim Kontrolü Middleware (Express)

**Middleware Örneği:**

```ts
export function authorize(roles: ('admin' | 'company' | 'user')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
}
```

**Kullanımı:**

```ts
router.get('/admin-only', authenticate, authorize(['admin']), handler);
```

---

### 12. Giriş Geçmişi Görüntüleme (Audit Trail)

**Endpoint:** `GET /api/auth/login-history`

**Response:**

```json
{
  "success": true,
  "history": [
    {
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0",
      "timestamp": "2024-05-04T22:15:12.000Z"
    },
    {
      "ip": "185.12.33.1",
      "userAgent": "PostmanRuntime/7.29",
      "timestamp": "2024-04-30T14:02:45.000Z"
    }
  ]
}
```

---

### 13. Aktif Oturumları Listeleme

**Endpoint:** `GET /api/auth/sessions`

---

### 14. Oturumu Sonlandırma

**Endpoint:** `DELETE /api/auth/sessions/:tokenId`
