# Wesco QA Inspection Monitor

ระบบติดตามงานรอ QA ตรวจ — ใช้ได้ทั้งมือถือและคอมพิวเตอร์ ทุกเครื่องเห็นข้อมูลเดียวกัน

- **เว็บแอป:** https://topmaha.github.io/Wesco_QA_monitoring/
- **API:** https://wesco-qa-api.wiphawas-sketchup.workers.dev (Cloudflare Worker + D1)

## การใช้งาน

1. เข้าสู่ระบบด้วย **รหัสพนักงาน** (ไม่มีรหัสผ่าน) — Admin เพิ่ม/ลบพนักงานได้ที่หน้า **ตั้งค่า**
2. **แจ้งงานตรวจ:** Date Received, Job No., Product, Process, Process Detail, Plan to inspection, Remark/รูป (ถ้ามี)
3. **บอร์ดติดตาม:** นับถอยหลังถึงคิวตรวจ, แจ้งเตือนก่อน 30 นาที, ถึงเวลาแล้ว QA กด **ยอมรับ** หรือ **Reject · เลื่อนเวลา**
4. **ลงผลตรวจ:** OK → ออกจากบอร์ด · NG → ใส่สาเหตุ และระบบสร้างรอบตรวจซ้ำจนกว่าจะผ่าน
5. **1st piece** ต้องตรวจ **Last piece** ผ่านจึงปิด Job ได้
6. **โหมดจอ TV** สำหรับจอหน้างาน (เมนูผู้ใช้ → โหมดจอ TV)

| สิทธิ์ | ทำอะไรได้ |
|---|---|
| Production | แจ้งงานตรวจ, ดูบอร์ด/ประวัติ, ยกเลิกงานที่ตัวเองแจ้ง |
| QA Inspector | + ยอมรับ / เลื่อนเวลา / ลงผลตรวจ |
| Admin | + ตั้งค่าพนักงาน, Process, Process Detail, เวลาแจ้งเตือน |

## โครงสร้าง

```
index.html          หน้าเว็บ (GitHub Pages)
css/app.css         ธีมขาว-เขียวอ่อน
js/config.js        URL ของ API
js/store.js         ชั้นข้อมูล: sync กับ API ทุก 8 วินาที, optimistic update
js/app.js           UI ทั้งหมด (บอร์ด, ฟอร์ม, ประวัติ, ตั้งค่า, TV)
assets/             โลโก้ Wesco
worker/             Cloudflare Worker (API) + schema.sql ของ D1
sw.js               ล้าง service worker ของแอปเก่าที่เคยอยู่ใน URL นี้
```

## Deploy API (Cloudflare)

```bash
cd worker
npm install
npx wrangler d1 execute wesco-qa --remote --file=./schema.sql   # สร้างตาราง (รันซ้ำได้)
npx wrangler deploy
```

ตั้งค่าครั้งแรก: `npx wrangler secret put TOKEN_SECRET` (สตริงสุ่ม ใช้เซ็น token เข้าระบบ)

หน้าเว็บ deploy อัตโนมัติผ่าน GitHub Pages เมื่อ push ขึ้น `main`

## เวอร์ชัน

เลขเวอร์ชันแสดงที่หน้า Login, เมนูผู้ใช้ และโหมดจอ TV · หน้าจอที่เปิดค้างไว้จะขึ้นแถบ "มีเวอร์ชันใหม่" ภายใน 5 นาทีหลังอัปเดต (โหมด TV รีโหลดเอง)

**อัปเดตเวอร์ชัน:** แก้ `VERSION` ใน `js/config.js` และ `?v=` ใน `index.html` ให้ตรงกัน (ถ้าแก้ API ด้วย ให้แก้ `VERSION` ใน `worker/src/index.js` แล้ว `npx wrangler deploy` ในโฟลเดอร์ `worker`)

| เวอร์ชัน | วันที่ | รายละเอียด |
|---|---|---|
| 1.1.0 | 2026-10-04 | แสดงเลขเวอร์ชัน + แจ้งเตือนเมื่อมีเวอร์ชันใหม่ |
| 1.0.1 | 2026-10-04 | เอาปุ่ม "ล้างรายการตรวจทั้งหมด" ออก |
| 1.0.0 | 2026-10-04 | เปิดใช้งานจริง (GitHub Pages + Cloudflare Worker/D1) |

## หมายเหตุ

- หน้าจอโหลดรายการที่ยังค้าง + ประวัติย้อนหลัง 31 วัน (ข้อมูลเก่ากว่านั้นยังอยู่ในฐานข้อมูล)
- รูปถ่ายถูกย่อเหลือไม่เกิน 1024px แล้วเก็บใน D1
- แอปเดิม (CountGD) เก็บไว้ที่ branch `countgd-archive`
