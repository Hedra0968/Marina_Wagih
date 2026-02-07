import { login, register } from './auth.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));

window.showLoginForm = (role) => {
    document.getElementById('userRole').value = role;
    document.getElementById('displayRole').textContent = 
        role === 'admin' ? 'المديرة' : role === 'secretary' ? 'السكرتير' : 'الطالب';
    loginModal.show();
};

document.getElementById('doLogin').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const code = document.getElementById('login-code').value;
    if(email && pass && code) login(email, pass, code);
    else Swal.fire('تنبيه', 'يرجى ملء كافة الحقول مع الكود السري', 'warning');
});

document.getElementById('doRegister').addEventListener('click', () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const stage = document.getElementById('reg-stage').value;
    const subject = document.getElementById('reg-subject').value;

    if(name && email && pass && role) {
        register(email, pass, name, '', stage, subject, role);
    } else {
        Swal.fire('تنبيه', 'يرجى إكمال البيانات واختيار نوع الحساب', 'warning');
    }
});