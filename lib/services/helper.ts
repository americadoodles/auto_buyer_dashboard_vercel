  // Set initial date range to current year
export  const getCurrentYearRange = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0); // January 1st
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // December 31st
    return { start: startOfYear, end: endOfYear };
  };