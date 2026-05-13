import admin from 'firebase-admin';

// ==================================================
// 1. KHỞI TẠO FIREBASE ADMIN SDK (THẺ VIP)
// ==================================================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Fix lỗi xuống dòng của Private Key trên Vercel
      privateKey: process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined,
    })
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Chỉ nhận method POST
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { orderId, documentId, newStatus, cancelReason, userId, isAdmin } = req.body;

    // Lấy thông tin đơn hàng hiện tại
    const orderRef = db.collection('orders').doc(documentId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
    }

    const orderData = orderSnap.data();

    // ==================================================
    // 2. KIỂM TRA BẢO MẬT (PHÂN QUYỀN)
    // ==================================================
    if (!isAdmin) {
      // Nếu là khách: Chỉ được hủy đơn của chính mình & đơn đang pending
      if (orderData.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác trên đơn này!' });
      }
      if (orderData.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn đang chờ xác nhận!' });
      }
    }

    // ==================================================
    // 3. CẬP NHẬT FIREBASE
    // ==================================================
    const updatePayload = {
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (newStatus === 'cancelled' && cancelReason) {
      updatePayload.cancelReason = cancelReason;
    }

    await orderRef.update(updatePayload);

    // ==================================================
    // 4. ĐỒNG BỘ SANG GOOGLE SHEET (CẬP NHẬT TRẠNG THÁI)
    // ==================================================
    const SHEET_URL = process.env.VITE_GOOGLE_SHEET_API_URL;
    const SECRET_TOKEN = process.env.VITE_SHEET_SECRET_TOKEN;

    if (SHEET_URL) {
      // Dùng fetch ngầm, không dùng await để tránh làm chậm response trả về cho khách
      fetch(`${SHEET_URL}?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          token: SECRET_TOKEN,
          action: "UPDATE_STATUS",
          orderId: orderId,
          status: newStatus
        })
      }).catch(err => console.error("Lỗi đồng bộ Sheet Update:", err));
    }

    return res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công!' });

  } catch (error) {
    console.error("====== LỖI BACKEND UPDATE ORDER ======");
    console.error(error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ khi cập nhật!', 
      errorDetail: error.message 
    });
  }
}