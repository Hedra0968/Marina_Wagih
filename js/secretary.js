/* JS File: secretary.js
    Integrated Version: Student Registration & Attendance Approval
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
*/
Import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, onSnapshot, updateDoc, doc, getDoc, 
    addDoc, query, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالنافذة العالمية
window.handleLogout = logout;

// --- 1. إضافة طالب جديد للمنظومة (يدوي) ---
window.triggerAddStudent = async () => {
    const name = document.getElementById('student-name').value;
    const phone = document.getElementById('student-phone').value;
    const subject = document.getElementById('student-subject').value;
    const stage = document.getElementById('student-stage').value;

    if (!name || !phone) {
        return Swal.fire('تنبيه', 'يرجى إدخال اسم الطالب ورقم الهاتف', 'warning');
    }

    try {
        await addDoc(collection(db, "users"), {
            name,
            phone,
            subject,
            stage,
            role: 'student',
            status: 'active', // الإضافة اليدوية تكون نشطة فوراً
            accessCode: Math.random().toString(36).substring(2, 7).toUpperCase(), // كود بسيط للمسجلين يدوياً
            photoURL: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            registeredBy: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });

        Swal.fire({ icon: 'success', title: 'تم تسجيل الطالب', timer: 1500, showConfirmButton: false });
        
        // تفريغ الحقول
        ['student-name', 'student-phone', 'student-subject', 'student-stage'].forEach(id => document.getElementById(id).value = '');
        
    } catch (e) {
        Swal.fire('خطأ', 'فشل في الإضافة: ' + e.message, 'error');
    }
};

// --- 2. تحميل قائمة الطلاب المسجلين اليوم ---
function loadStudentsAndStats() {
    const list = document.getElementById('students-list');
    const todayCountLabel = document.getElementById('sec-stat-today');
    
    // جلب كل الطلاب لترتيبهم
    const q = query(collection(db, "users"), where("role", "==", "student"));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        let todayCount = 0;
        const todayStr = new Date().toDateString();

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            
            // حساب طلاب اليوم
            if (data.createdAt && data.createdAt.toDate().toDateString() === todayStr) {
                todayCount++;
            }

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center p-3 border-0 border-bottom bg-transparent';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${data.photoURL}" class="rounded-circle me-3 border" width="40" height="40" style="object-fit: cover;">
                    <div>
                        <h6 class="mb-0 fw-bold small text-dark">${data.name}</h6>
                        <small class="text-muted" style="font-size: 11px;">${data.stage} - ${data.phone}</small>
                    </div>
                </div>
                <span class="badge bg-light text-success border-success border rounded-pill">${data.subject}</span>
            `;
            list.appendChild(li);
        });
        
        if(todayCountLabel) todayCountLabel.innerText = todayCount;
    });
}

// --- 3. إدارة طلبات الحضور (بفحص صلاحية الدكتورة مارينا) ---
window.approveRequest = async (requestId) => {
    try {
        const myProfile = await getDoc(doc(db, "users", auth.currentUser.uid));
        const myData = myProfile.data();

        // فحص الأمان: هل مارينا سمحت للسكرتير بالتحضير؟
        if (!myData.canApproveAttendance) {
            return Swal.fire({
                title: 'صلاحية غير كافية',
                text: 'دكتورة مارينا لم تمنحك إذن قبول الحضور. يرجى مراجعتها.',
                icon: 'lock'
            });
        }

        await updateDoc(doc(db, "attendanceRequests", requestId), { 
            status: 'approved',
            approvedBy: myData.name,
            approvedAt: serverTimestamp()
        });

        Swal.fire({ icon: 'success', title: 'تم التحضير', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        
    } catch (e) {
        Swal.fire('خطأ', 'حدث خطأ: ' + e.message, 'error');
    }
};

function loadAttendanceRequests() {
    const list = document.getElementById('attendance-requests');
    const badgeCount = document.getElementById('pending-count');

    const q = query(collection(db, "attendanceRequests"), where("status", "==", "pending"));
    
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        badgeCount.innerText = `${snapshot.size} طلب`;

        if (snapshot.empty) {
            list.innerHTML = '<li class="list-group-item text-center text-muted py-4 border-0">لا توجد طلبات انتظار</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center p-3 mb-2 rounded-4 bg-white border shadow-sm';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-light-warning p-2 rounded-3 me-3 text-warning">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div>
                        <h6 class="mb-0 fw-bold small text-dark">${req.studentName}</h6>
                        <small class="text-muted" style="font-size: 11px;">تاريخ الحصة: ${req.date}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-success rounded-pill px-4 fw-bold" onclick="approveRequest('${docSnap.id}')">
                    تفعيل
                </button>
            `;
            list.appendChild(li);
        });
    });
}

// تشغيل المهام فور التحميل
loadStudentsAndStats();
loadAttendanceRequests();
