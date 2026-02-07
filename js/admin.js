import { db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, getDocs, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

window.logout = logout;

async function loadUsers() {
    const list = document.getElementById('users-list');
    onSnapshot(collection(db, "users"), (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(userDoc => {
            const user = userDoc.data();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center shadow-sm mb-2';
            li.innerHTML = `
                <div>
                    <span class="badge bg-primary">${user.role}</span> 
                    <strong>${user.name}</strong> <br>
                    <small class="text-muted">Code: <b class="text-danger">${user.accessCode}</b></small>
                </div>
                <div>
                    ${user.role === 'secretary' ? 
                    `<button class="btn btn-sm ${user.canApproveAttendance ? 'btn-success' : 'btn-outline-secondary'}" 
                     onclick="togglePermission('${userDoc.id}', ${user.canApproveAttendance})">
                     ${user.canApproveAttendance ? 'مسموح له بالقبول' : 'ممنوع من القبول'}
                    </button>` : ''}
                </div>
            `;
            list.appendChild(li);
        });
    });
}

window.togglePermission = async (id, status) => {
    await updateDoc(doc(db, "users", id), { canApproveAttendance: !status });
    Swal.fire('تحديث', 'تم تغيير صلاحية السكرتير بنجاح', 'success');
};

loadUsers();