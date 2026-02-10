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
}, 500);currentUser.uid,
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
