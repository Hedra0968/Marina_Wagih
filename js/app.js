/* JS File: app.js
    Integrated Version: Base Logic + Advanced Security + Digital ID
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
*/

import { login, register } from './auth.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// تعريف المودالات
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const idCardModal = new bootstrap.Modal(document.getElementById('idCardModal'));

// --- 1. التعامل مع الصور الشخصية والتحقق من الحجم ---
let selectedPhotoBase64 = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; // صورة افتراضية

window.previewImage = (event) => {
    const file = event.target.files[0];
    if (file) {
        // الإضافة: التأكد من حجم الصورة (أقل من 2 ميجا لتوفير مساحة Firestore وسرعة التحميل)
        if (file.size > 2 * 1024 * 1024) {
            return Swal.fire('حجم كبير', 'يرجى اختيار صورة أقل من 2 ميجابايت لضمان سرعة التسجيل', 'warning');
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedPhotoBase64 = e.target.result;
            document.getElementById('register-photo-preview').src = selectedPhotoBase64;
        };
        reader.readAsDataURL(file);
    }
};

// --- 2. فتح نموذج تسجيل الدخول وتحديد مسمى الدور ---
window.triggerShowLogin = (role) => {
    document.getElementById('userRole').value = role;
    // الإضافة: خريطة المسميات الجديدة
    const roleMap = {
        'admin': 'المديرة مارينا',
        'secretary': 'المكتب الإداري',
        'student': 'بوابة الطالب'
    };
    document.getElementById('displayRole').textContent = roleMap[role] || 'المستخدم';
    loginModal.show();
};

// --- 3. تنفيذ عملية الدخول مع تنظيف المدخلات ---
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const code = document.getElementById('login-code').value.trim();
    const selectedRole = document.getElementById('userRole').value;

    if(email && pass && code) {
        login(email, pass, code, selectedRole);
    } else {
        Swal.fire('تنبيه', 'يرجى ملء كافة الحقول (البريد، كلمة المرور، والكود السري)', 'warning');
    }
});

// --- 4. الإضافة: فحص قوة كلمة المرور (Security Validator) ---
function isPasswordStrong(password) {
    // الشرط: 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
}

// --- 5. تنفيذ عملية التسجيل وإصدار الكارت الرقمي ---
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone')?.value.trim() || "غير مسجل"; // الإضافة: دعم حقل الهاتف
    const role = document.getElementById('reg-role').value;
    const stage = document.getElementById('reg-stage').value || 'غير محدد';
    const subject = document.getElementById('reg-subject').value || 'عام';

    if(!role) return Swal.fire('تنبيه', 'يرجى اختيار نوع الحساب أولاً', 'warning');

    // الإضافة: التحقق من قوة كلمة المرور قبل الإرسال
    if(!isPasswordStrong(pass)) {
        return Swal.fire({
            title: 'كلمة مرور ضعيفة',
            html: '<ul class="text-start small"><li>يجب أن تكون 8 أحرف على الأقل</li><li>يجب أن تحتوي على حرف كبير (A-Z)</li><li>يجب أن تحتوي على رقم واحد على الأقل</li></ul>',
            icon: 'error'
        });
    }

    Swal.fire({
        title: 'جاري إنشاء حسابك الرقمي...',
        text: 'يتم الآن توليد الكود الخاص بك وتأمين البيانات',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // نرسل البيانات لـ Firebase (بما فيها الصورة ورقم الهاتف)
        const result = await register(email, pass, name, selectedPhotoBase64, stage, subject, role, phone);
        
        if (result && result.success) {
            Swal.close();
            showDigitalID(result.userData); // إظهار الكارت فوراً
        }
    } catch (error) {
        let errorMsg = error.message;
        if (error.code === 'auth/email-already-in-use') errorMsg = "هذا البريد الإلكتروني مسجل بالفعل!";
        Swal.fire('فشل التسجيل', errorMsg, 'error');
    }
});

// --- 6. وظيفة عرض الكارت الديجيتال الفخم والمطور ---
function showDigitalID(data) {
    const cardContent = document.getElementById('digitalCardContent');
    const roleText = data.role === 'student' ? 'طالب ذكي متميز' : 'سكرتير إداري';
    
    cardContent.innerHTML = `
        <div class="card-inner p-4 text-center animate__animated animate__zoomIn">
            <div class="position-relative d-inline-block mb-3">
                <img src="${data.photoURL || selectedPhotoBase64}" class="card-user-img border border-3 border-white shadow">
                <span class="position-absolute bottom-0 end-0 badge rounded-pill bg-warning text-dark border">New</span>
            </div>
            <h3 class="fw-bold mb-1 text-white">${data.name}</h3>
            <p class="badge bg-white text-dark mb-3 px-3 rounded-pill shadow-sm">${roleText}</p>
            
            <div class="bg-white text-dark rounded-4 p-3 shadow-sm mb-3 border-start border-danger border-5">
                <p class="small text-muted mb-1 fw-bold">كود الدخول السري (احفظه جيداً)</p>
                <h2 class="fw-bold text-danger mb-0" style="letter-spacing: 5px; font-family: monospace;">${data.accessCode}</h2>
                <small class="text-muted" style="font-size:9px;">يرجى تصوير الشاشة (Screenshot) للدخول لاحقاً</small>
            </div>
            
            <div class="row g-2 text-start small text-white">
                <div class="col-6"><i class="fas fa-layer-group me-1"></i> <b>المرحلة:</b> ${data.stage}</div>
                <div class="col-6"><i class="fas fa-book me-1"></i> <b>المادة:</b> ${data.subject}</div>
                <div class="col-12 mt-2"><i class="fas fa-phone-alt me-1"></i> <b>الهاتف:</b> ${data.phone || '---'}</div>
            </div>
            
            <hr class="opacity-25 bg-white">
            <p class="small text-white-50">نظام مدرسة مارينا وجيه الذكي 2026</p>
        </div>
    `;
    
    // إخفاء مودال التسجيل وإظهار الكارت
    const regModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    if(regModal) regModal.hide();
    idCardModal.show();
}

// تبديل الحقول بناءً على الدور مع أنيميشن بسيط
window.toggleRegFields = (role) => {
    const studentFields = document.getElementById('student-fields');
    if(studentFields) {
        studentFields.style.display = (role === 'student') ? 'block' : 'none';
        if(role === 'student') {
            studentFields.classList.add('animate__animated', 'animate__fadeIn');
        }
    }
};

/* الإضافة: درع الحماية البرمجي (SHIELD PROTECTION) 
   منع الوصول إلى Console لحماية الكود الخاص بك */
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
    if (e.key === 'F12') e.preventDefault();
});
document.addEventListener('contextmenu', e => e.preventDefault());
