import admin from 'firebase-admin';

// 1. KHỞI TẠO FIREBASE ADMIN SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined,
    })
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { items, customerInfo } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống!' });
    }

    // 2. TÍNH LẠI GIÁ TIỀN CHUẨN XÁC
    let totalAmount = 0;
    const validItems = [];

    for (const item of items) {
      const productRef = db.collection('products').doc(item.productId);
      const productSnap = await productRef.get();

      if (!productSnap.exists) {
        return res.status(400).json({ success: false, message: `Món "${item.name}" đã ngừng bán.` });
      }

      const productData = productSnap.data();
      let itemPrice = productData.price;

      if (item.variant && productData.variants && productData.variantPrices) {
        const variantIndex = productData.variants.indexOf(item.variant);
        if (variantIndex !== -1) {
          itemPrice = productData.variantPrices[variantIndex] || productData.price;
        }
      }

      totalAmount += itemPrice * item.quantity;
      
      validItems.push({
        ...item,
        price: itemPrice 
      });
    }

    const orderId = `MHX-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. LƯU VÀO FIREBASE
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
      total: totalAmount,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('orders').add(newOrder);

    // Cập nhật số lượng đã bán (sold)
    for (const item of validItems) {
      await db.collection('products').doc(item.productId).update({
        sold: admin.firestore.FieldValue.increment(item.quantity)
      });
    }

    // ==================================================
    // 4. GÓI DỮ LIỆU VÀ ĐẨY SANG GOOGLE SHEET
    // ==================================================
    const SHEET_URL = process.env.VITE_GOOGLE_SHEET_API_URL;
    const SECRET_TOKEN = process.env.VITE_SHEET_SECRET_TOKEN;

    if (SHEET_URL) {
      // ĐỊNH NGHĨA sheetData Ở ĐÂY ĐỂ TRÁNH LỖI "NOT DEFINED"
      const sheetData = {
        token: SECRET_TOKEN,
        action: "NEW_ORDER", // Đảm bảo bên Google Apps Script của bạn đang đón biến "NEW_ORDER" nhé
        orderId: orderId,
        customerName: customerInfo.customerName,
        phone: `'${customerInfo.phone}`, // Thêm dấu nháy đơn để Google Sheet không làm mất số 0 ở đầu
        address: customerInfo.address,
        shipFee: customerInfo.shippingFee,
        itemsDetail: validItems.map(i => `• ${i.name}${i.variant ? ` (${i.variant})`:''} x${i.quantity}`).join('\n'),
        totalPrice: totalAmount,
        payment: customerInfo.paymentMethod,
        deliveryTime: customerInfo.deliveryTime ? customerInfo.deliveryTime.replace('T', ' ') : '', 
        referrer: customerInfo.referrer || "Không có",
        notes: customerInfo.notes || "Không"
      };

      console.log("====== BẮT ĐẦU GỬI SANG GOOGLE SHEET ======");
      console.log("Dữ liệu gửi đi:", JSON.stringify(sheetData));
      
      // Gọi fetch sang Sheet ngầm (Không dùng await để khách hàng không phải chờ)
      fetch(`${SHEET_URL}?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(sheetData),
        redirect: 'follow'
      })
      .then(async (res) => {
        const text = await res.text();
        console.log("👉 PHẢN HỒI TỪ GOOGLE SHEET:", text);
      })
      .catch(err => console.error("❌ LỖI GỌI SHEET:", err));
    }

    // 5. TRẢ KẾT QUẢ THÀNH CÔNG VỀ FRONTEND
    return res.status(200).json({ success: true, orderId: orderId });

  } catch (error) {
    console.error("====== LỖI BACKEND CHECKOUT ======");
    console.error(error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo đơn hàng!' });
  }
}