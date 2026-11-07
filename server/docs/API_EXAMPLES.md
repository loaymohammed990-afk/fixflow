# أمثلة FixFlow API — PowerShell

شغّل MongoDB وBackend أولًا. جميع الأسماء والأرقام أدناه وهمية. نفذ المقاطع في جلسة PowerShell واحدة.

```powershell
$base = 'http://127.0.0.1:4000/api/v1'
Invoke-RestMethod "$base/health"
$csrf = Invoke-RestMethod "$base/auth/csrf" -SessionVariable fixflowSession
$read = @{ WebSession = $fixflowSession }
$account = Get-Credential -Message 'FixFlow login'
$login = Invoke-RestMethod "$base/auth/login" @read -Method Post `
  -Headers @{ 'X-CSRF-Token' = $csrf.data.csrfToken } -ContentType 'application/json' `
  -Body (@{ email = $account.UserName; password = $account.GetNetworkCredential().Password } | ConvertTo-Json)
$write = @{ WebSession = $fixflowSession; Headers = @{ 'X-CSRF-Token' = $login.data.csrfToken } }
Remove-Variable account, csrf, login
Invoke-RestMethod "$base/auth/me" @read
Invoke-RestMethod "$base/orders/statuses" @read
Invoke-RestMethod "$base/orders?page=1&limit=10" @read
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
$created = Invoke-RestMethod "$base/orders" @write -Method Post `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
$id = $created.data.id
$created | ConvertTo-Json -Depth 5
Invoke-RestMethod "$base/orders/$id" @read
```

الرقم يأتي من Backend؛ لا تفترض أنه 1043 إن كان لديك طلبات سابقة.

بحث بالعربية أو بالأرقام وتصفية الحالة مع ترقيم:

```powershell
$search = [uri]::EscapeDataString('عميل')
$status = [uri]::EscapeDataString('تم الاستلام')
Invoke-RestMethod "$base/orders?search=$search&status=$status&page=1&limit=10" @read
$search = [uri]::EscapeDataString('١٠٤٢')
Invoke-RestMethod "$base/orders?search=$search" @read
```

تعديل جزئي؛ يعيد الطلب الكامل ويحافظ على رقمه وتاريخ إنشائه:

```powershell
$json = @{ problem = 'تم فحص الجهاز وتحديد العطل' } | ConvertTo-Json
Invoke-RestMethod "$base/orders/$id" @write -Method Patch `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
```

يمكن للموظف تغيير حالة طلب غير ملغى. القيمة «ملغي» للمدير وتُبقي الطلب في السجل.

```powershell
$json = @{ status = 'جاهز للتسليم' } | ConvertTo-Json
Invoke-RestMethod "$base/orders/$id/status" @write -Method Patch `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
Invoke-RestMethod "$base/dashboard/summary" @read | ConvertTo-Json -Depth 8
```

فشل تحقق متوقع 422 (لا ينشئ طلبًا):

```powershell
$json = @{ phone = 'abc123' } | ConvertTo-Json
try {
  Invoke-RestMethod "$base/orders/$id" @write -Method Patch `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
} catch {
  $_.Exception.Response.StatusCode
  $_.ErrorDetails.Message
}
```

طلب غير موجود، وخطأ استعلام:

```powershell
try { Invoke-RestMethod "$base/orders/9999999" @read } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod "$base/orders?limit=101" @read } catch { $_.ErrorDetails.Message }
```

تسجيل الخروج ثم التحقق من رفض الطلب دون جلسة:

```powershell
Invoke-RestMethod "$base/auth/logout" @write -Method Post -ContentType 'application/json' -Body '{}'
Remove-Variable fixflowSession, read, write
curl.exe -i 'http://127.0.0.1:4000/api/v1/orders?page=1&limit=10'
```

Swagger المحلي: http://127.0.0.1:4000/api-docs/ . لا تظهر الوثائق في وضع `NODE_ENV=production`.
