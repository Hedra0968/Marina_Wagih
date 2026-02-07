import { db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// جعل دالة تسجيل الخروج متاحة عالمياً
window.logout = logout;

async function loadUsers() {
    const list = document.getElementById('users-list');
    if (!list) return;

    onSnapshot(collection(db, "users"), (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(userDoc => {
            const user = userDoc.data();
            const userId = userDoc.id;

            if (user.role === 'admin') return; 

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 p-3 rounded shadow-sm border-start border-4 ' + 
                          (user.status === 'pending' ? 'border-warning' : 'border-success');
            
            const statusLabel = user.status === 'pending' ? 
                `<span class="badge bg-warning text-dark mb-2">ينتظر التفعيل</span>` : 
                `<span class="badge bg-success mb-2">نشط</span>`;

            li.innerHTML = `
                <div class="mb-2 mb-md-0">
                    ${statusLabel} <br>
                    <strong>${user.name}</strong> <span class="badge bg-light text-dark border">${user.role === 'student' ? 'طالب' : 'سكرتير'}</span> <br>
                    <small class="text-muted">كود الدخول: <b class="text-danger">${user.accessCode || 'بدون كود'}</b></small>
                </div>
                <div class="d-flex flex-wrap gap-2">
                    ${user.status === 'pending' ? 
                        `<button class="btn btn-sm btn-primary flex-fill" onclick="activateUser('${userId}')">تفعيل الحساب</button>` : ''}
                    
                    ${user.role === 'secretary' ? 
                        `<button class="btn btn-sm ${user.canApproveAttendance ? 'btn-success' : 'btn-outline-secondary'} flex-fill" 
                                 onclick="togglePermission('${userId}', ${user.canApproveAttendance})">
                            صلاحية الحضور
                        </button>` : ''}
                    
                    <button class="btn btn-sm btn-dark flex-fill" onclick="makeAdmin('${userId}', '${user.name}')">ترقية لمدير</button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// --- تعريف الدوال وربطها بـ window لضمان عملها في الموبايل والـ HTML ---

window.activateUser = async (id) => {
    try {
        await updateDoc(doc(db, "users", id), { status: 'active' });
        Swal.fire({ title: 'تم التفعيل', text: 'الحساب أصبح نشطاً الآن.', icon: 'success', timer: 1500 });
    } catch (e) {
        Swal.fire('خطأ', 'فشل التفعيل: ' + e.message, 'error');
    }
};

window.makeAdmin = async (id, name) => {
    const confirm = await Swal.fire({
        title: 'ترقية لمديرة؟',
        text: `هل أنت متأكد من منح ${name} كامل الصلاحيات؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، ترقية',
        cancelButtonText: 'إلغاء'
    });
    if (confirm.isConfirmed) {
        await updateDoc(doc(db, "users", id), { role: 'admin', status: 'active' });
        Swal.fire('نجاح', 'تمت الترقية بنجاح.', 'success');
    }
};

window.togglePermission = async (id, currentStatus) => {
    await updateDoc(doc(db, "users", id), { canApproveAttendance: !currentStatus });
};

// تشغيل التحميل عند فتح الصفحة
document.addEventListener('DOMContentLoaded', loadUsers);
