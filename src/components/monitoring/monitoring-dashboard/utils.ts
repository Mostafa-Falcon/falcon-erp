import type { DailySalesPoint, MonthlySalesPoint } from'./types';

export const formatPayment = (type?: string): string => {
 switch (type) {
 case'cash':
 return'نقدي';
 case'card':
 return'شبكة / مدى';
 case'credit':
 return'آجل';
 case'split':
 return'سداد مشترك';
 default:
 return'نقدي';
 }
};

export const formatArabicDateTime = (isoString?: string): string => {
 if (!isoString) return'-';
 try {
 const d = new Date(isoString);
 const now = new Date();
 const isToday = d.toDateString() === now.toDateString();
 const yesterday = new Date(now);
 yesterday.setDate(yesterday.getDate() - 1);
 const isYesterday = d.toDateString() === yesterday.toDateString();

 let hours = d.getHours();
 const minutes = d.getMinutes().toString().padStart(2,'0');
 const ampm = hours >= 12 ?'م':'ص';
 hours = hours % 12 || 12;
 const timePart =`${hours}:${minutes} ${ampm}`;

 if (isToday) return`اليوم، ${timePart}`;
 if (isYesterday) return`أمس، ${timePart}`;
 return`${d.toISOString().slice(0, 10)}، ${timePart}`;
 } catch {
 return isoString;
 }
};

export const isDateMatchingFilter = (
 isoString: string | undefined,
 dateRange: string,
 selectedDate: string
): boolean => {
 if (!isoString) return false;

 if (selectedDate) {
 return isoString.startsWith(selectedDate);
 }

 const recordDate = new Date(isoString);
 const now = new Date();
 const todayStr = now.toISOString().slice(0, 10);

 switch (dateRange) {
 case'اليوم':
 return isoString.startsWith(todayStr);
 case'أمس': {
 const yesterday = new Date(now);
 yesterday.setDate(yesterday.getDate() - 1);
 return isoString.startsWith(yesterday.toISOString().slice(0, 10));
 }
 case'آخر 7 أيام': {
 const sevenDaysAgo = new Date(now);
 sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
 return recordDate >= sevenDaysAgo;
 }
 case'آخر 30 يوم': {
 const thirtyDaysAgo = new Date(now);
 thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
 return recordDate >= thirtyDaysAgo;
 }
 case'هذا الشهر': {
 const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
 return recordDate >= startOfMonth;
 }
 case'هذا العام': {
 const startOfYear = new Date(now.getFullYear(), 0, 1);
 return recordDate >= startOfYear;
 }
 default:
 return true;
 }
};

export const computeSvgPath = (
 points: { amount: number }[],
 maxAmount: number
): string => {
 if (points.length === 0) return'M 10 140 L 490 140';
 const step = 480 / (points.length - 1);
 const coords = points.map((p, idx) => {
 const x = 10 + idx * step;
 const y = 140 - (p.amount / maxAmount) * 110;
 return { x, y };
 });

 let d =`M ${coords[0].x} ${coords[0].y}`;
 for (let i = 1; i < coords.length; i++) {
 const prev = coords[i - 1];
 const curr = coords[i];
 const cx = (prev.x + curr.x) / 2;
 d +=`C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
 }
 return d;
};