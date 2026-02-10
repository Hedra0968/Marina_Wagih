import { db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, updateDoc, doc, onSnapshot, addDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// ربط الدوال بالواجهة
window.handleLogout = logout;

// --- 1. تحديث الإحصائيات الحية ---
function watchStats() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        const users = snapshot.docs.map(d => d.data());
        document.getElementById('stat-total-students').innerText = users.filter(u => u.role === 'student').length;
        document.getElementById('stat-pending-users').innerText = users.filter(u => u.status === 'pending').length;
    });

    onSnapshot(collection(db, "attendance"), (snapshot) => {
        // حساب الحاضرين اليوم فقط
        const today = new Date().toISOString().split('T')[0];
        const presentToday = snapshot.docs.filter(d => d.data().date === today && d.data().status === 'approved').length;
        document.getElementById('stat-today-attendance').innerText = presentToday;
    });
}

// --- 2. إدارة المستخدمين (عرض الصور والبيانات) ---
async function loadUsers() {
    const list = document.getElementById('users-list');
    onSnapshot(collection(db, "users"), (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(userDoc => {
            const user = userDoc.data();
            if (user.role === 'admin') return; 

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center p-3 mb-2 shadow-sm border-0 rounded-4 bg-white';
            
            // الصورة الشخصية أو افتراضية
            const userImg = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            const statusColor = user.status === 'pending' ? 'text-warning' : 'text-success';

            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${userImg}" class="rounded-circle me-3 border" width="50" height="50" style="object-fit: cover;">
                    <div>
                        <h6 class="mb-0 fw-bold">${user.name} <i class="fas fa-circle ${statusColor}" style="font-size: 8px;"></i></h6>
                        <small class="text-muted">${user.role === 'student' ? 'طالب - ' + user.stage : 'سكرتير'}</small><br>
                        <small class="badge bg-light text-danger p-1">كود: ${user.accessCode}</small>
                    </div>
                </div>
                <div class="d-flex gap-1 flex-wrap justify-content-end">
                    ${user.status === 'pending' ? 
                        `<button class="btn btn-sm btn-primary rounded-pill px-3" onclick="activateUser('${userDoc.id}')">تفعيل</button>` : ''}
                    
                    ${user.role === 'secretary' ? 
                        `<button class="btn btn-sm ${user.canApproveAttendance ? 'btn-success' : 'btn-outline-secondary'} rounded-pill" 
                            onclick="togglePermission('${userDoc.id}', ${user.canApproveAttendance})">
                            <i class="fas fa-fingerprint"></i> الحضور
                        </button>` : ''}
                        
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteUser('${userDoc.id}', '${user.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// --- 3. نشر المذكرات والكويزات ---
window.triggerUploadFile = async () => {
    const title = document.getElementById('file-title').value;
    const url = document.getElementById('file-url').value;

    if (!title || !url) return Swal.fire('خطأ', 'برجاء ملء بيانات الملف', 'error');

    await addDoc(collection(db, "files"), {
        title,
        url,
        createdAt: serverTimestamp()
    });
    
    Swal.fire('تم النشر', 'المذكرة متاحة للطلاب الآن', 'success');
    document.getElementById('file-title').value = '';
    document.getElementById('file-url').value = '';
};

window.triggerCreateQuiz = async () => {
    const title = document.getElementById('quiz-title').value;
    const link = document.getElementById('quiz-link').value;

    if (!title || !link) return Swal.fire('خطأ', 'برجاء ملء بيانات الكويز', 'error');

    await addDoc(collection(db, "quizzes"), {
        title,
        link,
        createdAt: serverTimestamp()
    });

    Swal.fire('تم النشر', 'الكويز ظهر للطلاب الآن', 'success');
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-link').value = '';
};

// --- 4. العمليات الإدارية ---
window.activateUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: 'active' });
    Swal.fire({ icon: 'success', title: 'تم التفعيل', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
};

window.togglePermission = async (id, currentStatus) => {
    await updateDoc(doc(db, "users", id), { canApproveAttendance: !currentStatus });
};

window.deleteUser = async (id, name) => {
    const confirm = await Swal.fire({
        title: 'حذف مستخدم؟',
        text: `هل أنت متأكد من حذف ${name} نهائياً؟`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'نعم، حذف'
    });
    if (confirm.isConfirmed) {
        // ملاحظة: في Firebase يجب التعامل مع الحذف بحذر، هنا نقوم بتعطيله فقط أو حذفه من الـ Store
        await updateDoc(doc(db, "users", id), { status: 'deleted' });
        Swal.fire('تم', 'تم حذف المستخدم من القائمة', 'info');
    }
};

// تشغيل المهام
watchStats();
loadUsers();
