# أمثلة FixFlow API — PowerShell

شغّل MongoDB وBackend أولًا. جميع الأسماء والأرقام أدناه وهمية. نفذ المقاطع في جلسة PowerShell واحدة.

```powershell
$base = 'http://127.0.0.1:4000/api/v1'
Invoke-RestMethod "$base/health"
Invoke-RestMethod "$base/orders/statuses"
Invoke-RestMethod "$base/orders?page=1&limit=10"
```

إنشاء طلب؛ تحويل الجسم إلى UTF-8 يحافظ على العربية في Windows PowerShell:

```powershell
$values = @{
  customerName = 'عميل تجريبي'
  phone = '٠٥٠١٢٣٤٥٦٧'
  deviceType = 'جوال'
  deviceName = 'iPhone 15'
  serialNumber = ''
  problem = 'تجربة حفظ في MongoDB'
}
$json = $values | ConvertTo-Json
$created = Invoke-RestMethod "$base/orders" -Method Post `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
$id = $created.data.id
$created | ConvertTo-Json -Depth 5
Invoke-RestMethod "$base/orders/$id"
```

الرقم يأتي من Backend؛ لا تفترض أنه 1043 إن كان لديك طلبات سابقة.

بحث بالعربية أو بالأرقام وتصفية الحالة مع ترقيم:

```powershell
$search = [uri]::EscapeDataString('عميل')
$status = [uri]::EscapeDataString('تم الاستلام')
Invoke-RestMethod "$base/orders?search=$search&status=$status&page=1&limit=10"
$search = [uri]::EscapeDataString('١٠٤٢')
Invoke-RestMethod "$base/orders?search=$search"
```

تعديل جزئي؛ يعيد الطلب الكامل ويحافظ على رقمه وتاريخ إنشائه:

```powershell
$json = @{ problem = 'تم فحص الجهاز وتحديد العطل' } | ConvertTo-Json
Invoke-RestMethod "$base/orders/$id" -Method Patch `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
```

تحديث الحالة؛ الإلغاء في React يحتاج تأكيدًا، وفي API هو تحديث حالة يحفظ السجل:

```powershell
$json = @{ status = 'جاهز للتسليم' } | ConvertTo-Json
Invoke-RestMethod "$base/orders/$id/status" -Method Patch `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
Invoke-RestMethod "$base/dashboard/summary" | ConvertTo-Json -Depth 8
```

فشل تحقق متوقع 422 (لا ينشئ طلبًا):

```powershell
$json = @{ phone = 'abc123' } | ConvertTo-Json
try {
  Invoke-RestMethod "$base/orders/$id" -Method Patch `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
} catch {
  $_.Exception.Response.StatusCode
  $_.ErrorDetails.Message
}
```

طلب غير موجود، وخطأ استعلام:

```powershell
try { Invoke-RestMethod "$base/orders/9999999" } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod "$base/orders?limit=101" } catch { $_.ErrorDetails.Message }
```

مثال `curl.exe` للقراءة (تجنب مشكلة اقتباس JSON عبر Windows باستخدام أمثلة PowerShell أعلاه للكتابة):

```powershell
curl.exe -i 'http://127.0.0.1:4000/api/v1/health'
curl.exe -i 'http://127.0.0.1:4000/api/v1/orders?page=1&limit=10'
```

Swagger المحلي: http://127.0.0.1:4000/api-docs/ . لا تظهر الوثائق في وضع `NODE_ENV=production`.
