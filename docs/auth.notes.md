## Auth API Dokümantasyonu

Bu modül, sistemdeki kullanıcı kayıt/giriş/çıkış ve kimlik doğrulama işlemlerini yönetir.

...

### 14. Oturumu Sonlandırma

**Endpoint:** `DELETE /api/auth/sessions/:tokenId`

---

## Ek Notlar ve Güvenlik Politikaları

### 1. Kullanıcı Rolleri ve Yetkileri (RBAC)

- `admin`: Sistem yönetimi (her şeye erişim).
- `company`: İK yetkisi olan kullanıcı (mülakat oluşturabilir, aday yönetebilir).
- `user`: Normal kullanıcı (örneğin aday).

🔸 Roller `User` modelindeki `role` alanına göre yönetilir. Role tabanlı erişim için `authorize(['role1', 'role2'])` middleware kullanılır.

---

### 2. JWT Token Yapısı ve Süreleri

- `access_token`: 10 dakikalık kısa ömürlü, HTTP-only cookie içinde saklanır.
- `refresh_token`: 7 günlük, yine HTTP-only cookie.

🔸 Her refresh token `Token` modelinde saklanır ve izlenir. Revokation yapılabilir.

---

### 3. Güvenlik Politikaları

- Şifre minimum 8 karakter olmalı.
- Şifreler `bcrypt` ile hashlenir (`saltRounds = 12`).
- 5 başarısız girişte hesap 15 dakikalığına kilitlenir.
- E-posta ve telefon doğrulaması zorunlu.
- 2FA varsa, login sonrası ikinci adım zorunlu.

---

### 4. Rate Limiting Önerisi (middleware)

Login ve şifre sıfırlama endpoint'leri için rate limit önerisi:

```ts
rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Çok fazla istek. Lütfen sonra tekrar deneyin.",
});
```

---

### 5. E-posta ve SMS Servisleri

- E-posta doğrulama ve şifre sıfırlama için: `nodemailer` gibi servisler.
- Telefon doğrulama için SMS sağlayıcı: `Twilio`, `Netgsm` vs.

---

### 6. Oturum Takibi ve Cihaz Tanıma

- Her oturum (token) IP ve User-Agent ile kayıt edilir.
- `lastKnownIPs` alanı ile son 5 IP adresi izlenir.
- `sessionCount` ile toplam oturum sayısı takip edilir.

---

### 7. Geliştiriciye Önerilen Testler

- 🔐 Login / logout / refresh akış testleri
- 🔁 Şifre sıfırlama (token ile) test
- ✅ E-posta/telefon doğrulama
- ⛔ Hatalı OTP / şifre giriş denemeleri
- 🔍 Token revokation ve expired token davranışı
- 🛡 Rol bazlı erişim kontrolü (RBAC test)
