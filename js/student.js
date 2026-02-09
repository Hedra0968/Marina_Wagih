/* JS File: student.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Features: Attendance, Points System, HW Upload, Graded Feedback.
*/

import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, addDoc, query, where, onSnapshot, getDoc, doc, orderBy, serverTimestamp, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالواجهة
window.handleLogout = logout;

// --- 1. إرسال طلب حضور ذكي ---
window.handleRequestAttendance = async () => {
    const dateInput = document.getElementById('attendance-date');
    const noteInput = document.getElementById('attendance-note');
    
    if (!dateInput.value) return Swal.fire('تنبيه', 'يرجى اختيار تاريخ الحصة أولاً', 'warning');

    try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const studentData = userDoc.data();

        // فحص منع التكرار لنفس اليوم
        const q = query(collection(db, "attendanceRequests"), 
                  where("studentId", "==", auth.currentUser.uid), 
                  where("date", "==", dateInput.value));
        const check = await getDocs(q);
        if(!check.empty) return Swal.fire('طلب مكرر', 'لقد أرسلت طلب حضور لهذا التاريخ بالفعل!', 'info');

        await addDoc(collection(db, "attendanceRequests"), {
            studentId: auth.currentUser.uid,
            studentName: studentData.name,
            date: dateInput.value,
            note: noteInput.value || "لا توجد ملاحظات",
            status: 'pending',
            timestamp: serverTimestamp()
        });

        Swal.fire({ title: 'تم الإرسال', text: 'سيظهر حضورك فور تأكيده من السكرتارية.', icon: 'success' });
        noteInput.value = '';
    } catch (e) {
        Swal.fire('خطأ', 'فشل الإرسال: ' + e.message, 'error');
    }
};

// --- 2. رفع الواجبات (مرتبط بنظام تصحيح مارينا) ---
window.triggerUploadHW = async () => {
    const fileInput = document.getElementById('hw-file');
    const titleInput = document.getElementById('hw-title'); // تأكد من وجود هذا الـ ID في الـ HTML
    const file = fileInput.files[0];

    if (!file || !titleInput.value) return Swal.fire('تنبيه', 'يرجى كتابة عنوان الواجب واختيار ملف PDF', 'warning');
    if (file.type !== 'application/pdf') return Swal.fire('خطأ', 'الملفات المسموحة PDF فقط', 'error');

    Swal.fire({ title: 'جاري تسليم الواجب...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        
        // ملاحظة: هنا نرفع البيانات. في النسخة الاحترافية نرفع الملف لـ Storage، 
        // هنا سنخزن الرابط (بافتراض أنك تستخدم رابط خارجي أو محاكاة)
        await addDoc(collection(db, "studentHomeworks"), {
            studentId: auth.currentUser.uid,
            studentName: userDoc.data().name,
            fileTitle: titleInput.value,
            fileUrl: "رابط_الملف_المرفوع", // يتم استبداله برابط Firebase Storage الفعلي
            status: 'pending',
            createdAt: serverTimestamp()
        });

        Swal.fire('تم التسليم!', 'وصل واجبك للمديرة مارينا بنجاح.', 'success');
        fileInput.value = '';
        titleInput.value = '';
    } catch (e) {
        Swal.fire('فشل الرفع', e.message, 'error');
    }
};

// --- 3. نظام النقاط والبروفايل الحقيقي ---
function setupStudentData() {
    const welcomeMsg = document.getElementById('welcome-msg');
    const pointsDisplay = document.getElementById('student-points-display');
    const rankLabel = document.getElementById('student-rank');
    const cardCode = document.getElementById('card-access-code');

    onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const pts = data.points || 0;

            if (welcomeMsg) welcomeMsg.innerText = `أهلاً يا بطل: ${data.name.split(' ')[0]}`;
            if (pointsDisplay) pointsDisplay.innerText = `${pts} نقطة`;
            if (cardCode) cardCode.innerText = data.accessCode; // عرض الكود في الكارت

            let rank = "طالب مجتهد 📚";
            if (pts > 100) rank = "بطل متميز 🌟";
            if (pts > 500) rank = "أسطورة المنصة 🔥";
            if (rankLabel) rankLabel.innerText = rank;
            
            // تحديث الصورة الشخصية في الهيدر
            const img = document.getElementById('student-header-photo');
            if(img) img.src = data.photoURL;
        }
    });
}

// --- 4. سجل الحضور ونتائج الواجبات ---
function loadStudentLogs() {
    const attendList = document.getElementById('attendance-history');
    const hwResultsList = document.getElementById('hw-results-list'); // تأكد من وجوده في الـ HTML

    // سجل الحضور
    const qAttend = query(collection(db, "attendanceRequests"), where("studentId", "==", auth.currentUser.uid), orderBy("timestamp", "desc"));
    onSnapshot(qAttend, (snapshot) => {
        attendList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const isOk = d.status === 'approved';
            attendList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center mb-2 border-0 shadow-sm rounded-3">
                    <div><small class="fw-bold">${d.date}</small></div>
                    <span class="badge ${isOk ? 'bg-success' : 'bg-warning text-dark'} rounded-pill">
                        ${isOk ? 'تم التحضير' : 'بانتظار التأكيد'}
                    </span>
                </li>`;
        });
    });

    // نتائج تصحيح الواجبات (الربط مع مارينا)
    const qHw = query(collection(db, "studentHomeworks"), where("studentId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    onSnapshot(qHw, (snapshot) => {
        if(!hwResultsList) return;
        hwResultsList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const h = docSnap.data();
            if(h.status === 'graded') {
                hwResultsList.innerHTML += `
                <div class="alert alert-info border-0 shadow-sm rounded-4 mb-2 p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong class="small">${h.fileTitle}</strong>
                        <span class="badge bg-primary">${h.grade}</span>
                    </div>
                    <p class="mb-0 mt-1 text-muted" style="font-size:11px;">ملاحظة مارينا: ${h.adminNote || 'عمل ممتاز!'}</p>
                </div>`;
            }
        });
    });
}

// --- 5. المكتبة والكويزات ---
function loadLibrary() {
    const filesList = document.getElementById('files-list');
    onSnapshot(query(collection(db, "files"), orderBy("createdAt", "desc")), (snapshot) => {
        if(!filesList) return;
        filesList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const file = docSnap.data();
            filesList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center border-0 border-bottom p-3">
                    <span class="small fw-bold"><i class="fas fa-file-pdf text-danger me-2"></i> ${file.title}</span>
                    <a href="${file.url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill">تحميل</a>
                </li>`;
        });
    });
}

// الأمان والتشغيل
document.addEventListener('contextmenu', e => e.preventDefault());

onAuthStateChanged(auth, (user) => {
    if (user) {
        setupStudentData();
        loadStudentLogs();
        loadLibrary();
    }
});
