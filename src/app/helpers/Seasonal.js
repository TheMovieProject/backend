// utils/Seasonal.js

const getCurrentSeason = () => {
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();
  
  // Winter: Dec 21 - Mar 19
  if ((month === 12 && day >= 21) || month === 1 || month === 2 || (month === 3 && day <= 19)) {
    return 'winter';
  }
  // Spring: Mar 20 - Jun 20
  else if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
    return 'spring';
  }
  // Summer: Jun 21 - Sep 21
  else if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day <= 21)) {
    return 'summer';
  }
  // Fall/Autumn: Sep 22 - Dec 20
  else {
    return 'autumn';
  }
};

const getCurrentFestival = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();
  
  // Approximate dates - you might want to calculate exact dates for some festivals
  const festivals = {
    // Fixed date festivals
    newyear: { month: 1, startDay: 1, endDay: 7, term: 'new year celebration' },
    valentine: { month: 2, startDay: 10, endDay: 15, term: 'valentine love romance' },
    easter: { 
      // Easter calculation (simplified - usually March 22 to April 25)
      getTerm: () => {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
        const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
        
        // Check if today is around Easter
        const easterDate = new Date(year, easterMonth - 1, easterDay);
        const weekBefore = new Date(easterDate);
        weekBefore.setDate(easterDate.getDate() - 7);
        const weekAfter = new Date(easterDate);
        weekAfter.setDate(easterDate.getDate() + 7);
        
        if (today >= weekBefore && today <= weekAfter) {
          return 'easter holiday spring';
        }
        return null;
      }
    },
    halloween: { month: 10, startDay: 20, endDay: 31, term: 'halloween horror spooky killer killed murder ghost ' },
    thanksgiving: { 
      // 4th Thursday of November
      getTerm: () => {
        if (month === 11) {
          // Find 4th Thursday
          let thursdayCount = 0;
          const novemberFirst = new Date(year, 10, 1);
          const dayOfWeek = novemberFirst.getDay(); // 0=Sun, 1=Mon, etc.
          
          // Calculate first Thursday
          let firstThursday = 1 + ((4 - dayOfWeek + 7) % 7);
          let fourthThursday = firstThursday + 21;
          
          if (day >= fourthThursday - 3 && day <= fourthThursday + 3) {
            return 'thanksgiving family dinner drama food eat fun';
          }
        }
        return null;
      }
    },
    christmas: { month: 12, startDay: 15, endDay: 31, term: 'christmas holiday winter' },
    
    // Festivals with variable dates (approximate - you might want to use a library for exact dates)
    diwali: {
      // Usually between October and November
      getTerm: () => {
        if (month === 10 || month === 11) {
          // Simple approximation - Diwali is usually in Oct/Nov
          return 'diwali festival lights india ramayan ram durga sita adipurush';
        }
        return null;
      }
    },
    holi: {
      // Usually in March
      getTerm: () => {
        if (month === 3) {
          return 'holi festival colors india';
        }
        return null;
      }
    },
    eid: {
      // Ramadan/Eid - approximate
      getTerm: () => {
        if (month === 4 || month === 5) {
          return 'eid ramadan muslim festival salman ek tha tiger khan khan';
        }
        return null;
      }
    }
  };
  
  // Check fixed date festivals first
  for (const [festival, data] of Object.entries(festivals)) {
    if (data.getTerm) {
      const term = data.getTerm();
      if (term) return term;
    } else if (month === data.month && day >= data.startDay && day <= data.endDay) {
      return data.term;
    }
  }
  
  return null;
};

export const getSeasonalTerm = () => {
  const festivalTerm = getCurrentFestival();
  if (festivalTerm) return festivalTerm;
  
  const season = getCurrentSeason();
  const seasonTerms = {
    winter: 'winter snow holiday christmas',
    spring: 'spring flowers romance renewal',
    summer: 'summer beach vacation adventure',
    autumn: 'autumn fall harvest thanksgiving'
  };
  
  return seasonTerms[season];
};

export const getSeasonalKeywords = () => {
  const term = getSeasonalTerm();
  return term.split(' ');
};

// Alternative: Get multiple terms for better search results
export const getSeasonalQueryParams = () => {
  const festivalTerm = getCurrentFestival();
  const season = getCurrentSeason();
  
  if (festivalTerm) {
    return {
      primary: festivalTerm.split(' ')[0],
      secondary: festivalTerm,
      type: 'festival'
    };
  }
  
  const seasonKeywords = {
    winter: { primary: 'winter', secondary: 'snow holiday', type: 'season' },
    spring: { primary: 'spring', secondary: 'flowers romance', type: 'season' },
    summer: { primary: 'summer', secondary: 'beach vacation', type: 'season' },
    autumn: { primary: 'autumn', secondary: 'fall harvest', type: 'season' }
  };
  
  return seasonKeywords[season];
};

// Get movies by season/festival
export const getSeasonalMovies = async (page = 1) => {
  const queryParams = getSeasonalQueryParams();
  // You'll implement the API call here or in your component
  return { queryParams, page };
};