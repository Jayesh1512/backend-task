// Purpose: Validation utilities for Hyperliquid PNL requests (address and date range checks)

/**
**************************
@params address: string
@return { valid: boolean; error?: string }

[FUNCTION] : Validate that the provided address is a valid 0x-prefixed Ethereum-like address.

**************************
*/
export function isValidAddress(address: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Invalid address format" };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: "Invalid address format" };
  }
  return { valid: true };
}

/**
**************************
@params dateString: string
@return boolean

[FUNCTION] : Check that a string is a valid date in YYYY-MM-DD format.

**************************
*/
export function isValidDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== "string") {
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}



/**
**************************
@params start: string, end: string
@return { valid: boolean; error?: string }

[FUNCTION] : Validate that start and end are valid YYYY-MM-DD strings and represent a logical date range (start <= end, start not in future).

**************************
*/
export function validateDateRange(
  start: string,
  end: string
): { valid: boolean; error?: string } {
  if (!isValidDateString(start)) {
    return { valid: false, error: "Invalid start date format. Use YYYY-MM-DD" };
  }

  if (!isValidDateString(end)) {
    return { valid: false, error: "Invalid end date format. Use YYYY-MM-DD" };
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();

  if (startDate > endDate) {
    return { valid: false, error: "Start date must be before end date" };
  }

  if (startDate > now) {
    return { valid: false, error: "Start date cannot be in the future" };
  }
  return { valid: true };
}

/**
**************************
@params address: string, start: string, end: string
@return { valid: boolean; error?: string }

[FUNCTION] : Validate address and date range for a PNL request by delegating to helper validators.

**************************
*/
export default function validatePNL(
  address: string,
  start: string,
  end: string
): { valid: boolean; error?: string } {
  const addressValidation = isValidAddress(address);
  if (!addressValidation.valid) {
    return addressValidation;
  }
  
  const dateValidation = validateDateRange(start, end);
  if (!dateValidation.valid) {
    return dateValidation;
  }
  
  return { valid: true };
}
