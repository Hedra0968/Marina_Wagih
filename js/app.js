/* JS File: app.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Features: Advanced Auth Logic, Role-Based Access Control, Digital ID Generation.
*/

import { login, register } from './auth.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// تعريف المودالات
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const idCardModal = new bootstrap.Modal(document.getElementById('idCardModal'));

// --- 1. التعامل مع الصور الشخصية ---
let selectedPhotoBase64 = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

window.previewImage = (event) => {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            return Swal.fire('حجم كبير', 'يرجى اختيار صورة أقل من 2 ميجابايت', 'warning');
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhotoBase64 = e.target.result;
            document.getElementById('register-photo-preview').src = selectedPhotoBase64;
        };
        reader.readAsDataURL(file);
    }
};

// --- 2. فتح نموذج تسجيل الدخول وتحديد الدور (تحديد المكان) ---
window.triggerShowLogin = (role) => {
    document.getElementById('userRole').value = role;
    const roleMap = {
        'admin': 'المديرة مارينا',
        'secretary': 'المكتب الإداري',
        'student': 'بوابة الطالب'
    };
    document.getElementById('displayRole').textContent = roleMap[role] || 'المستخدم';
    loginModal.show();
};

// --- 3. تنفيذ عملية الدخول (مع فحص الصلاحية والمكان) ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const code = document.getElementById('login-code').value.trim();
    const selectedRole = document.getElementById('userRole').value;

    if(email && pass && code) {
        Swal.fire({
            title: 'جاري التحقق...',
            didOpen: () => Swal.showLoading()
        });
        
        // استدعاء دالة الدخول من auth.js
        // ملاحظة: auth.js يجب أن تتعامل مع فحص الـ role والـ code
        const result = await login(email, pass, code, selectedRole);
        
        if (!result.success) {
            // هنا الميزة اللي طلبتها: لو سجل في مكان غير مكانه
            if (result.errorType === 'wrong-role') {
                Swal.fire({
                    icon: 'error',
                    title: 'دخول غير مصرح!',
                    text: `هذا الحساب غير مسجل في ${document.getElementById('displayRole').textContent}. يرجى التوجه للوحة الصحيحة.`,
                    confirmButtonText: 'فهمت'
                });
            } else if (result.errorType === 'wrong-code') {
                Swal.fire('كود خاطئ', 'كود الأمان السري الذي أدخلته غير صحيح.', 'error');
            } else {
                Swal.fire('فشل الدخول', result.message || 'تأكد من بياناتك', 'error');
            }
        }
    } else {
        Swal.fire('بيانات ناقصة', 'يرجى إدخال البريد، كلمة المرور، والكود السري', 'warning');
    }
});

// --- 4. فحص قوة كلمة المرور ---
function isPasswordStrong(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
}

// --- 5. تنفيذ عملية التسجيل وإصدار الكارت ---
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone')?.value.trim() || "غير مسجل";
    const role = document.getElementById('reg-role').value;
    const stage = document.getElementById('reg-stage').value || 'غير محدد';
    const subject = document.getElementById('reg-subject').value || 'عام';

    if(!role) return Swal.fire('تنبيه', 'يرجى اختيار نوع الحساب أولاً', 'warning');
    
    if(!isPasswordStrong(pass)) {
        return Swal.fire({
            title: 'كلمة مرور ضعيفة',
            html: '<ul class="text-start small"><li>يجب أن تكون 8 أحرف على الأقل</li><li>تحتوي على حرف كبير (A-Z)</li><li>تحتوي على رقم واحد</li></ul>',
            icon: 'error'
        });
    }

    Swal.fire({
        title: 'جاري إنشاء ملفك الرقمي...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // توليد كود دخول سري عشوائي فريد قبل الإرسال لـ Firebase
        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const result = await register(email, pass, name, selectedPhotoBase64, stage, subject, role, phone, accessCode);
        
        if (result && result.success) {
            Swal.close();
            showDigitalID(result.userData);
        }
    } catch (error) {
        let errorMsg = "حدث خطأ أثناء التسجيل";
        if (error.code === 'auth/email-already-in-use') errorMsg = "هذا البريد الإلكتروني مسجل بالفعل!";
        Swal.fire('فشل التسجيل', errorMsg, 'error');
    }
});

// --- 6. وظيفة عرض الكارت الديجيتال (Protected UI) ---
function showDigitalID(data) {
    const cardContent = document.getElementById('digitalCardContent');
    const roleText = data.role === 'student' ? 'طالب متميز' : 'سكرتير إداري';
    
    cardContent.innerHTML = `
        <div class="card-inner p-4 text-center animate__animated animate__zoomIn">
            <div class="position-relative d-inline-block mb-3">
                <img src="${data.photoURL || selectedPhotoBase64}" class="card-user-img border border-3 border-white shadow">
                <span class="position-absolute bottom-0 end-0 badge rounded-pill bg-warning text-dark border">جديد</span>
            </div>
            <h3 class="fw-bold mb-1 text-white">${data.name}</h3>
            <p class="badge bg-white text-dark mb-3 px-3 rounded-pill shadow-sm">${roleText}</p>
            
            <div class="bg-white text-dark rounded-4 p-3 shadow-sm mb-3 border-start border-danger border-5">
                <p class="small text-muted mb-1 fw-bold">كود الدخول السري (هام جداً)</p>
                <h2 class="fw-bold text-danger mb-0" style="letter-spacing: 5px; font-family: monospace;">${data.accessCode}</h2>
                <small class="text-muted" style="font-size:10px;">خذ لقطة شاشة (Screenshot) الآن!</small>
            </div>
            
            <div class="row g-2 text-start small text-white">
                <div class="col-6"><i class="fas fa-layer-group me-1"></i> ${data.stage}</div>
                <div class="col-6"><i class="fas fa-book me-1"></i> ${data.subject}</div>
            </div>
            <hr class="opacity-25 bg-white">
            <p class="small text-white-50">© 2026 مدرسة مارينا وجيه & هدرا فيكتور</p>
        </div>
    `;
    
    const regModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    if(regModal) regModal.hide();
    idCardModal.show();
}

window.toggleRegFields = (role) => {
    const studentFields = document.getElementById('student-fields');
    if(studentFields) {
        studentFields.style.display = (role === 'student') ? 'block' : 'none';
        studentFields.classList.add('animate__animated', 'animate__fadeIn');
    }
};

/* SHIELD PROTECTION */
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
    if (e.key === 'F12') e.preventDefault();
});
