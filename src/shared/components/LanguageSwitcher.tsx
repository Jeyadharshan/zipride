import React from "react";
import { useLanguage, Language } from "@/shared/context/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-semibold shadow-soft backdrop-blur-md z-50 ${className}`}>
      <Globe className="h-3.5 w-3.5 text-primary flex-shrink-0" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        aria-label="Select Language"
        className="bg-transparent text-foreground font-semibold outline-none cursor-pointer pr-1"
      >
        <option value="en" className="bg-card text-foreground">English</option>
        <option value="ta" className="bg-card text-foreground">தமிழ் (Tamil)</option>
        <option value="hi" className="bg-card text-foreground">हिंदी (Hindi)</option>
      </select>
    </div>
  );
}
export default LanguageSwitcher;
