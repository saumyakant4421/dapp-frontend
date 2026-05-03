/**
 * Convert UTC datetime string to IST and format for display
 * @param utcDateString - UTC datetime string (e.g., "2026-05-03 15:30:00")
 * @returns Formatted IST datetime string (e.g., "2026-05-03 21:00:00 IST")
 */
export function formatUTCToIST(utcDateString: string): string {
  if (!utcDateString) return "";
  
  try {
    // Parse UTC datetime string
    const utcDate = new Date(utcDateString.replace(" ", "T") + "Z");
    
    // Convert to IST (UTC+5:30)
    const istFormatter = new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
    
    const parts = istFormatter.formatToParts(utcDate);
    const partsMap: Record<string, string> = {};
    parts.forEach((part) => {
      partsMap[part.type] = part.value;
    });
    
    const istString = `${partsMap.year}-${partsMap.month}-${partsMap.day} ${partsMap.hour}:${partsMap.minute}:${partsMap.second}`;
    return `${istString} IST`;
  } catch {
    return utcDateString;
  }
}

/**
 * Convert UTC date to IST without the IST suffix (for comparison or storage)
 */
export function formatUTCToISTNoSuffix(utcDateString: string): string {
  if (!utcDateString) return "";
  
  try {
    const utcDate = new Date(utcDateString.replace(" ", "T") + "Z");
    
    const istFormatter = new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
    
    const parts = istFormatter.formatToParts(utcDate);
    const partsMap: Record<string, string> = {};
    parts.forEach((part) => {
      partsMap[part.type] = part.value;
    });
    
    return `${partsMap.year}-${partsMap.month}-${partsMap.day} ${partsMap.hour}:${partsMap.minute}:${partsMap.second}`;
  } catch {
    return utcDateString;
  }
}
