import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testTradebook() {
  const url = "https://console.zerodha.com/api/reports/tradebook?segment=EQ&from_date=2025-04-01&to_date=2026-03-22&page=1&sort_by=order_execution_time&sort_desc=false";
  const res = await fetch(url, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-csrftoken": process.env.KITE_CSRFTOKEN || "",
      "cookie": process.env.KITE_CONSOLE_COOKIES || ""
    },
    method: "GET"
  });
  
  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("HEADERS:", res.headers);
  console.log("BODY:", text.substring(0, 500));
}

testTradebook().catch(console.error);
