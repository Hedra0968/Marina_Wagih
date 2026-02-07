import { auth, db } from './firebase-config.js';
import { logout } from './auth.js';
import { collection, addDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

window.logout = logout;

window.requestAttendance = async () => {
    const date = document.getElementById('attendance-date').value;
    const note = document.getElementById('attendance-note').value;

    if (!date) return Swal.fire('خطأ', 'يرجى اختيار التاريخ', 'error');

    await addDoc(collection(db, "attendanceRequests"), {
        studentId: auth.currentUser.uid,
        date: date,
        note: note,
        status: 'pending',
        timestamp: new Date()
    });

    Swal.fire('تم الإرسال', 'تم إرسال طلب الحضور للمراجعة', 'success');
};

function loadMyHistory() {
    const list = document.getElementById('attendance-history');
    const q = query(collection(db, "attendanceRequests"), where("studentId", "==", auth.currentUser.uid));
    
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const li = document.createElement('li');
            li.className = `list-group-item d-flex justify-content-between align-items-center`;
            li.innerHTML = `
                <span>التاريخ: ${data.date}</span>
                <span class="badge ${data.status === 'approved' ? 'bg-success' : 'bg-warning'}">${data.status}</span>
            `;
            list.appendChild(li);
        });
    });
}

loadMyHistory();