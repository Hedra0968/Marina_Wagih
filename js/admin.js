/* JS File: admin.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Features: Live Stats, Point System, PDF Reports, Secretary Permissions.
*/

import { db } from './firebase-config.js';
import { logout } from './auth.js';
import { 
    collection, updateDoc, doc, onSnapshot, addDoc, 
    serverTimestamp, query, where, orderBy, getDocs, increment 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالواجهة
window.handleLogout = logout;

// --- 1. تحديث الإحصائيات الحية (بما فيها نقاط التميز) ---
function watchStats() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        const users = snapshot.docs.map(d => d.data());
        document.getElementById('stat-total-students').innerText = users.filter(u => u.role === 'student').length;
        document.getElementById('stat-pending-users').innerText = users.filter(u => u.status === 'pending').length;
        
        // حساب إجمالي نقاط التميز الموزعة على كل الطلاب
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

// --- 2. إدارة المستخدمين (مع زر صلاحيات السكرتير) ---
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
                        <small class="text-muted">${user.role === 'student' ? 'طالب - ' + user.stage : 'سكرتير'}</small><br>
                        <small class="text-primary fw-bold" style="font-size:11px;">${user.phone || 'بدون هاتف'}</small>
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

// --- 3. نظام منح نقاط التميز ---
window.awardPoints = async (id, name) => {
    const { value: pts } = await Swal.fire({
        title: `تشجيع ${name}`,
        input: 'number',
        inputLabel: 'كم نقطة تميز تود منحها للطالب؟',
        inputPlaceholder: '10, 20, 50...',
        showCancelButton: true
    });

    if (pts) {
        await updateDoc(doc(db, "users", id), {
            points: increment(parseInt(pts))
        });
        Swal.fire('تم!', `تم إضافة ${pts} نقطة إلى رصيد ${name}`, 'success');
    }
};

// --- 4. تبديل صلاحية السكرتير (الميزة المطلوبة) ---
window.togglePermission = async (id, currentStatus) => {
    try {
        await updateDoc(doc(db, "users", id), { 
            canApproveAttendance: !currentStatus 
        });
        Swal.fire({
            icon: 'success',
            title: currentStatus ? 'تم سحب الصلاحية' : 'تم منح الصلاحية',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
    } catch (e) {
        Swal.fire('خطأ', 'فشل في تحديث الصلاحية', 'error');
    }
};

// --- 5. نشر المذكرات والواجبات ---
window.triggerUploadFile = async () => {
    const title = document.getElementById('file-title').value;
    const url = document.getElementById('file-url').value;
    const type = document.getElementById('file-type').value;

    if (!title || !url) return Swal.fire('خطأ', 'برجاء ملء بيانات الملف', 'error');

    await addDoc(collection(db, "files"), {
        title,
        url,
        type, 
        createdAt: serverTimestamp()
    });
    
    Swal.fire('تم النشر', `تم نشر ${type === 'homework' ? 'الواجب' : 'المذكرة'} بنجاح`, 'success');
    document.getElementById('file-title').value = '';
    document.getElementById('file-url').value = '';
};

// --- 6. العمليات الإدارية الأساسية ---
window.activateUser = async (id) => {
    await updateDoc(doc(db, "users", id), { 
        status: 'active', 
        points: 0,
        canApproveAttendance: false // يبدأ السكرتير بدون صلاحية حضور حتى تفعليها
    });
    Swal.fire({ icon: 'success', title: 'تم التفعيل', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
};

window.deleteUser = async (id, name) => {
    const confirm = await Swal.fire({
        title: 'حذف نهائي؟',
        text: `هل أنت متأكد من حذف ${name}؟ لن يتمكن من الدخول ثانية.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'نعم، حذف'
    });
    if (confirm.isConfirmed) {
        await updateDoc(doc(db, "users", id), { status: 'deleted' });
        Swal.fire('حُذف', 'تم استبعاد المستخدم من المنظومة', 'success');
    }
};

// تشغيل التقارير (محاكاة)
window.triggerExportWeeklyPDF = () => Swal.fire('التقارير', 'جاري تجهيز التقرير الأسبوعي للطباعة...', 'info');
window.triggerExportMonthlyPDF = () => Swal.fire('التقارير', 'جاري استخراج بيانات الشهر الحالي...', 'info');

// تشغيل المهام عند التحميل
watchStats();
loadUsers();

/* PROTECTION SHIELD 
    © Marina Wagih & Hadra Victor
*/
document.addEventListener('contextmenu', e => e.preventDefault());
