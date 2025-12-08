  // Set initial date range to one month before
export  const getCurrentMonthRange = () => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0); // Start of day
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999); // End of day
    return { start: oneMonthAgo, end: endDate };
  };