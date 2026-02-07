import { db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// --- ربط الدوال بالنافذة العالمية لضمان عمل أزرار الـ HTML ---

window.triggerLogout = logout;

window.triggerSaveSettings = () => {
    const name = document.getElementById('school-name').value;
    const subject = document.getElementById('main-subject').value;
    if(name || subject) {
        Swal.fire('تم الحفظ', 'تم تحديث إعدادات المدرسة بنجاح', 'success');
        // هنا يمكنك إضافة كود تحديث الإعدادات في Firestore إذا أردت
    } else {
        Swal.fire('تنبيه', 'برجاء إدخال بيانات للتعديل', 'info');
    }
};

// --- تحميل المستخدمين وإدارتهم ---

async function loadUsers() {
    const list = document.getElementById('users-list');
    if (!list) return;

    onSnapshot(collection(db, "users"), (snapshot) => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<li class="text-center py-3">لا يوجد مستخدمين مسجلين حالياً</li>';
            return;
        }

        snapshot.forEach(userDoc => {
            const user = userDoc.data();
            const userId = userDoc.id;

            if (user.role === 'admin') return; 

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 p-3 shadow-sm border-start border-4 ' + 
                          (user.status === 'pending' ? 'border-warning' : 'border-success');
            
            const statusLabel = user.status === 'pending' ? 
                `<span class="badge bg-warning text-dark mb-2">ينتظر التفعيل</span>` : 
                `<span class="badge bg-success mb-2">نشط الآن</span>`;

            li.innerHTML = `
                <div class="mb-3 mb-md-0">
                    ${statusLabel} <br>
                    <strong class="fs-5">${user.name}</strong> 
                    <span class="badge bg-info text-white ms-1">${user.role === 'student' ? 'طالب' : 'سكرتير'}</span> <br>
                    <small class="text-muted">كود الدخول: <b class="text-danger">${user.accessCode || '0000'}</b></small>
                </div>
                <div class="d-flex flex-wrap gap-2">
                    ${user.status === 'pending' ? 
                        `<button class="btn btn-sm btn-primary px-3" onclick="activateUser('${userId}')"><i class="fas fa-check-circle"></i> تفعيل</button>` : ''}
                    
                    ${user.role === 'secretary' ? 
                        `<button class="btn btn-sm ${user.canApproveAttendance ? 'btn-success' : 'btn-outline-secondary'} px-3" 
                                 onclick="togglePermission('${userId}', ${user.canApproveAttendance})">
                            <i class="fas fa-key"></i> صلاحية الحضور
                        </button>` : ''}
                    
                    <button class="btn btn-sm btn-dark px-3" onclick="makeAdmin('${userId}', '${user.name}')">
                        <i class="fas fa-crown text-warning"></i> ترقية
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// --- العمليات (تفعيل، ترقية، صلاحيات) ---

window.activateUser = async (id) => {
    try {
        await updateDoc(doc(db, "users", id), { status: 'active' });
        Swal.fire({ title: 'تم التفعيل', text: 'الحساب أصبح نشطاً ومتاحاً للدخول.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (e) {
        Swal.fire('خطأ', 'فشل التفعيل: ' + e.message, 'error');
    }
};

window.makeAdmin = async (id, name) => {
    const confirm = await Swal.fire({
        title: 'ترقية لمديرة؟',
        text: `هل أنت متأكد من منح ${name} كامل الصلاحيات؟ سيصبح مديراً مثلك تماماً.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'نعم، ترقية',
        cancelButtonText: 'إلغاء'
    });
    if (confirm.isConfirmed) {
        try {
            await updateDoc(doc(db, "users", id), { role: 'admin', status: 'active' });
            Swal.fire('نجاح', 'تمت الترقية بنجاح.', 'success');
        } catch (e) {
            Swal.fire('خطأ', 'تعذر الترقية: ' + e.message, 'error');
        }
    }
};

window.togglePermission = async (id, currentStatus) => {
    try {
        await updateDoc(doc(db, "users", id), { canApproveAttendance: !currentStatus });
        const msg = !currentStatus ? 'تم منح الصلاحية بنجاح' : 'تم سحب الصلاحية بنجاح';
        Swal.fire({ title: 'تحديث الصلاحيات', text: msg, icon: 'info', timer: 1000, showConfirmButton: false });
    } catch (e) {
        console.error("Error toggling permission:", e);
    }
};

// تشغيل التحميل عند فتح الصفحة
document.addEventListener('DOMContentLoaded', loadUsers);
