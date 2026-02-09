/* JS File: secretary.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Core: Student Registration & Attendance Approval System (Advanced)
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

// --- 1. توليد كود دخول سري (نظام الحماية الموحد) ---
const generateSecureCode = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; 
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// --- 2. إضافة طالب جديد للمنظومة (يدوي) ---
window.triggerAddStudent = async () => {
    const name = document.getElementById('student-name').value.trim();
    const phone = document.getElementById('student-phone').value.trim();
    const subject = document.getElementById('student-subject').value.trim();
    const stage = document.getElementById('student-stage').value.trim();

    if (!name || !phone || !subject || !stage) {
        return Swal.fire('بيانات ناقصة', 'يرجى ملء كافة حقول الطالب لإتمام التسجيل', 'warning');
    }

    try {
        Swal.fire({ 
            title: 'جاري تسجيل الطالب...', 
            text: 'يتم الآن إصدار كود الدخول السري',
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        const accessCode = generateSecureCode();
        
        // إضافة الطالب كمستخدم نشط فوراً لأن السكرتير هو من أضافه
        await addDoc(collection(db, "users"), {
            name,
            phone,
            subject,
            stage,
            role: 'student',
            status: 'active', 
            accessCode: accessCode,
            points: 0,
            photoURL: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            registeredBy: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });

        Swal.fire({
            icon: 'success',
            title: 'تم تسجيل الطالب بنجاح',
            html: `
                <div class="security-display-box mt-3" style="background:#f8f9fa; border:2px dashed #0d6efd; padding:20px; border-radius:15px;">
                    <p class="mb-1 small text-muted">كود الدخول السري للطالب:</p>
                    <h2 class="text-primary fw-bold" style="letter-spacing:5px;">${accessCode}</h2>
                    <hr>
                    <small class="text-danger">يرجى تسليم هذا الكود للطالب ليتمكن من الدخول.</small>
                </div>
            `,
            confirmButtonText: 'تم، إرسال الكود للطالب'
        });
        
        // تفريغ الحقول
        ['student-name', 'student-phone', 'student-subject', 'student-stage'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = '';
        });
        
    } catch (e) {
        Swal.fire('خطأ في الاتصال', 'فشل في حفظ البيانات: ' + e.message, 'error');
    }
};

// --- 3. تحميل قائمة الطلاب المسجلين اليوم ---
function loadStudentsAndStats() {
    const list = document.getElementById('students-list');
    const todayCountLabel = document.getElementById('sec-stat-today');
    
    // جلب الطلاب المرتبطين بالمادة أو المرحلة (حسب حاجة السكرتير)
    const q = query(collection(db, "users"), where("role", "==", "student"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (!list) return;
        list.innerHTML = '';
        let todayCount = 0;
        const todayStr = new Date().toDateString();

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // حساب طلاب اليوم فقط للإحصائية
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
                    <span class="badge bg-primary-subtle text-primary border rounded-pill px-3" style="font-size:10px;">${data.subject}</span><br>
                    <small class="text-danger fw-bold" style="font-size:9px;">Code: ${data.accessCode}</small>
                </div>
            `;
            list.appendChild(li);
        });
        
        if(todayCountLabel) todayCountLabel.innerText = todayCount;
    });
}

// --- 4. إدارة طلبات الحضور (مع فحص الصلاحية الصارم) ---
window.approveRequest = async (requestId) => {
    try {
        const myProfile = await getDoc(doc(db, "users", auth.currentUser.uid));
        const myData = myProfile.data();

        // فحص الصلاحية: هل المديرة مارينا سمحت لهذا السكرتير؟
        if (!myData.canApproveAttendance) {
            return Swal.fire({
                title: 'صلاحية محدودة',
                text: 'عذراً، لا تملك صلاحية تفعيل الحضور حالياً. يرجى مراجعة الدكتورة مارينا.',
                icon: 'lock'
            });
        }

        await updateDoc(doc(db, "attendanceRequests", requestId), { 
            status: 'approved',
            approvedBy: myData.name,
            approvedAt: serverTimestamp()
        });

        Swal.fire({ icon: 'success', title: 'تم التفعيل', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        
    } catch (e) {
        Swal.fire('خطأ', 'تعذر تفعيل الطلب: ' + e.message, 'error');
    }
};

function loadAttendanceRequests() {
    const list = document.getElementById('attendance-requests');
    const badgeCount = document.getElementById('pending-count');

    const q = query(collection(db, "attendanceRequests"), where("status", "==", "pending"), orderBy("timestamp", "asc"));
    
    onSnapshot(q, (snapshot) => {
        if (!list) return;
        list.innerHTML = '';
        if(badgeCount) badgeCount.innerText = `${snapshot.size} طلب انتظار`;

        if (snapshot.empty) {
            list.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-check-circle text-success mb-2" style="font-size:30px;"></i>
                    <p class="text-muted small">كل الطلبات مكتملة</p>
                </div>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center p-3 mb-2 rounded-4 bg-white border-start border-primary border-4 shadow-sm animate__animated animate__slideInLeft';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <div>
                        <h6 class="mb-0 fw-bold small text-dark">${req.studentName}</h6>
                        <small class="text-muted" style="font-size: 10px;"><i class="far fa-calendar-alt me-1"></i> ${req.date}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary rounded-pill px-3 fw-bold shadow-sm" onclick="approveRequest('${docSnap.id}')">
                    تفعيل
                </button>
            `;
            list.appendChild(li);
        });
    });
}

// حماية الصفحة
document.addEventListener('contextmenu', e => e.preventDefault());

// التشغيل الابتدائي
loadStudentsAndStats();
loadAttendanceRequests();
