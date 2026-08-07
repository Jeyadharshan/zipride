import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ta" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Auth
    nav_home: "Home",
    nav_rides: "My Rides",
    nav_wallet: "Wallet",
    nav_profile: "Profile",
    nav_driver: "Driver Portal",
    nav_admin: "Admin",
    nav_login: "Sign In",
    nav_register: "Register",
    sign_in_title: "Welcome back to ZipRide",
    sign_in_sub: "Sign in to manage your rides, wallet, and account",
    google_login: "Sign in with Google",
    phone_login: "Sign in with Phone Number",
    enter_phone: "Enter Phone Number (+91)",
    send_otp: "Send OTP",
    enter_otp: "Enter 4-Digit OTP",
    verify_login: "Verify & Sign In",

    // Language Selector
    lang_en: "English",
    lang_ta: "தமிழ் (Tamil)",
    lang_hi: "हिंदी (Hindi)",

    // Rider Booking
    trip_type: "Trip Type",
    one_way: "One-Way Trip",
    two_way: "Two-Way (Round Trip)",
    comfort_option: "Vehicle Comfort",
    ac: "AC Vehicle",
    non_ac: "Non-AC Vehicle",
    pickup_location: "Pickup Location",
    drop_location: "Dropoff Location",
    distance: "Total Distance",
    estimated_fare: "Estimated Fare",
    book_now: "Book Ride Now",
    searching_driver: "Finding verified driver near you...",

    // Driver & AI Verification
    driver_dashboard: "Driver Dashboard",
    accept_ride: "Accept Ride",
    reject_ride: "Decline",
    ai_driver_check: "AI Driver Verification",
    run_ai_check: "Verify Documents with AI",
    ai_verifying: "AI Analyzing Documents...",
    ai_status_approved: "AI Verification Passed (High Match)",
    ai_status_pending: "AI Flagged for Admin Review",
    ai_status_rejected: "AI Verification Rejected",
    zero_commission: "0% Commission — 100% Earnings to Driver",

    // Pricing & Cancellation
    cancellation_policy: "Cancellation Policy",
    free_cancel: "Free Cancellation (No fee before driver accepts)",
    cancel_fee_notice: "Cancellation fee applies only after driver confirmation",
    admin_slab_rates: "Distance Slab Rates (Per KM)",
    slab_0_15: "0 - 15 KM Rate",
    slab_15_40: "15 - 40 KM Rate",
    slab_40_plus: "40+ KM Rate",
    ac_surcharge: "AC Surcharge / KM",

    // Common Buttons
    submit: "Submit",
    cancel: "Cancel",
    confirm: "Confirm"
  },

  ta: {
    // Navigation & Auth
    nav_home: "முகப்பு",
    nav_rides: "என் பயணங்கள்",
    nav_wallet: "வாலட்",
    nav_profile: "சுயவிவரம்",
    nav_driver: "ஓட்டுநர் தளம்",
    nav_admin: "நிர்வாகம்",
    nav_login: "உள்நுழைக",
    nav_register: "பதிவு செய்க",
    sign_in_title: "ஜிப்ரைடிற்கு மீண்டும் நல்வரவு",
    sign_in_sub: "உங்கள் பயணங்கள் மற்றும் வாலட்டை நிர்வகிக்க உள்நுழைக",
    google_login: "கூகிள் மூலம் உள்நுழைக",
    phone_login: "தொலைபேசி எண் மூலம் உள்நுழைக",
    enter_phone: "தொலைபேசி எண் உள்ளிடவும் (+91)",
    send_otp: "OTP அனுப்புக",
    enter_otp: "4-இலக்க OTP உள்ளிடவும்",
    verify_login: "சரிபார்த்து உள்நுழைக",

    // Language Selector
    lang_en: "English",
    lang_ta: "தமிழ் (Tamil)",
    lang_hi: "हिंदी (Hindi)",

    // Rider Booking
    trip_type: "பயண வகை",
    one_way: "ஒரு வழி பயணம் (One-Way)",
    two_way: "இரு வழி பயணம் (Round-Trip)",
    comfort_option: "வாகன வசதி",
    ac: "ஏசி வாகனம் (AC)",
    non_ac: "ஏசி அல்லாத வாகனம் (Non-AC)",
    pickup_location: "ஏறும் இடம்",
    drop_location: "இறங்கும் இடம்",
    distance: "மொத்த தூரம்",
    estimated_fare: "மதிப்பிடப்பட்ட கட்டணம்",
    book_now: "இப்போதே சவாரி பதிவு செய்க",
    searching_driver: "அருகிலுள்ள ஓட்டுநரைத் தேடுகிறது...",

    // Driver & AI Verification
    driver_dashboard: "ஓட்டுநர் முகப்பு",
    accept_ride: "சவாரியை ஏற்கவும்",
    reject_ride: "நிராகரி",
    ai_driver_check: "AI ஓட்டுநர் சரிபார்ப்பு",
    run_ai_check: "AI மூலம் ஆவணங்களைச் சரிபார்க்கவும்",
    ai_verifying: "AI ஆவணங்களை பகுப்பாய்வு செய்கிறது...",
    ai_status_approved: "AI சரிபார்ப்பு வெற்றி பெற்றன",
    ai_status_pending: "நிர்வாகி பார்வைக்கு அனுப்பப்பட்டது",
    ai_status_rejected: "AI சரிபார்ப்பு நிராகரிக்கப்பட்டது",
    zero_commission: "0% கமிஷன் — 100% வருமானம் ஓட்டுநருக்கு",

    // Pricing & Cancellation
    cancellation_policy: "ரத்து செய்யும் கொள்கை",
    free_cancel: "இலவச ரத்து (ஓட்டுநர் ஏற்கும் வரை கட்டணம் இல்லை)",
    cancel_fee_notice: "ஓட்டுநர் உறுதி செய்த பிறகே ரத்து கட்டணம் விதிக்கப்படும்",
    admin_slab_rates: "கிலோமீட்டர் வாரியான கட்டணங்கள்",
    slab_0_15: "0 - 15 கி.மீ கட்டணம்",
    slab_15_40: "15 - 40 கி.மீ கட்டணம்",
    slab_40_plus: "40+ கி.மீ கட்டணம்",
    ac_surcharge: "ஏசி கூடுதல் கட்டணம் / கி.மீ",

    // Common Buttons
    submit: "சமர்ப்பிக்கவும்",
    cancel: "ரத்து செய்",
    confirm: "உறுதிப்படுத்து"
  },

  hi: {
    // Navigation & Auth
    nav_home: "होम",
    nav_rides: "मेरी सवारी",
    nav_wallet: "वॉलेट",
    nav_profile: "प्रोफ़ाइल",
    nav_driver: "ड्राइवर पोर्टल",
    nav_admin: "एडमिन",
    nav_login: "साइन इन करें",
    nav_register: "रजिस्टर करें",
    sign_in_title: "जिपराइड में आपका स्वागत है",
    sign_in_sub: "अपनी सवारी और वॉलेट प्रबंधित करने के लिए लॉगिन करें",
    google_login: "गूगल के साथ लॉगिन करें",
    phone_login: "मोबाइल नंबर से लॉगिन करें",
    enter_phone: "मोबाइल नंबर दर्ज करें (+91)",
    send_otp: "ओटीपी भेजें",
    enter_otp: "4-अंकीय ओटीपी दर्ज करें",
    verify_login: "सत्यापित करें और लॉगिन करें",

    // Language Selector
    lang_en: "English",
    lang_ta: "தமிழ் (Tamil)",
    lang_hi: "हिंदी (Hindi)",

    // Rider Booking
    trip_type: "यात्रा का प्रकार",
    one_way: "एक तरफ की यात्रा (One-Way)",
    two_way: "दो तरफ की यात्रा (Round-Trip)",
    comfort_option: "वाहन सुविधा",
    ac: "एसी वाहन (AC)",
    non_ac: "नॉन-एसी वाहन (Non-AC)",
    pickup_location: "पिकअप स्थान",
    drop_location: "ड्रॉप स्थान",
    distance: "कुल दूरी",
    estimated_fare: "अनुमानित किराया",
    book_now: "अभी राइड बुक करें",
    searching_driver: "निकटतम ड्राइवर की खोज की जा रही है...",

    // Driver & AI Verification
    driver_dashboard: "ड्राइवर डैशबोर्ड",
    accept_ride: "राइड स्वीकार करें",
    reject_ride: "अस्वीकार करें",
    ai_driver_check: "एआई ड्राइवर सत्यापन",
    run_ai_check: "एआई के साथ दस्तावेज सत्यापित करें",
    ai_verifying: "एआई दस्तावेजों का विश्लेषण कर रहा है...",
    ai_status_approved: "एआई सत्यापन सफल",
    ai_status_pending: "एडमिन समीक्षा के लिए लंबित",
    ai_status_rejected: "एआई सत्यापन अस्वीकृत",
    zero_commission: "0% कमीशन — 100% कमाई ड्राइवर की",

    // Pricing & Cancellation
    cancellation_policy: "रद्दीकरण नीति",
    free_cancel: "मुफ्त रद्दीकरण (ड्राइवर द्वारा स्वीकार करने से पहले कोई शुल्क नहीं)",
    cancel_fee_notice: "ड्राइवर की पुष्टि के बाद ही रद्दीकरण शुल्क लागू होगा",
    admin_slab_rates: "किलोमीटर के अनुसार किराया दरें",
    slab_0_15: "0 - 15 किमी दर",
    slab_15_40: "15 - 40 किमी दर",
    slab_40_plus: "40+ किमी दर",
    ac_surcharge: "एसी अतिरिक्त शुल्क / किमी",

    // Common Buttons
    submit: "जमा करें",
    cancel: "रद्द करें",
    confirm: "पुष्टि करें"
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zipride_language");
      if (saved && (saved === "en" || saved === "ta" || saved === "hi")) {
        setLanguageState(saved as Language);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("zipride_language", lang);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
