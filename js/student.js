/* JS File: student.js
    Integrated Version: Attendance, Points, HW Upload & Resources
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
*/
Import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, addDoc, query, where, onSnapshot, getDoc, doc, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط تسجيل الخروج بالنافذة
window.handleLogout = logout;

// --- 1. إرسال طلب حضور ---
window.handleRequestAttendance = async () => {
    const dateInput = document.getElementById('attendance-date');
    const noteInput = document.getElementById('attendance-note');
    
    if (!dateInput.value) {
        return Swal.fire('تنبيه', 'يرجى اختيار تاريخ الحصة أولاً', 'warning');
    }

    try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const studentData = userDoc.data();

        await addDoc(collection(db, "attendanceRequests"), {
            studentId: auth.currentUser.uid,
            studentName: studentData.name,
            date: dateInput.value,
            note: noteInput.value,
            status: 'pending',
            timestamp: new Date()
        });

        Swal.fire({
            title: 'تم إرسال الطلب',
            text: 'سيتم مراجعة حضورك من قبل الإدارة فوراً.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

        noteInput.value = '';
    } catch (e) {
        Swal.fire('خطأ', 'فشل في الإرسال: ' + e.message, 'error');
    }
};

// --- 2. تحميل سجل الحضور الشخصي ---
function loadMyHistory() {
    const list = document.getElementById('attendance-history');
    const q = query(
        collection(db, "attendanceRequests"), 
        where("studentId", "==", auth.currentUser.uid)
    );
    
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li class="list-group-item text-center text-muted py-4 small">لا يوجد سجلات حضور حتى الآن</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const li = document.createElement('li');
            
            let badge = data.status === 'approved' ? 
                '<span class="badge bg-success rounded-pill px-3">مقبول</span>' : 
                '<span class="badge bg-warning text-dark rounded-pill px-3">قيد الانتظار</span>';

            li.className = 'list-group-item d-flex justify-content-between align-items-center mb-2 border-0 shadow-sm rounded-3 bg-white p-3';
            li.innerHTML = `
                <div>
                    <h6 class="mb-0 fw-bold small"><i class="fas fa-calendar-day me-2 text-primary"></i> ${data.date}</h6>
                    ${data.note ? `<small class="text-muted d-block mt-1">${data.note}</small>` : ''}
                </div>
                ${badge}
            `;
            list.appendChild(li);
        });
    });
}

// --- 3. تحميل المذكرات والكويزات (المكتبة) ---
function loadLibrary() {
    const filesList = document.getElementById('files-list');
    const quizzesList = document.getElementById('quizzes-list');

    // تحميل المذكرات
    onSnapshot(collection(db, "files"), (snapshot) => {
        filesList.innerHTML = '';
        if (snapshot.empty) {
            filesList.innerHTML = '<li class="list-group-item text-center text-muted py-3 small">لا يوجد مذكرات منشورة</li>';
        }
        snapshot.forEach(docSnap => {
            const file = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center border-0 border-bottom p-3';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-file-pdf fa-2x text-danger me-3"></i>
                    <span class="fw-bold small text-dark">${file.title}</span>
                </div>
                <a href="${file.url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3">تحميل</a>
            `;
            filesList.appendChild(li);
        });
    });

    // تحميل الكويزات
    onSnapshot(collection(db, "quizzes"), (snapshot) => {
        quizzesList.innerHTML = '';
        if (snapshot.empty) {
            quizzesList.innerHTML = '<li class="list-group-item text-center text-muted py-3 small">لا يوجد اختبارات حالياً</li>';
        }
        snapshot.forEach(docSnap => {
            const quiz = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center border-0 border-bottom p-3';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-edit fa-lg text-info me-3"></i>
                    <span class="fw-bold small text-dark">${quiz.title}</span>
                </div>
                <a href="${quiz.link}" target="_blank" class="btn btn-sm btn-dark rounded-pill px-3">بدء الآن</a>
            `;
            quizzesList.appendChild(li);
        });
    });
}

// --- 4. إعداد بيانات البروفايل ---
async function setupStudentProfile() {
    const welcomeMsg = document.getElementById('welcome-msg');
    const headerPhoto = document.getElementById('student-header-photo');

    onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (welcomeMsg) welcomeMsg.innerText = `أهلاً بك يا بطل: ${data.name}`;
            if (headerPhoto) headerPhoto.src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
        }
    });
}

// تشغيل السيستم بمجرد تأكيد الهوية
const checkInterval = setInterval(() => {
    if (auth.currentUser) {
        setupStudentProfile();
        loadMyHistory();
        loadLibrary();
        clearInterval(checkInterval);
    }
}, 500);
