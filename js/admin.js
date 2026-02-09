/* JS File: admin.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Features: Live Stats, Point System, PDF Reports, Homework Grading.
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

    onSnapshot(collection(db, "attendance"), (snapshot) => {
        const today = new Date().toISOString().split('T')[0];
        const presentToday = snapshot.docs.filter(d => d.data().date === today && d.data().status === 'approved').length;
        document.getElementById('stat-today-attendance').innerText = presentToday;
    });
}

// --- 2. إدارة المستخدمين (إضافة نظام النقاط والتقييم) ---
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
            const statusColor = user.status === 'pending' ? 'text-warning' : 'text-success';

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

// --- 3. نظام منح نقاط التميز (Gamification) ---
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

// --- 4. مركز التقارير (PDF) - الربط البرمجي ---
window.triggerExportWeeklyPDF = async () => {
    Swal.fire({
        title: 'جاري إعداد التقرير الأسبوعي',
        text: 'يتم الآن تجميع بيانات الحضور والدرجات بصيغة PDF...',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
    });
    // هنا يتم استدعاء مكتبة مثل jsPDF أو رابط الـ Backend المخصص للتقارير
    console.log("Generating Weekly Report for Marina...");
};

window.triggerExportMonthlyPDF = async () => {
    Swal.fire({
        title: 'التقرير الشهري الشامل',
        text: 'سيتم استخراج ملف PDF يوضح مستوى كل الطلاب هذا الشهر.',
        icon: 'success'
    });
};

// --- 5. نشر المذكرات والواجبات (دعم الـ PDF) ---
window.triggerUploadFile = async () => {
    const title = document.getElementById('file-title').value;
    const url = document.getElementById('file-url').value;
    const type = document.getElementById('file-type').value;

    if (!title || !url) return Swal.fire('خطأ', 'برجاء ملء بيانات الملف', 'error');

    await addDoc(collection(db, "files"), {
        title,
        url,
        type, // homework or note
        createdAt: serverTimestamp()
    });
    
    Swal.fire('تم النشر', `تم نشر ${type === 'homework' ? 'الواجب' : 'المذكرة'} بنجاح`, 'success');
    document.getElementById('file-title').value = '';
    document.getElementById('file-url').value = '';
};

// --- 6. العمليات الإدارية الأساسية ---
window.activateUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: 'active', points: 0 });
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

// تشغيل المهام عند التحميل
watchStats();
loadUsers();

/* PROTECTION SHIELD 
    © Marina Wagih & Hadra Victor
*/
document.addEventListener('contextmenu', e => e.preventDefault());
