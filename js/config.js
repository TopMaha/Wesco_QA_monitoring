/* ค่าตั้งของแอป
 * VERSION — เปลี่ยนทุกครั้งที่อัปเดตเว็บ (และแก้ ?v= ใน index.html ให้ตรงกัน)
 *           หน้าจอที่เปิดค้างไว้จะเห็นแถบ "มีเวอร์ชันใหม่" ภายใน 5 นาที
 * API_BASE — Cloudflare Worker + D1 (ดูโค้ดใน worker/) */
window.APP_CONFIG = {
  VERSION: '1.1.0',
  API_BASE: 'https://wesco-qa-api.wiphawas-sketchup.workers.dev'
};
