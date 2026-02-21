# Zikr v2.0 — Hatm Document: Muammolar va Yechimlar

> Barcha o'zgarishlar NestJS + Prisma backend asosida amalga oshirilgan.
> Bazaviy URL: `http://localhost:4000/api/v1`
> Barcha so'rovlar `Authorization: Bearer <token>` headerini talab qiladi (login va send-otp bundan mustasno).

---

## 1. LOGIN — Xavfsizlik muammosi

### Muammo
Login qilganda faqat email va password tekshirilardi. Raqam (phone) hech qanday tekshirilmasdi. Ya'ni birovning emaili va parolini bilsangiz, uning accountiga kirib ketish mumkin edi. Hech qanday verification yo'q edi.

### Yechim
Ikki bosqichli login joriy etildi:
1. Avval emailga OTP (6 raqamli kod) yuboriladi
2. Login qilganda OTP va telefon raqami ham tekshiriladi

---

### Qanday ishlatiladi

#### Qadam 1 — OTP yuborish

```
POST /auth/send-otp
```

**Request Body:**
```json
{
  "email": "john@gmail.com"
}
```

**Muvaffaqiyatli Javob:**
```json
{
  "message": "OTP sent to email"
}
```

> OTP emailga yuboriladi. Amal qilish muddati — 5 daqiqa.

---

#### Qadam 2 — Login qilish

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@gmail.com",
  "password": "12345",
  "otp": "847291"
}
```

**Muvaffaqiyatli Javob:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Xato holatlari:**
| Holat | Xato |
|-------|------|
| OTP noto'g'ri | `401 Unauthorized: Invalid OTP` |
| OTP muddati o'tgan | `401 Unauthorized: OTP not found or expired` |
| Telefon raqami mos kelmasa | `401 Unauthorized: Phone number mismatch` |
| Email yoki parol noto'g'ri | `401 Unauthorized: Invalid email or password` |

> Admin login OTP talab qilmaydi: `POST /auth/admin/login`

---

## 2. USER — Profil ma'lumotlari

### 2a. GET /users/me — Group sonlari yo'q edi

#### Muammo
User profilini olganda faqat asosiy ma'lumotlar kelardi. Userdagi QURAN GROUP va ZIKR GROUP sonlari ko'rinmasdi.

#### Yechim
`GET /users/me` so'roviga `quranGroupCount` va `zikrGroupCount` maydonlari qo'shildi.

#### Qanday ishlatiladi

```
GET /users/me
```

**Javob:**
```json
{
  "status": true,
  "message": "User profile fetched successfully",
  "data": {
    "userId": "uuid",
    "name": "John",
    "surname": "Doe",
    "email": "john@gmail.com",
    "phone": "+998901234567",
    "image_url": null,
    "role": "USER",
    "quranGroupCount": 3,
    "zikrGroupCount": 2,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2b. DELETE /users/me — Foydalanuvchi o'z accountini o'chira olmardi

#### Muammo
Faqat admin boshqa userlarni o'chira olar edi. User o'z accountini o'chira olmasdi.

#### Yechim
`DELETE /users/me` endpointi qo'shildi — user o'z accountini o'chira oladi.

#### Qanday ishlatiladi

```
DELETE /users/me
```

**Javob:**
```json
{
  "status": true,
  "message": "Account deleted successfully",
  "data": null
}
```

---

## 3. QURAN GROUP — Alohida modul

### Muammo
Hatm va Zikr uchun group endpointlari bitta controller/serviceda aralash edi. Ikkita alohida URL dan foydalanish kerak bo'lardi (`/groups/public/mine?groupType=QURAN` va `/groups/private/mine?groupType=QURAN`). Response ham to'liq emas edi.

### Yechim
`/quran-groups` — yangi, to'liq alohida modul yaratildi.

---

### Qanday ishlatiladi

#### POST /quran-groups — Yangi Quran Group yaratish

```
POST /quran-groups
```

**Request Body:**
```json
{
  "name": "Oilaviy Hatm",
  "guruhImg": "https://example.com/image.jpg",
  "isPublic": false,
  "kimga": "Bobom ruhiga",
  "hatmSoni": 3
}
```

**Javob:**
```json
{
  "idGroup": "uuid",
  "name": "Oilaviy Hatm",
  "groupType": "QURAN",
  "isPublic": false,
  "kimga": "Bobom ruhiga",
  "hatmSoni": 3,
  "completedHatmCount": 0,
  "adminId": "user-uuid",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

> Guruh yaratilganda: admin avtomatik `GroupAdmin` sifatida qo'shiladi va `FinishedPoralarCount` yozuvi (juzCount: 0) avtomatik yaratiladi.

---

#### GET /quran-groups/mine — Barcha Quran Grouplarni olish

Eski usul (2 ta request):
```
GET /groups/public/mine?groupType=QURAN   ❌
GET /groups/private/mine?groupType=QURAN  ❌
```

Yangi usul (1 ta request):
```
GET /quran-groups/mine  ✅
```

**Javob:**
```json
{
  "adminGroups": [
    {
      "id": "uuid",
      "name": "Oilaviy Hatm",
      "guruhImg": null,
      "isPublic": false,
      "admin": {
        "userId": "uuid",
        "name": "John",
        "phone": "+998901234567"
      },
      "kimga": "Bobom ruhiga",
      "hatmSoni": 3,
      "completedHatmCount": 1,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "memberGroups": [
    {
      "id": "uuid",
      "name": "Do'stlar Hatmi",
      ...
    }
  ]
}
```

> `adminGroups` — siz admin bo'lgan grouplar.
> `memberGroups` — siz a'zo bo'lgan (lekin admin emas) grouplar.
> `completedHatmCount` — hozirga qadar tugatilgan hatmlar soni.

---

#### GET /quran-groups/:id — Group tafsilotlari

```
GET /quran-groups/uuid
```

**Javob:**
```json
{
  "id": "uuid",
  "name": "Oilaviy Hatm",
  "isPublic": false,
  "kimga": "Bobom ruhiga",
  "hatmSoni": 3,
  "completedHatmCount": 1,
  "admin": {
    "userId": "uuid",
    "name": "John",
    "surname": "Doe",
    "phone": "+998901234567"
  },
  "members": [
    {
      "userId": "uuid",
      "image_url": "https://...",
      "name": "John",
      "surname": "Doe",
      "phone": "+998901234567",
      "isAdmin": true,
      "bookedPoras": [
        { "poraId": "uuid", "poraName": "1-Juz" }
      ]
    }
  ],
  "poralar": [
    {
      "id": "uuid",
      "name": "1-Juz",
      "isBooked": true,
      "isDone": false,
      "bookedBy": {
        "userId": "uuid",
        "name": "John",
        "image_url": null,
        "phone": "+998901234567"
      },
      "bookId": "booking-uuid",
      "status": "Booked"
    },
    {
      "id": "uuid",
      "name": "2-Juz",
      "isBooked": false,
      "isDone": false,
      "bookedBy": null,
      "bookId": null,
      "status": "Available"
    }
  ]
}
```

> `status` qiymatlari: `"Available"` | `"Booked"` | `"Completed"`
> Barcha 30 ta pora har doim response ichida keladi.

---

#### PATCH /quran-groups/:id — Group yangilash

```
PATCH /quran-groups/uuid
```

**Request Body** (faqat o'zgartirilishi kerak bo'lgan maydonlar):
```json
{
  "name": "Yangi nom",
  "isPublic": true,
  "kimga": "Onam ruhiga",
  "hatmSoni": 5
}
```

---

## 4. PORA BOOKING — Tuzatishlar

### 4a. POST /booked-poralar — isBooked va isDone client tomonidan jo'natilmasdi

#### Muammo
Pora band qilganda `isBooked: true` va `isDone: false` ni har safar request bodyga qo'shib jo'natish kerak edi. Aks holda null qolardi.

#### Yechim
Server tomonida avtomatik o'rnatiladi: `isBooked: true`, `isDone: false`. Siz faqat `idGroup` va `poraId` jo'natasiz.

#### Qanday ishlatiladi

```
POST /booked-poralar
```

**Request Body (eski):**
```json
{
  "idGroup": "uuid",
  "poraId": "uuid",
  "isBooked": true,
  "isDone": false
}
```

**Request Body (yangi):**
```json
{
  "idGroup": "uuid",
  "poraId": "uuid"
}
```

**Javob (user ma'lumotlari ham keladi):**
```json
{
  "id": "booking-uuid",
  "poraId": "uuid",
  "idGroup": "uuid",
  "userId": "uuid",
  "isBooked": true,
  "isDone": false,
  "pora": { "id": "uuid", "name": "1-Juz" },
  "user": {
    "userId": "uuid",
    "name": "John",
    "surname": "Doe",
    "image_url": "https://...",
    "phone": "+998901234567"
  }
}
```

---

### 4b. GET /booked-poralar/:id — User ma'lumotlari yo'q edi

#### Muammo
Book ma'lumotini olganda faqat booking yozuvi kelardi, book qilgan user haqida hech qanday ma'lumot yo'q edi.

#### Yechim
Javobga user ma'lumotlari qo'shildi.

#### Qanday ishlatiladi

```
GET /booked-poralar/booking-uuid
```

**Javob:**
```json
{
  "id": "booking-uuid",
  "poraId": "uuid",
  "idGroup": "uuid",
  "userId": "uuid",
  "isBooked": true,
  "isDone": false,
  "user": {
    "userId": "uuid",
    "name": "John",
    "image_url": "https://...",
    "phone": "+998901234567"
  }
}
```

---

### 4c. PATCH /booked-poralar/:id — Keraksiz poraId maydoni

#### Muammo
PATCH so'rovida `poraId` ni ham jo'natish kerak edi, holbuki faqat `isBooked` va `isDone` o'zgartiriladi.

#### Yechim
`poraId` UpdateDto dan olib tashlandi.

#### Qanday ishlatiladi

```
PATCH /booked-poralar/booking-uuid
```

**Request Body (eski):**
```json
{
  "isBooked": true,
  "isDone": true,
  "poraId": "uuid"
}
```

**Request Body (yangi):**
```json
{
  "isDone": true
}
```

---

## 5. FINISHED PORA — Hatm tugatish mantiq xatosi

### Muammo
Barcha 30 ta pora o'qib bo'linganda `POST /finished-poralar-count` ga `idGroup` va `juzCount: 1` jo'natilardi, lekin:
- Har safar **yangi yozuv** yaratilardi (increment emas)
- `hatmSoni` — bu maqsad soni (target), lekin kod uni **tugatilgan hatmlar soniga** qo'shib yuborardi
- Poralar reset bo'lmasdi — userlar qayta hatm qila olmasdi

### Yechim
- Yangi yozuv yaratish o'rniga mavjud `FinishedPoralarCount` yozuvining `juzCount` i +1 ga oshiriladi
- Barcha `BookedPoralar` o'chiriladi → barcha poralar `Available` holatga qaytadi
- `hatmSoni` o'zgartirilmaydi (u maqsad soni bo'lib qoladi)
- WebSocket orqali `hatm_completed` eventi yuboriladi

#### Qanday ishlatiladi

Barcha 30 ta pora tugatilgandan keyin:

```
POST /finished-poralar-count
```

**Request Body (eski):**
```json
{
  "idGroup": "uuid",
  "juzCount": 1
}
```

**Request Body (yangi):**
```json
{
  "idGroup": "uuid"
}
```

**Javob:**
```json
{
  "id": "uuid",
  "idGroup": "uuid",
  "juzCount": 2,
  "created_at": "...",
  "updated_at": "..."
}
```

> `juzCount` — tugatilgan hatmlar umumiy soni (har muvaffaqiyatli hatmdan +1).
> Shu zahoti barcha poralar `Available` holatga qaytadi va yangi hatm boshlash mumkin.

---

## 6. ZIKR GROUP — Alohida modul

### Muammo
Zikr va Hatm uchun group endpointlari bitta edi. Zikr group yaratganda avval groupni, keyin zikrni alohida-alohida yaratish kerak edi (2 ta request). PATCH da ham xuddi shunday muammo bor edi.

### Yechim
`/zikr-groups` — yangi, to'liq alohida modul. Bitta so'rovda ham group, ham zikr yaratiladi.

---

### Qanday ishlatiladi

#### POST /zikr-groups — Yangi Zikr Group yaratish

Eski usul (2 ta request):
```
POST /groups     ❌
POST /zikr       ❌
```

Yangi usul (1 ta request):
```
POST /zikr-groups  ✅
```

**Request Body:**
```json
{
  "name": "Subhonalloh Guruhi",
  "guruhImg": "https://example.com/image.jpg",
  "isPublic": true,
  "kimga": null,
  "zikrName": "Subhonalloh",
  "zikrDesc": "Tonggi zikr",
  "zikrHint": "Dilingiz bilan ayting",
  "zikrBody": "سُبْحَانَ اللَّهِ",
  "goalZikrCount": 1000
}
```

**Javob:**
```json
{
  "group": {
    "idGroup": "uuid",
    "name": "Subhonalloh Guruhi",
    "groupType": "ZIKR",
    ...
  },
  "zikr": {
    "id": "uuid",
    "name": "Subhonalloh",
    "goal": 1000,
    "groupId": "uuid",
    ...
  }
}
```

> Bitta so'rovda: Group + Zikr + GroupZikrActivities — barchasi avtomatik yaratiladi.

---

#### GET /zikr-groups/mine — Barcha Zikr Grouplarni olish

Eski usul (2 ta request):
```
GET /groups/public/mine?groupType=ZIKR   ❌
GET /groups/private/mine?groupType=ZIKR  ❌
```

Yangi usul (1 ta request):
```
GET /zikr-groups/mine  ✅
```

**Javob:**
```json
{
  "adminGroups": [
    {
      "id": "uuid",
      "name": "Subhonalloh Guruhi",
      "isPublic": true,
      "admin": {
        "userId": "uuid",
        "name": "John",
        "phone": "+998901234567"
      },
      "zikrName": "Subhonalloh",
      "goalZikrCount": 1000,
      "currentZikrCount": 350
    }
  ],
  "memberGroups": [ ... ]
}
```

> `currentZikrCount` — joriy siklda aytilgan zikrlar soni (`totalCount % goal`).

---

#### GET /zikr-groups/:id — Group tafsilotlari

```
GET /zikr-groups/uuid
```

**Javob:**
```json
{
  "id": "uuid",
  "name": "Subhonalloh Guruhi",
  "isPublic": true,
  "admin": {
    "userId": "uuid",
    "name": "John",
    "surname": "Doe",
    "phone": "+998901234567"
  },
  "zikrName": "Subhonalloh",
  "goalZikrCount": 1000,
  "currentZikrCount": 350,
  "cycleCount": 2,
  "userZikrCount": 500,
  "members": [
    {
      "userId": "uuid",
      "image_url": null,
      "name": "John",
      "surname": "Doe",
      "phone": "+998901234567",
      "isAdmin": true,
      "userZikrCount": 500,
      "userCurrentZikrCount": 175
    }
  ]
}
```

**Maydonlar izohi:**

| Maydon | Izoh |
|--------|------|
| `goalZikrCount` | Guruh maqsadi (masalan: 1000 ta zikr) |
| `currentZikrCount` | Joriy siklda aytilgan umumiy zikr (`totalCount % goal`) |
| `cycleCount` | Guruh maqsadga necha marta erishgani (`floor(total / goal)`) |
| `userZikrCount` | Har bir user uchun minimal zikr (`ceil(goal / a'zolar soni)`) |
| `userCurrentZikrCount` | Shu userni joriy sikldagi zikr soni |

**Misol:** `goalZikrCount = 1000`, guruhda `2` a'zo, `cycleCount = 2`, umumiy zikr `2350`:
- `currentZikrCount = 2350 % 1000 = 350`
- `cycleCount = floor(2350 / 1000) = 2`
- `userZikrCount = ceil(1000 / 2) = 500`

---

#### PATCH /zikr-groups/:id — Group va Zikr birga yangilash

Eski usul (2 ta request):
```
PATCH /groups/uuid  ❌
PATCH /zikr/uuid    ❌
```

Yangi usul (1 ta request):
```
PATCH /zikr-groups/uuid  ✅
```

**Request Body** (faqat o'zgartirilishi kerak maydonlar):
```json
{
  "name": "Yangi Guruh Nomi",
  "isPublic": false,
  "zikrName": "Alhamdulilloh",
  "goalZikrCount": 500
}
```

---

## 7. ZIKR COUNT — Soddalashtirildi

### Muammo
Zikr qo'shganda `groupId`, `zikrId` va `count` — uchtalasini jo'natish kerak edi. Har bir POST da bazaga yangi satr qo'shilar edi (to'g'ri emas).

### Yechim
- `zikrId` endi kerak emas — server `groupId` bo'yicha o'zi topadi
- Bugungi sessiya uchun **upsert** pattern: agar bugun ushbu groupga zikr yozilgan bo'lsa — soni oshiriladi, yangi yozuv yaratilmaydi

#### Qanday ishlatiladi

```
POST /zikr-counts/add-zikr-count
```

**Request Body (eski):**
```json
{
  "groupId": "uuid",
  "zikrId": "uuid",
  "count": 33
}
```

**Request Body (yangi):**
```json
{
  "groupId": "uuid",
  "count": 33
}
```

**Javob:**
```json
{
  "totalCount": 383,
  "goalReached": false
}
```

> `goalReached: true` bo'lsa — guruh maqsadga erishdi, yangi sikl boshlanadi.

---

## 8. NOTIFICATION — Guruhga Invite tizimi

### Muammo
Notification tizimi aniq maqsadsiz edi: `isInvite` va `isRead` ni client o'zi yuborishi kerak edi. Bitta userga bir guruhdan bir nechta notification jo'natish mumkin edi. Accept/Ignore mexanizmi yo'q edi.

### Yechim
Notification = faqat guruhga invite. To'liq invite oqimi:
1. Admin invite yuboradi
2. Takroriy invite bloklanadi (PENDING bo'lsa)
3. User accept yoki ignore qiladi
4. Accept qilsa — avtomatik guruhga qo'shiladi
5. Ignore qilsa — keyinroq qayta invite yuborish mumkin

---

### Qanday ishlatiladi

#### POST /notifications — Invite yuborish

```
POST /notifications
```

**Request Body (eski):**
```json
{
  "receiverId": "uuid",
  "groupId": "uuid",
  "isInvite": true,
  "isRead": false
}
```

**Request Body (yangi):**
```json
{
  "receiverId": "uuid",
  "groupId": "uuid"
}
```

> Agar shu groupdan shu userga PENDING invite allaqachon bor bo'lsa — `409 Conflict` xatosi qaytariladi.

---

#### GET /notifications — Pending invitelarni olish

```
GET /notifications
```

**Javob:**
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "groupId": "uuid",
    "status": "PENDING",
    "time": "2025-01-01T00:00:00.000Z",
    "sender": {
      "name": "John",
      "surname": "Doe",
      "image_url": null
    },
    "group": {
      "name": "Oilaviy Hatm"
    }
  }
]
```

> Faqat `status: "PENDING"` bo'lgan invitelar keladi.

---

#### PATCH /notifications/:id/accept — Inviteni qabul qilish

```
PATCH /notifications/uuid/accept
```

**Javob:**
```json
{
  "id": "uuid",
  "status": "ACCEPTED",
  ...
}
```

> User avtomatik `GroupMembers` ga `USER` roli bilan qo'shiladi.

---

#### PATCH /notifications/:id/ignore — Inviteni rad etish

```
PATCH /notifications/uuid/ignore
```

**Javob:**
```json
{
  "id": "uuid",
  "status": "IGNORED",
  ...
}
```

> Status `IGNORED` bo'lgandan keyin shu groupdan qayta invite yuborish mumkin bo'ladi.

---

## Xulosa jadval

| # | Muammo | Endpoint | O'zgarish |
|---|--------|----------|-----------|
| 1 | Login xavfsizligi — telefon tekshirilmasdi | `POST /auth/send-otp` + `POST /auth/login` | OTP + phone verification qo'shildi |
| 2a | User profileda group sonlari yo'q | `GET /users/me` | `quranGroupCount`, `zikrGroupCount` qo'shildi |
| 2b | User o'z accountini o'chira olmasdi | `DELETE /users/me` | Yangi endpoint qo'shildi |
| 3 | Quran group alohida emas edi, 2 ta request kerak | `POST/GET/PATCH /quran-groups` | To'liq alohida modul |
| 4a | isBooked/isDone client tomonidan jo'natilardi | `POST /booked-poralar` | Server avtomatik belgilaydi |
| 4b | Book info'da user ma'lumoti yo'q edi | `GET /booked-poralar/:id` | User info qo'shildi |
| 4c | PATCH da keraksiz poraId maydoni | `PATCH /booked-poralar/:id` | poraId olib tashlandi |
| 5 | Hatm tugaganda yangi yozuv yaratilardi, poralar reset bo'lmasdi | `POST /finished-poralar-count` | Increment + reset mexanizmi |
| 6 | Zikr group alohida emas edi, 2 ta request kerak | `POST/GET/PATCH /zikr-groups` | To'liq alohida modul |
| 7 | zikrId client tomonidan jo'natilardi, har POST yangi satr | `POST /zikr-counts/add-zikr-count` | Auto-find + upsert |
| 8 | Invite tizimi yo'q edi, takroriy notiflar mumkin | `POST/GET /notifications`, `PATCH /:id/accept`, `PATCH /:id/ignore` | To'liq invite oqimi |

---

## Database o'zgarishlari

| Model | Yangi maydon | Izoh |
|-------|-------------|------|
| `Zikr` | `hint String?` | Zikr uchun maslahat matni |
| `Group` | `completedHatmCount Int @default(0)` | Tugatilgan hatmlar hisoblagichi |
| `Notifications` | `status InviteStatus @default(PENDING)` | `PENDING` / `ACCEPTED` / `IGNORED` |
