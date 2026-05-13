import admin from 'firebase-admin';

// ==================================================
// 1. KHỞI TẠO FIREBASE ADMIN SDK (THẺ VIP)
// ==================================================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Xử lý ký tự xuống dòng của Private Key
      privateKey: process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined,
    })
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Chỉ chấp nhận request dạng POST
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { items, customerInfo } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống!' });
    }

    // ==================================================
    // 2. TÍNH LẠI GIÁ TIỀN (BẢO MẬT CHỐNG HACKER F12)
    // ==================================================
    let totalAmount = 0;
    const validItems = [];

    // Duyệt qua từng món khách đặt, lấy giá GỐC từ Database ra tính
    for (const item of items) {
      const productRef = db.collection('products').doc(item.productId);
      const productSnap = await productRef.get();

      if (!productSnap.exists) {
        return res.status(400).json({ success: false, message: `Món "${item.name}" đã ngừng bán hoặc không tồn tại.` });
      }

      const productData = productSnap.data();
      let itemPrice = productData.price; // Lấy giá mặc định

      // Nếu món có phân loại (Vị/Size), tìm giá riêng của phân loại đó
      if (item.variant && productData.variants && productData.variantPrices) {
        const variantIndex = productData.variants.indexOf(item.variant);
        if (variantIndex !== -1) {
          // Ưu tiên giá của biến thể, nếu không có thì lấy giá gốc
          itemPrice = productData.variantPrices[variantIndex] || productData.price;
        }
      }

      // Cộng dồn vào tổng tiền thực tế
      totalAmount += itemPrice * item.quantity;
      
      // Đóng gói lại Item với giá chuẩn để lưu DB
      validItems.push({
        ...item,
        price: itemPrice 
      });
    }

    // Tạo mã đơn hàng ngắn gọn (VD: MHX-827364)
    const orderId = `MHX-${Math.floor(100000 + Math.random() * 900000)}`;

    // ==================================================
    // 3. LƯU ĐƠN HÀNG VÀO FIREBASE BẰNG QUYỀN ADMIN
    // ==================================================
    const newOrder = {
      orderId: orderId,
      userId: customerInfo.userId,
      userEmail: customerInfo.userEmail,
      customerName: customerInfo.customerName,
      phone: customerInfo.phone,
      address: customerInfo.address,
      shippingFee: customerInfo.shippingFee,
      deliveryTime: customerInfo.deliveryTime || '',
      paymentMethod: customerInfo.paymentMethod,
      notes: customerInfo.notes || '',
      referrer: customerInfo.referrer || '',
      proofLink: customerInfo.proofLink || '',
      items: validItems,
      total: totalAmount, // Số tiền chuẩn do Backend tự tính
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Bỏ qua mọi Rules của Firestore nhờ quyền Admin
    await db.collection('orders').add(newOrder);

    // ==================================================
    // 4. BẮN DỮ LIỆU ĐỒNG BỘ SANG GOOGLE SHEET (NẾU CÓ)
    // ==================================================
    const SHEET_URL = process.env.VITE_GOOGLE_SHEET_API_URL;
    const SECRET_TOKEN = process.env.VITE_SHEET_SECRET_TOKEN;

    if (SHEET_URL) {
      // Gộp các món ăn thành 1 chuỗi để dễ đọc trên Sheet
      const itemsDescription = validItems.map(i => 
        `${i.quantity}x ${i.name} ${i.variant ? `(${i.variant})` : ''}`
      ).join('\n');

      // Gửi ngầm không làm ảnh hưởng tốc độ trải nghiệm của khách
      fetch(`${SHEET_URL}?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          token: SECRET_TOKEN,
          action: "CREATE_ORDER",
          orderId: orderId,
          customerName: customerInfo.customerName,
          phone: customerInfo.phone,
          address: customerInfo.address,
          items: itemsDescription,
          total: totalAmount,
          paymentMethod: customerInfo.paymentMethod,
          shippingFee: customerInfo.shippingFee,
          status: 'pending',
          notes: customerInfo.notes || '',
          referrer: customerInfo.referrer || '',
          proofLink: customerInfo.proofLink || '',
          createdAt: new Date().toLocaleString('vi-VN')
        })
      }).catch(err => console.error("Lỗi đồng bộ Sheet:", err)); // Lỗi Sheet cũng ko báo cho khách biết
    }

    // ==================================================
    // 5. TRẢ KẾT QUẢ THÀNH CÔNG VỀ CHO TRÌNH DUYỆT
    // ==================================================
    return res.status(200).json({ success: true, orderId: orderId });

  } catch (error) {
    console.error("====== LỖI BACKEND CHECKOUT ======");
    console.error(error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ khi tạo đơn hàng!', 
      errorDetail: error.message 
    });
  }
}