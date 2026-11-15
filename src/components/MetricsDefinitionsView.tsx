import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calculator,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Search,
  Layers,
  Award,
  Timer,
  ShieldAlert,
  TrendingUp,
  Clock,
  FileCheck2,
  GraduationCap,
  Gamepad2,
  Trophy,
  Gauge,
  Scale,
  GitCompare,
  Flame,
  Crown,
  CalendarCheck2,
  BarChart3,
  Settings,
  HelpCircle,
  Compass,
  PlusCircle,
} from 'lucide-react';
import { APP_VERSION } from '../version.ts';
import { toPersianDigits } from '../utils/jalali.ts';

export interface MetricExampleTableRow {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
}

export interface MetricDefinitionRecord {
  id: string;
  codeBadge: string;
  categoryBadge: string;
  categoryKey: 'educational' | 'control' | 'budget' | 'period';
  shortSummary: string;
  title: string;
  concept: string;
  formula?: string[];
  example?: {
    summary: string;
    tableHeaders?: [string, string, string, string];
    tableRows?: MetricExampleTableRow[];
  };
  interpretation: string[];
}

const METRICS_DEFINITIONS_DATA: MetricDefinitionRecord[] = [
  {
    id: 'metric-study-time-t',
    codeBadge: 'T',
    categoryBadge: 'عملکرد آموزشی روزانه',
    categoryKey: 'educational',
    shortSummary: 'درصد تحقق زمان واقعی مطالعه نسبت به زمان هدف مطالعه در روز (۰ تا ۱۰۰٪)',
    title: '۱. شاخص تحقق زمان مطالعه (T)',
    concept:
      'این شاخص نشان می‌دهد از کل زمانی که امروز برای مطالعه درسی پیش‌بینی کرده‌اید، چه درصدی را در عمل مطالعه کرده‌اید. اگر به اندازه زمان هدف یا بیشتر از آن مطالعه کنید، امتیاز کامل ۱۰۰٪ را دریافت می‌کنید.',
    formula: [
      'درصد تحقق زمان مطالعه (T) = حداقلِ ۱۰۰ و ((مجموع زمان واقعی مطالعه ÷ مجموع زمان پیش‌بینی‌شده مطالعه) × ۱۰۰)',
    ],
    example: {
      summary:
        'اگر برای امروز ۱۸۰ دقیقه مطالعه درسی پیش‌بینی کرده باشید و در مجموع ۱۵۰ دقیقه مطالعه واقعی ثبت کنید: (۱۵۰ ÷ ۱۸۰) × ۱۰۰ = ۸۳٪.',
    },
    interpretation: [
      '۸۰٪ تا ۱۰۰٪: پایبندی زمانی عالی و اجرای کامل یا نزدیک به کامل برنامه مطالعه.',
      '۵۰٪ تا ۷۹٪: تحقق نسبی؛ بخشی از برنامه زمانی اجرا نشده و حجم برنامه نیاز به بازبینی دارد.',
      'کمتر از ۵۰٪: فاصله زیاد بین برنامه‌ریزی و اجرا.',
      'اگر در روزی هیچ فعالیت درسی تعریف نشده باشد، این شاخص نمره صفر کاذب نمی‌گیرد و در وضعیت «بدون برنامه» قرار می‌گیرد.',
    ],
  },
  {
    id: 'metric-exercises-q',
    codeBadge: 'Q',
    categoryBadge: 'عملکرد آموزشی روزانه',
    categoryKey: 'educational',
    shortSummary: 'درصد تحقق تعداد تست‌ها و تمرین‌های حل‌شده نسبت به هدف تعیین‌شده (۰ تا ۱۰۰٪)',
    title: '۲. شاخص تحقق تست و تمرین (Q)',
    concept:
      'این شاخص بخش مهارتی مطالعه را می‌سنجد و مشخص می‌کند چه درصدی از تست‌ها یا تمرین‌های هدف‌گذاری‌شده در روز واقعاً حل شده‌اند.',
    formula: [
      'درصد تحقق تست و تمرین (Q) = حداقلِ ۱۰۰ و ((مجموع تست‌های حل‌شده ÷ مجموع هدف تعداد تست) × ۱۰۰)',
    ],
    example: {
      summary:
        'اگر هدف امروز حل ۶۰ تست در دو درس باشد و ۴۵ تست حل کنید: (۴۵ ÷ ۶۰) × ۱۰۰ = ۷۵٪.',
    },
    interpretation: [
      '۷۰٪ تا ۱۰۰٪: عملکرد تمرینی مطلوب و متناسب با هدف‌گذاری روزانه.',
      'کمتر از ۷۰٪: نیاز به اختصاص زمان بیشتر برای حل تمرین و تست‌زنی.',
      'اگر در روزی هدف تستی تعیین نکرده باشید (مثلاً فقط روخوانی یا مرور تشریحی داشته باشید)، این شاخص غیرفعال شده و هیچ امتیاز منفی یا صفر کاذبی برای شما منظور نمی‌شود.',
    ],
  },
  {
    id: 'metric-learning-quality-k',
    codeBadge: 'L',
    categoryBadge: 'عملکرد آموزشی روزانه',
    categoryKey: 'educational',
    shortSummary: 'میانگین وزنی کیفیت یادگیری بر اساس زمان واقعی هر مطالعه درسی (مقیاس ۰ تا ۱۰ و ۰ تا ۱۰۰)',
    title: '۳. شاخص کیفیت یادگیری وزنی (L)',
    concept:
      'این شاخص عمق تمرکز و کیفیت یادگیری روزانه را اندازه‌گیری می‌کند. در محاسبه آن، هر درس به نسبتِ مدت زمانی که صرف مطالعه آن شده است در میانگین کیفیت روز اثر می‌گذارد.',
    formula: [
      'میانگین کیفیت یادگیری (از ۱۰) = مجموع (نمره کیفیت هر درس × زمان مطالعه واقعی همان درس) ÷ مجموع زمان واقعی مطالعه',
      'امتیاز کیفیت در مقیاس ۱۰۰ (L) = میانگین کیفیت یادگیری × ۱۰',
    ],
    example: {
      summary:
        'اگر ۶۰ دقیقه ریاضی با کیفیت ۸ و ۳۰ دقیقه علوم با کیفیت ۵ بخوانید: ((۶۰ × ۸) + (۳۰ × ۵)) ÷ ۹۰ = ۶۳۰ ÷ ۹۰ = ۷ از ۱۰ (معادل ۷۰ از ۱۰۰).',
    },
    interpretation: [
      '۸ تا ۱۰ (۸۰ تا ۱۰۰): تمرکز بالا و تسلط کامل بر مباحث مطالعه‌شده.',
      '۵ تا ۷.۹ (۵۰ تا ۷۹): کیفیت یادگیری متوسط؛ نیازمند مرور یا کاهش عوامل حواس‌پرتی.',
      'کمتر از ۵ (کمتر از ۵۰): خستگی یا عدم تمرکز حین مطالعه؛ پیشنهاد می‌شود روش یا زمان مطالعه اصلاح شود.',
      'فعالیت‌های غیردرسی (مانند استراحت، ورزش یا سرگرمی) در محاسبه کیفیت یادگیری وارد نمی‌شوند.',
    ],
  },
  {
    id: 'metric-educational-composite-e',
    codeBadge: 'E',
    categoryBadge: 'عملکرد آموزشی روزانه',
    categoryKey: 'educational',
    shortSummary: 'امتیاز ترکیبی عملکرد آموزشی روز حاصل از زمان مطالعه (۴۰٪)، تست (۳۰٪) و کیفیت یادگیری (۳۰٪)',
    title: '۴. امتیاز مستقیم عملکرد آموزشی روز (E)',
    concept:
      'شاخص جامعی از ۰ تا ۱۰۰ که سه بُعد اصلی درس خواندن یعنی «کمیت زمان مطالعه»، «مهارت حل تست» و «کیفیت یادگیری» را با ضرایب استاندارد ترکیب می‌کند.',
    formula: [
      'امتیاز آموزشی روز (E) = (۰.۴۰ × تحقق زمان مطالعه T) + (۰.۳۰ × تحقق تست Q) + (۰.۳۰ × امتیاز کیفیت یادگیری L)',
      'در روزهای بدون هدف تست: امتیاز آموزشی (E) = ((۰.۴۰ × T) + (۰.۳۰ × L)) ÷ ۰.۷۰',
    ],
    example: {
      summary:
        'اگر در یک روز تحقق زمان مطالعه ۸۰٪، تحقق تست ۷۰٪ و امتیاز کیفیت یادگیری ۹۰ باشد: E = (۰.۴ × ۸۰) + (۰.۳ × ۷۰) + (۰.۳ × ۹۰) = ۳۲ + ۲۱ + ۲۷ = ۸۰ از ۱۰۰.',
    },
    interpretation: [
      '۸۵ تا ۱۰۰: عملکرد آموزشی عالی و متوازن در هر سه بُعد زمان، تمرین و کیفیت.',
      '۷۰ تا ۸۴: عملکرد آموزشی خوب و استاندارد.',
      'کمتر از ۷۰: نیازمند تقویت یکی از ابعاد زمان مطالعه، تست‌زنی یا تمرکز.',
      'در صورت نبود داده در یکی از مؤلفه‌ها (مانند روزهای بدون تست)، وزن سایر مؤلفه‌های فعال به‌طور خودکار نرمال‌سازی می‌شود تا سقف امتیاز ۱۰۰ باقی بماند.',
    ],
  },
  {
    id: 'metric-restricted-control-c',
    codeBadge: 'C',
    categoryBadge: 'کنترل سرگرمی و نظم شخصی',
    categoryKey: 'control',
    shortSummary: 'سنجش رعایت سقف مجاز در فعالیت‌های تفریحی محدودشونده مانند موبایل، بازی و تلویزیون (۰ تا ۱۰۰٪)',
    title: '۵. شاخص کنترل سرگرمی و فعالیت‌های محدودشونده (C)',
    concept:
      'این شاخص میزان خودکنترلی در استفاده از سرگرمی‌های محدودشونده (مانند موبایل، بازی و تلویزیون) را با مقایسه زمان واقعی مصرف‌شده در برابر سقف مجاز تعیین‌شده در برنامه روز می‌سنجد.',
    formula: [
      'در صورت رعایت سقف مجاز (زمان واقعی ≤ زمان مجاز): امتیاز کنترل (C) = ۱۰۰٪',
      'در صورت عبور از سقف مجاز (زمان واقعی > زمان مجاز): امتیاز کنترل (C) = (زمان مجاز ÷ زمان واقعی) × ۱۰۰',
    ],
    example: {
      summary:
        'اگر سقف مجاز موبایل ۶۰ دقیقه باشد و ۴۵ دقیقه استفاده کنید، امتیاز شما ۱۰۰٪ است؛ اما اگر ۹۰ دقیقه استفاده کنید: (۶۰ ÷ ۹۰) × ۱۰۰ = ۶۷٪.',
    },
    interpretation: [
      '۱۰۰٪: رعایت کامل سقف مجاز سرگرمی (استفاده کمتر از سقف مجاز همیشه نمره کامل ۱۰۰٪ دارد).',
      '۷۰٪ تا ۹۹٪: اضافه‌مصرف خفیف نسبت به برنامه.',
      'کمتر از ۷۰٪: اضافه‌مصرف قابل توجه در سرگرمی‌ها که بخشی از زمان مطالعه یا استراحت را کاهش داده است.',
      'فعالیت‌های ضروری و بازیابی انرژی (خواب، استراحت، تغذیه و ورزش) جزو سرگرمی‌های محدودشونده نیستند و هیچ نمره منفی ایجاد نمی‌کنند.',
    ],
  },
  {
    id: 'metric-final-daily-score-d',
    codeBadge: 'DS',
    categoryBadge: 'امتیاز کل روزانه',
    categoryKey: 'educational',
    shortSummary: 'امتیاز نهایی عملکرد روزانه حاصل از ترکیب امتیاز آموزشی (۸۰٪) و کنترل سرگرمی‌ها (۲۰٪)',
    title: '۶. امتیاز نهایی روز (DS)',
    concept:
      'نمره کل و نهایی عملکرد روز دانش‌آموز از ۱۰۰ که ۸۰٪ آن به عملکرد آموزشی (E) و ۲۰٪ آن به مدیریت زمان سرگرمی‌های محدودشونده (C) اختصاص دارد.',
    formula: [
      'امتیاز نهایی روز (DS) = (۰.۸۰ × امتیاز آموزشی E) + (۰.۲۰ × شاخص کنترل سرگرمی C)',
    ],
    example: {
      summary:
        'اگر امتیاز آموزشی روز ۸۰ و شاخص کنترل سرگرمی ۷۰ باشد: DS = (۰.۸ × ۸۰) + (۰.۲ × ۷۰) = ۶۴ + ۱۴ = ۷۸٪.',
    },
    interpretation: [
      '۸۵٪ تا ۱۰۰٪: روز فوق‌العاده با اجرای دقیق برنامه درسی و مدیریت عالی سرگرمی‌ها.',
      '۷۰٪ تا ۸۴٪: عملکرد روزانه خوب و متعادل.',
      'کمتر از ۷۰٪: نیازمند بهبود اجرای مطالعه یا کنترل بیشتر زمان سرگرمی.',
      'اگر در روزی هیچ فعالیت سرگرمی ثبت نشده باشد، امتیاز نهایی روز (DS) دقیقاً برابر با امتیاز آموزشی (E) خواهد بود.',
    ],
  },
  {
    id: 'metric-study-share-budget',
    codeBadge: 'S_budget',
    categoryBadge: 'مدیریت ظرف زمانی روز',
    categoryKey: 'budget',
    shortSummary: 'تعیین کل زمان آزاد روز و محاسبه سهم مطالعه، استراحت و سرگرمی از این ظرفیت',
    title: '۷. ظرف زمانی روز و سهم فعالیت‌ها (S_budget)',
    concept:
      'ظرف زمانی روز کل زمان آزاد و در دسترس شما در یک روز (پس از کسر مدرسه و خواب شبانه) است. این شاخص نشان می‌دهد چه درصدی از این ظرفیت کل صرف مطالعه (بنفش)، استراحت و ضروریات (سبز) و سرگرمی‌ها (قرمز) شده است.',
    formula: [
      'سهم مطالعه از ظرف زمانی (S_budget) = (مجموع زمان واقعی مطالعه ÷ کل ظرف زمانی روز) × ۱۰۰',
      'سهم استراحت یا سرگرمی = (مجموع زمان واقعی آن گروه ÷ کل ظرف زمانی روز) × ۱۰۰',
    ],
    example: {
      summary:
        'اگر ظرف زمانی امروز ۶ ساعت (۳۶۰ دقیقه) باشد و ۱۸۰ دقیقه مطالعه واقعی ثبت کنید: (۱۸۰ ÷ ۳۶۰) × ۱۰۰ = ۵۰٪ سهم مطالعه از ظرف زمانی روز.',
    },
    interpretation: [
      'سهم مطالعه ۵۰٪ تا ۷۵٪ از زمان آزاد روز نشان‌دهنده تعادل سالم بین درس، استراحت و تفریح است.',
      'تفاوت با زمان پیش‌بینی مطالعه: «ظرف زمانی روز» کل وقت آزاد امروز برای تمام کارهاست، اما «زمان پیش‌بینی مطالعه» فقط مجموع زمان کارت‌های درسی همان روز است.',
    ],
  },
  {
    id: 'metric-card-time-ratio',
    codeBadge: 'R_card',
    categoryBadge: 'شاخص سطح کارت فعالیت',
    categoryKey: 'educational',
    shortSummary: 'نسبت زمان واقعی صرف‌شده به زمان پیش‌بینی‌شده روی هر کارت فعالیت',
    title: '۸. درصد زمان واقعی نسبت به پیش‌بینی (در سطح هر کارت)',
    concept:
      'این شاخص روی هر کارت فعالیت نشان می‌دهد زمان واقعی صرف‌شده چند درصد از زمان پیش‌بینی‌شده اولیه همان کارت بوده است تا دقت تخمین زمانی خود را در هر مبحث بسنجید.',
    formula: [
      'درصد زمان واقعی نسبت به پیش‌بینی = (زمان واقعی کارت ÷ زمان پیش‌بینی‌شده اولیه کارت) × ۱۰۰',
    ],
    example: {
      summary:
        'اگر برای مطالعه یک فصل ۹۰ دقیقه پیش‌بینی کرده باشید اما ۱۲۰ دقیقه زمان ببرد: (۱۲۰ ÷ ۹۰) × ۱۰۰ = ۱۳۳٪.',
    },
    interpretation: [
      'برخلاف شاخص روزانه تحقق زمان مطالعه (T) که در سقف ۱۰۰٪ متوقف می‌شود، روی هر کارت درصد واقعی (حتی بالای ۱۰۰٪) نمایش داده می‌شود.',
      'این درصد مستقل از وضعیت «تکمیل‌شده» یا «ناقص» بودن مبحث است؛ ممکن است ۱۲۰٪ زمان صرف شود اما مبحث هنوز نیاز به ادامه داشته باشد.',
    ],
  },
  {
    id: 'metric-budget-planned-comparison',
    codeBadge: 'B_plan',
    categoryBadge: 'مدیریت ظرف زمانی روز',
    categoryKey: 'budget',
    shortSummary: 'مقایسه مجموع زمان برنامه‌ریزی‌شده با ظرف زمانی روز و نمایش ظرفیت باقی‌مانده',
    title: '۹. برنامه‌ریزی در برابر ظرفیت',
    concept:
      'این نمودار افقی هنگام چیدن برنامه روزانه نشان می‌دهد از کل ظرف زمانی امروز، چه مقدار را با کارت‌های فعالیت (درسی، استراحت و سرگرمی) پر کرده‌اید و چقدر ظرفیت خالی باقی مانده است.',
    formula: [
      'ظرفیت باقی‌مانده برای برنامه‌ریزی = کل ظرف زمانی روز − مجموع زمان پیش‌بینی‌شده تمام فعالیت‌های روز',
      'در صورت عبور برنامه از ظرفیت: اضافه‌تخصیص برنامه = مجموع زمان پیش‌بینی‌شده − کل ظرف زمانی روز',
    ],
    interpretation: [
      'نگه‌داشتن حدود ۲۰ تا ۴۵ دقیقه ظرفیت آزاد در برنامه روزانه باعث می‌شود در برابر اتفاقات پیش‌بینی‌نشده انعطاف کافی داشته باشید.',
      'در صورت عبور مجموع زمان برنامه‌ها از ظرفیت روز، هشدار اضافه‌تخصیص نمایش داده می‌شود تا برنامه را متعادل کنید.',
    ],
  },
  {
    id: 'metric-budget-actual-comparison',
    codeBadge: 'B_actual',
    categoryBadge: 'مدیریت ظرف زمانی روز',
    categoryKey: 'budget',
    shortSummary: 'مقایسه زمان واقعی مطالعه با ظرف زمانی روز و پشتیبانی از نمایش مازاد مطالعه',
    title: '۱۰. عملکرد واقعی در برابر ظرفیت',
    concept:
      'این نمودار افقی میزان زمان مطالعه واقعی انجام‌شده را در برابر کل ظرف زمانی روز نمایش می‌دهد تا مشخص شود چه بخشی از ظرفیت روز به مطالعه واقعی تبدیل شده است.',
    formula: [
      'ظرفیت باقی‌مانده نسبت به مطالعه واقعی = کل ظرف زمانی روز − مجموع زمان واقعی مطالعه',
      'در صورت عبور مطالعه واقعی از کل ظرفیت: مازاد مطالعه نسبت به ظرفیت = مجموع زمان واقعی مطالعه − کل ظرف زمانی روز',
    ],
    interpretation: [
      'مقایسه هم‌زمان دو نمودار «برنامه‌ریزی در برابر ظرفیت» و «عملکرد واقعی در برابر ظرفیت» در یک نگاه نشان می‌دهد چقدر از برنامه چیده‌شده به مطالعه واقعی تبدیل شده است.',
    ],
  },
  {
    id: 'metric-period-aggregation-comparison',
    codeBadge: 'Δ%',
    categoryBadge: 'گزارش‌های تحلیلی و مقایسه‌ای',
    categoryKey: 'period',
    shortSummary: 'نحوه محاسبه شاخص‌های تجمیعی هفتگی و ماهانه و فرمول مقایسه دو بازه زمانی',
    title: '۱۱. شاخص‌های تجمیعی بازه‌ای و مقایسه دو بازه زمانی',
    concept:
      'در گزارش‌های هفتگی، ماهانه و بازه دلخواه، شاخص‌ها در کل بازه تجمیع می‌شوند و امکان مقایسه مستقیم بازه فعلی با بازه قبلی (تغییر عددی و درصدی) فراهم می‌شود.',
    formula: [
      'میانگین امتیاز نهایی در بازه = مجموع امتیاز نهایی روزهای دارای ثبت عملکرد ÷ تعداد روزهای دارای ثبت عملکرد',
      'تغییر مطلق دو بازه = مقدار بازه جدید − مقدار بازه پایه',
      'درصد تغییر دو بازه = ((مقدار بازه جدید − مقدار بازه پایه) ÷ مقدار بازه پایه) × ۱۰۰',
    ],
    example: {
      summary:
        'اگر زمان مطالعه هفته قبل ۹۰۰ دقیقه و این هفته ۱٬۱۲۵ دقیقه باشد: تغییر مطلق = ۲۲۵+ دقیقه و درصد رشد = (۲۲۵ ÷ ۹۰۰) × ۱۰۰ = ۲۵+٪.',
    },
    interpretation: [
      'روزهای خالی که هنوز هیچ عملکردی در آن‌ها ثبت نشده است، میانگین امتیاز دوره را به شکل کاذب کاهش نمی‌دهند.',
      'کیفیت یادگیری در بازه‌های چندروزه به‌صورت میانگین وزنی کل دقایق مطالعه در سراسر بازه محاسبه می‌شود تا روزهای پرمطالعه وزن واقعی خود را حفظ کنند.',
    ],
  },
  {
    id: 'metric-experience-points-xp',
    codeBadge: 'XP',
    categoryBadge: 'سیستم امتیازدهی و انگیزش',
    categoryKey: 'educational',
    shortSummary: 'مفهوم امتیاز تجربه (XP)، ماهیت تجمیعی و تفاوت آن با نمره روزانه',
    title: '۱۲. امتیاز تجربه (XP)',
    concept:
      'امتیاز تجربه (XP) پاداش عددی و ماندگاری است که به ازای هر تلاش واقعی (تکمیل فعالیت‌ها، زمان مطالعه، حل تست و کیفیت یادگیری) دریافت می‌کنید. برخلاف امتیاز روزانه که هر روز بین ۰ تا ۱۰۰ سنجیده می‌شود، امتیاز XP تجمیعی است، هرگز صفر یا منفی نمی‌شود و مبنای ارتقای سطح دائمی شماست.',
    interpretation: [
      'در منوی عملکرد، هم «XP کسب‌شده در بازه انتخابی (مثلاً امروز)» و هم «کل XP تجمیعی از ابتدای استفاده» (که سطح دائمی شما را می‌سازد) نمایش داده می‌شود.',
      'حتی در روزهایی که نتوانید تمام برنامه را کامل کنید، به ازای فعالیت‌های ناقص، دقایق مطالعه و تست‌های حل‌شده امتیاز XP دریافت می‌کنید.',
    ],
  },
  {
    id: 'metric-xp-calculation-formula',
    codeBadge: 'XP_calc',
    categoryBadge: 'سیستم امتیازدهی و انگیزش',
    categoryKey: 'educational',
    shortSummary: 'فرمول ۵ مؤلفه‌ای محاسبه امتیاز عملکرد (XP) و ضرایب هر بخش در آکاردئون ریزمحاسبات',
    title: '۱۳. فرمول و اجزای محاسبه امتیاز عملکرد (XP)',
    concept:
      'امتیاز XP از مجموع ۵ مؤلفه شفاف محاسبه می‌شود و جزئیات کامل آن در آکاردئون «ریز محاسبات XP» در منوی عملکرد قابل مشاهده است.',
    formula: [
      '۱. امتیاز فعالیت‌های کامل = تعداد فعالیت‌های تکمیل‌شده × ۵۰',
      '۲. امتیاز فعالیت‌های ناقص = تعداد فعالیت‌های ناقص × ۲۵',
      '۳. امتیاز زمان مطالعه = جزء صحیح (مجموع دقایق مطالعه واقعی درسی ÷ ۵)  [هر ۵ دقیقه = ۱ امتیاز]',
      '۴. امتیاز حل تست و تمرین = مجموع تعداد تست و تمرین حل‌شده × ۲',
      '۵. پاداش کیفیت یادگیری = مجموع (نمره کیفیت هر فعالیت درسی از ۱۰ × ۲)  [حداکثر ۲۰ امتیاز به ازای هر نوبت مطالعه]',
      'مجموع امتیاز عملکرد (XP) = جمع هر ۵ مؤلفه بالا',
    ],
    example: {
      summary:
        'با ثبت ۳ فعالیت کامل (۱۵۰)، ۱ فعالیت ناقص (۲۵)، ۱۲۴ دقیقه مطالعه (۲۴)، ۳۵ تست (۷۰) و دو درس با کیفیت ۸ و ۹ (۳۴): مجموع XP روز برابر با ۳۰۳ امتیاز می‌شود.',
    },
    interpretation: [
      'پاداش کیفیت یادگیری فقط به فعالیت‌های درسی که زمان مطالعه واقعی آن‌ها بیشتر از صفر دقیقه باشد تعلق می‌گیرد.',
      'فعالیت‌های غیردرسی در صورت انجام، امتیاز پایه تکمیل فعالیت (۵۰ یا ۲۵ امتیاز) را دریافت می‌کنند اما امتیاز زمان مطالعه، تست و کیفیت ویژه فعالیت‌های درسی است.',
    ],
  },
  {
    id: 'metric-level-progression-system',
    codeBadge: 'LEVEL',
    categoryBadge: 'سیستم سطح‌بندی و پیشرفت',
    categoryKey: 'educational',
    shortSummary: 'ساختار پله‌های سطح دائمی دانش‌آموز، جدول سطوح، عناوین رتبه و امتیاز باقی‌مانده تا سطح بعد',
    title: '۱۴. سیستم سطح‌بندی و پیشرفت (Level System)',
    concept:
      'کل امتیازهای XP تجمیعی شما از ابتدای استفاده از برنامه، سطح دائمی (Level) و عنوان رتبه شما را تعیین می‌کند. با کسب امتیاز بیشتر، نوار پیشرفت پله فعلی پر شده و به سطح‌های بالاتر صعود می‌کنید.',
    formula: [
      'ظرفیت امتیاز هر پله سطح = ۲۵۰ + ((شماره سطح فعلی − ۱) × ۱۵۰)',
      'امتیاز طی‌شده در سطح فعلی = کل امتیاز تجمیعی − مرز امتیاز شروع سطح فعلی',
      'امتیاز باقی‌مانده تا سطح بعد = مرز امتیاز ورود به سطح بعدی − کل امتیاز تجمیعی',
      'درصد پیشرفت در پله فعلی = (امتیاز طی‌شده در سطح فعلی ÷ ظرفیت امتیاز پله فعلی) × ۱۰۰',
    ],
    example: {
      summary:
        'اگر کل امتیاز تجمیعی شما ۱٬۴۲۰ XP باشد، در سطح ۴ (بازه ۱٬۲۰۰ تا ۱٬۹۰۰ با ظرفیت پله ۷۰۰ امتیاز) قرار دارید؛ ۲۲۰ امتیاز از این پله (۳۱٪) را طی کرده‌اید و ۴۸۰ امتیاز تا سطح ۵ فاصله دارید.',
      tableHeaders: ['شماره و عنوان سطح', 'حداقل XP کل برای ورود', 'محدوده XP کل و ظرفیت پله', 'جایگاه و مفهوم سطح'],
      tableRows: [
        {
          col1: 'سطح ۱: نوآموز هدفمند 🌱',
          col2: '۰ XP',
          col3: '۰ تا ۲۵۰ XP (پله ۲۵۰ امتیازی)',
          col4: 'آغاز مسیر برنامه‌ریزی منظم و ثبت اولین فعالیت‌ها',
        },
        {
          col1: 'سطح ۲: کاوشگر دانش 🧭',
          col2: '۲۵۰ XP',
          col3: '۲۵۰ تا ۶۵۰ XP (پله ۴۰۰ امتیازی)',
          col4: 'شکل‌گیری عادت ثبت عملکرد واقعی و مطالعه روزانه',
        },
        {
          col1: 'سطح ۳: برنامه‌ریز پرتلاش ⚡',
          col2: '۶۵۰ XP',
          col3: '۶۵۰ تا ۱٬۲۰۰ XP (پله ۵۵۰ امتیازی)',
          col4: 'تثبیت نظم مطالعاتی، حل تمرین مستمر و رشد ساعت مطالعه',
        },
        {
          col1: 'سطح ۴: ستاره پیوستگی 🌟',
          col2: '۱٬۲۰۰ XP',
          col3: '۱٬۲۰۰ تا ۱٬۹۰۰ XP (پله ۷۰۰ امتیازی)',
          col4: 'پایداری و استمرار چندروزه و چندهفته‌ای در اجرای برنامه‌ها',
        },
        {
          col1: 'سطح ۵: قهرمان تمرکز 🔥',
          col2: '۱٬۹۰۰ XP',
          col3: '۱٬۹۰۰ تا ۲٬۷۵۰ XP (پله ۸۵۰ امتیازی)',
          col4: 'تسلط بالا بر کیفیت مطالعه، تمرکز عمیق و حجم بالای تست‌زنی',
        },
        {
          col1: 'سطح ۶: معمار موفقیت 💎',
          col2: '۲٬۷۵۰ XP',
          col3: '۲٬۷۵۰ تا ۳٬۷۵۰ XP (پله ۱٬۰۰۰ امتیازی)',
          col4: 'مدیریت حرفه‌ای زمان، تعادل عالی بین دروس و پیشرفت مستمر',
        },
        {
          col1: 'سطح ۷ به بالا: استاد برنامه‌ریزی و نخبگی 👑',
          col2: '۳٬۷۵۰+ XP',
          col3: '۳٬۷۵۰+ XP (افزایش ۱۵۰ امتیازی هر پله)',
          col4: 'بالاترین درجه تسلط، نظم شخصی و نخبگی در اجرای برنامه‌های تحصیلی',
        },
      ],
    },
    interpretation: [
      'سطح دائمی همیشه از روی کل تاریخچه فعالیت‌های شما محاسبه می‌شود و با تغییر روز یا تغییر فیلتر تاریخ گزارش‌ها هرگز کاهش نمی‌یابد.',
    ],
  },
  {
    id: 'metric-xp-daily-velocity',
    codeBadge: 'XP_vel',
    categoryBadge: 'تحلیل روند XP و سطح‌بندی',
    categoryKey: 'educational',
    shortSummary: 'میانگین وزنی و پایدارشده امتیاز XP روزانه در بازه‌های ۷، ۱۴ و ۳۰ روزه',
    title: '۱۵. سرعت روزانه کسب XP (XP_vel)',
    concept:
      'این شاخص ریتم واقعی و مستمر کسب امتیاز شما در روز را نشان می‌دهد. برای جلوگیری از خطای ناشی از نوسان‌های شدید تک‌روزه یا روزهای بدون برنامه، سرعت مؤثر ۷ روزه از ترکیب وزنی میانگین تقویمی، میانگین روزهای دارای برنامه و میانگین پیراسته (حذف کمترین و بیشترین روز هفته) محاسبه می‌شود.',
    formula: [
      'میانگین تقویمی ۷ روزه = مجموع XP هفت روز اخیر ÷ ۷  (مشابه برای ۱۴ و ۳۰ روز اخیر)',
      'میانگین روزهای پاسخگو = مجموع XP هفت روز اخیر ÷ تعداد روزهای فعال یا دارای برنامه در ۷ روز اخیر',
      'میانگین پیراسته ۵ روز میانی = (مجموع XP هفت روز اخیر − بیشترین روز − کمترین روز) ÷ ۵',
      'سرعت روزانه مؤثر (XP_vel) = (۰.۴۵ × میانگین تقویمی ۷ روزه) + (۰.۳۵ × میانگین روزهای پاسخگو) + (۰.۲۰ × میانگین پیراسته)',
    ],
    example: {
      summary:
        'اگر در ۷ روز اخیر مجموعاً ۱٬۴۰۰ XP در ۶ روز فعال کسب کرده باشید (با میانگین تقویمی ۲۰۰، میانگین روزهای پاسخگو ۲۳۳ و میانگین پیراسته ۲۰۰): سرعت روزانه مؤثر برابر با ۲۱۲ XP در روز خواهد بود.',
    },
    interpretation: [
      '۲۰۰+ امتیاز در روز: ریتم پیشرفت بسیار قوی و مطالعه منظم روزانه.',
      '۱۰۰ تا ۱۹۹ امتیاز در روز: ریتم استاندارد و پایدار.',
      'کمتر از ۱۰۰ امتیاز در روز: نیازمند افزایش پیوستگی روزانه در ثبت و اجرای فعالیت‌ها.',
    ],
  },
  {
    id: 'metric-xp-weekly-trend',
    codeBadge: 'XP_trend',
    categoryBadge: 'تحلیل روند XP و سطح‌بندی',
    categoryKey: 'period',
    shortSummary: 'مقایسه سرعت کسب XP در ۷ روز جاری نسبت به ۷ روز قبلی به همراه وضعیت روند',
    title: '۱۶. روند سرعت پیشرفت هفتگی (XP_trend)',
    concept:
      'این شاخص نرخ روزانه کسب امتیاز در ۷ روز جاری را با ۷ روز قبلی (هفته گذشته) مقایسه می‌کند تا مشخص شود شتاب پیشرفت شما صعودی، پایدار یا نزولی بوده است.',
    formula: [
      'نرخ روزانه قابل مقایسه هر هفته = مجموع XP همان هفته ÷ حداکثرِ (۳ و تعداد روزهای پاسخگوی آن هفته)',
      'درصد تغییر روند هفتگی = ((نرخ هفته جاری − نرخ هفته قبل) ÷ نرخ هفته قبل) × ۱۰۰',
    ],
    interpretation: [
      'شروع پرقدرت و صعودی 🚀: زمانی که در هفته قبل فعالیتی ثبت نشده و در این هفته فعالیت مؤثر آغاز شده است.',
      'صعودی (۱۲+٪ یا بیشتر): افزایش محسوس سرعت پیشرفت نسبت به هفته گذشته.',
      'پایدار و متعادل (بین ۱۴-٪ تا ۱۱+٪): حفظ ریتم منظم و باثبات هفتگی.',
      'کاهش ریتم (۱۵-٪ یا کمتر): افت سرعت کسب امتیاز نسبت به هفته گذشته و نیاز به بازیابی نظم روزانه.',
    ],
  },
  {
    id: 'metric-xp-educational-alignment',
    codeBadge: 'XP_align',
    categoryBadge: 'تحلیل روند XP و سطح‌بندی',
    categoryKey: 'educational',
    shortSummary: 'راستی‌آزمایی هم‌راستایی امتیاز XP کسب‌شده با شاخص واقعی عملکرد آموزشی (E) و کیفیت یادگیری',
    title: '۱۷. هم‌سنجی XP با رشد واقعی تحصیلی (XP_align)',
    concept:
      'این مکانیزم بررسی می‌کند که آیا امتیاز XP کسب‌شده در هفته جاری واقعاً حاصل مطالعه باکیفیت، حل تست و اجرای برنامه‌های درسی بوده است یا خیر، و متناسب با آن بازخورد انگیزشی و غیرتنبیهی ارائه می‌دهد.',
    formula: [
      'سهم امتیاز آموزشی = (امتیاز XP حاصل از مطالعه، تست و کیفیت یادگیری در ۷ روز اخیر ÷ کل XP هفت روز اخیر) × ۱۰۰',
      'ارزیابی هم‌زمان ۴ معیار در ۷ روز اخیر: میانگین امتیاز آموزشی (E ≥ ۶۸)، میانگین کیفیت یادگیری (حداقل ۶.۵ از ۱۰)، سهم امتیاز آموزشی (حداقل ۵۵٪) و تعداد روزهای فعال (حداقل ۴ روز).',
    ],
    interpretation: [
      'رشد اصیل و هم‌راستای XP با پیشرفت واقعی تحصیلی: بهترین وضعیت تفسیری؛ نشان‌دهنده آن است که افزایش XP کاملاً با کیفیت بالای یادگیری، امتیاز آموزشی مطلوب و استمرار مطالعه همراه بوده است.',
      'هشدار رشد ظاهری XP بدون عمق کافی یادگیری: زمانی که امتیاز XP کسب شده اما میانگین کیفیت یادگیری کمتر از ۶.۵، امتیاز آموزشی کمتر از ۶۸ یا سهم فعالیت‌های درسی کمتر از ۵۵٪ بوده است.',
      'کیفیت یادگیری عالی، نیازمند پیوستگی روزانه بیشتر: زمانی که کیفیت مطالعه بالاست اما تعداد روزهای فعال هفته کمتر از ۴ روز بوده است.',
      'سیاست تشویقی بدون جریمه: در هیچ حالتی امتیاز XP یا سطح از شما کسر نمی‌شود؛ بلکه در صورت افت ریتم، یک «چالش احیای ریتم» برای جبران پیشنهاد می‌گردد.',
    ],
  },
  {
    id: 'metric-next-level-time-prediction',
    codeBadge: 'T_next_level',
    categoryBadge: 'تحلیل روند XP و سطح‌بندی',
    categoryKey: 'educational',
    shortSummary: 'تخمین تعداد روزهای لازم برای صعود به سطح بعدی بر اساس امتیاز باقی‌مانده و سرعت فعلی',
    title: '۱۸. پیش‌بینی زمان صعود به سطح بعد (T_next_level)',
    concept:
      'این شاخص بر اساس امتیاز باقی‌مانده تا سطح بعدی و سرعت روزانه فعلی شما تخمین می‌زند که در صورت حفظ همین ریتم تلاش، ظرف چند روز آینده به سطح (Level) بعدی صعود خواهید کرد.',
    formula: [
      'سرعت مبنای پیش‌بینی = بیشترین مقدار بین (سرعت مؤثر ۷ روزه، سرعت تقویمی ۱۴ روزه، و ۷۵٪ امتیاز امروز)',
      'تعداد روزهای تخمینی تا سطح بعد = گرد کردن به بالا (امتیاز باقی‌مانده تا سطح بعد ÷ سرعت مبنای پیش‌بینی)',
    ],
    example: {
      summary:
        'اگر ۴۸۰ امتیاز تا سطح بعدی فاصله داشته باشید و سرعت مبنای شما ۲۱۲ امتیاز در روز باشد: ۴۸۰ ÷ ۲۱۲ = ۲.۲۶ که به بالا گرد شده و «حدود ۳ روز تا سطح بعد» نمایش داده می‌شود.',
    },
    interpretation: [
      'این عدد یک تخمین پویا بر اساس حفظ ریتم فعلی است؛ با افزایش تلاش روزانه کوتاه‌تر می‌شود.',
      'اگر سرعت اخیر کمتر از ۱۵ امتیاز در روز باشد، به‌جای نمایش اعداد طولانی غیرواقعی، پیام «نیازمند حداقل ۱ روز فعالیت برای پیش‌بینی» نمایش داده می‌شود.',
    ],
  },
];

function getMetricIconConfig(metricId: string): {
  Icon: React.ComponentType<{ className?: string }>;
  iconBoxClass: string;
} {
  switch (metricId) {
    case 'metric-study-time-t':
      return {
        Icon: Clock,
        iconBoxClass:
          'bg-gradient-to-br from-indigo-500/15 to-blue-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      };
    case 'metric-exercises-q':
      return {
        Icon: FileCheck2,
        iconBoxClass:
          'bg-gradient-to-br from-blue-500/15 to-sky-500/10 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      };
    case 'metric-learning-quality-k':
      return {
        Icon: GraduationCap,
        iconBoxClass:
          'bg-gradient-to-br from-purple-500/15 to-fuchsia-500/10 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      };
    case 'metric-educational-composite-e':
      return {
        Icon: Award,
        iconBoxClass:
          'bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-800',
      };
    case 'metric-restricted-control-c':
      return {
        Icon: Gamepad2,
        iconBoxClass:
          'bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    case 'metric-final-daily-score-d':
      return {
        Icon: Trophy,
        iconBoxClass:
          'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    case 'metric-study-share-budget':
      return {
        Icon: Timer,
        iconBoxClass:
          'bg-gradient-to-br from-teal-500/15 to-emerald-500/10 text-teal-600 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      };
    case 'metric-card-time-ratio':
      return {
        Icon: Gauge,
        iconBoxClass:
          'bg-gradient-to-br from-cyan-500/15 to-sky-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      };
    case 'metric-budget-planned-comparison':
      return {
        Icon: Scale,
        iconBoxClass:
          'bg-gradient-to-br from-sky-500/15 to-indigo-500/10 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      };
    case 'metric-budget-actual-comparison':
      return {
        Icon: Layers,
        iconBoxClass:
          'bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    case 'metric-period-aggregation-comparison':
      return {
        Icon: GitCompare,
        iconBoxClass:
          'bg-gradient-to-br from-purple-500/15 to-indigo-500/10 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      };
    case 'metric-experience-points-xp':
      return {
        Icon: Flame,
        iconBoxClass:
          'bg-gradient-to-br from-orange-500/15 to-amber-500/10 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      };
    case 'metric-xp-calculation-formula':
      return {
        Icon: Calculator,
        iconBoxClass:
          'bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      };
    case 'metric-level-progression-system':
      return {
        Icon: Crown,
        iconBoxClass:
          'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      };
    case 'metric-xp-daily-velocity':
      return {
        Icon: Gauge,
        iconBoxClass:
          'bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      };
    case 'metric-xp-weekly-trend':
      return {
        Icon: TrendingUp,
        iconBoxClass:
          'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    case 'metric-xp-educational-alignment':
      return {
        Icon: ShieldAlert,
        iconBoxClass:
          'bg-gradient-to-br from-violet-500/20 to-purple-500/10 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-800',
      };
    case 'metric-next-level-time-prediction':
      return {
        Icon: Compass,
        iconBoxClass:
          'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    default:
      return {
        Icon: Award,
        iconBoxClass:
          'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      };
  }
}

export type GuideTabKey = 'definitions' | 'user_guide';

export interface MetricsDefinitionsViewProps {
  initialTab?: GuideTabKey;
}

export const MetricsDefinitionsView: React.FC<MetricsDefinitionsViewProps> = ({
  initialTab = 'definitions',
}) => {
  const [activeGuideTab, setActiveGuideTab] = useState<GuideTabKey>(initialTab);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'educational' | 'control' | 'budget' | 'period'
  >('all');

  const filteredMetrics = useMemo(() => {
    return METRICS_DEFINITIONS_DATA.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryKey !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.codeBadge.toLowerCase().includes(q) ||
        item.shortSummary.toLowerCase().includes(q) ||
        item.concept.toLowerCase().includes(q) ||
        (item.formula && item.formula.some((f) => f.toLowerCase().includes(q)))
      );
    });
  }, [searchQuery, selectedCategory]);

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const item of filteredMetrics) {
      next[item.id] = true;
    }
    setOpenIds(next);
  };

  const collapseAll = () => {
    setOpenIds({});
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          SECTION 1: STREAMLINED GUIDE HEADER
          1. Main Title: «مرجع رسمی مستندات آموزشی و راهنمای سامانه Martia Planner»
          2. Current App Version
          3. Main Tabs: «تعاریف» and «راهنما» (No intermediate title or description)
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-900 via-indigo-800 to-violet-900 text-white p-5 sm:p-6 shadow-lg shadow-indigo-950/15">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 w-64 h-64 rounded-full bg-emerald-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="inline-flex items-center gap-2 text-sm sm:text-base lg:text-lg font-extrabold text-white tracking-tight">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>مرجع رسمی مستندات آموزشی و راهنمای سامانه Martia Planner</span>
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-white/10 text-indigo-100 border border-white/15 tabular-nums">
              <span>نسخه {toPersianDigits(APP_VERSION)}</span>
            </span>
          </div>

          {/* Direct Main Tabs: «تعاریف» and «راهنما» */}
          <div className="grid grid-cols-2 sm:inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/35 backdrop-blur-md border border-white/15 shrink-0">
            <button
              type="button"
              onClick={() => setActiveGuideTab('definitions')}
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeGuideTab === 'definitions'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calculator className="w-4 h-4 shrink-0" />
              <span>تعاریف</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveGuideTab('user_guide')}
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeGuideTab === 'user_guide'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>راهنما</span>
            </button>
          </div>
        </div>
      </div>

      {activeGuideTab === 'definitions' ? (
        <>
          {/* =====================================================================
              QUICK OVERVIEW FORMULA FLOW STRIP
          ===================================================================== */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-3 space-y-1">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  ۱. مؤلفه‌های پایه آموزشی
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white" dir="ltr">
                  T (40%) + Q (30%) + L (30%)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  زمان مطالعه، تست و کیفیت یادگیری وزنی
                </div>
              </div>

              <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-3 space-y-1">
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  ۲. امتیاز مستقیم آموزشی (E)
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white" dir="ltr">
                  E = 0.4×T + 0.3×Q + 0.3×L
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  با نرمال‌سازی خودکار در صورت نبود هدف تست
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-3 space-y-1">
                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  ۳. کنترل سرگرمی‌ها (C)
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  نسبت سقف مجاز به زمان واقعی
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  سنجش رعایت سقف مجاز موبایل و بازی
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3 space-y-1">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  ۴. امتیاز نهایی روز (DS)
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white" dir="ltr">
                  DS = (0.8 × E) + (0.2 × C)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ۸۰٪ عملکرد آموزشی + ۲۰٪ کنترل سرگرمی
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================================
              SEARCH, CATEGORY FILTER & EXPAND/COLLAPSE BAR
          ===================================================================== */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'all', label: 'همه شاخص‌ها (۱۸ مورد)' },
                { key: 'educational', label: 'آموزشی، XP و سطح‌بندی' },
                { key: 'control', label: 'کنترل سرگرمی (C)' },
                { key: 'budget', label: 'ظرف زمانی روز' },
                { key: 'period', label: 'گزارش‌های بازه‌ای و روند' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedCategory === tab.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی شاخص یا فرمول..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={expandAll}
                className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-2 text-xs font-extrabold transition-colors cursor-pointer shrink-0"
              >
                باز کردن همه
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-3 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                بستن همه
              </button>
            </div>
          </div>

          {/* =====================================================================
              SECTION 2: CONCISE, SECURE & NON-REPETITIVE ACCORDIONS
              1. تعریف و مفهوم شاخص
              2. فرمول و مبنای محاسبه (در صورت نیاز)
              3. مثال کاربردی (در صورت نیاز)
              4. تفسیر نتیجه و کاربرد
          ===================================================================== */}
          <div className="space-y-3">
            {filteredMetrics.map((metric) => {
              const isOpen = Boolean(openIds[metric.id]);
              const { Icon: MetricIcon, iconBoxClass } = getMetricIconConfig(metric.id);

              const badgeColorClass =
                metric.categoryKey === 'educational'
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : metric.categoryKey === 'control'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : metric.categoryKey === 'budget'
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';

              return (
                <div
                  key={metric.id}
                  className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(metric.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-right hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs ${iconBoxClass}`}
                      >
                        <MetricIcon className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                            {metric.title}
                          </h2>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${badgeColorClass}`}
                          >
                            {metric.categoryBadge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {metric.shortSummary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {isOpen ? 'بستن' : 'مشاهده جزئیات'}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-6 pb-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs sm:text-sm leading-relaxed">
                      {/* ۱. تعریف و مفهوم شاخص */}
                      <div className="rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-900/50 p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                          <BookOpen className="w-4 h-4 shrink-0" />
                          <span>تعریف و مفهوم شاخص</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                          {metric.concept}
                        </p>
                      </div>

                      {/* ۲. فرمول یا مبنای محاسبه */}
                      {metric.formula && metric.formula.length > 0 && (
                        <div className="rounded-2xl bg-slate-900 dark:bg-slate-950 text-white p-4 space-y-2 border border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                            <Calculator className="w-4 h-4 shrink-0" />
                            <span>فرمول و مبنای محاسبه</span>
                          </div>
                          <div className="space-y-1.5">
                            {metric.formula.map((fLine, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl bg-white/10 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-300 leading-relaxed"
                              >
                                {fLine}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ۳. مثال کاربردی (در صورت وجود) */}
                      {metric.example && (
                        <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>مثال کاربردی</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                            {metric.example.summary}
                          </p>

                          {metric.example.tableHeaders && metric.example.tableRows && (
                            <div className="overflow-x-auto rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-white dark:bg-slate-900">
                              <table className="w-full text-right text-xs">
                                <thead className="bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-extrabold">
                                  <tr>
                                    {metric.example.tableHeaders.map((th, i) => (
                                      <th key={i} className="px-3.5 py-2.5">
                                        {th}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                                  {metric.example.tableRows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      <td className="px-3.5 py-2 font-bold text-slate-900 dark:text-white">
                                        {row.col1}
                                      </td>
                                      <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300">
                                        {row.col2}
                                      </td>
                                      <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300">
                                        {row.col3}
                                      </td>
                                      <td className="px-3.5 py-2 font-extrabold text-indigo-600 dark:text-indigo-400">
                                        {row.col4}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ۴. تفسیر نتیجه و کاربرد */}
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>تفسیر نتیجه و کاربرد برای کاربر</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
                          {metric.interpretation.map((interp, idx) => (
                            <li key={idx}>{interp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* =====================================================================
           TAB 2: راهنما (Practical Step-by-Step User Guide)
        ===================================================================== */
        <div className="space-y-6">
          {/* Quick Roadmap Strip: Operational vs Observational Sections */}
          <div className="rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-l from-indigo-50/80 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-black text-slate-900 dark:text-white">
              <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>نقشه راه سریع استفاده از برنامه (از کجا شروع کنم؟)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              اپلیکیشن به دو دسته بخش‌های <strong>«عملیاتی (ثبت اطلاعات)»</strong> و بخش‌های{' '}
              <strong>«مشاهده‌ای و تحلیلی (کارنامه‌ها)»</strong> تقسیم می‌شود. شما فقط در بخش‌های عملیاتی فعالیت‌های خود را وارد می‌کنید و تمام نمودارها، امتیازها و گزارش‌ها به‌طور خودکار ساخته می‌شوند:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/70 dark:border-slate-700 p-4 space-y-1.5">
                <div className="font-black text-indigo-600 dark:text-indigo-400">
                  گام اول: تعریف درس‌ها (یک‌بار)
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  از منوی <strong>«سایر ← ایجاد درس»</strong>، کتاب‌های درسی و فصل‌های خود را بررسی یا اضافه کنید.
                </p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200/70 dark:border-slate-700 p-4 space-y-1.5">
                <div className="font-black text-emerald-600 dark:text-emerald-400">
                  گام دوم: برنامه‌ریزی و ثبت عملکرد (روزانه)
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  در منوی <strong>«برنامه‌ریزی»</strong>، برنامه امروز یا فردا را بچینید و پس از انجام هر فعالیت، عملکرد واقعی آن را ثبت کنید.
                </p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-800/90 border border-purple-200/70 dark:border-slate-700 p-4 space-y-1.5">
                <div className="font-black text-purple-600 dark:text-purple-400">
                  گام سوم: مشاهده کارنامه در «عملکرد» و «دروس»
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  در منوهای <strong>«عملکرد»</strong> و <strong>«دروس»</strong>، سطح خود، نمودارهای پیشرفت و توصیه‌های مشاوره‌ای را ببینید.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Operational Sections Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ۱. راهنمای بخش برنامه‌ریزی (مهم‌ترین بخش عملیاتی) */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      ۱. منوی «برنامه‌ریزی» (بخش اصلی ثبت فعالیت‌ها و عملکرد روزانه)
                    </h2>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      بخش عملیاتی و ثبت اطلاعات
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تمام برنامه‌های مطالعه، استراحت، سرگرمی و گزارش اجرای واقعی آن‌ها در این بخش ثبت می‌شوند.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 p-4 space-y-2">
                  <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>الف) تنظیم ظرف زمانی و اهداف روز</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
                    <li>
                      در بالای صفحه برنامه‌ریزی، ابتدا با کلیک روی <strong>«ظرف زمانی روز»</strong> مشخص کنید امروز در مجموع چند ساعت وقت آزاد برای برنامه‌ریزی دارید (مثلاً ۶ ساعت).
                    </li>
                    <li>
                      در بخش <strong>«اهداف مطالعاتی عددی روزانه»</strong> می‌توانید هدف کل ساعت مطالعه یا تعداد تست روز خود را تعیین کنید.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 p-4 space-y-2">
                  <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>ب) نحوه تعریف و ثبت فعالیت جدید</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
                    <li>
                      روی دکمه زردرنگ <strong>«ثبت فعالیت جدید»</strong> کلیک کنید.
                    </li>
                    <li>
                      <strong>دسته‌بندی فعالیت</strong> را انتخاب کنید (اگر مطالعه درسی است، نام درس، فصل، نوع مطالعه مثل روخوانی/تست‌زنی و هدف تعداد تست را وارد کنید).
                    </li>
                    <li>
                      <strong>زمان پیش‌بینی‌شده (دقیقه)</strong> و اولویت فعالیت را مشخص کرده و دکمه ذخیره را بزنید.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 p-4 space-y-2">
                  <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>ج) ثبت عملکرد واقعی پس از انجام</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
                    <li>
                      پس از انجام هر فعالیت، روی کارت همان فعالیت یا دکمه <strong>«ثبت عملکرد»</strong> کلیک کنید.
                    </li>
                    <li>
                      <strong>وضعیت انجام</strong> (تکمیل‌شده یا ناقص)، <strong>زمان واقعی صرف‌شده (دقیقه)</strong>، <strong>تعداد تست/تمرین حل‌شده</strong> و <strong>نمره کیفیت یادگیری (از ۰ تا ۱۰)</strong> را وارد کنید تا امتیاز و XP شما محاسبه شود.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ۲. راهنمای بخش ایجاد درس (در منوی سایر) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      ۲. بخش «ایجاد درس» (در زیرمنوی سایر)
                    </h2>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      بخش عملیاتی
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تعریف کتاب‌های درسی، تعیین پایه تحصیلی و ثبت فصل‌های هر درس
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  با کلیک روی منوی <strong>«سایر»</strong> و انتخاب گزینه <strong>«ایجاد درس»</strong> وارد این صفحه می‌شوید.
                </li>
                <li>
                  برای افزودن درس جدید، نام درس (مثلاً ریاضی، علوم، زبان)، پایه تحصیلی (هفتم، هشتم یا نهم) و رنگ دلخواه کارت درس را انتخاب کرده و آن را ثبت کنید.
                </li>
                <li>
                  در پایین هر کارت درس، می‌توانید <strong>فصل‌ها، بخش‌ها یا درس‌نامه‌های کتاب</strong> را اضافه کنید تا هنگام ثبت برنامه روزانه، به سرعت از لیست انتخاب شوند.
                </li>
              </ul>
            </div>

            {/* ۳. راهنمای بخش تنظیمات (در منوی سایر) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      ۳. بخش «تنظیمات» (در زیرمنوی سایر)
                    </h2>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      پیکربندی و پشتیبان‌گیری
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مدیریت دسته‌بندی فعالیت‌ها، انواع مطالعه و پشتیبان‌گیری اطلاعات
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  در این بخش می‌توانید دسته‌بندی‌های فعالیت را در ۳ گروه <strong>«آموزشی و مطالعه»</strong>، <strong>«تفریحی محدودشونده (مانند موبایل و بازی)»</strong> و <strong>«ضروری و استراحت»</strong> تعریف یا ویرایش کنید.
                </li>
                <li>
                  امکان فعال‌سازی <strong>یادآور هوشمند مطالعه</strong>، تهیه <strong>نسخه پشتیبان (Backup)</strong> و بازیابی ایمن اطلاعات (Restore) نیز در این صفحه قرار دارد.
                </li>
              </ul>
            </div>

            {/* ۴. معرفی منوی «عملکرد» (بخش مشاهده‌ای) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      ۴. منوی «عملکرد» (مشاهده کارنامه و تحلیل وضعیت)
                    </h2>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      بخش مشاهده‌ای و تحلیلی
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    بررسی خودکار شاخص‌ها، سطح دائمی، نمودارها و توصیه‌های مشاوره‌ای
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                در منوی <strong>«عملکرد»</strong> نیازی به ثبت دستی اطلاعات ندارید؛ این بخش به صورت خودکار بر اساس فعالیت‌هایی که در منوی «برنامه‌ریزی» ثبت کرده‌اید، <strong>سطح دائمی (Level) و امتیاز تجربه (XP)</strong>، <strong>نمودارهای تحلیلی روزانه، هفتگی، ماهانه و بازه دلخواه</strong>، <strong>کارت توصیه‌های هوشمند مشاوره‌ای</strong> و <strong>گزارش تحلیلی هفتگی</strong> را به شما نمایش می‌دهد.
              </p>
            </div>

            {/* ۵. معرفی منوی «دروس» (بخش مشاهده‌ای) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-3.5">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      ۵. منوی «دروس» (گزارش‌ها و مقایسه عملکرد کتاب‌ها)
                    </h2>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      بخش مشاهده‌ای و تحلیلی
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مقایسه دیداری دروس، کارنامه اختصاصی هر کتاب و تحلیل تفریحات
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                منوی <strong>«دروس»</strong> برای بررسی تخصصی عملکرد شما در هر کتاب درسی طراحی شده است. در این بخش می‌توانید <strong>مقایسه دیداری پیش‌بینی و عملکرد واقعی در هر درس</strong>، نمودارهای مقایسه‌ای بین درس‌های مختلف، کارنامه فصل‌به‌فصل هر درس و همچنین گزارش زمان مصرفی فعالیت‌های تفریحی را در بازه‌های زمانی مختلف مشاهده و بررسی کنید.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
