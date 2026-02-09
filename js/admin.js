/* JS File: admin.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Features: Live Stats, Point System, PDF Reports, Secretary Permissions, HW Grading.
*/

import { db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, updateDoc, doc, onSnapshot, addDoc, 
    serverTimestamp, query, where, orderBy, getDocs, increment, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالواجهة
window.handleLogout = logout;

// --- 1. تحديث الإحصائيات الحية ---
function watchStats() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        const users = snapshot.docs.map(d => d.data());
        document.getElementById('stat-total-students').innerText = users.filter(u => u.role === 'student').length;
        document.getElementById('stat-pending-users').innerText = users.filter(u => u.status === 'pending').length;
        
        const totalPoints = users.reduce((acc, user) => acc + (user.points || 0), 0);
        const pointsElem = document.getElementById('stat-total-points');
        if (pointsElem) pointsElem.innerText = totalPoints;
    });

    onSnapshot(collection(db, "attendanceRequests"), (snapshot) => {
        const today = new Date().toISOString().split('T')[0];
        const presentToday = snapshot.docs.filter(d => d.data().date === today && d.data().status === 'approved').length;
        const statAttendance = document.getElementById('stat-today-attendance');
        if (statAttendance) statAttendance.innerText = presentToday;
    });
}

// --- 2. إدارة المستخدمين والصلاحيات ---
async function loadUsers() {
    const list = document.getElementById('users-list');
    onSnapshot(collection(db, "users"), (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(userDoc => {
            const user = userDoc.data();
            if (user.role === 'admin' || user.status === 'deleted') return; 

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center p-3 mb-2 shadow-sm border-0 rounded-4 bg-white animate__animated animate__fadeIn';
            
            const userImg = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${userImg}" class="rounded-circle me-3 border shadow-sm" width="55" height="55" style="object-fit: cover;">
                    <div>
                        <h6 class="mb-0 fw-bold">${user.name} <span class="badge points-badge ms-2">${user.points || 0} pt</span></h6>
                        <small class="text-muted">${user.role === 'student' ? 'طالب - ' + user.stage : 'سكرتير'}</small>
                    </div>
                </div>
                <div class="d-flex gap-1 flex-wrap justify-content-end">
                    ${user.role === 'secretary' ? 
                        `<button class="btn btn-sm ${user.canApproveAttendance ? 'btn-success' : 'btn-outline-secondary'} rounded-pill" 
                            onclick="togglePermission('${userDoc.id}', ${user.canApproveAttendance})">
                            <i class="fas fa-fingerprint"></i> الحضور
                        </button>` : ''}

                    ${user.role === 'student' ? 
                        `<button class="btn btn-sm btn-warning rounded-pill text-dark fw-bold" onclick="awardPoints('${userDoc.id}', '${user.name}')">
                            <i class="fas fa-star"></i> تميز
                        </button>` : ''}
                    
                    ${user.status === 'pending' ? 
                        `<button class="btn btn-sm btn-primary rounded-pill px-3" onclick="activateUser('${userDoc.id}')">تفعيل</button>` : ''}
                    
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteUser('${userDoc.id}', '${user.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// --- 3. نظام تصحيح الواجبات المرفوعة ---
function watchHomeworks() {
    const hwList = document.getElementById('hw-eval-list');
    const q = query(collection(db, "studentHomeworks"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        hwList.innerHTML = '';
        if (snapshot.empty) {
            hwList.innerHTML = '<li class="list-group-item text-center text-muted py-4 small">لا يوجد واجبات بانتظار التصحيح</li>';
            return;
        }

        snapshot.forEach(docSnap => {
            const hw = docSnap.data();
            const li = document.createElement('li');
            li.className = 'list-group-item border-0 mb-2 shadow-sm rounded-3 d-flex justify-content-between align-items-center animate__animated animate__fadeInUp';
            li.innerHTML = `
                <div>
                    <span class="fw-bold d-block">${hw.studentName}</span>
                    <small class="text-muted">واجب: ${hw.fileTitle}</small>
                </div>
                <div class="d-flex gap-2">
                    <a href="${hw.fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i> عرض</a>
                    <button class="btn btn-sm btn-success" onclick="openEvalModal('${docSnap.id}', '${hw.studentId}')">تصحيح</button>
                </div>
            `;
            hwList.appendChild(li);
        });
    });
}

window.openEvalModal = (hwId, studentId) => {
    document.getElementById('eval-hw-id').value = hwId;
    document.getElementById('eval-student-id').value = studentId;
    const modal = new bootstrap.Modal(document.getElementById('evalModal'));
    modal.show();
};

window.submitEvaluation = async () => {
    const hwId = document.getElementById('eval-hw-id').value;
    const studentId = document.getElementById('eval-student-id').value;
    const grade = document.getElementById('eval-grade').value;
    const note = document.getElementById('eval-note').value;

    try {
        await updateDoc(doc(db, "studentHomeworks", hwId), {
            status: "graded",
            grade: grade,
            adminNote: note,
            gradedAt: serverTimestamp()
        });

        // إضافة نقاط تلقائية للطالب (مثلاً 10 نقاط عند التصحيح)
        await updateDoc(doc(db, "users", studentId), {
            points: increment(10)
        });

        bootstrap.Modal.getInstance(document.getElementById('evalModal')).hide();
        Swal.fire('تم التصحيح!', 'تم إرسال الدرجة للطالب وإضافة 10 نقاط لرصيده.', 'success');
    } catch (e) {
        Swal.fire('خطأ', 'فشل في حفظ التقييم', 'error');
    }
};

// --- 4. إعدادات المنصة ---
window.handleSaveSettings = async () => {
    const schoolName = document.getElementById('school-name').value;
    const mainSubject = document.getElementById('main-subject');
    
    if(!schoolName) return Swal.fire('تنبيه', 'برجاء إدخال اسم المنصة', 'warning');

    await updateDoc(doc(db, "settings", "general"), {
        schoolName: schoolName,
        mainSubject: mainSubject.value,
        lastUpdated: serverTimestamp()
    });
    Swal.fire('تم التحديث', 'تم حفظ إعدادات المنصة بنجاح', 'success');
};

// --- 5. صلاحيات ونقاط ---
window.awardPoints = async (id, name) => {
    const { value: pts } = await Swal.fire({
        title: `تشجيع ${name}`,
        input: 'number',
        inputLabel: 'كم نقطة تميز تود منحها للطالب؟',
        showCancelButton: true
    });
    if (pts) {
        await updateDoc(doc(db, "users", id), { points: increment(parseInt(pts)) });
        Swal.fire('تم!', `تم إضافة ${pts} نقطة إلى رصيد ${name}`, 'success');
    }
};

window.togglePermission = async (id, currentStatus) => {
    await updateDoc(doc(db, "users", id), { canApproveAttendance: !currentStatus });
    Swal.fire({ icon: 'success', title: currentStatus ? 'تم سحب الصلاحية' : 'تم منح الصلاحية', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
};

// --- 6. رفع الملفات ---
window.triggerUploadFile = async () => {
    const title = document.getElementById('file-title').value;
    const url = document.getElementById('file-url').value;
    const type = document.getElementById('file-type').value;

    if (!title || !url) return Swal.fire('خطأ', 'برجاء ملء بيانات الملف', 'error');

    await addDoc(collection(db, "files"), { title, url, type, createdAt: serverTimestamp() });
    Swal.fire('تم النشر', 'تم نشر الملف بنجاح', 'success');
    document.getElementById('file-title').value = '';
    document.getElementById('file-url').value = '';
};

// تفعيل المستخدم
window.activateUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: 'active', points: 0, canApproveAttendance: false });
    Swal.fire({ icon: 'success', title: 'تم التفعيل بنجاح', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
};

window.deleteUser = async (id, name) => {
    const confirm = await Swal.fire({ title: 'حذف نهائي؟', text: `هل أنت متأكد من حذف ${name}؟`, icon: 'warning', showCancelButton: true });
    if (confirm.isConfirmed) {
        await updateDoc(doc(db, "users", id), { status: 'deleted' });
        Swal.fire('حُذف', 'تم استبعاد المستخدم', 'success');
    }
};

// تشغيل المهام
watchStats();
loadUsers();
watchHomeworks();

document.addEventListener('contextmenu', e => e.preventDefault());
