// src/modules/auth/dtos/register.dto.ts

export interface RegisterDTO {
    name: string;
    email: string;
    password: string;
    phone?: string; // Kullanıcı telefon da girebilir (zorunlu değilse opsiyonel)
    role?: 'admin' | 'company' | 'user'; // Bazı durumlarda role atanabilir
    emailVerified?: boolean; // Eklenen alan
}


