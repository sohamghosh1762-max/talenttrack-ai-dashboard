import React from "react";

export function GoogleLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 33" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16.5 13.5v5.8h9.3c-.4 2.4-2.8 7-9.3 7-5.6 0-10.2-4.6-10.2-10.3s4.6-10.3 10.2-10.3c3.2 0 5.3 1.4 6.5 2.6l4.6-4.4C24 1.1 20.6 0 16.5 0 7.4 0 0 7.4 0 16.5S7.4 33 16.5 33c9.5 0 15.8-6.7 15.8-16.1 0-1.1-.1-1.9-.3-2.7L16.5 13.5z"
        fill="#4285F4"
      />
      <path
        d="M44.4 17c0 5.1-3.9 9-9 9s-9-3.9-9-9 3.9-9 9-9 9 3.9 9 9zm-3.9 0c0-3.3-2.3-5.6-5.1-5.6s-5.1 2.3-5.1 5.6 2.3 5.6 5.1 5.6 5.1-2.3 5.1-5.6z"
        fill="#EA4335"
      />
      <path
        d="M63.8 17c0 5.1-3.9 9-9 9s-9-3.9-9-9 3.9-9 9-9 9 3.9 9 9zm-3.9 0c0-3.3-2.3-5.6-5.1-5.6s-5.1 2.3-5.1 5.6 2.3 5.6 5.1 5.6 5.1-2.3 5.1-5.6z"
        fill="#FBBC05"
      />
      <path
        d="M82.2 8.4v16.8c0 7-4.1 9.8-9 9.8-4.6 0-7.3-3.1-8.3-5.5l3.5-1.5c.6 1.5 2.1 3.5 4.8 3.5 3.1 0 5.1-2 5.1-5.5v-1.3h-.2c-1 1.2-2.8 2.2-5.1 2.2-4.9 0-9.2-4.2-9.2-9.5s4.4-9.5 9.2-9.5c2.3 0 4.1 1 5.1 2.2h.2v-1.7h3.7zm-3.4 8.7c0-3.2-2.2-5.6-5-5.6s-5.1 2.4-5.1 5.6c0 3.1 2.3 5.5 5.1 5.5s5-2.3 5-5.5z"
        fill="#4285F4"
      />
      <path d="M88.1 1.2h3.9v24.2h-3.9V1.2z" fill="#34A853" />
      <path
        d="M103.5 19.8l3.1 2.1c-1 1.5-3.5 4.1-7.7 4.1-5.3 0-9.1-4.1-9.1-9s3.8-9 8.6-9c4.9 0 7.3 3.6 8.1 5.7l.4 1.1-12.7 5.3c1 1.9 2.5 2.9 4.7 2.9s3.6-1.1 4.6-2.3zm-6.2-3.1l8.5-3.5c-.5-.8-1.5-2-3.2-2-2.1 0-4.4 1.8-4.4 4.7-.9.8-.9.8-.9.8z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function MicrosoftLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid grid-cols-2 gap-0.5 size-5 shrink-0">
        <div className="bg-[#F25022] rounded-[1px]" />
        <div className="bg-[#7FBA00] rounded-[1px]" />
        <div className="bg-[#00A4EF] rounded-[1px]" />
        <div className="bg-[#FFB900] rounded-[1px]" />
      </div>
      <span className="text-base font-semibold tracking-tight text-[#5E5E5E] font-sans">
        Microsoft
      </span>
    </div>
  );
}

export function AmazonLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* amazon text */}
      <text
        x="0"
        y="20"
        fontFamily="sans-serif"
        fontWeight="800"
        fontSize="21"
        fill="#131921"
        letterSpacing="-0.5"
      >
        amazon
      </text>
      {/* smile curve */}
      <path
        d="M11 23.5 C32 32.5, 58 31.5, 75 22.5"
        stroke="#FF9900"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* arrowhead */}
      <path d="M72 19 L78 22.5 L73 26 Z" fill="#FF9900" />
    </svg>
  );
}

export function AdobeLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 30 26"
        className="h-6 w-6 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19 0L30 26H22.5L17.5 14H13L19 0Z" fill="#FA0F00" />
        <path d="M11 0L0 26H7.5L12.5 14H17L11 0Z" fill="#FA0F00" />
        <path d="M15 8.5L19.5 19H10.5L15 8.5Z" fill="#FA0F00" />
      </svg>
      <span className="text-base font-extrabold tracking-tight text-[#FA0F00] font-sans">
        Adobe
      </span>
    </div>
  );
}

export function InfosysLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 85 28" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <text
        x="0"
        y="21"
        fontFamily="sans-serif"
        fontWeight="bold"
        fontStyle="italic"
        fontSize="21"
        fill="#007CC3"
        letterSpacing="-0.2"
      >
        Infosys
      </text>
      <circle cx="79" cy="6" r="2" fill="#007CC3" />
    </svg>
  );
}

export function TCSLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xl font-extrabold tracking-tight text-[#002B49] font-sans leading-none">
        tcs
      </span>
      <div className="flex flex-col justify-center border-l-2 border-[#002B49]/30 pl-2 leading-none">
        <span className="text-[7.5px] font-extrabold tracking-wider text-[#002B49] uppercase">
          TATA
        </span>
        <span className="text-[6.5px] font-bold tracking-tight text-[#002B49]/80 uppercase">
          CONSULTANCY SERVICES
        </span>
      </div>
    </div>
  );
}

export function FlipkartLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M4 7h16l-2 14H6L4 7z" fill="#2874F0" />
        <path d="M8 7V5a4 4 0 018 0v2" stroke="#FFE500" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M10 11h4M10 14h3" stroke="#FFE500" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="text-base font-extrabold italic tracking-tight text-[#2874F0] font-sans">
        Flipkart
      </span>
    </div>
  );
}

export function ZomatoLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="text-xl font-black italic tracking-tighter text-[#E23744] font-sans">
        zomato
      </span>
    </div>
  );
}
