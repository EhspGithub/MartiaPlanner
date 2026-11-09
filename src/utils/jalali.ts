/**
 * Persian (Jalali / Shamsi) Calendar & Number Formatting Utilities
 * Built on jalaali-js for accurate Iranian calendar conversions, week calculation (Saturday to Friday),
 * and Persian numeral formatting.
 */
import * as jalaali from 'jalaali-js';

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/**
 * Converts English/Arabic digits to Persian digits (۰-۹)
 */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/\d/g, (d) => persianDigits[Number(d)]);
}

/**
 * Formats a Date object as local YYYY-MM-DD string
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date object (at noon to avoid DST shift)
 */
export function parseISODate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/**
 * Returns today's YYYY-MM-DD in local time
 */
export function getTodayISO(): string {
  return toISODateString(new Date());
}

/**
 * Adds `days` to a given YYYY-MM-DD date string and returns new YYYY-MM-DD
 */
export function addDaysISO(isoDate: string, days: number): string {
  const dt = parseISODate(isoDate);
  dt.setDate(dt.getDate() + days);
  return toISODateString(dt);
}

/**
 * Returns Tomorrow's YYYY-MM-DD
 */
export function getTomorrowISO(): string {
  return addDaysISO(getTodayISO(), 1);
}

/**
 * Returns the Iranian weekday index (0 = Saturday / شنبه ... 6 = Friday / جمعه)
 */
export function getPersianWeekdayIndex(isoDate: string): number {
  const dt = parseISODate(isoDate);
  // JS getDay(): 0 = Sunday, 6 = Saturday
  const jsDay = dt.getDay();
  return (jsDay + 1) % 7;
}

/**
 * Returns the Persian weekday name (e.g., "شنبه")
 */
export function getPersianWeekdayName(isoDate: string): string {
  return PERSIAN_WEEKDAYS[getPersianWeekdayIndex(isoDate)];
}

/**
 * Converts a YYYY-MM-DD Gregorian string to Jalali { jy, jm, jd }
 */
export function isoToJalali(isoDate: string): { jy: number; jm: number; jd: number } {
  const [gy, gm, gd] = isoDate.split('-').map(Number);
  return jalaali.toJalaali(gy, gm, gd);
}

/**
 * Formats an ISO date as a full readable Persian date: e.g. "شنبه ۱۹ آبان ۱۴۰۵"
 */
export function formatJalaliFull(isoDate: string): string {
  const { jy, jm, jd } = isoToJalali(isoDate);
  const weekday = getPersianWeekdayName(isoDate);
  const monthName = PERSIAN_MONTHS[jm - 1] || '';
  return `${weekday} ${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
}

/**
 * Formats an ISO date as compact Persian date: e.g. "۱۹ آبان"
 */
export function formatJalaliCompact(isoDate: string): string {
  const { jm, jd } = isoToJalali(isoDate);
  const monthName = PERSIAN_MONTHS[jm - 1] || '';
  return `${toPersianDigits(jd)} ${monthName}`;
}

/**
 * Formats an ISO date as numeric Jalali: e.g. "۱۴۰۵/۰۸/۱۹"
 */
export function formatJalaliNumeric(isoDate: string): string {
  const { jy, jm, jd } = isoToJalali(isoDate);
  return `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, '0'))}/${toPersianDigits(
    String(jd).padStart(2, '0')
  )}`;
}

/**
 * Given any reference ISO date, returns the 7 days of that Iranian week (Saturday to Friday)
 */
export function getPersianWeekDays(referenceIsoDate: string): Array<{
  isoDate: string;
  weekdayIndex: number;
  weekdayName: string;
  dayNumberPersian: string;
  monthName: string;
  fullLabel: string;
  isToday: boolean;
}> {
  const todayIso = getTodayISO();
  const currentWeekdayIdx = getPersianWeekdayIndex(referenceIsoDate); // 0 = Saturday
  const saturdayIso = addDaysISO(referenceIsoDate, -currentWeekdayIdx);

  return Array.from({ length: 7 }, (_, i) => {
    const isoDate = addDaysISO(saturdayIso, i);
    const { jm, jd } = isoToJalali(isoDate);
    const weekdayName = PERSIAN_WEEKDAYS[i];
    const monthName = PERSIAN_MONTHS[jm - 1] || '';
    return {
      isoDate,
      weekdayIndex: i,
      weekdayName,
      dayNumberPersian: toPersianDigits(jd),
      monthName,
      fullLabel: `${weekdayName} ${toPersianDigits(jd)} ${monthName}`,
      isToday: isoDate === todayIso,
    };
  });
}

/**
 * Returns start and end ISO dates for the current Jalali month containing `referenceIsoDate`
 */
export function getJalaliMonthRange(referenceIsoDate: string): {
  startIso: string;
  endIso: string;
  monthLabel: string;
} {
  const { jy, jm } = isoToJalali(referenceIsoDate);
  const monthLength = jalaali.jalaaliMonthLength(jy, jm);
  const startGreg = jalaali.toGregorian(jy, jm, 1);
  const endGreg = jalaali.toGregorian(jy, jm, monthLength);

  const startIso = `${startGreg.gy}-${String(startGreg.gm).padStart(2, '0')}-${String(
    startGreg.gd
  ).padStart(2, '0')}`;
  const endIso = `${endGreg.gy}-${String(endGreg.gm).padStart(2, '0')}-${String(
    endGreg.gd
  ).padStart(2, '0')}`;

  return {
    startIso,
    endIso,
    monthLabel: `${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`,
  };
}

/**
 * Formats minutes clearly in Persian: e.g. "۹۰ دقیقه (۱ ساعت و ۳۰ دقیقه)" or compact "۹۰ دقیقه"
 */
export function formatMinutesPersian(minutes: number, includeHoursHint = false): string {
  const mins = Math.max(0, Math.round(minutes || 0));
  if (!includeHoursHint || mins < 60) {
    return `${toPersianDigits(mins)} دقیقه`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) {
    return `${toPersianDigits(mins)} دقیقه (${toPersianDigits(h)} ساعت)`;
  }
  return `${toPersianDigits(mins)} دقیقه (${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه)`;
}
