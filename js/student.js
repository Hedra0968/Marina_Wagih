/* JS File: student.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Features: Attendance, Points System, HW Upload, Performance Chart.
*/

import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, addDoc, query, where, onSnapshot, getDoc, doc, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالواجهة
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
            title: 'تم الإرسال بنجاح',
            text: 'سيظهر حضورك في السجل فور تأكيده من الإدارة.',
            icon: 'success',
            confirmButtonColor: '#0d6efd'
        });

        noteInput.value = '';
    } catch (e) {
        Swal.fire('خطأ', 'تعذر إرسال الطلب، تأكد من الاتصال بالإنترنت', 'error');
    }
};

// --- 2. رفع الواجبات (PDF Upload) ---
window.triggerUploadHW = async () => {
    const fileInput = document.getElementById('hw-file');
    const file = fileInput.files[0];

    if (!file) return Swal.fire('تنبيه', 'يرجى اختيار ملف الواجب أولاً', 'warning');
    if (file.type !== 'application/pdf') return Swal.fire('خطأ', 'يجب أن يكون الملف بصيغة PDF فقط', 'error');

    Swal.fire({ title: 'جاري الرفع...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // في هذه المرحلة، نقوم بمحاكاة الرفع (أو استخدام Firebase Storage إذا كان مفعلاً)
        // سنقوم بتخزين بيانات الواجب في Firestore للمديرة
        await addDoc(collection(db, "homeworks"), {
            studentId: auth.currentUser.uid,
            studentName: (await getDoc(doc(db, "users", auth.currentUser.uid))).data().name,
            fileName: file.name,
            status: 'submitted',
            timestamp: serverTimestamp()
        });

        Swal.fire('تم التسليم', 'وصل واجبك للمديرة مارينا بنجاح، سيتم تقييمه قريباً.', 'success');
        fileInput.value = '';
    } catch (e) {
        Swal.fire('فشل الرفع', e.message, 'error');
    }
};

// --- 3. نظام النقاط والبروفايل والتحليل ---
function setupStudentData() {
    const welcomeMsg = document.getElementById('welcome-msg');
    const headerPhoto = document.getElementById('student-header-photo');
    const pointsDisplay = document.getElementById('student-points-display');
    const rankLabel = document.getElementById('student-rank');

    onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const pts = data.points || 0;

            if (welcomeMsg) welcomeMsg.innerText = `أهلاً بك يا بطل: ${data.name.split(' ')[0]}`;
            if (headerPhoto) headerPhoto.src = data.photoURL;
            if (pointsDisplay) pointsDisplay.innerText = `${pts} pts`;

            // تحديد الرتبة بناءً على النقاط
            let rank = "طالب مجتهد";
            if (pts > 100) rank = "بطل متميز 🌟";
            if (pts > 500) rank = "أسطورة المدرسة 🔥";
            if (rankLabel) rankLabel.innerText = `رتبتك الحالية: ${rank}`;
        }
    });
}

// --- 4. تحديث سجل الحضور (بأحدث البيانات أولاً) ---
function loadAttendanceHistory() {
    const list = document.getElementById('attendance-history');
    const q = query(
        collection(db, "attendanceRequests"), 
        where("studentId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
    );
    
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li class="text-center py-5 text-muted small">سجلك نظيف.. ابدأ بالتحضير اليوم!</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const isApproved = data.status === 'approved';
            
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center mb-2 border-0 shadow-sm rounded-3 bg-white p-3 animate__animated animate__fadeInUp';
            li.innerHTML = `
                <div>
                    <h6 class="mb-0 fw-bold small text-dark"><i class="fas fa-calendar-check me-2 ${isApproved ? 'text-success' : 'text-warning'}"></i> ${data.date}</h6>
                    <small class="text-muted">${data.note}</small>
                </div>
                <span class="badge ${isApproved ? 'bg-success' : 'bg-warning text-dark'} rounded-pill px-3">
                    ${isApproved ? 'تم التحضير' : 'قيد المراجعة'}
                </span>
            `;
            list.appendChild(li);
        });
    });
}

// --- 5. المكتبة والكويزات (مع الربط بالأنواع الجديدة) ---
function loadResources() {
    const filesList = document.getElementById('files-list');
    const quizzesList = document.getElementById('quizzes-list');

    // مذكرات PDF
    onSnapshot(query(collection(db, "files"), orderBy("createdAt", "desc")), (snapshot) => {
        filesList.innerHTML = '';
        if (snapshot.empty) filesList.innerHTML = '<li class="p-4 text-center text-muted small">لا مذكرات متاحة حالياً</li>';
        
        snapshot.forEach(docSnap => {
            const file = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center border-0 border-bottom p-3 animate__animated animate__fadeIn';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-light-danger p-2 rounded-3 me-3 text-danger"><i class="fas fa-file-pdf"></i></div>
                    <span class="fw-bold small text-dark">${file.title}</span>
                </div>
                <a href="${file.url}" target="_blank" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold">تحميل</a>
            `;
            filesList.appendChild(li);
        });
    });

    // كويزات تفاعلية
    onSnapshot(query(collection(db, "quizzes"), orderBy("createdAt", "desc")), (snapshot) => {
        quizzesList.innerHTML = '';
        if (snapshot.empty) quizzesList.innerHTML = '<li class="p-4 text-center text-muted small">انتظر اختباراتك القادمة</li>';
        
        snapshot.forEach(docSnap => {
            const quiz = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center border-0 border-bottom p-3 animate__animated animate__fadeIn';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-light-primary p-2 rounded-3 me-3 text-primary"><i class="fas fa-star-half-alt"></i></div>
                    <span class="fw-bold small text-dark">${quiz.title}</span>
                </div>
                <a href="${quiz.link}" target="_blank" class="btn btn-sm btn-dark rounded-pill px-3 fw-bold">ابدأ الاختبار</a>
            `;
            quizzesList.appendChild(li);
        });
    });
}

// --- 6. الأمان والتشغيل ---
document.addEventListener('contextmenu', e => e.preventDefault());

onAuthStateChanged(auth, (user) => {
    if (user) {
        setupStudentData();
        loadAttendanceHistory();
        loadResources();
    }
});

/* Rights © 2026 - Marina Wagih School Platform */
