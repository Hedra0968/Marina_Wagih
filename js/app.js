import { login, register } from './auth.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// تعريف متغير المودال عالمياً
let loginModalInstance;

// الربط مع وظيفة الـ HTML لفتح المودال
window.triggerShowLogin = (role) => {
    const modalElement = document.getElementById('loginModal');
    if (!modalElement) return;

    // ضبط بيانات الدور المختار
    document.getElementById('userRole').value = role;
    const roleTitle = role === 'admin' ? 'المديرة' : role === 'secretary' ? 'السكرتير' : 'الطالب';
    document.getElementById('displayRole').textContent = roleTitle;

    // تشغيل المودال
    if (!loginModalInstance) {
        loginModalInstance = new bootstrap.Modal(modalElement);
    }
    loginModalInstance.show();
};

// وظيفة تبديل حقول الطالب في التسجيل
window.toggleRegFields = (role) => {
    const fields = document.getElementById('student-fields');
    if (fields) {
        fields.style.display = (role === 'student') ? 'block' : 'none';
    }
};

// مستمع حدث الدخول (Login)
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); // منع الصفحة من التحميل

    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const code = document.getElementById('login-code').value;
    const selectedRole = document.getElementById('userRole').value;

    if (email && pass && code) {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جاري الدخول...';
        
        await login(email, pass, code, selectedRole);
        
        btn.disabled = false;
        btn.innerHTML = 'دخول النظام';
    } else {
        Swal.fire('تنبيه', 'يرجى ملء كافة الحقول مع الكود السري', 'warning');
    }
});

// مستمع حدث التسجيل (Register)
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const stage = document.getElementById('reg-stage').value;
    const subject = document.getElementById('reg-subject').value;

    if (name && email && pass && role) {
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جاري المعالجة...';

        await register(email, pass, name, '', stage, subject, role);
        
        btn.disabled = false;
        btn.innerHTML = 'تأكيد إنشاء الحساب';
    } else {
        Swal.fire('تنبيه', 'يرجى إكمال البيانات واختيار نوع الحساب', 'warning');
    }
});

// حل مشكلة "تعليق الشاشة" عند إغلاق النوافذ
document.addEventListener('hidden.bs.modal', function () {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '0';
});
