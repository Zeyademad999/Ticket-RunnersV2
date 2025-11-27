export interface CountryDialCode {
  code: string;
  name: string;
  dial_code: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: "EG", name: "Egypt", dial_code: "+20" },
  { code: "SA", name: "Saudi Arabia", dial_code: "+966" },
  { code: "AE", name: "United Arab Emirates", dial_code: "+971" },
  { code: "QA", name: "Qatar", dial_code: "+974" },
  { code: "KW", name: "Kuwait", dial_code: "+965" },
  { code: "BH", name: "Bahrain", dial_code: "+973" },
  { code: "OM", name: "Oman", dial_code: "+968" },
  { code: "JO", name: "Jordan", dial_code: "+962" },
  { code: "LB", name: "Lebanon", dial_code: "+961" },
  { code: "MA", name: "Morocco", dial_code: "+212" },
  { code: "TN", name: "Tunisia", dial_code: "+216" },
  { code: "DZ", name: "Algeria", dial_code: "+213" },
  { code: "TR", name: "Turkey", dial_code: "+90" },
  { code: "KE", name: "Kenya", dial_code: "+254" },
  { code: "NG", name: "Nigeria", dial_code: "+234" },
  { code: "ZA", name: "South Africa", dial_code: "+27" },
  { code: "US", name: "United States", dial_code: "+1" },
  { code: "CA", name: "Canada", dial_code: "+1" },
  { code: "GB", name: "United Kingdom", dial_code: "+44" },
  { code: "FR", name: "France", dial_code: "+33" },
  { code: "DE", name: "Germany", dial_code: "+49" },
  { code: "ES", name: "Spain", dial_code: "+34" },
  { code: "IT", name: "Italy", dial_code: "+39" },
  { code: "NL", name: "Netherlands", dial_code: "+31" },
  { code: "SE", name: "Sweden", dial_code: "+46" },
  { code: "NO", name: "Norway", dial_code: "+47" },
  { code: "FI", name: "Finland", dial_code: "+358" },
  { code: "GR", name: "Greece", dial_code: "+30" },
  { code: "IN", name: "India", dial_code: "+91" },
  { code: "PK", name: "Pakistan", dial_code: "+92" },
  { code: "BD", name: "Bangladesh", dial_code: "+880" },
  { code: "PH", name: "Philippines", dial_code: "+63" },
  { code: "SG", name: "Singapore", dial_code: "+65" },
  { code: "MY", name: "Malaysia", dial_code: "+60" },
  { code: "ID", name: "Indonesia", dial_code: "+62" },
  { code: "TH", name: "Thailand", dial_code: "+66" },
  { code: "VN", name: "Vietnam", dial_code: "+84" },
  { code: "CN", name: "China", dial_code: "+86" },
  { code: "JP", name: "Japan", dial_code: "+81" },
  { code: "KR", name: "South Korea", dial_code: "+82" },
  { code: "AU", name: "Australia", dial_code: "+61" },
  { code: "NZ", name: "New Zealand", dial_code: "+64" },
];

export const DEFAULT_DIAL_CODE = COUNTRY_DIAL_CODES[0]?.dial_code ?? "+20";


