export default async function handler(req, res) {
  // Bật CORS nếu cần gọi từ domain khác (nếu chung domain Vercel thì không lo)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chỉ cho phép POST để truyền dữ liệu
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const SHEET_URL = process.env.VITE_GOOGLE_SHEET_API_URL;
    const SECRET_TOKEN = process.env.VITE_SHEET_SECRET_TOKEN;

    if (!SHEET_URL || !SECRET_TOKEN) {
      return res.status(500).json({ success: false, message: 'Chưa cấu hình API Sheet trên Server' });
    }

    // Nhận data từ Front-end gửi lên
    const clientData = req.body;

    // Gắn thêm Secret Token của hệ thống vào data (Front-end không hề biết cái Token này)
    const payloadToSheet = {
      ...clientData,
      token: SECRET_TOKEN 
    };

    // Gọi sang Google Apps Script
    const response = await fetch(`${SHEET_URL}?t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payloadToSheet)
    });

    const result = await response.json();

    // Trả kết quả từ Google Sheet về lại cho trình duyệt (Front-end)
    return res.status(200).json(result);

  } catch (error) {
    console.error("====== LỖI BACKEND SHEET PROXY ======");
    console.error(error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi giao tiếp với Google Sheet!', 
      errorDetail: error.message 
    });
  }
}