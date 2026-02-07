import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, onSnapshot, updateDoc, doc, getDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالنافذة العالمية
window.triggerLogout = logout;

// --- 1. إضافة طالب جديد للمنظومة ---
window.triggerAddStudent = async () => {
    const name = document.getElementById('student-name').value;
    const phone = document.getElementById('student-phone').value;
    const subject = document.getElementById('student-subject').value;
    const stage = document.getElementById('student-stage').value;

    if (!name || !phone) {
        Swal.fire('تنبيه', 'يرجى إدخال اسم الطالب ورقم الهاتف على الأقل', 'warning');
        return;
    }

    try {
        await addDoc(collection(db, "students_manual"), {
            name, phone, subject, stage,
            registeredBy: auth.currentUser.uid,
            createdAt: new Date()
        });
        Swal.fire('تم الإضافة', 'تم تسجيل بيانات الطالب بنجاح', 'success');
        // تفريغ الحقول
        document.getElementById('student-name').value = '';
        document.getElementById('student-phone').value = '';
    } catch (e) {
        Swal.fire('خطأ', 'فشل في إضافة الطالب: ' + e.message, 'error');
    }
};

// --- 2. تحميل قائمة الطلاب المسجلين ---
function loadStudentsList() {
    const list = document.getElementById('students-list');
    if (!list) return;

    onSnapshot(collection(db, "students_manual"), (snapshot) => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li class="list-group-item text-center text-muted">لا يوجد طلاب مسجلين يدويًا</li>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center shadow-sm mb-2 rounded border-end border-success border-3';
            li.innerHTML = `
                <div>
                    <strong class="text-dark">${data.name}</strong> <br>
                    <small class="text-muted"><i class="fas fa-phone-alt small"></i> ${data.phone}</small>
                </div>
                <span class="badge bg-light text-dark border">${data.stage || 'عام'}</span>
            `;
            list.appendChild(li);
        });
    });
}

// --- 3. إدارة طلبات الحضور (بفحص الصلاحية) ---
window.approveRequest = async (requestId) => {
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            // فحص الصلاحية الممنوحة من المديرة
            if (userData.role === 'secretary' && !userData.canApproveAttendance) {
                Swal.fire({
                    title: 'صلاحية مرفوضة',
                    text: 'عذراً، دكتورة مارينا لم تمنحك صلاحية قبول الحضور بعد.',
                    icon: 'error'
                });
                return;
            }

            await updateDoc(doc(db, "attendanceRequests", requestId), { 
                status: 'approved',
                approvedBy: userData.name,
                approvedAt: new Date()
            });
            Swal.fire({ title: 'تم القبول', icon: 'success', timer: 1000, showConfirmButton: false });
        }
    } catch (e) {
        Swal.fire('خطأ', 'حدثت مشكلة: ' + e.message, 'error');
    }
};

function loadAttendanceRequests() {
    const list = document.getElementById('attendance-requests');
    if (!list) return;

    // جلب الطلبات المعلقة فقط
    const q = query(collection(db, "attendanceRequests"), where("status", "==", "pending"));
    
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li class="list-group-item text-center text-muted py-3">لا توجد طلبات معلقة</li>';
            return;
        }
        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center mb-2 border-start border-warning border-3 shadow-sm';
            li.innerHTML = `
                <div>
                    <span class="fw-bold text-dark">${req.studentName || 'طالب'}</span> <br>
                    <small class="text-muted"><i class="far fa-calendar-alt"></i> ${req.date}</small>
                </div>
                <button class="btn btn-sm btn-success px-3 shadow-sm" onclick="approveRequest('${docSnap.id}')">
                    <i class="fas fa-check"></i> قبول
                </button>
            `;
            list.appendChild(li);
        });
    });
}

// تشغيل الدوال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadStudentsList();
    loadAttendanceRequests();
});
