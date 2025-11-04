function isValidAddress(address: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Invalid address format" };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: "Invalid address format" };
  }
  return { valid: true };
}

function isValidDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== "string") {
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}



function validateDateRange(
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

export default function validatePNL(
  address: string,
  start: string,
  end: string
): { valid: boolean; error?: string } {
  return isValidAddress(address) && validateDateRange(start, end);
}
