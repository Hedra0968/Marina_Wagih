import { db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

window.logout = logout;

async function loadUsers() {
    const list = document.getElementById('users-list');
    onSnapshot(collection(db, "users"), (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(userDoc => {
            const user = userDoc.data();
            if (user.role === 'admin') return; // عدم عرض المديرة لنفسها في القائمة

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center mb-2 rounded shadow-sm border-start border-4 ' + 
                          (user.status === 'pending' ? 'border-warning' : 'border-success');
            
            // حالة الحساب
            const statusLabel = user.status === 'pending' ? 
                `<span class="badge bg-warning text-dark">ينتظر التفعيل</span>` : 
                `<span class="badge bg-success">نشط</span>`;

            // زر التفعيل
            const activateBtn = user.status === 'pending' ? 
                `<button class="btn btn-sm btn-primary me-1" onclick="activateUser('${userDoc.id}')">تفعيل الحساب</button>` : '';

            li.innerHTML = `
                <div>
                    ${statusLabel} <strong>${user.name}</strong> (${user.role === 'student' ? 'طالب' : 'سكرتير'}) <br>
                    <small class="text-muted">كود: <b class="text-danger">${user.accessCode}</b></small>
                </div>
                <div>
                    ${activateBtn}
                    ${user.role === 'secretary' ? 
                        `<button class="btn btn-sm ${user.canApproveAttendance ? 'btn-success' : 'btn-outline-secondary'} me-1" onclick="togglePermission('${userDoc.id}', ${user.canApproveAttendance})">صلاحية الحضور</button>` : ''}
                    <button class="btn btn-sm btn-dark" onclick="makeAdmin('${userDoc.id}', '${user.name}')">ترقية لمدير</button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// تفعيل الحساب المعلق
window.activateUser = async (id) => {
    await updateDoc(doc(db, "users", id), { status: 'active' });
    Swal.fire('تم التفعيل', 'الحساب أصبح نشطاً الآن ويمكنه الدخول.', 'success');
};

// ترقية سكرتير لمدير
window.makeAdmin = async (id, name) => {
    const confirm = await Swal.fire({
        title: 'ترقية لمديرة؟',
        text: `هل أنت متأكد من منح ${name} كامل الصلاحيات؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، ترقية'
    });
    if (confirm.isConfirmed) {
        await updateDoc(doc(db, "users", id), { role: 'admin', status: 'active' });
        Swal.fire('نجاح', 'تمت الترقية بنجاح.', 'success');
    }
};

// تبديل صلاحية قبول الحضور للسكرتير
window.togglePermission = async (id, status) => {
    await updateDoc(doc(db, "users", id), { canApproveAttendance: !status });
};

loadUsers();
