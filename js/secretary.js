import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, getDocs, onSnapshot, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

window.logout = logout;

// دالة الموافقة على الحضور (تفحص الصلاحية الممنوحة من المديرة أولاً)
window.approveRequest = async (requestId) => {
    const adminRef = doc(db, "users", auth.currentUser.uid);
    const adminSnap = await getDoc(adminRef);
    
    if (adminSnap.exists() && adminSnap.data().role === 'secretary' && !adminSnap.data().canApproveAttendance) {
        Swal.fire('صلاحية مرفوضة', 'عذراً، المديرة لم تمنحك صلاحية قبول الطلبات بعد.', 'error');
        return;
    }

    await updateDoc(doc(db, "attendanceRequests", requestId), { status: 'approved' });
    Swal.fire('نجاح', 'تم قبول طلب الحضور', 'success');
};

function loadRequests() {
    const list = document.getElementById('attendance-requests');
    onSnapshot(collection(db, "attendanceRequests"), (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            if(req.status === 'pending') {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between';
                li.innerHTML = `
                    <span>طلب من طالب ID: ${req.studentId.substring(0,5)}... بتاريخ ${req.date}</span>
                    <button class="btn btn-sm btn-success" onclick="approveRequest('${docSnap.id}')">قبول</button>
                `;
                list.appendChild(li);
            }
        });
    });
}

loadRequests();