# FixFlow — إدارة طلبات الصيانة

واجهة React عربية/RTL مرتبطة بـ Express 5 وMongoDB/Mongoose. البيانات تأتي من قاعدة البيانات عبر REST API؛ تحديث الصفحة أو إعادة تشغيل Backend لا يعيدان بيانات Mock. هذه نسخة تعليمية محلية ببيانات وهمية فقط.

## المتطلبات

- Node.js 24 LTS وnpm (بيئة التنفيذ الحالية: Node 24.19.0، npm 11.17.0).
- MongoDB Community محلي، أو Docker اختياريًا. لا يحتاج المشروع MongoDB Atlas.
- نافذتا PowerShell مستقلتان لتشغيل Backend وReact.

## 1. تشغيل MongoDB

إذا كانت MongoDB مثبتة كخدمة، شغّل الخدمة بالطريقة المعتادة وتأكد من الاستماع على `127.0.0.1:27017`. استخدم [تعليمات MongoDB الرسمية لـ Windows](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-windows/) عند التثبيت لأول مرة.

إذا كان لديك Docker بالفعل، فهذا بديل اختياري يحفظ البيانات في volume ويربط المنفذ محليًا فقط:

```powershell
docker run -d --name fixflow-mongo -p 127.0.0.1:27017:27017 -v fixflow-mongo-data:/data/db mongo:8.0
```

بعد إنشاء الحاوية أول مرة، استخدم `docker start fixflow-mongo` في المرات التالية. لا تحذف volume إذا أردت الاحتفاظ بالطلبات. لا تجعل قاعدة البيانات أو API متاحين للشبكة العامة.

## 2. Backend — النافذة الأولى

من مجلد المشروع:

```powershell
cd C:\Users\Administrator\Desktop\fixflow\server
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
$configPath = (Resolve-Path .env).Path
$serverConfig = [IO.File]::ReadAllText($configPath)
if ($serverConfig -notmatch '(?m)^\s*SESSION_SECRET\s*=') {
  $serverConfig += "`r`nSESSION_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET`r`n"
}
if ($serverConfig.Contains('SESSION_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET')) {
  $sessionKey = node -p "require('node:crypto').randomBytes(48).toString('hex')"
  [IO.File]::WriteAllText($configPath, $serverConfig.Replace('SESSION_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET', "SESSION_SECRET=$sessionKey"))
  Remove-Variable sessionKey
}
npm run create-admin
npm run dev
```

`npm run create-admin` يُشغّل يدويًا في نافذة تفاعلية ويطلب الاسم والبريد وكلمة مرور مخفية من 12 حرفًا على الأقل. يمكن تشغيل الأمر أيضًا من جذر المشروع. عند وجود حساب إداري استخدم بياناته. البريد المكرر يُرفض.

`npm run seed` اختياري. من قاعدة فارغة يضيف الطلبات التجريبية السبعة 1036–1042؛ إعادة تشغيله لا تستبدل الطلبات الموجودة أو تعديلاتها ولا تحذف شيئًا. تواريخ Mock التي لا تحتوي منطقة زمنية تُفسر صراحةً بوصفها UTC بإضافة `Z`، ويعرضها المتصفح بتوقيت الجهاز.

بدون Seed يبدأ الترقيم من 1001. بعد Seed في قاعدة جديدة يبدأ من 1043. قد توجد فجوات عند فشل الحفظ بعد حجز الرقم؛ يمنع الفهرس الفريد تكرار الرقم. لا يُخفض العداد القائم.

إعدادات `server/.env`:

| المتغير | الافتراضي |
|---|---|
| HOST | 127.0.0.1؛ يجب أن يكون loopback |
| PORT | 4000 |
| MONGODB_URI | mongodb://127.0.0.1:27017/fixflow |
| CORS_ORIGINS | http://127.0.0.1:5173,http://localhost:5173 |
| CLIENT_ORIGIN | عنوان الواجهة المسموح به، مثل http://127.0.0.1:5173 |
| NODE_ENV | development |
| SESSION_SECRET | مطلوب، سر عشوائي بطول 32 حرفًا على الأقل |
| SESSION_IDLE_MINUTES | 30، ويمكن تقليلها |
| SESSION_ABSOLUTE_HOURS | 8، ويمكن تقليلها |
| COOKIE_SECURE | false في التطوير المحلي عبر HTTP؛ true في الإنتاج عبر HTTPS |

الخادم يبدأ الاستماع بعد الاتصال بقاعدة البيانات وإنشاء الفهرس الفريد وتهيئة العداد. عند تعذر الاتصال يخرج برسالة عامة ورمز فشل، ولا يطبع URI أو أسرارًا. بعد فقد الاتصال أثناء التشغيل تعيد المسارات 503. يستجيب CORS أيضًا لمصدر API نفسه لتعمل تجربة Swagger محليًا.

- [Health](http://127.0.0.1:4000/api/v1/health)
- [Swagger UI](http://127.0.0.1:4000/api-docs/)
- ملف العقد: `server/docs/openapi.yaml`؛ يتوفر أيضًا على `/api-docs/openapi.yaml` في التطوير.
- `npm start` تشغيل دون watch؛ `npm run dev` باستخدام `node --watch`.

## 3. React — النافذة الثانية

```powershell
cd C:\Users\Administrator\Desktop\fixflow
npm ci
npm run dev
```

افتح [FixFlow](http://127.0.0.1:5173) وسجّل الدخول بالبريد وكلمة المرور التي أدخلتها في CLI. يوجّه Vite طلبات `/api/v1` إلى Express. إذا كان لديك إعداد قديم لـ `VITE_API_BASE_URL` في `.env` أو `.env.local`، اضبطه على `/api/v1`. لتغيير منفذ Express محليًا، اضبط `FIXFLOW_API_TARGET` في إعدادات Vite وأعد تشغيله. تبقى أسرار الخادم في `server/.env`.

من **المستخدمون** أنشئ حساب موظف، واحفظ كلمة المرور المؤقتة التي تظهر مرة واحدة وسلّمها للموظف بطريقة آمنة. عند دخوله ستظهر له صفحة تغيير كلمة المرور، ثم يسجّل الدخول مجددًا بكلمته الجديدة. جرّب عرض الطلبات وتعديل طلب مفتوح بحساب الموظف، ثم قارن أزرار الإدارة والإلغاء بحساب المدير.

```powershell
npm run build
npm run preview
```

المعاينة تستخدم المنفذ 4173؛ لاختبار عمليات الكتابة منها أضف `http://127.0.0.1:4173` إلى `CORS_ORIGINS` وأعد تشغيل Backend.

## API

الأساس `http://127.0.0.1:4000/api/v1`، والرقم في URL هو `order.id` العددي.

| الطريقة | المسار | الوظيفة |
|---|---|---|
| GET | /health | جاهزية MongoDB |
| GET | /auth/csrf | إصدار رمز CSRF للجلسة |
| POST | /auth/login | التحقق من بيانات الدخول وتجديد الجلسة |
| GET | /auth/me | بيانات المستخدم الحالي |
| POST | /auth/logout | إتلاف الجلسة |
| POST | /auth/change-password | تغيير كلمة المرور وإنهاء الجلسات القديمة |
| GET / POST | /users | عرض الحسابات أو إنشاؤها للمدير |
| PATCH | /users/:id | تغيير الدور أو التفعيل للمدير |
| POST | /users/:id/reset-password | إصدار كلمة مرور مؤقتة للمدير |
| GET | /orders/statuses | الحالات الخمس |
| GET | /orders | بحث، تصفية، صفحات |
| GET | /orders/:id | التفاصيل |
| POST | /orders | إنشاء |
| PATCH | /orders/:id | تعديل جزئي للحقول الستة |
| PATCH | /orders/:id/status | تغيير الحالة |
| GET | /dashboard/summary | الأعداد وأحدث خمسة طلبات |

تتطلب مسارات الطلبات والإحصائيات جلسة صالحة وكلمة مرور دائمة. الحالات هي «تم الاستلام»، «قيد الصيانة»، «جاهز للتسليم»، «تم التسليم» و«ملغي». إلغاء الطلب وتعديل الطلبات الملغاة من صلاحيات المدير. يبقى الطلب الملغى في السجل.

في Swagger نفّذ `GET /auth/csrf` أولًا، ثم أدخل رمزه في **Authorize → csrfToken** ونفّذ `POST /auth/login`. يحتفظ المتصفح بملف الارتباط. حدّث **csrfToken** بالرمز الذي يعيده الدخول قبل تنفيذ أي عملية كتابة. تعرض الواجهة الوثائق في وضع التطوير على عنوان Express نفسه.

الإنشاء والتعديل يعتمدان allowlist: `customerName`, `phone`, `deviceType`, `deviceName`, `serialNumber`, `problem`. الخادم يرفض الحقول المحمية وغير المعروفة، ويطبع الأرقام العربية والفارسية للهاتف والبحث. بيانات الطلب الكاملة تعاد بعد الإنشاء وكل تعديل؛ `_id` و`__v` لا يظهران.

القائمة تقبل `search` (100 حرف)، `status`، `page` (موجب، افتراضي 1)، `limit` (1–100، افتراضي 10). البحث جزئي حرفي في الاسم والجهاز والهاتف ورقم الطلب، ويُجمع مع الحالة بشرط AND. الفرز `createdAt desc, id desc`. `meta.total` لجميع المطابقات؛ `totalPages` يساوي 0 للقائمة الفارغة.

أمثلة PowerShell الصحيحة في [API_EXAMPLES.md](server/docs/API_EXAMPLES.md).

## الاختبارات

```powershell
npm run build
npm test --prefix server
```

الاختبارات الأساسية لا تحتاج MongoDB وتغطي التطبيع والتحقق والردود أثناء الانقطاع وCORS وSwagger. اختبار MongoDB يُتخطى بوضوح عند عدم ضبط متغير الاختبار.

بعد تشغيل MongoDB محليًا:

```powershell
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm test --prefix server
Remove-Item Env:TEST_MONGODB_URI
```

اختبار التكامل يستخدم قاعدة جديدة باسم `fixflow_test_<uuid>` ويتركها للمراجعة. يغطي جلسات MongoDB وCSRF والصلاحيات والإبطال وحماية آخر مدير، إضافة إلى البحث والتزامن والطلبات وSeed وإعادة الاتصال. عند ضبط المتغير وعدم توفر MongoDB يفشل الاختبار.

نتائج تنفيذ المصادقة في [تقرير التنفيذ](FIXFLOW_AUTH_IMPLEMENTATION_REPORT.md).

## اختبار الاستمرارية الأساسي

1. أضف طلبًا وهميًا من React ودوّن الرقم الصادر من الخادم.
2. افتح قاعدة `fixflow` وcollection `orders` في MongoDB Compass وابحث بـ `{ id: الرقم }`.
3. حدّث الصفحة؛ افتح الطلب من القائمة وتحقق من بقائه.
4. أوقف Backend بـ Ctrl+C ثم شغّله مجددًا؛ تحقق من بقاء الطلب والتعديل والحالة.

## تشخيص سريع

- رسالة الاتصال بالخادم: شغّل MongoDB ثم Backend وتحقق من Health وهدف Vite Proxy.
- رفض بدء Express مع `SESSION_SECRET`: اضبط السر في `server/.env` وأعد التشغيل.
- عند تشغيل HTTPS في الإنتاج، اضبط عنوان الواجهة العام في `CLIENT_ORIGIN` واستخدم وكيل HTTPS على loopback يضبط `X-Forwarded-Proto: https` ويستبدل ترويسات التوجيه الواردة من العميل.
- `DATABASE_UNAVAILABLE`: تحقق من الخدمة و`MONGODB_URI` دون مشاركة ملف `.env`.
- تعارض المنفذ: أوقف العملية التي شغلتها سابقًا؛ لا يغيّر التطبيق المنفذ تلقائيًا.
- فشل إنشاء فهرس بسبب أرقام قديمة مكررة: الخادم يرفض البدء؛ افحص نسخة احتياطية من البيانات وعالج التعارض يدويًا. لا تُنفذ إعادة تهيئة مدمرة.
