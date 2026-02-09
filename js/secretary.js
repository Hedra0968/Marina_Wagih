/* JS File: secretary.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Core: Student Registration & Attendance Approval System
*/

import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, onSnapshot, updateDoc, doc, getDoc, 
    addDoc, query, where, serverTimestamp, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالنافذة العالمية
window.handleLogout = logout;

// --- 1. توليد كود دخول سري (نفس منطق auth.js لضمان التوافق) ---
const generateSecureCode = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; 
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// --- 2. إضافة طالب جديد للمنظومة (يدوي عبر السكرتير) ---
window.triggerAddStudent = async () => {
    const name = document.getElementById('student-name').value.trim();
    const phone = document.getElementById('student-phone').value.trim();
    const subject = document.getElementById('student-subject').value.trim();
    const stage = document.getElementById('student-stage').value.trim();

    if (!name || !phone || !subject || !stage) {
        return Swal.fire('بيانات ناقصة', 'يرجى ملء كافة حقول الطالب لإتمام التسجيل', 'warning');
    }

    try {
        Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const accessCode = generateSecureCode();
        
        await addDoc(collection(db, "users"), {
            name,
            phone,
            subject,
            stage,
            role: 'student',
            status: 'active', // الإضافة اليدوية تكون مفعلة تلقائياً
            accessCode: accessCode,
            points: 0,
            photoURL: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            registeredBy: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });

        Swal.fire({
            icon: 'success',
            title: 'تم تسجيل الطالب بنجاح',
            html: `كود الدخول الخاص بالطالب هو: <b class="text-danger" style="font-size:20px;">${accessCode}</b>`,
            confirmButtonText: 'حفظ وإغلاق'
        });
        
        // تفريغ الحقول
        ['student-name', 'student-phone', 'student-subject', 'student-stage'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = '';
        });
        
    } catch (e) {
        Swal.fire('خطأ برمي', 'فشل في الاتصال بالسيرفر: ' + e.message, 'error');
    }
};

// --- 3. تحميل قائمة الطلاب المسجلين اليوم (مزامنة لحظية) ---
function loadStudentsAndStats() {
    const list = document.getElementById('students-list');
    const todayCountLabel = document.getElementById('sec-stat-today');
    
    // جلب الطلاب المرتبين بالأحدث أولاً
    const q = query(collection(db, "users"), where("role", "==", "student"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (!list) return;
        list.innerHTML = '';
        let todayCount = 0;
        const todayStr = new Date().toDateString();

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            
            // فلترة طلاب اليوم للإحصائيات
            if (data.createdAt && data.createdAt.toDate().toDateString() === todayStr) {
                todayCount++;
            }

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center p-3 border-0 border-bottom bg-transparent animate__animated animate__fadeIn';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${data.photoURL}" class="rounded-circle me-3 border shadow-sm" width="45" height="45" style="object-fit: cover;">
                    <div>
                        <h6 class="mb-0 fw-bold small text-dark">${data.name}</h6>
                        <small class="text-muted" style="font-size: 11px;">${data.stage} | <i class="fab fa-whatsapp text-success"></i> ${data.phone}</small>
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge bg-light text-primary border rounded-pill px-3">${data.subject}</span><br>
                    <small class="text-danger fw-bold" style="font-size:9px;">Code: ${data.accessCode}</small>
                </div>
            `;
            list.appendChild(li);
        });
        
        if(todayCountLabel) {
            // إضافة أنيميشن عند تغير الرقم
            todayCountLabel.classList.add('animate__bounceIn');
            todayCountLabel.innerText = todayCount;
            setTimeout(() => todayCountLabel.classList.remove('animate__bounceIn'), 1000);
        }
    });
}

// --- 4. إدارة طلبات الحضور (بصلاحيات مارينا) ---
window.approveRequest = async (requestId) => {
    try {
        const myProfile = await getDoc(doc(db, "users", auth.currentUser.uid));
        const myData = myProfile.data();

        // فحص الصلاحية الأمنية الممنوحة من لوحة الإدارة
        if (!myData.canApproveAttendance) {
            return Swal.fire({
                title: 'صلاحية مغلقة',
                text: 'عذراً، دكتورة مارينا لم تفعل لك خاصية قبول الحضور بعد.',
                icon: 'lock',
                confirmButtonColor: '#d33'
            });
        }

        await updateDoc(doc(db, "attendanceRequests", requestId), { 
            status: 'approved',
            approvedBy: myData.name,
            approvedAt: serverTimestamp()
        });

        Swal.fire({ 
            icon: 'success', 
            title: 'تم تفعيل الحضور', 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000 
        });
        
    } catch (e) {
        Swal.fire('خطأ', 'تعذر تحديث الحالة: ' + e.message, 'error');
    }
};

function loadAttendanceRequests() {
    const list = document.getElementById('attendance-requests');
    const badgeCount = document.getElementById('pending-count');

    const q = query(collection(db, "attendanceRequests"), where("status", "==", "pending"), orderBy("timestamp", "asc"));
    
    onSnapshot(q, (snapshot) => {
        if (!list) return;
        list.innerHTML = '';
        badgeCount.innerText = `${snapshot.size} طلب معلق`;

        if (snapshot.empty) {
            list.innerHTML = '<li class="list-group-item text-center text-muted py-5 border-0">لا توجد طلبات انتظار حالياً</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center p-3 mb-2 rounded-4 bg-white border-start border-warning border-4 shadow-sm animate__animated animate__slideInLeft';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-light-warning p-2 rounded-circle me-3 text-warning">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div>
                        <h6 class="mb-0 fw-bold small text-dark">${req.studentName}</h6>
                        <small class="text-muted" style="font-size: 11px;">تاريخ الحصة: ${req.date}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-success rounded-pill px-4 fw-bold shadow-sm" onclick="approveRequest('${docSnap.id}')">
                    قبول
                </button>
            `;
            list.appendChild(li);
        });
    });
}

// --- 5. حماية البيانات (منع التفتيش) ---
document.addEventListener('contextmenu', e => e.preventDefault());

// تشغيل المهام
loadStudentsAndStats();
loadAttendanceRequests();
