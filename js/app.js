import { login, register } from './auth.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// تعريف المودالات
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const idCardModal = new bootstrap.Modal(document.getElementById('idCardModal'));

// --- 1. التعامل مع الصور الشخصية ---
let selectedPhotoBase64 = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; // صورة افتراضية

window.previewImage = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhotoBase64 = e.target.result;
            document.getElementById('register-photo-preview').src = selectedPhotoBase64;
        };
        reader.readAsDataURL(file);
    }
};

// --- 2. فتح نموذج تسجيل الدخول ---
window.triggerShowLogin = (role) => {
    document.getElementById('userRole').value = role;
    document.getElementById('displayRole').textContent = 
        role === 'admin' ? 'المديرة' : role === 'secretary' ? 'السكرتير' : 'الطالب';
    loginModal.show();
};

// --- 3. تنفيذ عملية الدخول ---
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const code = document.getElementById('login-code').value;
    const selectedRole = document.getElementById('userRole').value;

    if(email && pass && code) {
        login(email, pass, code, selectedRole);
    } else {
        Swal.fire('تنبيه', 'يرجى ملء كافة الحقول والكود السري', 'warning');
    }
});

// --- 4. تنفيذ عملية التسجيل وإصدار الكارت ---
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const stage = document.getElementById('reg-stage').value || 'غير محدد';
    const subject = document.getElementById('reg-subject').value || 'عام';

    if(!role) return Swal.fire('تنبيه', 'يرجى اختيار نوع الحساب أولاً', 'warning');

    Swal.fire({
        title: 'جاري إنشاء الحساب...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // نرسل البيانات لـ Firebase (بما فيها الصورة)
        const result = await register(email, pass, name, selectedPhotoBase64, stage, subject, role);
        
        if (result && result.success) {
            Swal.close();
            showDigitalID(result.userData); // إظهار الكارت فوراً
        }
    } catch (error) {
        Swal.fire('فشل التسجيل', error.message, 'error');
    }
});

// --- 5. وظيفة عرض الكارت الديجيتال الفخم ---
function showDigitalID(data) {
    const cardContent = document.getElementById('digitalCardContent');
    const roleText = data.role === 'student' ? 'طالب ذكي' : 'سكرتير إداري';
    
    cardContent.innerHTML = `
        <div class="card-inner p-4 text-center">
            <div class="mb-3">
                <img src="${data.photoURL || selectedPhotoBase64}" class="card-user-img border border-3 border-white shadow">
            </div>
            <h3 class="fw-bold mb-1">${data.name}</h3>
            <p class="badge bg-white text-dark mb-3 px-3 rounded-pill">${roleText}</p>
            
            <div class="bg-white text-dark rounded-4 p-3 shadow-sm mb-3">
                <p class="small text-muted mb-1">كود الدخول السري (احفظه جيداً)</p>
                <h2 class="fw-bold text-danger mb-0" style="letter-spacing: 5px;">${data.accessCode}</h2>
            </div>
            
            <div class="row g-2 text-start small">
                <div class="col-6"><b>المرحلة:</b> ${data.stage || '---'}</div>
                <div class="col-6"><b>المادة:</b> ${data.subject || '---'}</div>
            </div>
            
            <hr class="opacity-25">
            <p class="x-small text-white-50">نظام مدرسة مارينا وجيه الذكي 2026</p>
        </div>
    `;
    
    // إخفاء مودال التسجيل وإظهار الكارت
    bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
    idCardModal.show();
}

// تبديل الحقول بناءً على الدور
window.toggleRegFields = (role) => {
    document.getElementById('student-fields').style.display = (role === 'student') ? 'block' : 'none';
};
