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
npm run seed
npm run dev
```

`npm run seed` اختياري. من قاعدة فارغة يضيف الطلبات التجريبية السبعة 1036–1042؛ إعادة تشغيله لا تستبدل الطلبات الموجودة أو تعديلاتها ولا تحذف شيئًا. تواريخ Mock التي لا تحتوي منطقة زمنية تُفسر صراحةً بوصفها UTC بإضافة `Z`، ويعرضها المتصفح بتوقيت الجهاز.

بدون Seed يبدأ الترقيم من 1001. بعد Seed في قاعدة جديدة يبدأ من 1043. قد توجد فجوات عند فشل الحفظ بعد حجز الرقم؛ يمنع الفهرس الفريد تكرار الرقم. لا يُخفض العداد القائم.

إعدادات `server/.env`:

| المتغير | الافتراضي |
|---|---|
| HOST | 127.0.0.1؛ يجب أن يكون loopback |
| PORT | 4000 |
| MONGODB_URI | mongodb://127.0.0.1:27017/fixflow |
| CORS_ORIGINS | http://127.0.0.1:5173,http://localhost:5173 |
| NODE_ENV | development |

الخادم يبدأ الاستماع بعد الاتصال بقاعدة البيانات وإنشاء الفهرس الفريد وتهيئة العداد. عند تعذر الاتصال يخرج برسالة عامة ورمز فشل، ولا يطبع URI أو أسرارًا. بعد فقد الاتصال أثناء التشغيل تعيد المسارات 503. يستجيب CORS أيضًا لمصدر API نفسه لتعمل تجربة Swagger محليًا.

- [Health](http://127.0.0.1:4000/api/v1/health)
- [Swagger UI](http://127.0.0.1:4000/api-docs/)
- ملف العقد: `server/docs/openapi.yaml`؛ يتوفر أيضًا على `/api-docs/openapi.yaml` في التطوير.
- `npm start` تشغيل دون watch؛ `npm run dev` باستخدام `node --watch`.

## 3. React — النافذة الثانية

```powershell
cd C:\Users\Administrator\Desktop\fixflow
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

افتح [FixFlow](http://127.0.0.1:5173). المنفذ ثابت 5173؛ إذا كان مشغولًا أغلق نسختك السابقة أو حرر المنفذ. لا تضع URI MongoDB أو أي سر في متغير يبدأ بـ `VITE_` لأنه يصل للمتصفح. بعد تغيير `.env.local` أعد تشغيل Vite.

```powershell
npm run build
npm run preview
```

المعاينة تستخدم منفذ Vite preview المعتاد 4173؛ لاختبار API منها أضف `http://127.0.0.1:4173` إلى `CORS_ORIGINS` وأعد تشغيل Backend. التشغيل الأساسي المطلوب هو `npm run dev` على 5173.

## API

الأساس `http://127.0.0.1:4000/api/v1`، والرقم في URL هو `order.id` العددي.

| الطريقة | المسار | الوظيفة |
|---|---|---|
| GET | /health | جاهزية MongoDB |
| GET | /orders/statuses | الحالات الخمس |
| GET | /orders | بحث، تصفية، صفحات |
| GET | /orders/:id | التفاصيل |
| POST | /orders | إنشاء |
| PATCH | /orders/:id | تعديل جزئي للحقول الستة |
| PATCH | /orders/:id/status | تغيير الحالة |
| GET | /dashboard/summary | الأعداد وأحدث خمسة طلبات |

الحالات: تم الاستلام، قيد الصيانة، جاهز للتسليم، تم التسليم، ملغي. إلغاء الطلب يغير الحالة ويبقي السجل؛ لا يوجد DELETE.

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

اختبار التكامل يختار تلقائيًا قاعدة جديدة باسم `fixflow_test_<uuid>` ولا يستخدم اسم قاعدة العمل الموجود في URI. يتحقق من HTTP والتزامن والفهرس والبحث والصفحات والتعديل والإلغاء وSeed وإعادة الاتصال. لا يحذف قواعد البيانات أو السجلات؛ يطبع اسم القاعدة التجريبية ويتركها للمراجعة. عند ضبط المتغير وعدم توفر MongoDB يفشل الاختبار فعليًا.

نتائج التنفيذ الفعلية والقيود في [VERIFICATION.md](VERIFICATION.md) و[تقرير التنفيذ](FIXFLOW_BACKEND_IMPLEMENTATION_REPORT.md). لا يوجد lint script في المشروع.

## اختبار الاستمرارية الأساسي

1. أضف طلبًا وهميًا من React ودوّن الرقم الصادر من الخادم.
2. افتح قاعدة `fixflow` وcollection `orders` في MongoDB Compass وابحث بـ `{ id: الرقم }`.
3. حدّث الصفحة؛ افتح الطلب من القائمة وتحقق من بقائه.
4. أوقف Backend بـ Ctrl+C ثم شغّله مجددًا؛ تحقق من بقاء الطلب والتعديل والحالة.

## تشخيص سريع

- رسالة الاتصال بالخادم: شغّل MongoDB ثم Backend وتحقق من Health وعنوان `VITE_API_BASE_URL`.
- `DATABASE_UNAVAILABLE`: تحقق من الخدمة و`MONGODB_URI` دون مشاركة ملف `.env`.
- تعارض المنفذ: أوقف العملية التي شغلتها سابقًا؛ لا يغيّر التطبيق المنفذ تلقائيًا.
- فشل إنشاء فهرس بسبب أرقام قديمة مكررة: الخادم يرفض البدء؛ افحص نسخة احتياطية من البيانات وعالج التعارض يدويًا. لا تُنفذ إعادة تهيئة مدمرة.

المصادقة والصلاحيات والنشر والدفع والإشعارات والملفات خارج نطاق هذه النسخة. لا تنشرها للعموم قبل إضافة حماية مناسبة.
