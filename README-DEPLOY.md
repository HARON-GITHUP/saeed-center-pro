# سنتر سعيد التعليمي — نسخة GitHub + Firebase Hosting

هذه النسخة مرتبة بحيث يمكن رفع الكود إلى GitHub بدون نشر قاعدة البيانات أو ملفات التشغيل الحساسة، ويمكن نشر الواجهة الموجودة داخل `public/` على Firebase Hosting بدون خطأ الملفات التنفيذية.

## مهم قبل النشر

المشروع ليس موقعًا ثابتًا فقط. هو Full-Stack ويستخدم:

- واجهة HTML/CSS/JavaScript داخل `public/`
- Backend بـ Node.js 22+
- قاعدة بيانات SQLite داخل `data/`
- ملفات مرفوعة داخل `uploads/`

لذلك Firebase Hosting وحده يستضيف الواجهة فقط. لكي تعمل لوحة الإدارة والتسجيل وبوابة ولي الأمر والدفعات والحضور وباقي الوظائف، يجب أن يكون `server.js` شغالًا على استضافة Node.js ذات تخزين دائم، ثم تضع رابط الـ Backend في `public/config.js`.

## 1) التشغيل المحلي الكامل

على Windows شغّل:

```bat
START-SITE.bat
```

أو من Terminal:

```bash
npm start
```

ثم افتح العنوان الذي يظهر في الطرفية.

## 2) اختبار النسخة قبل الرفع

```bash
npm run check
```

يجب أن تظهر:

```text
SELF-CHECK PASSED
```

## 3) رفع المشروع إلى GitHub

أنشئ Repository فارغًا على GitHub ثم من داخل مجلد المشروع:

```bash
git init
git add .
git commit -m "Saeed Center deploy-ready"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

ملف `.gitignore` يمنع تلقائيًا رفع:

- `.env`
- قاعدة SQLite وملفات WAL/SHM
- محتويات `uploads/`
- `node_modules/`
- كاش Firebase المحلي

لا تجبر Git على رفع هذه الملفات.

## 4) إعداد Firebase Hosting

### أ) ضع Project ID

انسخ:

```text
.firebaserc.example
```

إلى:

```text
.firebaserc
```

ثم بدّل:

```text
YOUR_FIREBASE_PROJECT_ID
```

بـ Project ID الحقيقي.

### ب) ربط الواجهة بالـ Backend

افتح:

```text
public/config.js
```

وغيّر:

```js
apiBaseUrl: '',
```

إلى رابط السيرفر، مثل:

```js
apiBaseUrl: 'https://api.example.com',
```

إذا كان الموقع والـ API يعملان من نفس سيرفر Node اتركها فارغة.

### ج) اضبط رابط الموقع في السيرفر

في متغيرات بيئة الـ Backend ضع رابط Firebase النهائي:

```text
PUBLIC_SITE_URL=https://YOUR_PROJECT_ID.web.app
```

هذا يجعل رسائل المتابعة ترسل رابط بوابة ولي الأمر على موقع Firebase بدل رابط سيرفر الـ Backend.

### د) النشر

بعد تثبيت Firebase CLI وتسجيل الدخول:

```bash
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only hosting
```

Firebase سيرفع `public/` فقط.

## 5) لماذا النسخة القديمة كانت تسبب مشكلة Firebase؟

كان مجلد `public/` يحتوي ملفات مثل:

- `START-SITE.bat`
- `server.js`
- `db.js`
- `package.json`
- ملفات تشغيل أخرى

وهذه ليست ملفات واجهة يجب نشرها على Firebase Hosting. النسخة الحالية نظفت `public/` ليحتوي ملفات الويب فقط.

## 6) قاعدة البيانات والملفات

لا تحذف `data/` إذا كانت لديك بيانات حقيقية. قبل أي نقل أو تحديث خذ نسخة احتياطية من:

```text
data/saeed-center.db*
uploads/
```

الاستضافة التي تشغل الـ Backend يجب أن توفر Persistent Storage؛ لأن SQLite ومجلد `uploads` يجب أن يظلا محفوظين بعد إعادة التشغيل أو إعادة النشر.

## 7) متغيرات البيئة

انسخ `.env.example` إلى `.env` على السيرفر فقط، ثم عدل القيم المطلوبة. لا ترفع `.env` إلى GitHub.

## الهيكلة النهائية

```text
Saeed-Center-Pro/
├─ public/              # الملفات التي يرفعها Firebase Hosting فقط
├─ data/                # SQLite - خاص وغير منشور
├─ uploads/             # الملفات المرفوعة - خاص بالـ Backend
├─ scripts/
├─ server.js
├─ db.js
├─ xlsx-lite.js
├─ env-loader.js
├─ package.json
├─ firebase.json
├─ .firebaserc.example
├─ .env.example
├─ .gitignore
└─ README-DEPLOY.md
```

## ملاحظة مهمة عن Firebase-only

إذا أردت أن يصبح المشروع كله داخل Firebase بدون أي استضافة Node خارجية، فيجب نقل SQLite والـ Backend إلى بنية Firebase/Google Cloud مناسبة مثل Firestore مع Backend serverless. هذا تغيير معماري وليس مجرد رفع ملفات، ولا ينبغي استخدام SQLite محلية كقاعدة بيانات إنتاج دائمة داخل بيئة serverless مؤقتة.
