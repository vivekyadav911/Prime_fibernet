export type ParsedAddressFields = {
  city?: string;
  district?: string;
  pincode?: string;
  state?: string;
};

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
];

export function parseIndianAddress(address: string): ParsedAddressFields {
  const result: ParsedAddressFields = {};
  const trimmed = address.trim();
  if (!trimmed) return result;

  const pincodeMatch = trimmed.match(/\b(\d{6})\b/);
  if (pincodeMatch) {
    result.pincode = pincodeMatch[1];
  }

  const lower = trimmed.toLowerCase();
  for (const state of INDIAN_STATES) {
    if (lower.includes(state.toLowerCase())) {
      result.state = state;
      break;
    }
  }

  const parts = trimmed.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1] ?? '';
    const secondLast = parts[parts.length - 2] ?? '';

    if (result.state && lastPart.toLowerCase().includes(result.state.toLowerCase())) {
      if (secondLast && !/^\d{6}$/.test(secondLast)) {
        result.city = secondLast;
      }
    } else if (!result.state && parts.length >= 3) {
      result.city = parts[parts.length - 3] ?? secondLast;
      result.district = secondLast;
    } else if (secondLast) {
      result.city = secondLast;
    }
  }

  if (!result.district && result.city) {
    const districtMatch = trimmed.match(/(?:district|dist\.?)\s*[:\-]?\s*([^,\n]+)/i);
    if (districtMatch?.[1]) {
      result.district = districtMatch[1].trim();
    }
  }

  return result;
}
