/* JS File: auth.js
    Rights: © 2026 Marina Wagih & Hadra Victor. All Rights Reserved.
    Core: Firebase Authentication & Security Logic (Integrated Version)
*/
Import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// توليد كود دخول سري معقد (8 رموز)
const generateAccessCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // استبعاد الحروف المتشابهة مثل O و 0
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// تسجيل حساب جديد مع دعم الصورة الشخصية
export async function register(email, password, name, photoURL, stage, subject, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const accessCode = generateAccessCode();
        
        const userData = {
            uid: userCredential.user.uid,
            name,
            email,
            role,
            photoURL: photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            accessCode,
            createdAt: serverTimestamp(),
            status: 'pending' // الحساب معلق افتراضياً حتى تفعله مارينا
        };

        // إضافة بيانات إضافية حسب الدور
        if (role === 'student') {
            userData.stage = stage;
            userData.subject = subject;
        } else if (role === 'secretary') {
            userData.canApproveAttendance = false;
        }

        // حفظ البيانات في Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), userData);
        
        // تسجيل الخروج فوراً لضمان عدم الدخول إلا بعد التفعيل
        await signOut(auth);

        // إرجاع البيانات لـ app.js لعرض الكارت
        return { success: true, userData };
        
    } catch (error) {
        let errorMsg = "حدث خطأ في التسجيل";
        if (error.code === 'auth/email-already-in-use') errorMsg = "هذا البريد مسجل بالفعل!";
        Swal.fire('خطأ', errorMsg, 'error');
        throw error;
    }
}

// تسجيل الدخول مع فحص "البوابة الصحيحة" والحالة
export async function login(email, password, providedCode, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // 1. فحص الرتبة (لازم يدخل من بوابته)
            if (data.role !== selectedRole) {
                await signOut(auth);
                Swal.fire('دخول مرفوض', `هذا الحساب مسجل كـ (${data.role === 'student' ? 'طالب' : 'إدارة'}) وليس ${selectedRole === 'student' ? 'طالب' : 'إدارة'}`, 'warning');
                return;
            }

            // 2. فحص التفعيل (المديرة مارينا مستثناة)
            if (data.status === 'pending' && data.role !== 'admin') {
                await signOut(auth);
                Swal.fire('الحساب معلق', 'يرجى التواصل مع المديرة لتفعيل حسابك أولاً.', 'info');
                return;
            }

            // 3. فحص كود الأمان
            if (data.accessCode !== providedCode.toUpperCase()) {
                await signOut(auth);
                Swal.fire('كود خاطئ', 'كود الأمان الذي أدخلته غير صحيح.', 'error');
                return;
            }

            // نجاح الدخول
            Swal.fire({ 
                title: 'مرحباً بك', 
                text: 'جاري فتح لوحة التحكم...', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false 
            });
            
            setTimeout(() => redirectByRole(data.role), 1500);
        }
    } catch (error) {
        Swal.fire('فشل الدخول', 'تأكد من البريد وكلمة المرور', 'error');
    }
}

export function logout() {
    signOut(auth).then(() => window.location.href = 'index.html');
}

export function redirectByRole(role) {
    const pages = {
        'admin': 'admin.html',
        'secretary': 'secretary.html',
        'student': 'student.html'
    };
    window.location.href = pages[role] || 'index.html';
}

// مراقبة حالة الجلسة (الحماية)
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    const isPublicPage = path.includes('index.html') || path === '/' || path === '';
    
    if (!user && !isPublicPage) {
        window.location.href = 'index.html';
    }
});
