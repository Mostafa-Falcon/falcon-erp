# مراجعة شاملة — Falcon Universal ERP

**المشروع:** `erp_system_net`
**تاريخ المراجعة:** 2026-10-21
**النطاق:** التصميم / الإمكانيات / العمليات الحسابية / الحفظ والمزامنة / منع التكرار (الضغط المزدوج)
**نوع المراجعة:** قراءة كود فقط — لم يتم تعديل أي ملف.

---

## 1) الملخص التنفيذي

النظام طموح جداً ومبني على أساس معماري سليم فعلاً: **Offline-First** بـ Dexie/IndexedDB كـ source of truth، وOutbox pattern بـ `sync_queue`، ومسار **online-first** على Supabase عبر RPCs ذرّية، ومحاسبة مزدوجة حقيقية، ووحدات متعددة المستويات (علبة → شريط → قرص) — ودي حاجات قليل اللي بتتعمل بالجودة دي في أنظمة ERP عربية.

**لكن** فيه ثلاث مناطق خطر حقيقية بتضرب في قلب الفلوس والمخزون:

1. **معامل التحويل (`conversion_factor`) له ثلاث دلالات متضاربة في نفس المشروع** — قسمة في فاتورة البيع، ضرب في المرتجع والمشتريات والسحابة، وضرب في مكان وتعليق بيقول قسمة في مكان تاني. النتيجة: رصيد المخزون بيختلف بمقدار **مربع المعامل** بين البيع والمرتجع، وبين الأونلاين والأوفلاين.
2. **الحماية من الضغط المزدوج موجودة في الأزرار بس، ومش موجودة في الإجراء نفسه** — اختصارات F10/F7/F9 بتنادي `executeCheckout` مباشرة وتتخطى الحماية تماماً، و`createSalesInvoiceOnline` بيولّد UUID جديد في كل محاولة فده بيلغي الـ idempotency السحابي من أصله.
3. **البيع الآجل (`credit`) مدعوم في الواجهة ومرفوض في السحابة** — أي محاولة بيع آجل والجهاز أونلاين بترجع برسالة "نوع الدفع غير صالح" وما بتسجلش.

### جدول أخطر النتائج

| # | المشكلة | الخطورة | الموضع |
|---|---------|---------|--------|
| C1 | انعكاس معامل التحويل: البيع يقسم، المرتجع يضرب (فرق = factor²) | **P0 — حرج** | `sales_repository.ts:323` مقابل `:976` و`:1271` |
| C2 | المسار الأوفلاين يقسم على المعامل، والسحابة تضرب فيه | **P0 — حرج** | `sales_repository.ts:323` / `stock_movement_service.ts:167` مقابل `migration:608` |
| C3 | `payment_type='credit'` مرفوض في RPC السحابي | **P0 — حرج** | `migration:554` مقابل `types/sales.ts:33` |
| C4 | لا حماية من التكرار داخل `executeCheckout`؛ الاختصارات تتخطى `disabled` | **P0 — حرج** | `pos/index.tsx:281`, `:431` |
| C5 | UUID جديد لكل محاولة إرسال ⇒ idempotency السحابي بلا أثر | **P0 — حرج** | `sales_repository.ts:548` |
| C6 | `ALREADY_EXISTS` يرجع بدون `items` ⇒ فاتورة بصفر بنود محلياً | **P1 — عالي** | `migration:564` + `sales_repository.ts:622` |
| C7 | أرصدة المستويات (silos) بتضرب في المعامل بدل ما تقسم | **P1 — عالي** | `stock_movement_service.ts:327` |
| C8 | `nextOfflineSeq` قراءة/كتابة بدون معاملة ⇒ أرقام مؤقتة مكررة | **P1 — عالي** | `document_number_service.ts:200-222` |
| C9 | أرقام الورديات بـ `count + 1` ومش بتستخدم `nextShiftNumber` | **P1 — عالي** | `sales_repository.ts:150` |
| C10 | `Math.max(0, ...)` بيخفي العجز في الدفعات والخزينة | **P2 — متوسط** | `stock_movement_service.ts:102`, `sales_repository.ts:219` |
| C11 | تقريب السحابة لمنزلتين في الكميات مقابل 3 منازل في العميل | **P2 — متوسط** | `migration:608` مقابل `decimal.ts` |
| C12 | توكنات Supabase بصيغة نص صريح داخل المستودع | **P0 — أمني** | `GEMINI.md` |
| C13 | العناصر `failed` تُعاد محاولتها للأبد + عدّاد المعلّق كاذب | **P0 — حرج** | `sync_queue_manager.ts:151-152` / `:190-197` |
| C14 | `enqueue` لا يدمج `update+update` ⇒ تطبيق خارج الترتيب | **P1 — عالي** | `sync_queue_manager.ts:28-50` |
| C16 | فشل القيد المحاسبي لا يُفشل الفاتورة (فاتورة بلا قيد) | **P1 — عالي** | `sales_repository.ts:492-511` |
| C17 | `adjustBalance` غير ذرّي بلا transaction ولا حارس رصيد سالب | **P1 — عالي** | `treasury_repository.ts:328-346` |
| C18 | دلتا الكميات تُقرَّب لمنزلتين بدل 3 | **P2 — متوسط** | `sync_queue_manager.ts:212-214` |
| C19 | `markSynced` يحذف بلا أرشفة (لا أثر تدقيقي) | **P2 — متوسط** | `sync_queue_manager.ts:178-180` |
| C20 | مزامنة كل 20 ثانية + إعادة رسم كل الشاشات بلا شرط تغيير | **P2 — متوسط** | `AppShell.tsx:144-148` |
| C21 | `isOfflineDocumentNumber` يعتمد على `includes('-P')` | **P2 — متوسط** | `document_number_service.ts:304-312` |
| C22 | خطأ شبكة/مهلة ⇒ مسار محلي ⇒ ازدواج سحابي | **P1 — عالي** | `sales_repository.ts:583-588` |

---

## 2) المحور الأول: التصميم وتجربة الاستخدام

### نقاط القوة الحقيقية

| البند | التقييم |
|-------|---------|
| الاتجاه واللغة | `dir="rtl"` على `<html>` + `DirectionProvider` من Radix ⇒ اتجاه صحيح حتى في مكونات Radix (Dropdown, Dialog) — `app/layout.tsx:44-53` |
| الخطوط | Cairo بأوزان 300–900 مع `display: swap` ⇒ مناسب جداً للعربي وأرقامه |
| منع وميض الثيم | `themeBootScript` inline قبل الـ paint + `useSyncExternalStore` ⇒ لا FOUC، وهذا تفصيل احترافي |
| هيكل التطبيق | `AppShell` موحّد (Sidebar + Header + PageContainer + MobileBottomNav) بيمنع تكرار التخطيط |
| إيقاع المسافات | `PageContainer`/`PageHeader`/`Section` + tokens (`--spacing-sidebar`, `--container-page`) ⇒ نظام تصميم حقيقي لا مجرد classes |
| الاستجابة | شبكة `sm:`/`lg:` + `MobileBottomNav` + `useIsDesktop` ⇒ تجربة موبايل مقصودة |
| الوصولية البصرية | لا يوجد `<img>` بدون `alt` في كل `src` |

### ملاحظات التصميم

**1. `select-none` على كل الشل — P2**
`AppShell.tsx:178` بيحط `select-none` على الحاوية الجذرية. في نظام ERP ده مؤذي: المستخدم مش هيقدر يحدد رقم فاتورة أو كود صنف أو مبلغ ينسخه. المفروض يقتصر على عناصر التحكم (`button`, `nav`, `[role=tab]`) مش على المحتوى.

**2. قفل الارتفاع `h-[100dvh] overflow-hidden` — P2**
`layout.tsx:52` + `AppShell.tsx:178`. على الموبايل لما الكيبورد يفتح في شاشة زي POS أو `AdminCloseShiftModal` (991 سطر)، الارتفاع الثابت ممكن يقص المحتوى أو يعمل قفزة. الأنسب: `min-h-dvh` على الـ body مع `overflow-hidden` على الـ shell الداخلي فقط.

**3. Metadata عامة غير مُعرّفة بالعلامة**
`layout.tsx:33` → `title: 'ERP Systems | ...'`. المشروع اسمه Falcon، والمفروض يبقى فيه `title.template` لكل صفحة + `icons` + `openGraph`. حالياً كل التابات في المتصفح بنفس العنوان.

**4. كثافة الصفحات (God Components)**
أحجام فعلية: `settings/page.tsx` 919 سطر، `AdminCloseShiftModal.tsx` 991، `inventory/adjustments/new/page.tsx` 971، `pos/index.tsx` 1327. المشكلة مش الطول في حد ذاته، لكن **المنطق والـ JSX والـ state في ملف واحد** ⇒ صعوبة اختبار، وسهولة إدخال أخطاء زي C4 (الحارس الناقص). تم بالفعل تفكيك POS جزئياً (`usePosCart`, `usePosData`, `PosPaymentActions`, domain views) — نفس النمط محتاج يتعمم.

**5. ازدواج مكونات وملفات**
- `modules/inventory/product_repository.ts` **و** `modules/inventory/products/product_repository.ts`
- `modules/inventory/stock_transfer_repository.ts` **و** `modules/inventory/transfers/stock_transfer_repository.ts`
- `components/contacts/CustomersManager.tsx` **و** `components/contacts/customers/CustomersManager.tsx`
- `components/contacts/CustomerProfileView.tsx` **و** `components/contacts/profile/CustomerProfileView.tsx`

ده خطر حقيقي: إصلاح بيتعمل في نسخة والنسخة التانية (اللي بتُستخدم فعلاً) بتفضل زي ما هي.

**6. توثيق غائب**
- `README.md` لسه boilerplate بتاع `create-next-app` — لا يشرح المشروع ولا طريقة التشغيل ولا الـ env vars.
- `CLAUDE.md` بيستدعي `@AGENTS.md` وهو **غير موجود** ⇒ مرجع مكسور.
- `docs/adr/` فيه قرارين architecture محترمين (ADR-001, ADR-002) — لكن مفيش ADR لقرار "مين المرجع في المخزون" بشكل صريح ومربوط بالكود.

---

## 3) المحور الثاني: الإمكانيات

### اللي موجود فعلاً (وهو كتير)

| المجال | التغطية |
|--------|---------|
| POS | 3 نطاقات (`PharmacyPosView`, `RestaurantCafePosView`, `MobilePosView`) + اختصارات F4/F6/F7/F9/F10/F12 + ميزان حي + قارئ باركود كاميرا + دفع مقسّم |
| المبيعات | فواتير، مرتجعات، عروض أسعار، تعديل فاتورة مع إعادة ترحيل القيد، حذف ناعم مع عكس كامل |
| المشتريات | فواتير، أوامر شراء، مرتجعات، متوسط تكلفة مرجّح (WAC) |
| المخزون | مستويات متعددة (علبة/شريط/قرص)، دفعات وصلاحية، تحويلات بين مخازن، جرد فعلي، تسويات، تالف، أرصدة افتتاحية |
| الخزينة | خزائن متعددة، تحويل بين خزائن، سندات قبض/صرف، مصروفات، ورديات كاشير مع تسوية |
| المحاسبة | دليل حسابات، قيود مزدوجة، ميزان مراجعة، أرباح، تدفق نقدي، تقييم مخزون، عكس مستند |
| الموارد البشرية | موظفين، هيكل أقسام، حضور، رواتب، سلف، صلاحيات، مستندات |
| أخرى | CRM، توصيل، تقسيط، صيانة، أرقام تسلسلية (IMEI)، اشتراكات ومنشآت، فروع |

### الفجوات الحقيقية

1. **لا يوجد أي اختبار آلي.** `package.json` فيه `dev/build/start/lint` فقط — مفيش `test` ولا Playwright ولا Vitest. نظام فيه محاسبة ومخزون بهذا التعقيد بدون شبكة أمان واحدة = كل تعديل بقى مقامرة. **P0**
2. **لا يوجد Audit Log للمستخدم.** القيود بترصد الحركة المالية، لكن "مين عدّل الفاتورة دي ومن إمتى" مش متتبَّع في مكان واحد.
3. **لا فصل واضح للصلاحيات على مستوى الحقول** — الصلاحيات موجودة على مستوى الصفحات/الإجراءات (`employees/permissions`)، لكن مش واضحة على مستوى تحديث سعر التكلفة أو الخصم اليدوي.
4. **لا i18n** — كل النصوص عربية مكتوبة inline في JSX. مقبول لنطاق السوق الحالي، لكنه سدّ طريق لأي توسّع.
5. **ازدواج ملفات الهجرات السحابية** — إصدارات متكررة: `202610010000_18_...` و`202610040000_18_...` (الاثنان 18)، و`202610010100_19_...` و`202610040001_19_...` (الاثنان 19). ترتيب التطبيق بيبقى غير محدد ⇒ خطر فشل migrations على بيئة جديدة. **P1**
6. **نظافة المستودع** — `_b.log`, `build_check.log`, `out/`, `tsconfig.tsbuildinfo`, `analyze-orphans.mjs`, `analyze-sweep.mjs`, `apply-sweep.mjs`، ومجلد `pharmacy_system/` (مرجع Flutter) جوه نفس المستودع.

### 🔴 ملاحظة أمنية عاجلة

`GEMINI.md` بيحتوي **توكنات Supabase Management بصيغة نص صريح** لمشروعين (بادئة `sbp_v0_...`) + Project Ref + Organization ID + بريد المالكين. أي حد عنده وصول للمستودع (أو نسخة منه على GitHub) يقدر يدير المشروع السحابي بالكامل.
**الإجراء:** إبطال التوكنات فوراً من لوحة Supabase، حذف الملف من الـ history (مش بس من HEAD)، ونقل أي إعداد لـ `.env.local` مع `.gitignore`.

---

## 4) المحور الثالث: العمليات الحسابية

ده أهم محور، والنتائج هنا مش "تحسينات" — دي أخطاء بتنتج أرقام غلط في الدفاتر.

### 4.1 🔴 C1 + C2 — معامل التحويل: ثلاث دلالات متضاربة

المعامل (`conversion_factor`) المفروض يعني: **كام وحدة أساسية في الوحدة دي**. لو 1 علبة = 20 شريط، فمعامل العلبة = 20. وبالتالي:
`الكمية بالأساسي = الكمية بالوحدة × المعامل`

الواقع في الكود:

| الموضع | المعادلة | الحكم |
|--------|----------|-------|
| `purchases_repository.ts:95` | `quantity * conversionFactor` | ✅ صح |
| `migration:608` | `v_base := round(v_qty * v_factor, 2)` | ✅ صح (بس تقريب منزلتين) |
| `useNewStockTransfer.ts:164` | `quantity * factor` | ✅ صح |
| **`sales_repository.ts:323`** | `factor > 1 ? quantity / factor : quantity * factor` | ❌ **قسمة** |
| **`stock_movement_service.ts:167`** | `factor > 1 ? quantity / factor : quantity * factor` | ❌ **قسمة** |
| **`sales_repository.ts:976`** (مرتجع) | `quantity * conversionFactor` | ✅ صح — وده اللي بيكشف التناقض |
| **`sales_repository.ts:1271`** (تعديل فاتورة) | `quantity * conversionFactor` | ✅ صح |

**الأثر رقم 1 — تناقض داخلي في نفس المستند:**
بيع 1 علبة (معامل 20) ⇒ المخزون ينقص `1 / 20 = 0.05` شريط.
مرتجع نفس العلبة ⇒ المخزون يزيد `1 × 20 = 20` شريط.
**صافي التضخم = 400 ضعف.** علبة واحدة ترجع تزوّد 20 شريط مكان 0.05.

**الأثر رقم 2 — نفس الفاتورة تختلف حسب الشبكة:**
نفس البيع أونلاين: السحابة تخصم 20 شريط. أوفلاين: العميل يخصم 0.05. الفرق 400×.
يعني نفس الكاشير، نفس العملية، رصيد مختلف حسب وجود الإنترنت.

**الأثر رقم 3 — تعديل الفاتورة:**
`createSalesInvoice` يكتب `base_quantity = qty/20`، و`updateSalesInvoice` يعيد كتابتها `qty*20`. مجرد فتح الفاتورة وتعديلها بيقلب الكمية 400 مرة.

**الإصلاح:** دالة واحدة مركزية في `lib/decimal.ts`:

```ts
export const toBaseQty = (qty: number, factor?: number | null): number =>
  roundQty(qty * (factor && factor > 0 ? factor : 1));
```

وتُستخدم في: `sales_repository` (بيع/مرتجع/تعديل)، `stock_movement_service`، `purchases_repository`، والتحويلات — **وبعدها حذف كل `? :` المكررة**. لو فيه بيانات تاريخية اتسجلت بالمعادلة الغلط، محتاجة سكربت تصحيح (reconciliation) لأن `base_quantity` المحفوظة قديمة.

### 4.2 🔴 C3 — البيع الآجل مكسور أونلاين

- نوع الدفع في العميل: `'cash' | 'card' | 'credit' | 'split'` — `src/types/sales.ts:33`
- الـ POS بيرسل `paymentType: payType` وقد تكون `'credit'` — `pos/index.tsx:392`
- السحابة بترفض أي حاجة غير الثلاثة: `if p_payment_type not in ('cash','card','split') then return ... 'INVALID_PAYMENT'` — `migration:554-556`
- و`createSalesInvoiceOnline` بترمي الخطأ لأعلى (`:594-596`) بدل ما تعمل fallback

**النتيجة:** أي فاتورة آجلة والجهاز أونلاين = **بتفشل تماماً** برسالة "نوع الدفع غير صالح". والبيع الآجل في صيدلية مش رفاهية.

**الإصلاح:** إضافة `'credit'` للقائمة في السحابة، والمنطق: `if p_payment_type = 'credit' then v_cash := 0; v_card := 0;` (المتبقي كله يروح على حساب العميل) — التعديل ده متسق مع فحص `CUSTOMER_REQUIRED_FOR_CREDIT` الموجود أصلاً في `:815`.

### 4.3 🔴 C5 — الـ Idempotency السحابي ملغي من العميل

السحابة مبنية صح: `p_invoice_id` هو مفتاح التكرار، ولو الفاتورة موجودة بترجع `ALREADY_EXISTS` (`migration:558-565`).

لكن العميل بيعمل:
```ts
// sales_repository.ts:548
const invoiceId = uuidv4();   // جديد في كل استدعاء
```
⇒ كل retry أو double-tap بيروح بـ UUID مختلف ⇒ السحابة بتشوفه فاتورة جديدة تماماً ⇒ **بتُنشئ فاتورة ثانية**.

**الإصلاح:** توليد `invoiceId` **قبل** الاستدعاء في `createSalesInvoice` (أو في الـ POS نفسه) وتمريره كـ `idempotencyKey`، مع `useRef` في الواجهة يمنع نفس العملية من الولادة مرتين.

### 4.4 🟠 C6 — `ALREADY_EXISTS` بيرجع فاتورة بدون بنود

`migration:564` بيرجع `{ok, code:'ALREADY_EXISTS', invoice}` — بدون `items` ولا `stock_after` ولا `journal`.

والعميل بيعمل `result.items || []` (`sales_repository.ts:622`) ⇒ يكتب فاتورة **بصفر بنود** بحالة `synced`.
**الأثر:** فاتورة تظهر في التقارير بإجمالي صحيح لكن بدون أصناف، ومخزونها غير مخصوم، وقيودها ناقصة.

**الإصلاح:** في حالة `ALREADY_EXISTS` السحابة لازم ترجع `items` و`inventory_transactions` كاملة (أو العميل يرفض الاستيعاب ويقرأ الفاتورة من السحابة بـ pull).

### 4.5 🟠 C7 — أرصدة مستويات الوحدات معكوسة

`stock_movement_service.ts:316-338`:
```
* Stored in the unit of that level (totalAvailableBase / conversion_factor).
...
const silo = roundQty(totalAvailableBase * factor);
```
**التعليق بيقول قسمة، والكود بيضرب.** لو المتاح 100 شريط والعلبة معاملها 20 ⇒ المفروض 5 علب، الكود بيكتب 2000 علبة.

**الإصلاح:** `totalAvailableBase / factor` + اختبار وحدات يغطي (base, factor>1, factor<1 زي الجرام 0.001).

### 4.6 الخصومات والضرائب والشحن — سليمة ومتسقة ✅

اتأكدت إن المعادلة في العميل مطابقة للسحابة بند بند:

| الخطوة | العميل | السحابة |
|--------|--------|---------|
| إجمالي البند | `roundMoney(qty × price)` | `round(qty * price, 2)` |
| الأساس الخاضع | `max(0, subtotal − discount)` | `greatest(0, ... - discount)` |
| الضريبة | `taxable × rate / 100` | نفسها |
| خصم إجمالي | `max(0, (subtotal − itemDisc) × pct/100)` | نفسها |
| الصافي | `subtotal − itemDisc − overall` | نفسها |
| النهائي | `net + tax + shipping` | نفسها |

كمان الشحن متعامل معاه صح: داخل في الإجمالي اللي العميل دفعه، عشان الفاتورة ما تطلعش أقل من المبلغ المستلم (`sales_repository.ts:341-345`).

**ملاحظة P2:** `discount_amount` المخزّن = `itemDiscount + overallDiscount`، بينما `subtotal` هو الإجمالي **قبل** أي خصم. ده صحيح حسابياً بس معناه إن `subtotal - discount_amount ≠ goodsNet` لو فيه ضريبة على البنود — أي تقرير بيحسب الصافي بالطريقة دي هيغلط. الأنسب إضافة عمود `item_discount_amount` منفصل.

### 4.7 🟡 COGS — متسق لكن هشّ

الوضع الحالي متسق رياضياً لكنه بيعتمد على الواجهة:

- الـ POS يبعت `unitCost: line.cost * line.factor` (`pos/index.tsx:365`) — أي **تكلفة الوحدة المُدخلة**.
- المستودع يحسب `cogs = Σ quantity × unit_cost` (`:505`) — صح على هذا الأساس.
- `applyBatchDelta` يحوّلها لتكلفة الأساسي بـ `unitCost / factor` (`:43`) — صح.
- `inventory_transactions.total_cost = |quantity × unitCost|` (`:278`) — صح.

**الخطر:** أي مستدعٍ جديد يبعت `unitCost` بتكلفة **الأساسي** بدل الوحدة المُدخلة هيضاعف التكلفة ×factor بدون أي خطأ ظاهر. **الإصلاح:** تغيير اسم الحقل إلى `unitCostPerEnteredUnit` + تحقق `if (unitCost > product.purchase_price * factor * 5) throw`.

### 4.8 🟡 C10 — `Math.max(0, ...)` بيخفي العجز

- `stock_movement_service.ts:102`: `nextQuantity = Math.max(0, existing.current_quantity + params.delta)` — لو دفعة راحت سالب، بترجع صفر والحركة تتسجل كأنها سليمة.
- `sales_repository.ts:219` (إغلاق الوردية): `Math.max(0, sourceTreasury - amount)` — عجز الخزينة بيختفي بدل ما يظهر كفرق.

**الإصلاح:** رفض العملية بخطأ صريح بدل الكتم، أو على الأقل تسجيل `adjustment` compensating entry.

### 4.9 🟡 C11 — تقريب الكميات

`QTY_DECIMALS = 3` في العميل، والسحابة بتقرّب الكميات لمنزلتين (`round(v_qty * v_factor, 2)`). الصنف اللي بيتوزن بالجرام (معامل 0.001) هيتقرّب خطأ. **الإصلاح:** `round(..., 4)` في السحابة (الكود نفسه بيستخدم 4 في تسجيل الحركة `:773`) + توحيد الثابت في مكان واحد.

### 4.10 🟠 C9 — ترقيم الورديات

`openShift` بيحسب `shiftCount + 1` (`:150`). فيه `DocumentNumberService.nextShiftNumber()` جاهزة (`document_number_service.ts:296`) وبتتعامل مع الأوفلاين برقم سالب كـ sentinel — بس **مش مستخدمة**.
**الأثر:** جهازين يفتحوا وردية في نفس الوقت ⇒ نفس الرقم. وحذف وردية ⇒ الرقم يتكرر بعدها.

---

## 5) المحور الرابع: الحفظ والمزامنة

### 5.0 المعمارية الحالية — باختصار

النظام مبني على نمط **Offline-First + Outbox**، وهو اختيار صحيح لمشروع ERP صيدليات (النت كتير بيقطع والكاشير لازم يفضل شغال):

| الطبقة | الملف | الدور |
|--------|------|-------|
| قاعدة البيانات المحلية | `src/core/db/app_database.ts` | Dexie/IndexedDB — المصدر المحلي للحقيقة، 16 إصدار schema |
| صندوق الصادر | `src/core/sync/sync_queue_manager.ts` | يجدول كل تغيير (`insert`/`update`/`delete`/`delta`) |
| منسّق الدفع | `src/core/sync/sync_coordinator.ts` | يقرأ الـ queue ويبعته لـ Supabase |
| السحب | `src/core/sync/pull_sync_service.ts` | Supabase ← Dexie بسحب تفاضلي (delta cursor + صفحات 500) |
| اللحظية | `src/core/sync/realtime_sync_listener.ts` | Realtime channels |
| حلقة التقارب | `src/components/layout/AppShell.tsx:114-157` | `pullAll` → `triggerSync` → `notifyCloudDataChanged` كل 20 ثانية |
| المسار السحابي الذرّي | `supabase/migrations/202609250000_16_online_first_transactions.sql` | RPCs تفعل كل شيء في transaction واحدة على السيرفر |

**نقطة قوة حقيقية لازم تتقال:** `PullSyncService.mergeIntoLocal` فيه **حارس يمنع السحابة من دهس تغيير محلي لسه ما اتبعتش** — لو السجل حالته `pending`/`in_flight`/`failed` بيترمى السحابي ويُحتفظ بالمحلي (`pull_sync_service.ts:316-320`)، ومعاه `SHIELD_COLUMNS` بتحمي الأعمدة المحلية (أسماء الوحدات، snapshots) من التصفير بسجل سحابي قديم (`:100-113`). كمان `falcon_sync_journal_entry` بياخد `unique_violation` ويعتبرها نجاح (`migration:1176`) — معالجة idempotency صحيحة. وكل معاملات `createSalesInvoice` المحلية على `db.transaction('rw', …)` بقائمة جداول صريحة.

المشاكل تحت كلها في **التفاصيل**، مش في التصميم.

---

### 5.1 🔴 C13 — "الفشل الدائم" مش دائم فعلياً ⇒ حلقة إعادة إرسال أبدية

دي أخطر مشكلة في طبقة المزامنة، وهي **تناقض داخلي في نفس الملف**:

```ts
// sync_queue_manager.ts:185-198 — بعد 5 محاولات يقول "فشل دائم"
const isPermanentFailure = retryCount >= 5;
await db.sync_queue.update(id, { status: isPermanentFailure ? 'failed' : 'pending', ... });

// sync_queue_manager.ts:147-163 — لكن القارئ بياخد 'failed' كمان!
.filter((item) => {
  if (item.status === 'pending') return true;
  if (item.status === 'failed') return true;   // ← الفشل الدائم يرجع للطابور
  ...
})
```

**الأثر:**
1. أي عملية يرفضها السيرفر رفضاً مشروعاً (زي `INSUFFICIENT_STOCK` على delta مخزون) **هتفضل تتبعت كل 20 ثانية للأبد** — ضغط على Supabase + استهلاك باقة + `last_error` بيتكتب فوق بعضه.
2. `markRejected()` (`:136-142`) معمولة بالظبط عشان توقف الدلتا المرفوضة نهائياً — بس **أثرها صفر** لنفس السبب.
3. `getPendingCount()` (`:203-205`) بيعدّ `'pending'` **بس** ⇒ شارة العدّاد في الواجهة بتقول "0 معلّق" بينما فيه 50 عنصر فاشل بيعيد المحاولة. المستخدم مش هيشوف المشكلة أبداً.

**الإصلاح:** إما (أ) `getPendingItems` يستبعد `'failed'` ويبقى فيه مسار "إعادة محاولة يدوي" من شاشة صحة المزامنة، أو (ب) الصفوف الفاشلة تنتقل لجدول `sync_dead_letter` بعد 5 محاولات. + تصحيح `getPendingCount` ليعدّ الحالتين منفصلين.

### 5.2 🟠 C14 — `enqueue` مابيدمجش `update + update`

الدمج الحالي مغطّي حالتين بس (`sync_queue_manager.ts:28-50`):

| الحالة | السلوك | صح؟ |
|-------|--------|-----|
| `insert` + `update` | دمج الـ payload | ✅ |
| `insert` + `delete` | إلغاء الصف من الطابور | ✅ |
| **`update` + `update`** | **صفّين منفصلين** | ❌ |
| **`update` + `delete`** | صفّين — ممكن التحديث يتبعت بعد الحذف | ❌ |

**الأثر:** تعديل نفس الفاتورة/المنتج 6 مرات قبل المزامنة = 6 صفوف بتتبعت بالترتيب. لو أي واحد منهم فشل (`failed`) والباقي نجح، السحابة تنتهي بقيمة **قديمة** (آخر تحديث ناجح مش آخر تحديث فعلي). ومع C13، الفاشل بيرجع يتبعت تاني في цикл مختلف ويحصل **تذبذب قيمة** (flip-flop) بين الأجهزة.

**الإصلاح:** دمج `update+update` بـ merge للـ payload + إلغاء `update` لو جه بعده `delete`.

### 5.3 🔴 C8 — سباق الترقيم الأوفلاين

`nextOfflineSeq` (`document_number_service.ts:200-222`):

```ts
const existing = await db.app_settings.get(key);          // read
const dexieMaxSeq = await getMaxOfflineSeqFromDexie(...);  // read (full scan)
const next = Math.max(settingSeq, dexieMaxSeq) + 1;        // compute
await db.app_settings.put({ id: key, value: String(next) }); // write
```

مفيش `db.transaction` حوالين الأربع خطوات. أي استدعاءين متزامنين (فاتورتين بيتحفظوا ورا بعض، أو تبويبين مفتوحين على نفس الجهاز) بيقروا نفس `settingSeq` ⇒ **نفس الرقم المؤقت**. الرقم المؤقت هو مفتاح الهوية الوحيد للفاتورة الأوفلاين في `falcon_reassign_offline_document_numbers` ⇒ فاتورتين بيتحولوا لرقم رسمي واحد.

**كمان:** `getMaxOfflineSeqFromDexie` (`:113-198`) بيستخدم `.filter()` على كل صفوف الجدول — **full table scan** على `sales_invoices` لكل فاتورة جديدة، والجدول بيكبر للأبد.

**الإصلاح:** `db.transaction('rw', db.app_settings, db.sales_invoices, …)` + استعلام مفهرس بدل `filter` + counter في الذاكرة مع تسلسل لكل `docType`.

### 5.4 🟠 C16 — فاتورة من غير قيد محاسبي (فساد دفاتر صامت)

في `createSalesInvoice` (`sales_repository.ts:492-511`) القيد المحاسبي ملفوف بـ `try/catch` — أي فشل في الترحيل **مابيفشلشش الفاتورة**، وبيتكتب `console.warn` بس.

النتيجة: فاتورة موجودة، مخزون مخصوم، خزينة متحركة، **ومفيش قيد**. ميزان المراجعة هيبقى مش متوازن ومفيش أي إنذار. الفاتورة دي بتتزامن `sync_status: 'synced'` عادي.

**الإصلاح:** القيد جزء من الـ transaction (يرمي ⇒ rollback كامل)، أو على الأقل: لو فشل، الفاتورة تتسجل `journal_status: 'missing'` وتظهر في تقرير "فواتير بلا قيود" على الداشبورد.

### 5.5 🟠 C17 — `adjustBalance` بلا transaction ولا حارس رصيد

`treasury_repository.ts:328-346`:

```ts
const treasury = await db.treasuries.get(treasuryId);   // read
const newBalance = roundMoney(treasury.current_balance + deltaAmount);
await db.treasuries.put(updated);                        // write (منفصل)
await SyncQueueManager.enqueueDelta('treasuries', treasuryId, { current_balance: deltaAmount }, {});
```

الاسم بيقول `atomically` والتعليق بيقول "Modify treasury balance atomically" — **والكود مش ذرّي**. الأمان بيعتمد كلياً على إن المستدعي فاتح transaction (وده حاصل في معظم الحالات)، لكن أي مستدعٍ جديد ينسى ⇒ **last-write-wins** بيضيع حركة كاش. ومفيش أي حارس يمنع رصيد سالب هنا (بخلاف `transferBetweenTreasuries:139-148` اللي بيتحقق ✅).

**الإصلاح:** `db.transaction('rw', db.treasuries, db.sync_queue, …)` جوه الدالة نفسها + `if (newBalance < 0) throw` (مع استثناء صريح للخزائن اللي بتسمح بالسالب لو ده مطلوب).

### 5.6 🟡 C18 — `roundDelta` منزلتين مقابل 3 للكميات

`roundDelta` (`sync_queue_manager.ts:212-214`) بيقرّب لـ **2** منزلة. الكميات في النظام `QTY_DECIMALS = 3`. أي منتج بيتوزن بالجرام (0.001) بيتجمع في الـ queue وينزل السحابة بفقد. أدوية بـ 0.5 مل مثلاً هتتراكم عليها فروق مخزون مش قابلة للتفسير.

**الإصلاح:** `roundDelta` تفرّق حسب نوع الحقل (مال ⇒ 2، كمية ⇒ 3)، أو `roundQty` من `lib/decimal.ts` للحقول المعروفة.

### 5.7 🟡 C19 — `markSynced` بيمسح بلا أثر

`sync_queue_manager.ts:178-180`: `await db.sync_queue.delete(id)` — بالحرف. مفيش أرشفة، مفيش `synced_at`، مفيش سجل إن العملية دي اتبعتت. لو حصل نزاع بيانات ("الفاتورة دي اتبعتت ولا لأ؟") مفيش أي أثر محلي. التعليق نفسه بيقول *"clears or archives it"* — التنفيذ اختار `clear` بس.

### 5.8 🟡 C20 — حلقة التقارب كل 20 ثانية بلا شرط تغيير

`AppShell.tsx:144-148`: `setInterval` كل 20 ثانية ينادي `reconcile()` = `pullAll` لكل الـ 40+ جدول في `PARENT_TABLES` + كل الجداول اللي في `FULL_REFRESH_TABLES` + `notifyCloudDataChanged()`.

- `notifyCloudDataChanged` بتبعت حدث عام ⇒ كل الشاشات المفتوحة بتعمل refetch كل 20 ثانية حتى لو مفيش ولا صف اتغير.
- `cashier_shift` بتُسحب **بالكامل** كل دورة (`FULL_REFRESH_TABLES:67-69`) — مقبول لجدول صغير، بس مع نموه بيبقى تكلفة ثابتة كل 20 ثانية لكل جهاز.
- على أجهزة الكاشير الضعيفة (2GB RAM، Windows قديم) ده بيعمل رجة في الـ POS كل 20 ثانية.

**الإصلاح:** `changed` flag من `pullAll` ⇒ `notifyCloudDataChanged` تتنادى **بس** لو فيه تغيير فعلي. + backoff تصاعدي لـ 60/120 ثانية في حالة الخمول.

### 5.9 🟡 C21 — `isOfflineDocumentNumber` فضفاض

`document_number_service.ts:304-312` آخر شرط: `value.includes('-P')`. أي رقم مستند فيه `-P` في أي مكان يتحسب "مؤقت" — بما فيها أسماء/أكواد فروع فيها حرف P. النتيجة: `falcon_reassign_offline_document_numbers` بيعيد ترقيم مستندات رسمية. **الإصلاح:** الاعتماد على regex المرساة بس (`/^[A-Z]+-P[A-Z0-9]+-\d+$/`) وحذف `includes`.

### 5.10 جدول ملخص المحور الرابع

| # | الأولوية | المشكلة | الملف |
|---|---------|--------|-------|
| C13 | 🔴 P0 | `failed` يُعاد إرساله ⇒ حلقة أبدية + عدّاد كاذب | `sync_queue_manager.ts:151-152` مع `:190-197` |
| C14 | 🟠 P1 | لا دمج `update+update` | `sync_queue_manager.ts:28-50` |
| C8 | 🔴 P0 | `nextOfflineSeq` بلا transaction + full scan | `document_number_service.ts:200-222` |
| C16 | 🟠 P1 | فشل القيد لا يُفشل الفاتورة | `sales_repository.ts:492-511` |
| C17 | 🟠 P1 | `adjustBalance` غير ذرّي ومفيش حارس سالب | `treasury_repository.ts:328-346` |
| C18 | 🟡 P2 | دلتا الكميات تتقرب 2 بدل 3 | `sync_queue_manager.ts:212-214` |
| C19 | 🟡 P2 | حذف بلا أرشفة عند النجاح | `sync_queue_manager.ts:178-180` |
| C20 | 🟡 P2 | poll كل 20 ثانية + إعادة رسم كامل | `AppShell.tsx:144-148` |
| C21 | 🟡 P2 | كشف الرقم المؤقت فضفاض | `document_number_service.ts:304-312` |

---

## 6) المحور الخامس: منع التكرار (الضغط المزدوج)

ده أخطر محور من ناحية **فلوس حقيقية**. البداية كانت إيجابية: فحصت نماذج الحفظ في النظام (مشتريات، مرتجعات، خزينة، موظفين، جرد، تحويلات) ولقيت **معظمها فيه `isSaving` + `disabled` على الزرار** — يعني الوعي موجود. المشكلة مركزة في المسار الأهم: **الكاشير**.

### 6.1 🔴 C4 — `executeCheckout` بلا حارس تكرار

`src/components/sales/pos/index.tsx:281` الدالة بتبدأ **بدون أي حارس**:

```ts
const executeCheckout = async () => {
  // ← مفيش if (isSaving) return;
  if (...validation) return;
  ...
```

`setIsSaving(true)` بيتنادى بعد كده بكتير (`:301` للمرتجع، `:356` للبيع) — أي إن نافذة الخطر مفتوحة طوال فترة الفاليديشن وتحضير البيانات.

**وكمان الأخطر:** اختصارات الكيبورد بتنادي الدالة مباشرة (`pos/index.tsx:431-450`):

```ts
// F10 = دفع، F7 = مرتجع، F9 = …
```

الاختصار بينادي `executeCheckout()` في الـ handler — **فبيتخطى `disabled={isSaving}`** اللي على زرار الدفع في `PosPaymentActions.tsx`. فالكاشير اللي بيدوس F10 مرتين بسرعة (عادة يدوية شائعة جداً في الصيدليات وقت الزحمة) بيعمل **فاتورتين**.

**الأثر المالي:** فاتورتين، مخزون مخصوم مرتين، خزينة زادت مرتين، عميل آجل مدين مرتين. ولو العميل دفع كاش، الفلوس الحقيقية اتحصّلت مرة — الفرق يبقى عجز خزينة.

**الإصلاح (ثلاث طبقات دفاع):**
1. حارس في أول الدالة: `if (isSaving) return;` — أرخص سطر في المشروع.
2. حارس بـ `useRef` مش state (لأن `setState` async ومش بيمنع الضغطة التانية في نفس tick): `if (lockRef.current) return; lockRef.current = true;` مع `finally`.
3. منع الاختصارات لما `isSaving` — الفحص جوه الـ handler نفسه، مش بالاعتماد على `disabled` بتاع الزرار.

### 6.2 🔴 C5 — `uuidv4()` جديد في كل محاولة ⇒ إلغاء الـ idempotency بالكامل

دي المشكلة اللي بتلغي كل المجهود السحابي:

```ts
// sales_repository.ts:547-548
private static async createSalesInvoiceOnline(params) {
  const invoiceId = uuidv4();   // ← هوية جديدة في كل استدعاء
  const payload = { p_invoice_id: invoiceId, ... };
```

السحابة عندها حماية idempotency ممتازة: `p_invoice_id` لو موجود ⇒ `ALREADY_EXISTS` ومش بتعمل فاتورة تانية (`migration:558-565`). **بس الحماية دي بلا قيمة** طول ما العميل بيبعت هوية مختلفة كل مرة. أي retry (شبكة قطعت بعد ما السيرفر خلّص، أو المستخدم دوس تاني، أو fallback محلي ثم مزامنة) ⇒ **فاتورة جديدة على السيرفر**.

**الإصلاح:** توليد `invoiceId` **مرة واحدة عند بداية العملية** (في `createSalesInvoice` قبل أي محاولة) وتخزينه في حالة الطلب، فكل retry بيحمل نفس الـ id. وده بيربط كمان بمسار fallback المحلي — لازم نفس الـ id يتكتب في `sales_invoices.id` محلياً.

### 6.3 🟠 C6 — `ALREADY_EXISTS` بيرجع فاتورة بصفر بنود

سلسلة الفشل الكاملة:

1. العميل يبعت فاتورة بـ id = X، السيرفر ينفّذها وينجح، الرد يضيع في الشبكة.
2. العميل يعيد المحاولة بنفس الـ id (بعد إصلاح C5) ⇒ السيرفر يرد `ALREADY_EXISTS`.
3. الـ RPC في حالة `ALREADY_EXISTS` **مابيرجعش `items`** (`migration:558-565`).
4. العميل: `const items = (result.items || []).map(...)` (`sales_repository.ts:622`) ⇒ **مصفوفة فاضية**.
5. الفاتورة تتكتب محلياً `sync_status: 'synced'` ببنود صفرية ومخزون غير مخصوم محلياً.

النتيجة: فاتورة "متزامنة" على الجهاز، بلا أصناف، والمخزون المحلي بيبقى أعلى من السحابي لحد ما الـ pull التالي يظبط (`stock_after` بترجع صح، بس البنود مش بترجع).

**الإصلاح:** في حالة `ALREADY_EXISTS` يعمل **قراءة** للفاتورة وبنودها من السيرفر (`select` بسيط) ويرجعها كاملة، أو على الأقل يرفض الكتابة المحلية ويطلب pull. الحل الأول أنضف.

### 6.4 🟠 C22 — مسار الـ fallback بيخلق تكرار عند حدود الشبكة

`createSalesInvoiceOnline` (`:583-588`): أي `error` من الـ RPC ⇒ `return null` ⇒ **المسار المحلي يشتغل**. المشكلة إن `error` مش بالضرورة معناه "السيرفر مرفضش" — ممكن يكون **timeout بعد ما السيرفر نفّذ فعلاً**. ساعتها:

- السيرفر: فاتورة (بمخزونها وخزينتها).
- المحلي: فاتورة تانية بنفس رقم المستند لكن id مختلف (بسبب C5).
- المزامنة بعدين: ترفع المحلية كفاتورة جديدة ⇒ **ازدواج كامل**.

**الإصلاح:** التمييز بين أخطاء (timeout/network ⇒ retry بنفس الـ id) و(4xx/rejection ⇒ fallback)، وده كمان بيمنع التحول الصامت لمسار مختلف الحسابات (شوف C2).

### 6.5 🟠 C9 — ترقيم الورديات

`openShift` (`sales_repository.ts:150`) بيحسب `shift_number = shiftCount + 1`:
- جهازين يفتحوا وردية في نفس اللحظة ⇒ **نفس الرقم** (وده مش مجرد تكرار شكلي — الوردية مرتبطة بتسوية الكاش).
- حذف وردية ⇒ الرقم يتكرر بعد كده.
- الأوفلاين: الرقم بيبقى عادي مش سالب، فمفيش طريقة تعرف إنه مؤقت.

و`DocumentNumberService.nextShiftNumber()` (`:296-300`) **جاهزة وبتعمل ده صح** (سالب كـ sentinel أوفلاين) — **ومش مستخدمة في أي مكان**.

### 6.6 جدول ملخص المحور الخامس

| # | الأولوية | المشكلة | الأثر المباشر | الملف |
|---|---------|--------|---------------|-------|
| C4 | 🔴 P0 | لا حارس في `executeCheckout` + اختصارات تتخطى `disabled` | فاتورتين بضغطة مزدوجة | `pos/index.tsx:281, 431-450` |
| C5 | 🔴 P0 | `uuidv4()` كل محاولة | idempotency ملغية ⇒ فواتير مكررة | `sales_repository.ts:548` |
| C6 | 🟠 P1 | `ALREADY_EXISTS` بلا items | فاتورة صفرية `synced` | `migration:558-565` + `repo:622` |
| C22 | 🟠 P1 | timeout ⇒ fallback محلي | ازدواج سحابي/محلي | `sales_repository.ts:583-588` |
| C9 | 🟠 P1 | رقم وردية = count+1 | تصادم أرقام وتسويات كاش | `sales_repository.ts:150` |
| C14 | 🟠 P1 | لا دمج update+update | تطبيق خارج الترتيب | `sync_queue_manager.ts:28-50` |

**اللي اتأكدت إنه سليم ✅:** نماذج الحفظ الأخرى (مشتريات، مرتجع مشتريات، سندات، موظفين، جروة، تحويل مخزون) كلها فيها `isSaving` + `disabled`. `registerVoucherOnly` (`treasury_repository.ts:356+`) معمولة خصيصاً لمنع تطبيق الكاش مرتين في المرتبات — دليل إن الفريق واعي للمشكلة دي. `falcon_sync_journal_entry` بيعالج `unique_violation` صح. `transferBetweenTreasuries` بيتحقق من الرصيد قبل التحويل.

---

## 7) خطة الإصلاح المرتّبة

الترتيب مش بالخطورة النظرية — بالترتيب اللي بيقلل احتمال **خسارة فلوس حقيقية** في أقصر وقت. أول مرحلة كلها تعديلات صغيرة (سطور) وأثرها فوري.

### المرحلة 0 — قبل أي تشغيل حقيقي (يوم واحد تقريباً)

| # | الإصلاح | الملف | التغيير |
|---|--------|-------|---------|
| 1 | **C12** إبطال توكنات Supabase المكشوفة + حذف `GEMINI.md` من المستودع ونقله لمتغيرات بيئة | `GEMINI.md` | إبطال من لوحة Supabase أولاً، ثم تنقية التاريخ (`git filter-repo`) |
| 2 | **C4** حارس تكرار في `executeCheckout` | `pos/index.tsx:281` | `if (isSaving) return;` + `lockRef` + فحص `isSaving` داخل handlers الاختصارات |
| 3 | **C3** إضافة `'credit'` لـ `p_payment_type` المسموحة | `migration` (RPC جديد) | `in ('cash','card','split','credit')` مع معالجة المتبقي |
| 4 | **C13** استبعاد `failed` من `getPendingItems` | `sync_queue_manager.ts:151-152` | حذف السطر + إضافة `getFailedItems()` للعرض اليدوي |

### المرحلة 1 — تسوية الأرقام (أهم مرحلة منطقياً)

| # | الإصلاح | الموضع |
|---|--------|--------|
| 5 | **C1** توحيد دلالة `conversion_factor`: القاعدة `base = qty × factor` وتُطبَّق في **مكان واحد** (دالة مساعدة `toBaseQty(qty, factor)`) بدل 5 نسخ متضاربة | `sales_repository.ts:323`, `:976`, `:1271`, `stock_movement_service.ts:167`, `purchases_repository.ts:95` |
| 6 | **C7** `silos` تقسم على المعامل | `stock_movement_service.ts:327` |
| 7 | **C2** مطابقة السحابة للعميل بعد توحيد القاعدة | `migration:608` |
| 8 | **C11 / C18** توحيد دقة الكميات على 3–4 منازل في العميل والسحابة والـ delta | `decimal.ts` + `migration` + `sync_queue_manager.ts:212` |
| 9 | **C8** لفّ `nextOfflineSeq` في `db.transaction` + استعلام مفهرس | `document_number_service.ts:200-222` |
| 10 | **C9** استخدام `nextShiftNumber()` في `openShift` | `sales_repository.ts:150` |

> **بعد المرحلة دي إلزامي:** سكربت تدقيق يقارن `stock_levels` محلياً بالسحابة لكل منتج، وقائمة الفروق. بدون التسوية دي، أي إصلاح فوق بيانات ملوثة هيكرر الغلط.

### المرحلة 2 — المزامنة والتكرار

| # | الإصلاح | الموضع |
|---|--------|--------|
| 11 | **C5** توليد `invoiceId` مرة واحدة قبل أي محاولة + تمريره لكل retry ونفسه للمسار المحلي | `sales_repository.ts:547-548` |
| 12 | **C22** التمييز بين أخطاء النقل (retry بنفس الـ id) ورفض العمل (fallback) | `sales_repository.ts:583-588` |
| 13 | **C6** عند `ALREADY_EXISTS` قراءة الفاتورة وبنودها من السيرفر وإرجاعها | `migration` + `repo:622` |
| 14 | **C14** دمج `update+update` و`update+delete` | `sync_queue_manager.ts:28-50` |
| 15 | **C16** القيد المحاسبي داخل الـ transaction (أو `journal_status='missing'`) | `sales_repository.ts:492-511` |
| 16 | **C17** transaction + حارس رصيد داخل `adjustBalance` | `treasury_repository.ts:328-346` |

### المرحلة 3 — المتانة والجودة

| # | البند |
|---|-------|
| 17 | **C10** رفض العجز بدل `Math.max(0, …)` + قيد تسوية ظاهر |
| 18 | **C20** `notifyCloudDataChanged` شرطية + backoff للـ polling |
| 19 | **C19** أرشفة الـ queue المنتهي (`synced_at`) بدل الحذف |
| 20 | **C21** regex مرساة بدل `includes('-P')` |
| 21 | **شاشة "صحة المزامنة"**: pending / in_flight / failed / آخر خطأ لكل عنصر + إعادة محاولة يدوية |
| 22 | **اختبارات**: Vitest على `decimal.ts`، `DocumentNumberService`، `stock_movement_service` (base/factor>1/factor<1)، ومعادلات الفاتورة — ثم Playwright على checkout مزدوج |
| 23 | **تنظيف المستودع**: حذف `_b.log`, `build_check.log`, `out/`, `tsconfig.tsbuildinfo`, `analyze-*.mjs`, `pharmacy_system/`، وإزالة ازدواج الملفات (`product_repository` ×2، `stock_transfer_repository` ×2، `CustomersManager` ×2، `CustomerProfileView` ×2) |
| 24 | **تصحيح إصدارات الهجرات** المكررة (`18` مرتين، `19` مرتين) و`CLAUDE.md` اللي بيفتح `AGENTS.md` غير موجود |
| 25 | **تقسيم God Components**: `pos/index.tsx` (1327 سطر)، `pos/usePosData.ts`، وشاشات 900+ سطر |

---

## 8) الخاتمة

**التقييم العام: أساس قوي، وتنفيذ فيه ثلاث مناطق خطر حقيقية.**

| المحور | التقييم | السبب |
|--------|---------|-------|
| التصميم | **جيد جداً** | RTL/Cairo/ثيم بلا وميض/نظام tokens/تجاوب مقصود. الخصم الأساسي: `select-none` على الجذر بيمنع نسخ أي نص، و`overflow-hidden` مع كيبورد الموبايل |
| الإمكانيات | **قوي** | تغطية وظيفية أوسع من متوقع (POS بأنماط 3، WAC، جرد، ورديات، تقارير، CRM، تقسيط، صيانة، Serials). الفجوات: صفر اختبارات آلية، لا Audit Log، لا i18n، لا صلاحيات حقلية |
| الحسابات | **فيه خلل حرج** | الخصم/الضريبة/الشحن **متطابقة** بين العميل والسحابة بند بند ✅. لكن معامل التحويل له 3 دلالات متضاربة ⇒ فرق `factor²`، و`credit` مكسور أونلاين، ودقة الكميات غير موحّدة |
| الحفظ | **سليم التصميم، ضعيف الحواف** | Outbox + معاملات محلية + حارس ضد دهس السحابة للتغيير المعلّق = تصميم صح. لكن "الفشل الدائم" غير دائم، والترقيم الأوفلاين فيه سباق، والقيد المحاسبي قابل للسقوط بصمت |
| منع التكرار | **أخطر محور** | الحماية موجودة في الأزرار بس. الإجراء نفسه (`executeCheckout`) مفتوح، والاختصارات بتتخطى الحماية، و`uuidv4` في كل محاولة بيلغي idempotency السحابي بالكامل |

**الخلاصة العملية:** لو النظام ده هيتشغّل في صيدلية بفلوس حقيقية النهاردة، أخطر سيناريو مش "الشاشة وحشة" — أخطر سيناريو إن كاشير يدوس F10 مرتين في الزحمة، أو النت يقطع في نص فاتورة، فتطلع فاتورتين ومخزون أقل من الحقيقة وخزينة فيها فرق. المنع الحقيقي محتاج **حارس واحد في `executeCheckout`** و**UUID ثابت لكل عملية** — سطرين تقريباً، وأثرهم أكبر من أي إصلاح تاني في المشروع.

**ما تم التحقق أنه سليم ولا يحتاج تدخل:** معادلات الفاتورة (خصم بندي + خصم إجمالي + ضريبة + شحن)، حساب WAC في المشتريات، تكلفة الوحدة الأساسية في `applyBatchDelta`، قفل المخزون السحابي `for update`، حارس التغيير المعلّق في `mergeIntoLocal`، معالجة `unique_violation` في مزامنة القيود، والتزامن الافتراضي بين الحقول في `types/sales.ts` و`migration`.

> **ملاحظة نطاق:** المراجعة دي قراءة كود فقط. لم يتم تعديل أي ملف من `src/` أو `supabase/`. الملف الوحيد اللي اتكتب هو التقرير ده.
