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
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center shadow-sm mb-2 rounded';
            
            // زر الترقية لمدير (يظهر فقط بجانب السكرتير)
            const upgradeBtn = user.role === 'secretary' ? 
                `<button class="btn btn-sm btn-dark ms-2" title="ترقية لمديرة" onclick="makeAdmin('${userDoc.id}', '${user.name}')"><i class="fas fa-crown"></i></button>` : '';

            li.innerHTML = `
                <div>
                    <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role}</span> 
                    <strong>${user.name}</strong> <br>
                    <small class="text-muted">كود الدخول: <b class="text-danger">${user.accessCode}</b></small>
                </div>
                <div>
                    ${upgradeBtn}
                    ${user.role === 'secretary' ? 
                    `<button class="btn btn-sm ${user.canApproveAttendance ? 'btn-success' : 'btn-outline-secondary'}" 
                     onclick="togglePermission('${userDoc.id}', ${user.canApproveAttendance})">
                     صلاحية القبول: ${user.canApproveAttendance ? 'مفعلة' : 'معطلة'}
                    </button>` : ''}
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// دالة ترقية سكرتير لمدير
window.makeAdmin = async (id, name) => {
    const confirm = await Swal.fire({
        title: 'ترقية لمدير؟',
        text: `هل أنت متأكد من منح ${name} كامل صلاحيات المديرة؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'نعم، ترقية',
        cancelButtonText: 'إلغاء'
    });

    if (confirm.isConfirmed) {
        await updateDoc(doc(db, "users", id), { role: 'admin' });
        Swal.fire('نجاح', 'تمت الترقية بنجاح. يمكنه الآن الدخول من لوحة المديرة.', 'success');
    }
};

window.togglePermission = async (id, status) => {
    await updateDoc(doc(db, "users", id), { canApproveAttendance: !status });
    Swal.fire('تحديث', 'تم تغيير صلاحية السكرتير', 'success');
};

loadUsers();
