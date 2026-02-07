import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, addDoc, query, where, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط تسجيل الخروج بالنافذة
window.triggerLogout = logout;

// --- 1. إرسال طلب حضور ---
window.triggerRequestAttendance = async () => {
    const dateInput = document.getElementById('attendance-date');
    const noteInput = document.getElementById('attendance-note');
    
    if (!dateInput.value) {
        return Swal.fire('تنبيه', 'يرجى اختيار تاريخ اليوم أولاً', 'warning');
    }

    try {
        // جلب بيانات الطالب الحالية لجلب اسمه
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const studentName = userDoc.exists() ? userDoc.data().name : "طالب غير معروف";

        await addDoc(collection(db, "attendanceRequests"), {
            studentId: auth.currentUser.uid,
            studentName: studentName,
            date: dateInput.value,
            note: noteInput.value,
            status: 'pending',
            timestamp: new Date()
        });

        Swal.fire({
            title: 'تم الإرسال بنجاح',
            text: 'تم إرسال طلبك للسكرتارية والمديرة للمراجعة.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

        // مسح الحقول بعد الإرسال
        noteInput.value = '';
    } catch (e) {
        Swal.fire('خطأ', 'فشل في إرسال الطلب: ' + e.message, 'error');
    }
};

// --- 2. تحميل سجل حضور الطالب ---
function loadMyHistory() {
    const list = document.getElementById('attendance-history');
    if (!list) return;

    // استعلام لجلب طلبات الطالب الحالي فقط مرتبة حسب التاريخ
    const q = query(
        collection(db, "attendanceRequests"), 
        where("studentId", "==", auth.currentUser.uid)
    );
    
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        
        if (snapshot.empty) {
            list.innerHTML = '<li class="list-group-item text-center text-muted py-3">لا يوجد سجل حضور سابق لديك</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const li = document.createElement('li');
            
            // تحديد لون الحالة
            let statusHTML = '';
            if (data.status === 'approved') {
                statusHTML = '<span class="badge bg-success"><i class="fas fa-check"></i> تم القبول</span>';
            } else if (data.status === 'pending') {
                statusHTML = '<span class="badge bg-warning text-dark"><i class="fas fa-clock"></i> معلق</span>';
            } else {
                statusHTML = '<span class="badge bg-danger">مرفوض</span>';
            }

            li.className = 'list-group-item d-flex justify-content-between align-items-center mb-2 shadow-sm border-0 bg-white rounded';
            li.innerHTML = `
                <div>
                    <i class="far fa-calendar-alt text-primary me-2"></i>
                    <strong>${data.date}</strong>
                    ${data.note ? `<br><small class="text-muted ms-4">${data.note}</small>` : ''}
                </div>
                ${statusHTML}
            `;
            list.appendChild(li);
        });
    });
}

// --- 3. تحميل رسالة الترحيب ---
async function setupWelcome() {
    const welcomeMsg = document.getElementById('welcome-msg');
    if (welcomeMsg && auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            welcomeMsg.innerText = `أهلاً بك يا بطل: ${userDoc.data().name}`;
        }
    }
}

// تشغيل الدوال عند جاهزية الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // التأكد من أن المستخدم سجل دخوله قبل التحميل
    const checkAuth = setInterval(() => {
        if (auth.currentUser) {
            setupWelcome();
            loadMyHistory();
            clearInterval(checkAuth);
        }
    }, 500);
});
