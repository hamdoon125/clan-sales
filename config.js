// ⚠️ غيّر أول سطرين بالقيم اللي هتلاقيها في Supabase > Project Settings > API
window.CLAN_CONFIG = {
  SUPABASE_URL: 'https://finvzwgsizaznkursxxn.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbnZ6d2dzaXphem5rdXJzeHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxMTczMDcsImV4cCI6MjExMDY5MzMwN30.cuUrbT3IvylFyFl8rnG981cq--Oo17arfZpE-4Ydt-w',

  SUPPORT_PHONE: '01550779470',   // رقم المسوقين
  CLIENTS_PHONE: '01556639413',   // رقم العملا
  SITE_URL: 'https://clanagency.it.com/',

  // الحماية من البوتات (Cloudflare Turnstile): حط هنا الـ Site Key (العام، مش السري)
  // وسيبه فاضي '' لو الـ CAPTCHA مقفولة في Supabase
  TURNSTILE_SITE_KEY: '',

  // ما تغيّرش السطر ده بعد ما المسوقين يبدأوا يسجلوا
  EMAIL_DOMAIN: 'sales.clanagency.it.com'
};
