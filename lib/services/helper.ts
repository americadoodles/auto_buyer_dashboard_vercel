  // Set initial date range to today
export  const getCurrentTodayRange = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0); // Start of day
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999); // End of day
    return { start: startDate, end: endDate };
  };