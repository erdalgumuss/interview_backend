# 🔐 Auth Module

## 📋 Genel Bakış

Auth modülü, platformun kimlik doğrulama ve yetkilendirme sistemini yönetir. Kullanıcı kaydı, e-posta doğrulaması, güvenli oturum yönetimi (JWT), şifre sıfırlama ve profil yönetimi işlevlerini kapsar.

## 🎯 Modülün Amaçları

- Kullanıcıların register, login, logout işlemlerini yönetmek
- JWT Access Token ve Refresh Token sistemiyle güvenli oturum yönetimi
- E-posta doğrulama ile hesap aktivasyonu
- Şifre sıfırlama akışı
- Çoklu cihaz/oturum güvenliği
- Token versiyon kontrolü ile güvenlik
- Kullanıcı profil yönetimi

## 🏗️ Mimari Yapı

```
auth/
├── controllers/
│   └── auth.controller.ts          # Tüm auth endpoint'leri
├── dtos/
│   ├── login.dto.ts                # Giriş validasyonu
│   ├── register.dto.ts             # Kayıt validasyonu
│   ├── resetPassword.dto.ts        # Şifre sıfırlama
│   └── updateProfile.dto.ts        # Profil güncelleme
├── models/
│   ├── user.model.ts               # Kullanıcı şeması
│   └── token.model.ts              # Refresh token şeması
├── repositories/
│   ├── auth.repository.ts          # Kullanıcı DB işlemleri
│   └── token.repository.ts         # Token DB işlemleri
├── routes/
│   ├── auth.routes.ts              # Auth rotaları
│   └── profile.routes.ts           # Profil rotaları
├── services/
│   └── auth.service.ts             # İş mantığı
└── README.md
```

## 🔗 Modül Bağımlılıkları

### İç Bağımlılıklar
| Modül | İlişki Türü | Açıklama |
|-------|-------------|----------|
| `middlewares/auth` | Koruma | JWT doğrulama middleware'i |
| `utils/tokenUtils` | Yardımcı | Token oluşturma/doğrulama |
| `utils/emailUtils` | Yardımcı | E-posta gönderimi |

### Dış Bağımlılıklar
| Kütüphane | Kullanım |
|-----------|----------|
| `bcrypt` | Şifre hashleme |
| `jsonwebtoken` | JWT işlemleri |
| `nodemailer` | E-posta gönderimi |

---

## 📊 Veri Modeli

### IUser Interface

```typescript
interface IUser {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;                        // Hashlenmiş
  role: 'admin' | 'company' | 'user';
  isActive: boolean;
  
  // Hesap Güvenliği
  accountLockedUntil?: Date;
  failedLoginAttempts: number;
  
  // Doğrulama
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  phone?: string;
  
  // Token Güvenliği
  tokenVersion: number;                    // Token invalidation için
  lastLoginAt?: Date;
  lastKnownIPs?: string[];
  sessionCount: number;
  
  // Şifre Sıfırlama
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetTries?: number;
  
  // 2FA (Gelecek)
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  
  // Profil
  profilePicture?: string;
  bio?: string;
  preferences?: {
    language?: 'en' | 'es' | 'fr' | 'tr';
    themeMode?: 'light' | 'dark';
    notificationsEnabled?: boolean;
    timezone?: string;
  };
  
  // Erişim İzinleri
  permissions: Array<{
    module: string;
    accessLevel: 'read' | 'write' | 'delete';
  }>;
  
  // Metodlar
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementFailedLogins(): Promise<void>;
  clearPasswordResetToken(): Promise<void>;
  incrementTokenVersion(): Promise<void>;
  updateLastLogin(ip: string): Promise<void>;
}
```

### Token Model

```typescript
interface IToken {
  _id: ObjectId;
  user: ObjectId;
  tokenHash: string;               // Hashlenmiş refresh token
  expiresAt: Date;
  isRevoked: boolean;
  ip: string;
  userAgent: string;
  lastUsedAt: Date;
  createdAt: Date;
}
```

---

## 🔄 İş Akışları

### 1. Kayıt (Register) Akışı

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Register   │────▶│  Email Kontrolü │────▶│  Şifre Hash     │
│  Request    │     │  (Duplicate?)   │     │  (bcrypt)       │
└─────────────┘     └─────────────────┘     └─────────────────┘
                                                    │
                                                    ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Kullanıcı      │◀────│  Email Gönder   │◀────│  User Kaydet    │
│  Onay Bekle     │     │  (Verification) │     │  emailVerified: │
└─────────────────┘     └─────────────────┘     │  false          │
                                                └─────────────────┘
```

### 2. Giriş (Login) Akışı

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Login      │────▶│  Şifre Kontrol  │────▶│  Email Verified?│
│  Request    │     │  (bcrypt)       │     │                 │
└─────────────┘     └─────────────────┘     └─────────────────┘
                           │                        │
                    ❌ Hatalı                  ❌ Doğrulanmamış
                           │                        │
                           ▼                        ▼
               ┌─────────────────┐      ┌─────────────────┐
               │  Failed Login   │      │  Yeniden Email  │
               │  Counter++      │      │  Gönder         │
               └─────────────────┘      └─────────────────┘
                                                    
                                            ✅ Başarılı
                                                    │
                                                    ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Cookie'lere    │◀────│  Token Üret     │◀────│  Eski Tokenları │
│  Token Yaz      │     │  Access+Refresh │     │  İptal Et       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 3. Token Yenileme (Refresh) Akışı

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Refresh Token  │────▶│  JWT Verify     │────▶│  Token Version  │
│  (Cookie'den)   │     │                 │     │  Kontrol        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                            ┌─────────────────┐
                                            │  IP/UserAgent   │
                                            │  Kontrol        │
                                            │  (Şüpheli?)     │
                                            └─────────────────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                              ✅ Normal       ⚠️ Farklı       🚨 3+ Cihaz
                                    │           Cihaz              │
                                    ▼               │               ▼
                        ┌─────────────────┐        │    ┌─────────────────┐
                        │  Yeni Token     │        │    │  Tüm Tokenları  │
                        │  Oluştur        │        │    │  İptal Et       │
                        └─────────────────┘        │    └─────────────────┘
                                                   ▼
                                        ┌─────────────────┐
                                        │  Log + İzleme   │
                                        └─────────────────┘
```

---

## 📡 API Endpoints

### Auth Routes (`/api/auth`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/register` | Yeni kullanıcı kaydı | - |
| `GET` | `/verify-email?token=xxx` | E-posta doğrulama | - |
| `POST` | `/login` | Kullanıcı girişi | - |
| `POST` | `/logout` | Oturumu kapat | Required |
| `POST` | `/refresh` | Token yenileme | - |
| `POST` | `/forgot-password` | Şifre sıfırlama isteği | - |
| `POST` | `/reset-password` | Yeni şifre belirleme | - |
| `PUT` | `/profile` | Profil güncelleme | Required |

### Profile Routes (`/api/profile`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `GET` | `/me` | Kullanıcı profili | Required |
| `PUT` | `/me` | Profil güncelle | Required |

---

## 🔧 Service Metodları

### AuthService

| Metod | Parametre | Dönüş | Açıklama |
|-------|-----------|-------|----------|
| `registerUser` | `RegisterDTO` | `IUser` | Yeni kullanıcı oluştur |
| `loginUser` | `LoginDTO, clientInfo` | `{ user, accessToken, refreshToken }` | Giriş yap |
| `logoutUser` | `refreshToken` | `void` | Token iptal et |
| `refreshAccessToken` | `refreshToken, clientInfo` | `{ accessToken, refreshToken }` | Token yenile |
| `requestPasswordReset` | `email` | `{ success, message }` | Şifre sıfırlama emaili |
| `resetPassword` | `token, newPassword` | `{ success }` | Yeni şifre belirle |
| `getProfileById` | `userId` | `IUser` | Profil bilgisi |
| `updateUserProfile` | `userId, UpdateProfileDTO` | `IUser` | Profil güncelle |

---

## 🔒 Güvenlik Mekanizmaları

### 1. Şifre Güvenliği
```typescript
// Şifre hashleme (pre-save hook)
const saltRounds = 12;
const salt = await bcrypt.genSalt(saltRounds);
this.password = await bcrypt.hash(this.password, salt);
```

### 2. Token Güvenliği

| Özellik | Değer | Açıklama |
|---------|-------|----------|
| Access Token Süresi | 10 dakika | Kısa süreli erişim |
| Refresh Token Süresi | 7 gün | Uzun süreli oturum |
| Token Version | Artırılabilir | Tüm tokenları geçersiz kılar |
| Token Hashing | SHA-256 | DB'de hashlenmiş saklanır |

### 3. Giriş Korumaları

| Koruma | Limit | Aksiyon |
|--------|-------|---------|
| Başarısız Giriş | 5 deneme | Hesap kilitleme |
| Kilit Süresi | 30 dakika | Otomatik açılır |
| Şüpheli Aktivite | 3 farklı cihaz | Tüm tokenlar iptal |

### 4. Cookie Ayarları

```typescript
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict',  // Production'da
  maxAge: 10 * 60 * 1000,  // 10 dakika
  path: '/',
});
```

---

## ⚙️ Konfigürasyon

### Çevre Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `JWT_ACCESS_SECRET` | Access token imzalama anahtarı |
| `JWT_REFRESH_SECRET` | Refresh token imzalama anahtarı |
| `JWT_ACCESS_EXPIRES` | Access token süresi (örn: '10m') |
| `JWT_REFRESH_EXPIRES` | Refresh token süresi (örn: '7d') |
| `COOKIE_SECURE` | HTTPS cookie zorunluluğu |
| `EMAIL_HOST` | SMTP sunucu adresi |
| `EMAIL_USER` | SMTP kullanıcı adı |
| `EMAIL_PASS` | SMTP şifre |

---

## 🧪 Test Senaryoları

| Senaryo | Açıklama | Beklenen Sonuç |
|---------|----------|----------------|
| Başarılı Kayıt | Geçerli email + şifre | 201 + Doğrulama emaili |
| Duplicate Email | Var olan email | 400 Email in use |
| Doğrulanmamış Giriş | emailVerified: false | 403 + Yeni email |
| Başarısız Giriş | Yanlış şifre (5x) | Hesap kilitleme |
| Token Yenileme | Geçerli refresh token | Yeni token çifti |
| Şüpheli Aktivite | 3 farklı IP/cihaz | Tüm tokenlar iptal |

---

## 📝 Versiyon Notları

### v2.0 (Güncel)
- Token version ile invalidation
- Çoklu cihaz takibi
- Şüpheli aktivite algılama
- IP/UserAgent logging
- Gelişmiş profil yönetimi

### v1.0
- Temel auth akışları
- JWT token yönetimi
- E-posta doğrulama
- Şifre sıfırlama

---

## 🔗 İlgili Dokümantasyon

- [Middlewares - auth.ts](../../middlewares/auth.ts)
- [Utils - tokenUtils.ts](../../utils/tokenUtils.ts)
- [Utils - emailUtils.ts](../../utils/emailUtils.ts)

Refresh token çalınması veya kötüye kullanımı durumunda güvenlik önlemleri.

3. Repository Katmanı (repositories/auth.repository.ts)
   MongoDB ile veri alışverişini yapar.

findByEmail, findById, createUser, updateLastLogin gibi CRUD işlemleri burada.

Ayrıca token.repository.ts dosyası:

Refresh token'ları veritabanına kaydeder.

Refresh token'ın süresini kontrol eder, günceller veya iptal eder.

🧩 Modülde Kullanılan Yapılar

Yapı Açıklama
JWT Kimlik doğrulama için access ve refresh token üretimi.
Bcrypt Şifrelerin güvenli şekilde hashlenmesi.
Cookies Access ve Refresh Token'ların güvenli saklanması.
Token Hashing Refresh token'lar veritabanında hashlenmiş şekilde tutulur.
IP ve User-Agent Kontrolü Şüpheli girişleri algılamak ve engellemek için kullanılır.
Yup veya Joi DTO validasyonları yapılır.
🛡️ Güvenlik Özellikleri
Token Versioning: Kullanıcı her giriş yaptığında refresh token versiyonu artırılır.

Çoklu Cihaz Takibi: Refresh token'lar IP ve cihaz bilgileriyle birlikte saklanır.

Şüpheli Aktivite Algılama: IP veya User-Agent değişimi algılanır, riskli durumlarda tüm token'lar iptal edilir.

Şifre Reset Token Süresi: Sadece belirli bir süre içinde kullanılabilir (örneğin 1 saat).

🔥 Kullanım Örnekleri
Kayıt Ol (Register)
POST /auth/register
Content-Type: application/json

{
"name": "John Doe",
"email": "john@example.com",
"password": "SecurePassword123"
}
Email Doğrulama

GET /auth/verify-email?token=xxx
Giriş Yap (Login)
http
Kopyala
Düzenle
POST /auth/login
Content-Type: application/json

{
"email": "john@example.com",
"password": "SecurePassword123"
}
Refresh Token

POST /auth/refresh
(Refresh token cookie içinde gönderilir)
📦 Önemli Bağımlılıklar
jsonwebtoken – JWT oluşturma ve doğrulama

bcrypt – Şifre hashleme

express-validator / joi – Validasyon

cookie-parser – Cookie okuma/yazma

mongoose – MongoDB ORM

📑 Geliştirme Notları
Erişim güvenliği için Access Token 10 dakika geçerlidir.

Refresh Token 7 gün geçerlidir.

Refresh Token, veritabanında SHA-256 ile hashlenmiş olarak saklanır.

Giriş yapıldığında eski refresh token'lar iptal edilir.

E-posta ile gelen doğrulama ve sıfırlama token'ları süreye tabidir.

✅ Özet
Bu modül, sistemin kullanıcı kimlik doğrulamasını, güvenli oturum yönetimini ve kullanıcı güvenliğini sağlamak için tasarlanmıştır.
Kendi içinde modüler, genişletilebilir ve güvenli bir yapıya sahiptir.
