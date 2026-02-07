import { login, register } from './auth.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// تعريف متغير المودال عالمياً عشان نعرف نقفله ونفتحه بسهولة
let loginModalInstance;

// وظيفة إظهار الفورم - مربوطة بـ window عشان تشتغل من الـ HTML (onclick)
window.showLoginForm = (role) => {
    const modalElement = document.getElementById('loginModal');
    if (!modalElement) return;

    // إعداد البيانات داخل المودال
    document.getElementById('userRole').value = role;
    const roleTitle = role === 'admin' ? 'المديرة' : role === 'secretary' ? 'السكرتير' : 'الطالب';
    document.getElementById('displayRole').textContent = roleTitle;

    // تشغيل المودال بطريقة تضمن عدم تعليق الشاشة
    if (!loginModalInstance) {
        loginModalInstance = new bootstrap.Modal(modalElement);
    }
    loginModalInstance.show();
};

// وظيفة تبديل حقول الطالب - مربوطة بـ window
window.toggleRegFields = (role) => {
    const fields = document.getElementById('student-fields');
    if (fields) {
        fields.style.display = (role === 'student') ? 'block' : 'none';
    }
};

// مستمع حدث الدخول
document.getElementById('doLogin')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const code = document.getElementById('login-code').value;
    const selectedRole = document.getElementById('userRole').value;

    if (email && pass && code) {
        // تعطيل الزرار مؤقتاً لمنع التكرار
        const btn = document.getElementById('doLogin');
        btn.disabled = true;
        
        await login(email, pass, code, selectedRole);
        
        btn.disabled = false;
    } else {
        Swal.fire('تنبيه', 'يرجى ملء كافة الحقول مع الكود السري', 'warning');
    }
});

// مستمع حدث التسجيل
document.getElementById('doRegister')?.addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const stage = document.getElementById('reg-stage').value;
    const subject = document.getElementById('reg-subject').value;

    if (name && email && pass && role) {
        const btn = document.getElementById('doRegister');
        btn.disabled = true;

        await register(email, pass, name, '', stage, subject, role);
        
        btn.disabled = false;
    } else {
        Swal.fire('تنبيه', 'يرجى إكمال البيانات واختيار نوع الحساب', 'warning');
    }
});

// حل مشكلة "الشاشة السوداء" عند إغلاق المودال في الموبايل
document.addEventListener('hidden.bs.modal', function () {
    // إزالة أي بقايا للطبقة السوداء يدوياً لو علقت
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '0';
});
