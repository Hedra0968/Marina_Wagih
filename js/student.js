/* JS File: student.js
    Integrated Version: Attendance, Points, HW Upload & Resources
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
*/

import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, addDoc, query, where, onSnapshot, getDoc, doc, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط تسجيل الخروج بالنافذة
window.handleLogout = logout;

// --- 1. إرسال طلب حضور ذكي ---
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
            note: noteInput.value || "لا توجد ملاحظات",
            status: 'pending',
            timestamp: serverTimestamp()
        });

        Swal.fire({
            title: 'تم إرسال الطلب',
            text: 'سيظهر حضورك في السجل فور تأكيده من الإدارة.',
            icon: 'success',
            confirmButtonColor: '#0d6efd',
            timer: 2500
        });

        noteInput.value = '';
    } catch (e) {
        Swal.fire('خطأ', 'فشل في الإرسال: ' + e.message, 'error');
    }
};

// --- 2. رفع الواجبات (PDF Upload Support) ---
window.triggerUploadHW = async () => {
    const fileInput = document.getElementById('hw-file');
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) return Swal.fire('تنبيه', 'يرجى اختيار ملف الواجب أولاً', 'warning');
    if (file.type !== 'application/pdf') return Swal.fire('خطأ', 'يجب أن يكون الملف بصيغة PDF فقط', 'error');

    Swal.fire({ title: 'جاري الرفع...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // تسجيل بيانات الواجب في قاعدة البيانات للمراجعة
        await addDoc(collection(db, "homeworks"), {
            studentId: auth.currentUser.uid,
            studentName: (await getDoc(doc(db, "users", auth.currentUser.uid))).data().name,
            fileName: file.name,
            status: 'submitted',
            timestamp: serverTimestamp()
        });

        Swal.fire('تم التسليم', 'وصل واجبك للدكتورة مارينا بنجاح، سيتم تقييمه قريباً.', 'success');
        if(fileInput) fileInput.value = '';
    } catch (e) {
        Swal.fire('فشل الرفع', 'حدث خطأ أثناء الرفع: ' + e.message, 'error');
    }
};

// --- 3. نظام النقاط والبروفايل والرتب الذكية ---
function setupStudentProfile() {
    const welcomeMsg = document.getElementById('welcome-msg');
    const headerPhoto = document.getElementById('student-header-photo');
    const pointsDisplay = document.getElementById('student-points-display');
    const rankLabel = document.getElementById('student-rank');

    onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const pts = data.points || 0;

            if (welcomeMsg) welcomeMsg.innerText = `أهلاً بك يا بطل: ${data.name.split(' ')[0]}`;
            if (headerPhoto) headerPhoto.src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
            if (pointsDisplay) pointsDisplay.innerText = `${pts} pts`;

            // تحديد الرتبة بناءً على نقاط التميز الممنوحة
            let rank = "طالب مجتهد";
            if (pts > 100) rank = "بطل متميز 🌟";
            if (pts > 500) rank = "أسطورة المدرسة 🔥";
            if (rankLabel) rankLabel.innerText = `رتبتك: ${rank}`;
        }
    });
}

// --- 4. تحميل سجل الحضور الشخصي (بالترتيب الأحدث) ---
function loadMyHistory() {
    const list = document.getElementById('attendance-history');
    const q = query(
        collection(db, "attendanceRequests"), 
        where("studentId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
    );
    
    onSnapshot(q, (snapshot) => {
        if (!list) return;
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li class="list-group-item text-center text-muted py-5 small border-0">سجلك نظيف.. ابدأ بالتحضير اليوم!</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const isApproved = data.status === 'approved';
            const li = document.createElement('li');
            
            li.className = 'list-group-item d-flex justify-content-between align-items-center mb-2 border-0 shadow-sm rounded-3 bg-white p-3 animate__animated animate__fadeInUp';
            li.innerHTML = `
                <div>
                    <h6 class="mb-0 fw-bold small text-dark">
                        <i class="fas fa-calendar-check me-2 ${isApproved ? 'text-success' : 'text-warning'}"></i> 
                        ${data.date}
                    </h6>
                    <small class="text-muted d-block mt-1">${data.note || ''}</small>
                </div>
                <span class="badge ${isApproved ? 'bg-success' : 'bg-warning text-dark'} rounded-pill px-3">
                    ${isApproved ? 'تم التحضير' : 'قيد المراجعة'}
                </span>
            `;
            list.appendChild(li);
        });
    });
}

// --- 5. تحميل المكتبة والكويزات (المكتبة الذكية) ---
function loadResources() {
    const filesList = document.getElementById('files-list');
    const quizzesList = document.getElementById('quizzes-list');

    // تحميل المذكرات (PDF)
    const filesQuery = query(collection(db, "files"), orderBy("createdAt", "desc"));
    onSnapshot(filesQuery, (snapshot) => {
        if (!filesList) return;
        filesList.innerHTML = '';
        if (snapshot.empty) filesList.innerHTML = '<li class="p-4 text-center text-muted small">لا توجد مذكرات منشورة حالياً</li>';
        
        snapshot.forEach(docSnap => {
            const file = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center border-0 border-bottom p-3 animate__animated animate__fadeIn';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-light-danger p-2 rounded-3 me-3 text-danger"><i class="fas fa-file-pdf"></i></div>
                    <span class="fw-bold small text-dark">${file.title}</span>
                </div>
                <a href="${file.url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold">تحميل</a>
            `;
            filesList.appendChild(li);
        });
    });

    // تحميل الكويزات التفاعلية
    const quizzesQuery = query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
    onSnapshot(quizzesQuery, (snapshot) => {
        if (!quizzesList) return;
        quizzesList.innerHTML = '';
        if (snapshot.empty) quizzesList.innerHTML = '<li class="p-4 text-center text-muted small">انتظر اختباراتك القادمة قريباً</li>';
        
        snapshot.forEach(docSnap => {
            const quiz = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center border-0 border-bottom p-3 animate__animated animate__fadeIn';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-light-primary p-2 rounded-3 me-3 text-primary"><i class="fas fa-star-half-alt"></i></div>
                    <span class="fw-bold small text-dark">${quiz.title}</span>
                </div>
                <a href="${quiz.link}" target="_blank" class="btn btn-sm btn-dark rounded-pill px-3 fw-bold">ابدأ الآن</a>
            `;
            quizzesList.appendChild(li);
        });
    });
}

// --- 6. حماية المحتوى والتشغيل الآمن ---
document.addEventListener('contextmenu', e => e.preventDefault());

onAuthStateChanged(auth, (user) => {
    if (user) {
        setupStudentProfile();
        loadMyHistory();
        loadResources();
    }
});

/* Rights © 2026 - Marina Wagih & Hadra Victor School Platform */
